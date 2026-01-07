#!/usr/bin/env python3
"""
DeepSeek-OCR FastAPI Server with WebSocket Streaming
True concurrent processing with process pool
"""

import os
import sys
import argparse
from pathlib import Path

parser = argparse.ArgumentParser(description="DeepSeek-OCR FastAPI Server")
parser.add_argument("--port", type=int, default=8000, help="Server port")
parser.add_argument("--host", type=str, default="0.0.0.0", help="Server host")
parser.add_argument("--device", type=str, default="0", help="CUDA device ID")
parser.add_argument("--workers", type=int, default=8, help="Number of worker processes")
parser.add_argument("--log-file", type=str, default="deepseek_fastapi.log", help="Log file")

args = parser.parse_args()
os.environ["CUDA_VISIBLE_DEVICES"] = args.device
# 优化 CUDA 内存分配，避免内存碎片（多进程场景必需）
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import torch
from transformers import AutoModel, AutoTokenizer
import tempfile
import shutil
import asyncio
import logging
import time
import random
import glob
import json
from concurrent.futures import ProcessPoolExecutor
from typing import Dict, Optional
from contextlib import asynccontextmanager
import base64
from PIL import Image
import io

# ============================================================================
# 配置
# ============================================================================

PRODUCTION_CONFIG = {
    "max_image_pixels": 4096 * 4096,
    "dtype": torch.bfloat16,
    "model_name": "deepseek-ai/DeepSeek-OCR",
    "streaming_interval": 0.1,
    "request_timeout": 300,  # 请求超时时间（秒）
}

SIZE_CONFIGS = {
    "Tiny": {"base_size": 512, "image_size": 512, "crop_mode": False},
    "Small": {"base_size": 640, "image_size": 640, "crop_mode": False},
    "Base": {"base_size": 1024, "image_size": 1024, "crop_mode": False},
    "Large": {"base_size": 1280, "image_size": 1280, "crop_mode": False},
    "Gundam (Recommended)": {"base_size": 1024, "image_size": 640, "crop_mode": True}
}

PROMPT_TEMPLATES = {
    "Free OCR": "<image>\nFree OCR. ",
    "Markdown Conversion": "<image>\n<|grounding|>Convert the document to markdown. ",
}

# ============================================================================
# 日志
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(args.log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ============================================================================
# Worker 进程函数（在独立进程中运行）
# ============================================================================

def worker_process(worker_id: int, task_queue, result_queue):
    """Worker 进程 - 独立加载模型，处理推理任务"""

    # 每个 worker 独立初始化日志
    worker_logger = logging.getLogger(f"Worker-{worker_id}")

    worker_logger.info(f"Worker {worker_id} starting...")

    # 加载模型（每个进程独立加载）
    try:
        torch.backends.cudnn.benchmark = True

        tokenizer = AutoTokenizer.from_pretrained(
            PRODUCTION_CONFIG["model_name"],
            trust_remote_code=True
        )

        # 修复 tokenizer 警告：明确设置 pad_token 和相关 ID
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        if tokenizer.pad_token_id is None:
            tokenizer.pad_token_id = tokenizer.eos_token_id

        # 设置生成配置，避免警告
        if not hasattr(tokenizer, 'model_max_length') or tokenizer.model_max_length > 1000000:
            tokenizer.model_max_length = 4096  # 设置合理的最大长度

        model = AutoModel.from_pretrained(
            PRODUCTION_CONFIG["model_name"],
            _attn_implementation='flash_attention_2',
            torch_dtype=PRODUCTION_CONFIG['dtype'],
            device_map='cuda',
            trust_remote_code=True,
            use_safetensors=True
        )
        model = model.eval()
        model.requires_grad_(False)

        worker_logger.info(f"Worker {worker_id} model loaded successfully")

    except Exception as e:
        worker_logger.error(f"Worker {worker_id} failed to load model: {e}")
        return

    # 处理任务循环
    while True:
        request_id = None  # 初始化，防止异常时未定义
        try:
            # 从队列获取任务
            task = task_queue.get()

            if task is None:  # 结束信号
                worker_logger.info(f"Worker {worker_id} shutting down")
                break

            request_id = task['request_id']
            image_path = task['image_path']
            prompt = task['prompt']
            config = task['config']
            temp_dir = task['temp_dir']

            worker_logger.info(f"Worker {worker_id} processing {request_id}")

            # 执行推理
            start_time = time.time()

            with torch.inference_mode():
                result = model.infer(
                    tokenizer,
                    prompt=prompt,
                    image_file=image_path,
                    output_path=temp_dir,
                    base_size=config["base_size"],
                    image_size=config["image_size"],
                    crop_mode=config["crop_mode"],
                    save_results=True,
                    test_compress=True
                )

            inference_time = time.time() - start_time

            # 读取结果
            result_files = (
                glob.glob(os.path.join(temp_dir, "*.txt")) +
                glob.glob(os.path.join(temp_dir, "*.md")) +
                glob.glob(os.path.join(temp_dir, "*.mmd"))
            )

            if result_files:
                with open(result_files[0], 'r', encoding='utf-8') as f:
                    final_result = f.read().strip()
            else:
                final_result = str(result).strip() if result else "No text detected"

            worker_logger.info(f"Worker {worker_id} completed {request_id} in {inference_time:.2f}s")

            # 返回结果
            result_queue.put({
                'request_id': request_id,
                'result': final_result,
                'inference_time': inference_time,
                'worker_id': worker_id,
                'status': 'success'
            })

        except Exception as e:
            worker_logger.error(f"Worker {worker_id} error: {e}")
            worker_logger.error(f"Worker {worker_id} traceback:", exc_info=True)  # 完整堆栈

            # 如果 request_id 未定义，使用占位符
            error_result = {
                'request_id': request_id if request_id else f'unknown_{worker_id}',
                'result': None,
                'error': str(e),
                'worker_id': worker_id,
                'status': 'error'
            }

            # 记录错误详情（用于诊断特定图片问题）
            if request_id:
                worker_logger.error(f"[{request_id}] Error details:")
                worker_logger.error(f"  - Image path: {task.get('image_path', 'N/A') if 'task' in locals() else 'N/A'}")
                worker_logger.error(f"  - Prompt type: {task.get('prompt', 'N/A')[:50] if 'task' in locals() else 'N/A'}")
                worker_logger.error(f"  - Config: {task.get('config', 'N/A') if 'task' in locals() else 'N/A'}")

            result_queue.put(error_result)

# ============================================================================
# FastAPI 应用
# ============================================================================

# 全局变量
process_pool = None
task_queue = None
result_queue = None
active_requests: Dict[str, dict] = {}
shutdown_event = None  # 用于优雅关闭

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI 生命周期管理 - 启动和关闭逻辑"""
    global process_pool, task_queue, result_queue, shutdown_event

    # ========== 启动逻辑 ==========
    logger.info("="*80)
    logger.info("DeepSeek-OCR FastAPI Server Starting...")
    logger.info(f"Workers: {args.workers}")
    logger.info(f"Device: cuda:{args.device}")
    logger.info("="*80)

    # 创建任务队列和结果队列
    import multiprocessing as mp
    task_queue = mp.Queue()
    result_queue = mp.Queue()
    shutdown_event = asyncio.Event()

    # 启动 worker 进程
    process_pool = []
    for i in range(args.workers):
        p = mp.Process(target=worker_process, args=(i, task_queue, result_queue))
        p.start()
        process_pool.append(p)
        logger.info(f"Started worker process {i} (PID: {p.pid})")

    # 启动结果监控任务
    monitor_task = asyncio.create_task(result_monitor(shutdown_event))

    logger.info("✅ Server ready!")
    logger.info("="*80)

    yield  # ← 应用运行期间

    # ========== 关闭逻辑 ==========
    logger.info("Shutting down workers...")

    # 设置关闭标志
    shutdown_event.set()

    # 发送结束信号到所有 worker
    if task_queue:
        for _ in range(args.workers):
            task_queue.put(None)

    # 等待 monitor 任务停止
    try:
        await asyncio.wait_for(monitor_task, timeout=5.0)
    except asyncio.TimeoutError:
        logger.warning("Monitor task did not stop in time, cancelling...")
        monitor_task.cancel()

    # 等待进程结束
    if process_pool:
        for p in process_pool:
            p.join(timeout=5)
            if p.is_alive():
                logger.warning(f"Worker {p.pid} did not stop, terminating...")
                p.terminate()
                p.join(timeout=2)

    logger.info("All workers shut down")

    # 清理残留的临时文件
    cleanup_temp_files()

app = FastAPI(title="DeepSeek-OCR API", lifespan=lifespan)

async def result_monitor(shutdown_event: asyncio.Event):
    """监控结果队列，将结果分发到对应的 WebSocket"""
    last_cleanup = time.time()
    last_worker_check = time.time()

    while not shutdown_event.is_set():
        try:
            # 非阻塞检查结果队列
            if not result_queue.empty():
                result = result_queue.get_nowait()
                request_id = result['request_id']

                if request_id in active_requests:
                    active_requests[request_id]['result'] = result
                    active_requests[request_id]['ready'].set()
                else:
                    logger.warning(f"[{request_id}] Result received but request not found")

            # 定期检查 Worker 健康状态（每30秒）
            current_time = time.time()
            if current_time - last_worker_check > 30:
                if process_pool:
                    alive_workers = [p for p in process_pool if p.is_alive()]
                    dead_workers = len(process_pool) - len(alive_workers)

                    if dead_workers > 0:
                        logger.error(f"⚠️ 检测到 {dead_workers} 个 Worker 进程已死亡！")
                        logger.error("可能原因：1. OOM  2. 模型崩溃  3. 特定图片导致异常")
                        logger.error("建议：重启服务器以恢复全部 Workers")

                last_worker_check = current_time

            # 定期清理超时的请求（防止内存泄漏）
            if current_time - last_cleanup > 60:  # 每60秒清理一次
                timeout = PRODUCTION_CONFIG.get("request_timeout", 300)
                expired_requests = []

                for req_id, req_data in active_requests.items():
                    if current_time - req_data.get('start_time', current_time) > timeout:
                        expired_requests.append(req_id)

                for req_id in expired_requests:
                    logger.warning(f"[{req_id}] Request timeout, cleaning up...")
                    # 设置超时错误
                    if not active_requests[req_id]['ready'].is_set():
                        active_requests[req_id]['result'] = {
                            'status': 'error',
                            'error': 'Request timeout - Worker may have crashed',
                            'worker_id': -1
                        }
                        active_requests[req_id]['ready'].set()

                last_cleanup = current_time

            await asyncio.sleep(0.01)

        except Exception as e:
            logger.error(f"Result monitor error: {e}")
            await asyncio.sleep(0.1)

    logger.info("Result monitor stopped")

def cleanup_temp_files():
    """清理所有残留的临时文件"""
    try:
        temp_base = tempfile.gettempdir()
        ocr_dirs = glob.glob(os.path.join(temp_base, "ocr_req_*"))

        cleaned = 0
        for dir_path in ocr_dirs:
            try:
                # 检查是否是旧文件（超过1小时）
                if os.path.exists(dir_path):
                    mtime = os.path.getmtime(dir_path)
                    if time.time() - mtime > 3600:  # 1小时
                        shutil.rmtree(dir_path, ignore_errors=True)
                        cleaned += 1
            except Exception as e:
                logger.warning(f"Failed to clean {dir_path}: {e}")

        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} old temporary directories")

    except Exception as e:
        logger.error(f"Cleanup error: {e}")

# ============================================================================
# API 端点
# ============================================================================

@app.get("/", response_class=HTMLResponse)
async def get_index():
    """返回前端页面"""
    html_content = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeepSeek-OCR - FastAPI Streaming</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            padding: 30px;
        }

        .panel {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
        }

        .panel h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.5em;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }

        .file-input-wrapper {
            position: relative;
            overflow: hidden;
            display: inline-block;
            width: 100%;
        }

        .file-input-wrapper input[type=file] {
            position: absolute;
            left: -9999px;
        }

        .file-input-label {
            display: block;
            padding: 15px;
            background: white;
            border: 2px dashed #667eea;
            border-radius: 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }

        .file-input-label:hover {
            background: #f0f0ff;
            border-color: #764ba2;
        }

        .file-name {
            margin-top: 10px;
            color: #667eea;
            font-weight: 600;
        }

        .radio-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .radio-item {
            display: flex;
            align-items: center;
            padding: 12px;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
        }

        .radio-item:hover {
            background: #f0f0ff;
        }

        .radio-item input[type=radio] {
            margin-right: 10px;
        }

        textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-family: inherit;
            resize: vertical;
        }

        .button {
            width: 100%;
            padding: 15px;
            border: none;
            border-radius: 10px;
            font-size: 1.1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .button-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .button-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }

        .button-primary:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }

        .button-secondary {
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
            margin-top: 10px;
        }

        .button-secondary:hover {
            background: #f0f0ff;
        }

        #copyBtn {
            transition: all 0.3s;
        }

        #copyBtn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
        }

        #copyBtn:active {
            transform: translateY(0);
        }

        #output {
            width: 100%;
            min-height: 400px;
            max-height: 600px;  /* 限制最大高度 */
            padding: 20px;
            background: white;
            border: 2px solid #ddd;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-y: auto;  /* 超出时显示滚动条 */
            overflow-x: hidden;  /* 隐藏横向滚动条 */
        }

        /* 美化滚动条 */
        #output::-webkit-scrollbar {
            width: 10px;
        }

        #output::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
        }

        #output::-webkit-scrollbar-thumb {
            background: #667eea;
            border-radius: 10px;
        }

        #output::-webkit-scrollbar-thumb:hover {
            background: #764ba2;
        }

        .status {
            padding: 15px;
            background: white;
            border-radius: 10px;
            margin-top: 15px;
            font-family: monospace;
        }

        .status-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
        }

        .badge-success {
            background: #d4edda;
            color: #155724;
        }

        .badge-info {
            background: #d1ecf1;
            color: #0c5460;
        }

        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }

        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .processing {
            animation: pulse 1.5s infinite;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 DeepSeek-OCR</h1>
            <p>FastAPI + WebSocket 实时流式识别 | 真并发处理</p>
        </div>

        <div class="content">
            <!-- 左侧：输入面板 -->
            <div class="panel">
                <h2>📤 输入设置</h2>

                <div class="form-group">
                    <label>上传图片</label>
                    <div class="file-input-wrapper">
                        <input type="file" id="imageInput" accept="image/*">
                        <label for="imageInput" class="file-input-label">
                            📁 点击选择图片
                        </label>
                    </div>
                    <div class="file-name" id="fileName"></div>
                </div>

                <div class="form-group">
                    <label>识别模式</label>
                    <div class="radio-group">
                        <label class="radio-item">
                            <input type="radio" name="promptType" value="Free OCR">
                            <span>🔤 Free OCR - 通用文字识别</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" name="promptType" value="Markdown Conversion" checked>
                            <span>📄 Markdown Conversion - 转换为Markdown</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" name="promptType" value="Custom">
                            <span>✏️ Custom - 自定义Prompt</span>
                        </label>
                    </div>
                </div>

                <div class="form-group" id="customPromptGroup" style="display: none;">
                    <label>自定义 Prompt</label>
                    <textarea id="customPrompt" rows="3" placeholder="输入自定义 prompt..."></textarea>
                </div>

                <div class="form-group">
                    <label>模型尺寸</label>
                    <div class="radio-group">
                        <label class="radio-item">
                            <input type="radio" name="modelSize" value="Tiny">
                            <span>🔸 Tiny (512x512) - 最快</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" name="modelSize" value="Small">
                            <span>🔹 Small (640x640) - 快速</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" name="modelSize" value="Base">
                            <span>🔷 Base (1024x1024) - 平衡</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" name="modelSize" value="Large">
                            <span>🔶 Large (1280x1280) - 高精度</span>
                        </label>
                        <label class="radio-item">
                            <input type="radio" name="modelSize" value="Gundam (Recommended)" checked>
                            <span>⭐ Gundam (1024x640) - 推荐</span>
                        </label>
                    </div>
                </div>

                <button class="button button-primary" id="processBtn">
                    🚀 开始识别
                </button>
                <button class="button button-secondary" id="clearBtn">
                    🗑️ 清空
                </button>
            </div>

            <!-- 右侧：输出面板 -->
            <div class="panel">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;">📄 识别结果</h2>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <span id="charCount" style="font-size: 0.85em; color: #666; font-family: monospace;">0 字符</span>
                        <button class="button" id="copyBtn" style="width: auto; padding: 8px 20px; background: #667eea; color: white; font-size: 0.9em;">
                            📋 复制结果
                        </button>
                    </div>
                </div>
                <div id="output">等待识别...</div>

                <!-- 滚动提示 -->
                <div id="scrollHint" style="display: none; text-align: center; margin-top: 10px; color: #667eea; font-size: 0.9em;">
                    ⬇️ 内容较长，可向下滚动查看
                </div>

                <div class="status">
                    <div class="status-item">
                        <span>连接状态:</span>
                        <span class="badge badge-info" id="wsStatus">未连接</span>
                    </div>
                    <div class="status-item">
                        <span>处理状态:</span>
                        <span class="badge badge-info" id="processStatus">空闲</span>
                    </div>
                    <div class="status-item">
                        <span>Worker ID:</span>
                        <span id="workerInfo">-</span>
                    </div>
                    <div class="status-item">
                        <span>处理时长:</span>
                        <span id="timeInfo">-</span>
                    </div>
                    <div class="status-item">
                        <span>Worker状态:</span>
                        <span id="workerStatus" class="badge badge-info">检查中...</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let ws = null;
        let currentImage = null;
        let healthCheckInterval = null;

        // 元素引用
        const imageInput = document.getElementById('imageInput');
        const fileName = document.getElementById('fileName');
        const processBtn = document.getElementById('processBtn');
        const clearBtn = document.getElementById('clearBtn');
        const copyBtn = document.getElementById('copyBtn');
        const output = document.getElementById('output');
        const charCount = document.getElementById('charCount');
        const scrollHint = document.getElementById('scrollHint');
        const wsStatus = document.getElementById('wsStatus');
        const processStatus = document.getElementById('processStatus');
        const workerInfo = document.getElementById('workerInfo');
        const timeInfo = document.getElementById('timeInfo');
        const workerStatus = document.getElementById('workerStatus');
        const customPromptGroup = document.getElementById('customPromptGroup');

        // 更新字符计数和滚动提示
        function updateOutputInfo() {
            const text = output.textContent;
            const length = text.length;

            // 更新字符计数
            if (text === '等待识别...') {
                charCount.textContent = '0 字符';
            } else {
                charCount.textContent = `${length.toLocaleString()} 字符`;
            }

            // 检查是否需要滚动
            const needsScroll = output.scrollHeight > output.clientHeight;
            if (needsScroll && length > 100) {
                scrollHint.style.display = 'block';
            } else {
                scrollHint.style.display = 'none';
            }
        }

        // 初始化
        updateOutputInfo();

        // 定期检查 Worker 健康状态
        async function checkWorkerHealth() {
            try {
                const response = await fetch('/health');
                const data = await response.json();

                if (data.status === 'healthy') {
                    const activeWorkers = data.workers || 0;
                    if (activeWorkers > 0) {
                        workerStatus.textContent = `${activeWorkers} 个正常`;
                        workerStatus.className = 'badge badge-success';
                    } else {
                        workerStatus.textContent = '全部宕机';
                        workerStatus.className = 'badge badge-danger';
                    }
                } else {
                    workerStatus.textContent = '异常';
                    workerStatus.className = 'badge badge-warning';
                }
            } catch (e) {
                workerStatus.textContent = '检查失败';
                workerStatus.className = 'badge badge-danger';
                console.error('Health check failed:', e);
            }
        }

        // 启动时检查一次
        checkWorkerHealth();

        // 每30秒检查一次
        healthCheckInterval = setInterval(checkWorkerHealth, 30000);

        // 更新复制按钮状态
        function updateCopyButtonState() {
            const text = output.textContent;
            if (!text || text === '等待识别...' || text.startsWith('❌') || text.startsWith('⚠️')) {
                copyBtn.disabled = true;
                copyBtn.style.opacity = '0.5';
                copyBtn.style.cursor = 'not-allowed';
            } else {
                copyBtn.disabled = false;
                copyBtn.style.opacity = '1';
                copyBtn.style.cursor = 'pointer';
            }

            // 同时更新字符计数和滚动提示
            updateOutputInfo();
        }

        // 初始状态
        updateCopyButtonState();

        // 监听输出变化（使用 MutationObserver）
        const outputObserver = new MutationObserver(() => {
            updateCopyButtonState();
            updateOutputInfo();
        });
        outputObserver.observe(output, { childList: true, characterData: true, subtree: true });

        // 文件选择
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileName.textContent = `已选择: ${file.name}`;
                const reader = new FileReader();
                reader.onload = (event) => {
                    currentImage = event.target.result.split(',')[1]; // base64
                };
                reader.readAsDataURL(file);
            }
        });

        // Prompt 类型切换
        document.querySelectorAll('input[name="promptType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                customPromptGroup.style.display = e.target.value === 'Custom' ? 'block' : 'none';
            });
        });

        // 开始识别
        processBtn.addEventListener('click', async () => {
            if (!currentImage) {
                alert('请先上传图片！');
                return;
            }

            const promptType = document.querySelector('input[name="promptType"]:checked').value;
            const modelSize = document.querySelector('input[name="modelSize"]:checked').value;
            const customPrompt = document.getElementById('customPrompt').value;

            // 禁用按钮
            processBtn.disabled = true;
            processBtn.textContent = '⏳ 处理中...';
            output.textContent = '';

            // 建立 WebSocket 连接
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/ocr`;
            console.log('[WebSocket] 正在连接:', wsUrl);

            wsStatus.textContent = '连接中...';
            wsStatus.className = 'badge badge-info';

            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('[WebSocket] 连接成功');
                wsStatus.textContent = '已连接';
                wsStatus.className = 'badge badge-success';
                processStatus.textContent = '处理中...';
                processStatus.className = 'badge badge-warning processing';

                // 发送任务
                const payload = {
                    image: currentImage,
                    prompt_type: promptType,
                    custom_prompt: customPrompt,
                    model_size: modelSize
                };
                console.log('[WebSocket] 发送任务:', payload.prompt_type, payload.model_size);
                ws.send(JSON.stringify(payload));
            };

            ws.onmessage = (event) => {
                console.log('[WebSocket] 收到消息:', event.data.substring(0, 100));
                const data = JSON.parse(event.data);

                if (data.type === 'status') {
                    output.textContent += data.message + '\n';
                    output.scrollTop = output.scrollHeight;  // 状态信息也自动滚动
                } else if (data.type === 'chunk') {
                    output.textContent = data.content;
                    output.scrollTop = output.scrollHeight;  // 流式输出自动滚动到底部
                } else if (data.type === 'complete') {
                    output.textContent = data.result;
                    output.scrollTop = 0;  // 完成后滚动到顶部，方便查看完整结果
                    processStatus.textContent = '完成';
                    processStatus.className = 'badge badge-success';
                    workerInfo.textContent = `Worker ${data.worker_id}`;
                    timeInfo.textContent = `${data.inference_time.toFixed(2)}s`;
                    processBtn.disabled = false;
                    processBtn.textContent = '🚀 开始识别';
                    ws.close();
                } else if (data.type === 'error') {
                    console.error('[WebSocket] 服务器错误:', data.error);

                    // 格式化错误消息
                    let errorMsg = `❌ 处理失败\n\n`;
                    errorMsg += `错误信息：${data.error}\n\n`;

                    // 根据错误类型提供建议
                    if (data.error.includes('timeout') || data.error.includes('超时')) {
                        errorMsg += `⏱️ 可能原因：\n`;
                        errorMsg += `1. 图片过大或内容复杂\n`;
                        errorMsg += `2. Worker进程繁忙或崩溃\n`;
                        errorMsg += `3. 服务器负载过高\n\n`;
                        errorMsg += `💡 建议：\n`;
                        errorMsg += `- 尝试使用更小的模型尺寸（Tiny/Small）\n`;
                        errorMsg += `- 减少图片分辨率\n`;
                        errorMsg += `- 等待几分钟后重试\n`;
                        errorMsg += `- 联系管理员检查服务器日志\n`;
                    } else if (data.error.includes('OOM') || data.error.includes('内存')) {
                        errorMsg += `💾 GPU内存不足\n\n`;
                        errorMsg += `建议：使用 Tiny 或 Small 模型`;
                    } else {
                        errorMsg += `请查看浏览器控制台和服务器日志了解详情`;
                    }

                    output.textContent = errorMsg;
                    processStatus.textContent = '错误';
                    processStatus.className = 'badge badge-danger';
                    processBtn.disabled = false;
                    processBtn.textContent = '🚀 开始识别';
                    ws.close();
                }
            };

            ws.onerror = (error) => {
                console.error('[WebSocket] 连接错误:', error);
                console.error('[WebSocket] URL:', wsUrl);
                output.textContent = `❌ WebSocket连接失败\n\n可能原因：\n1. 服务器未启动\n2. 端口被占用\n3. 防火墙阻止连接\n\n连接地址: ${wsUrl}\n请检查浏览器控制台查看详细错误`;
                wsStatus.textContent = '连接错误';
                wsStatus.className = 'badge badge-danger';
                processBtn.disabled = false;
                processBtn.textContent = '🚀 开始识别';
            };

            ws.onclose = () => {
                console.log('[WebSocket] 连接已关闭');
                wsStatus.textContent = '已断开';
                wsStatus.className = 'badge badge-info';
            };

            // 添加连接超时检测
            const connectionTimeout = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    console.error('[WebSocket] 连接超时（10秒）');
                    output.textContent = `❌ 连接超时\n\n服务器在10秒内未响应\n请检查：\n1. 服务器是否正在运行\n2. 端口 ${window.location.port || '80'} 是否正确\n3. 防火墙设置\n\n尝试重新启动服务器`;
                    wsStatus.textContent = '超时';
                    wsStatus.className = 'badge badge-danger';
                    processBtn.disabled = false;
                    processBtn.textContent = '🚀 开始识别';
                    ws.close();
                }
            }, 10000);

            // 连接成功后清除超时
            ws.addEventListener('open', () => {
                clearTimeout(connectionTimeout);
            });
        });

        // 复制结果
        copyBtn.addEventListener('click', async () => {
            const text = output.textContent;

            // 检查是否有内容
            if (!text || text === '等待识别...' || text.startsWith('❌')) {
                alert('暂无可复制的内容');
                return;
            }

            try {
                // 使用现代 Clipboard API
                await navigator.clipboard.writeText(text);

                // 修改按钮文字显示反馈
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅ 已复制！';
                copyBtn.style.background = '#28a745';

                // 2秒后恢复
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = '#667eea';
                }, 2000);

                console.log('复制成功:', text.length, '个字符');

            } catch (err) {
                // 降级方案：使用旧的 execCommand 方法
                try {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);

                    copyBtn.textContent = '✅ 已复制！';
                    copyBtn.style.background = '#28a745';

                    setTimeout(() => {
                        copyBtn.textContent = '📋 复制结果';
                        copyBtn.style.background = '#667eea';
                    }, 2000);

                } catch (e) {
                    console.error('复制失败:', err, e);
                    alert('复制失败，请手动选择文本复制');
                }
            }
        });

        // 清空
        clearBtn.addEventListener('click', () => {
            imageInput.value = '';
            fileName.textContent = '';
            currentImage = null;
            output.textContent = '等待识别...';
            workerInfo.textContent = '-';
            timeInfo.textContent = '-';
            processStatus.textContent = '空闲';
            processStatus.className = 'badge badge-info';

            // 更新复制按钮状态
            updateCopyButtonState();

            if (ws) {
                ws.close();
            }
        });
    </script>
</body>
</html>
    """
    return HTMLResponse(content=html_content)

@app.websocket("/ws/ocr")
async def websocket_ocr(websocket: WebSocket):
    """WebSocket 端点 - 实时流式OCR"""
    await websocket.accept()

    request_id = f"req_{int(time.time()*1000)}_{random.randint(1000, 9999)}"
    temp_dir = None

    try:
        # 接收任务参数
        data = await websocket.receive_json()

        image_base64 = data.get('image')
        prompt_type = data.get('prompt_type', 'Free OCR')
        custom_prompt = data.get('custom_prompt', '')
        model_size = data.get('model_size', 'Gundam (Recommended)')

        logger.info(f"[{request_id}] New request: {prompt_type}, {model_size}")

        # 发送状态
        await websocket.send_json({
            'type': 'status',
            'message': '🔍 验证输入...'
        })

        # 解码图片
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))

        # 保存图片到临时文件
        temp_dir = tempfile.mkdtemp(prefix=f"ocr_{request_id}_")
        if image.mode in ('RGBA', 'LA', 'P'):
            image_path = os.path.join(temp_dir, "input.png")
            image.save(image_path, format='PNG')
        else:
            image_path = os.path.join(temp_dir, "input.jpg")
            image.save(image_path, format='JPEG', quality=95)

        await websocket.send_json({
            'type': 'status',
            'message': f'📦 已接收图片: {image.size[0]}x{image.size[1]}'
        })

        # 构建 prompt
        if prompt_type == "Custom":
            prompt = f"<image>\n{custom_prompt}"
        else:
            prompt = PROMPT_TEMPLATES.get(prompt_type, PROMPT_TEMPLATES["Free OCR"])

        config = SIZE_CONFIGS[model_size]

        # 提交任务到进程池
        await websocket.send_json({
            'type': 'status',
            'message': f'🚀 提交到处理队列 (模式: {model_size})...'
        })

        task = {
            'request_id': request_id,
            'image_path': image_path,
            'prompt': prompt,
            'config': config,
            'temp_dir': temp_dir
        }

        # 注册等待结果（添加 start_time 用于超时清理）
        result_ready = asyncio.Event()
        active_requests[request_id] = {
            'ready': result_ready,
            'result': None,
            'start_time': time.time()  # 记录开始时间
        }

        # 提交任务
        task_queue.put(task)

        await websocket.send_json({
            'type': 'status',
            'message': '⏳ 等待 Worker 处理...'
        })

        # 启动文件监控（实时流式输出）
        monitor_task = asyncio.create_task(
            monitor_and_stream(websocket, temp_dir, request_id, result_ready)
        )

        # 等待结果（带超时保护和心跳）
        timeout = PRODUCTION_CONFIG.get("request_timeout", 300)
        start_wait = time.time()
        last_heartbeat = start_wait

        try:
            while not result_ready.is_set():
                # 等待最多5秒，然后检查状态
                try:
                    await asyncio.wait_for(result_ready.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    # 5秒超时，发送心跳
                    elapsed = time.time() - start_wait

                    # 检查总超时
                    if elapsed > timeout:
                        raise TimeoutError(f"处理超时（{timeout}秒），可能原因：\n1. 图片过大\n2. Worker进程崩溃\n3. 模型处理卡死")

                    # 每10秒发送一次心跳
                    if time.time() - last_heartbeat > 10:
                        await websocket.send_json({
                            'type': 'status',
                            'message': f'⏳ 处理中... ({int(elapsed)}秒)'
                        })
                        last_heartbeat = time.time()
                        logger.info(f"[{request_id}] Still processing... {elapsed:.1f}s")

                    continue

        except TimeoutError as e:
            logger.error(f"[{request_id}] ❌ Timeout after {timeout}s")
            monitor_task.cancel()
            raise RuntimeError(str(e))

        # 停止监控
        monitor_task.cancel()

        # 获取结果
        result_data = active_requests[request_id].get('result')

        if not result_data:
            raise RuntimeError("Worker返回结果丢失，请检查日志")

        if result_data['status'] == 'success':
            await websocket.send_json({
                'type': 'complete',
                'result': result_data['result'],
                'inference_time': result_data['inference_time'],
                'worker_id': result_data['worker_id']
            })
            logger.info(f"[{request_id}] ✅ Completed by worker {result_data['worker_id']}")
        else:
            await websocket.send_json({
                'type': 'error',
                'error': result_data.get('error', 'Unknown error')
            })
            logger.error(f"[{request_id}] ❌ Failed: {result_data.get('error')}")

    except WebSocketDisconnect:
        logger.warning(f"[{request_id}] Client disconnected")
    except Exception as e:
        logger.error(f"[{request_id}] Error: {e}")
        try:
            await websocket.send_json({
                'type': 'error',
                'error': str(e)
            })
        except:
            pass
    finally:
        # 清理
        if request_id in active_requests:
            del active_requests[request_id]

        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except:
                pass

async def monitor_and_stream(websocket: WebSocket, temp_dir: str, request_id: str, stop_event: asyncio.Event):
    """监控输出文件，实时流式发送"""
    last_size = 0
    file_path = None

    try:
        while not stop_event.is_set():
            try:
                # 查找输出文件
                if file_path is None:
                    result_files = (
                        glob.glob(os.path.join(temp_dir, "*.txt")) +
                        glob.glob(os.path.join(temp_dir, "*.md")) +
                        glob.glob(os.path.join(temp_dir, "*.mmd"))
                    )
                    if result_files:
                        file_path = result_files[0]
                        logger.info(f"[{request_id}] 📄 Found output file")

                # 读取新内容
                if file_path and os.path.exists(file_path):
                    current_size = os.path.getsize(file_path)

                    if current_size > last_size:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()

                        await websocket.send_json({
                            'type': 'chunk',
                            'content': content
                        })

                        last_size = current_size

                await asyncio.sleep(PRODUCTION_CONFIG["streaming_interval"])

            except asyncio.CancelledError:
                # 任务被取消，正常退出
                logger.info(f"[{request_id}] Monitor cancelled")
                break
            except Exception as e:
                logger.error(f"[{request_id}] Monitor error: {e}")
                # 发送错误通知（尽力而为，WebSocket 可能已断开）
                try:
                    await websocket.send_json({
                        'type': 'error',
                        'error': f'Streaming error: {str(e)}'
                    })
                except:
                    pass
                break

    except Exception as e:
        logger.error(f"[{request_id}] Monitor fatal error: {e}")

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "workers": len([p for p in process_pool if p.is_alive()]) if process_pool else 0,
        "active_requests": len(active_requests)
    }

@app.get("/stats")
async def get_stats():
    """获取服务器统计信息"""
    gpu_info = "N/A"
    if torch.cuda.is_available():
        device = torch.cuda.current_device()
        allocated = torch.cuda.memory_allocated(device) / 1024**3
        total = torch.cuda.get_device_properties(device).total_memory / 1024**3
        gpu_info = f"{allocated:.2f}GB / {total:.2f}GB"

    return {
        "workers": args.workers,
        "active_workers": len([p for p in process_pool if p.is_alive()]) if process_pool else 0,
        "active_requests": len(active_requests),
        "gpu_memory": gpu_info
    }

# ============================================================================
# 主程序
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level="info"
    )
