#!/usr/bin/env python3
"""
DeepSeek-OCR FastAPI Server with WebSocket Streaming
True concurrent processing with process pool

✨ 修改版：支持前端 task_id + 结果缓存 (30秒)
"""

import os
import sys
import argparse
from pathlib import Path
from datetime import datetime

parser = argparse.ArgumentParser(description="DeepSeek-OCR FastAPI Server (Real)")
parser.add_argument("--port", type=int, default=8000, help="Server port")
parser.add_argument("--host", type=str, default="0.0.0.0", help="Server host")
parser.add_argument("--device", type=str, default="0", help="CUDA device ID")
parser.add_argument("--workers", type=int, default=8, help="Number of worker processes")
parser.add_argument("--log-file", type=str, default="deepseek_fastapi_real.log", help="Log file")

args = parser.parse_args()
os.environ["CUDA_VISIBLE_DEVICES"] = args.device
# 优化 CUDA 内存分配，避免内存碎片（多进程场景必需）
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
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
from typing import Dict
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
    "request_timeout": 180,  # 请求超时时间（秒）- 大图或复杂文档需要更长时间
    "max_worker_restarts": 3,  # 单个worker最大重启次数
    "restart_window": 300,  # 重启计数窗口（秒）
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

# ✨ 新增：缓存配置
CACHE_DURATION = 120  # 缓存时长：120 秒（2 分钟）
CLEANUP_INTERVAL = 10  # 清理间隔：10 秒

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
            worker_logger.error(f"Worker {worker_id} traceback:", exc_info=True)

            error_result = {
                'request_id': request_id if request_id else f'unknown_{worker_id}',
                'result': None,
                'error': str(e),
                'worker_id': worker_id,
                'status': 'error'
            }

            result_queue.put(error_result)

# ============================================================================
# FastAPI 应用
# ============================================================================

# 全局变量
process_pool = None
task_queue = None
result_queue = None
active_requests: Dict[str, dict] = {}
task_cache: Dict[str, dict] = {}  # ✨ 新增：结果缓存
shutdown_event = None
worker_restart_count: Dict[int, list] = {}  # ✨ 新增：Worker重启计数 {worker_id: [timestamp1, timestamp2, ...]}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI 生命周期管理 - 启动和关闭逻辑"""
    global process_pool, task_queue, result_queue, shutdown_event, worker_restart_count

    # ========== 启动逻辑 ==========
    logger.info("="*80)
    logger.info("DeepSeek-OCR FastAPI Server Starting (REAL with Cache)...")
    logger.info(f"Workers: {args.workers}")
    logger.info(f"Device: cuda:{args.device}")
    logger.info(f"Cache Duration: {CACHE_DURATION} seconds")
    logger.info("="*80)

    # 创建任务队列和结果队列
    import multiprocessing as mp
    task_queue = mp.Queue()
    result_queue = mp.Queue()
    shutdown_event = asyncio.Event()

    # 启动 worker 进程
    process_pool = []
    worker_restart_count = {i: [] for i in range(args.workers)}  # 初始化重启计数
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

    # 等待进程结束（三步关闭策略：join -> terminate -> kill）
    if process_pool:
        for p in process_pool:
            # 第一步：礼貌地等待进程自己结束（5秒）
            p.join(timeout=5)

            if p.is_alive():
                # 第二步：发送 SIGTERM 信号（2秒）
                logger.warning(f"Worker {p.pid} did not stop, terminating...")
                p.terminate()
                p.join(timeout=2)

                if p.is_alive():
                    # 第三步：强制杀死进程（最后保底）
                    logger.error(f"Worker {p.pid} still alive, force killing...")
                    p.kill()
                    p.join(timeout=1)

                    if p.is_alive():
                        logger.error(f"⚠️ Worker {p.pid} 无法关闭！可能需要手动 kill")
                    else:
                        logger.info(f"Worker {p.pid} force killed successfully")

    logger.info("All workers shut down")

    # 清理残留的临时文件
    cleanup_temp_files()

app = FastAPI(title="DeepSeek-OCR API (Real)", lifespan=lifespan)

# 添加 CORS 支持
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def result_monitor(shutdown_event: asyncio.Event):
    """监控结果队列，将结果分发到对应的 WebSocket"""
    last_cleanup = time.time()
    last_cache_cleanup = time.time()  # ✨ 新增：缓存清理时间戳
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

            # ✨ 新增：定期清理过期缓存（每10秒）
            current_time = time.time()
            if current_time - last_cache_cleanup > CLEANUP_INTERVAL:
                expired = [
                    tid for tid, data in task_cache.items()
                    if current_time > data['expires_at']
                ]
                for tid in expired:
                    del task_cache[tid]

                # 只记录汇总日志，避免冗余
                if expired:
                    logger.info(f"[Cache] Cleaned {len(expired)} expired tasks")

                last_cache_cleanup = current_time

            # 定期检查 Worker 健康状态（每30秒）并自动重启崩溃的worker
            if current_time - last_worker_check > 30:
                if process_pool:
                    import multiprocessing as mp

                    # 检查每个worker，并重启崩溃的
                    for i, p in enumerate(process_pool):
                        if not p.is_alive():
                            logger.error(f"⚠️ Worker {i} (PID: {p.pid}) 已死亡，检查是否可重启...")
                            logger.error(f"可能原因：1. OOM  2. 模型崩溃  3. 特定图片导致异常")

                            # 清理过期的重启记录（超过窗口期的不计入）
                            restart_window = PRODUCTION_CONFIG.get("restart_window", 300)
                            worker_restart_count[i] = [
                                ts for ts in worker_restart_count[i]
                                if current_time - ts < restart_window
                            ]

                            # 检查是否超过最大重启次数
                            max_restarts = PRODUCTION_CONFIG.get("max_worker_restarts", 3)
                            if len(worker_restart_count[i]) >= max_restarts:
                                logger.error(
                                    f"❌ Worker {i} 已达到最大重启次数 ({max_restarts}次/{restart_window}秒)，停止重启"
                                )
                                logger.error(f"建议：1. 检查内存是否充足  2. 查看日志排查崩溃原因  3. 手动重启服务")
                            else:
                                # 创建新的worker进程
                                new_process = mp.Process(target=worker_process, args=(i, task_queue, result_queue))
                                new_process.start()
                                process_pool[i] = new_process

                                # 记录重启时间
                                worker_restart_count[i].append(current_time)

                                logger.info(
                                    f"✅ Worker {i} 已自动重启 (新PID: {new_process.pid}) "
                                    f"[{len(worker_restart_count[i])}/{max_restarts}]"
                                )

                    # 记录存活状态
                    alive_count = len([p for p in process_pool if p.is_alive()])
                    logger.info(f"[Health Check] Workers: {alive_count}/{args.workers} alive")

                last_worker_check = current_time

            # 定期清理超时的请求（防止内存泄漏）
            if current_time - last_cleanup > 60:
                timeout = PRODUCTION_CONFIG.get("request_timeout", 300)
                expired_requests = []

                for req_id, req_data in active_requests.items():
                    if current_time - req_data.get('start_time', current_time) > timeout:
                        expired_requests.append(req_id)

                for req_id in expired_requests:
                    logger.warning(f"[{req_id}] Request timeout, cleaning up...")
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
        ocr_dirs = glob.glob(os.path.join(temp_base, "ocr_*"))

        cleaned = 0
        for dir_path in ocr_dirs:
            try:
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

@app.get("/")
async def root():
    """根路径 - 返回服务信息"""
    return JSONResponse({
        "service": "DeepSeek-OCR API (Real)",
        "version": "1.0.0",
        "description": "真实 OCR 服务，支持 GPU 推理 + 结果缓存",
        "cache_duration": f"{CACHE_DURATION} seconds",
        "endpoints": {
            "websocket": "ws://localhost:8000/ws/ocr",
            "query_task": "GET /api/ocr/task/{task_id}",
            "health": "GET /health",
            "stats": "GET /stats"
        }
    })

@app.websocket("/ws/ocr")
async def websocket_ocr(websocket: WebSocket):
    """WebSocket 端点 - 实时流式OCR"""
    await websocket.accept()

    request_id = None  # ✨ 修改：先初始化为 None
    temp_dir = None

    try:
        # 接收任务参数
        data = await websocket.receive_json()

        # ✨ 修改：使用前端传来的 task_id
        request_id = data.get('task_id') or f"req_{int(time.time()*1000)}_{random.randint(1000, 9999)}"

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

        # 注册等待结果
        result_ready = asyncio.Event()
        active_requests[request_id] = {
            'ready': result_ready,
            'result': None,
            'start_time': time.time()
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
                try:
                    await asyncio.wait_for(result_ready.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    elapsed = time.time() - start_wait

                    if elapsed > timeout:
                        raise TimeoutError(f"处理超时（{timeout}秒）")

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
            raise RuntimeError("Worker返回结果丢失")

        if result_data['status'] == 'success':
            # ✨ 新增：保存到缓存（30秒）
            current_time = time.time()
            task_cache[request_id] = {
                'result': result_data['result'],
                'inference_time': result_data['inference_time'],
                'worker_id': result_data['worker_id'],
                'status': 'completed',
                'created_at': current_time,
                'expires_at': current_time + CACHE_DURATION
            }
            logger.info(f"[{request_id}] 💾 Cached result for {CACHE_DURATION}s")

            # 发送完成消息
            await websocket.send_json({
                'type': 'complete',
                'result': result_data['result'],
                'inference_time': result_data['inference_time'],
                'worker_id': result_data['worker_id']
            })
            logger.info(f"[{request_id}] ✅ Completed by worker {result_data['worker_id']}")
        else:
            # ✨ 失败任务也存入缓存（30秒）
            current_time = time.time()
            task_cache[request_id] = {
                'result': None,
                'error': result_data.get('error', 'Unknown error'),
                'worker_id': result_data.get('worker_id', -1),
                'status': 'failed',
                'created_at': current_time,
                'expires_at': current_time + CACHE_DURATION
            }
            logger.info(f"[{request_id}] 💾 Cached error for {CACHE_DURATION}s")

            await websocket.send_json({
                'type': 'error',
                'error': result_data.get('error', 'Unknown error')
            })
            logger.error(f"[{request_id}] ❌ Failed: {result_data.get('error')}")

    except WebSocketDisconnect:
        if request_id:
            logger.warning(f"[{request_id}] Client disconnected")
        else:
            logger.warning("[unknown] Client disconnected")
        if request_id and request_id in active_requests:
            del active_requests[request_id]
    except Exception as e:
        if request_id:
            logger.error(f"[{request_id}] Error: {e}")

            # ✨ 异常也存入缓存（包括超时、崩溃等）
            current_time = time.time()
            task_cache[request_id] = {
                'result': None,
                'error': str(e),
                'worker_id': -1,
                'status': 'failed',
                'created_at': current_time,
                'expires_at': current_time + CACHE_DURATION
            }
            logger.info(f"[{request_id}] 💾 Cached exception for {CACHE_DURATION}s")
        else:
            logger.error(f"[unknown] Error: {e}")

        try:
            await websocket.send_json({
                'type': 'error',
                'error': str(e)
            })
        except:
            pass
        if request_id and request_id in active_requests:
            del active_requests[request_id]
    finally:
        # 清理
        if request_id and request_id in active_requests:
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
                logger.info(f"[{request_id}] Monitor cancelled")
                break
            except Exception as e:
                logger.error(f"[{request_id}] Monitor error: {e}")
                break

    except Exception as e:
        logger.error(f"[{request_id}] Monitor fatal error: {e}")

# ✨ 新增：查询任务结果接口
@app.get("/api/ocr/task/{task_id}")
async def get_task_status(task_id: str):
    """查询任务状态和结果"""

    # 检查缓存
    if task_id in task_cache:
        data = task_cache[task_id]
        expires_in = int(data['expires_at'] - time.time())
        return JSONResponse({
            "status": data["status"],
            "result": data.get("result"),
            "error": data.get("error"),  # ✨ 支持返回错误信息
            "inference_time": data.get("inference_time"),
            "worker_id": data.get("worker_id"),
            "expires_in": max(0, expires_in),
            "created_at": datetime.fromtimestamp(data["created_at"]).isoformat()
        })

    # 检查是否在处理中
    if task_id in active_requests:
        return JSONResponse({
            "status": "processing",
            "expires_in": None
        })

    # 任务不存在或已过期
    return JSONResponse({
        "status": "not_found",
        "error": "Task not found or expired"
    }, status_code=404)

@app.get("/health")
async def health_check():
    """健康检查"""
    return JSONResponse({
        "status": "healthy",
        "workers": len([p for p in process_pool if p.is_alive()]) if process_pool else 0,
        "active_requests": len(active_requests),
        "cached_tasks": len(task_cache),
        "timestamp": datetime.now().isoformat()
    })

@app.get("/stats")
async def get_stats():
    """获取服务器统计信息"""
    gpu_info = "N/A"
    if torch.cuda.is_available():
        device = torch.cuda.current_device()
        allocated = torch.cuda.memory_allocated(device) / 1024**3
        total = torch.cuda.get_device_properties(device).total_memory / 1024**3
        gpu_info = f"{allocated:.2f}GB / {total:.2f}GB"

    return JSONResponse({
        "workers": args.workers,
        "active_workers": len([p for p in process_pool if p.is_alive()]) if process_pool else 0,
        "active_requests": len(active_requests),
        "cached_tasks": len(task_cache),
        "cache_duration": f"{CACHE_DURATION} seconds",
        "gpu_memory": gpu_info,
        "timestamp": datetime.now().isoformat()
    })

# ============================================================================
# 主程序
# ============================================================================

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("🚀 Starting DeepSeek-OCR Real Service...")
    print(f"📍 Server will run on http://{args.host}:{args.port}")
    print(f"💾 Cache duration: {CACHE_DURATION} seconds")
    print(f"🧹 Cleanup interval: {CLEANUP_INTERVAL} seconds")
    print(f"🔥 GPU Workers: {args.workers}")
    print("=" * 80 + "\n")

    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level="info"
    )
