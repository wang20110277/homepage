#!/usr/bin/env python3
"""
模拟 OCR 服务 - 无需 GPU
用于开发测试，模拟 DeepSeek-OCR 的接口行为
"""

import asyncio
import time
import random
import base64
import io
from datetime import datetime
from typing import Dict, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from PIL import Image
import argparse

# ============================================================================
# 配置
# ============================================================================

parser = argparse.ArgumentParser(description="Mock OCR FastAPI Server")
parser.add_argument("--port", type=int, default=8000, help="Server port")
parser.add_argument("--host", type=str, default="0.0.0.0", help="Server host")
args = parser.parse_args()

CACHE_DURATION = 120  # 缓存时长：120 秒（2分钟）
CLEANUP_INTERVAL = 10  # 清理间隔：10 秒

# ============================================================================
# 模拟数据生成
# ============================================================================

SAMPLE_TEXTS = [
    """发票信息

发票号码：1234567890
开票日期：2026年1月7日
购买方：某某科技有限公司
销售方：测试供应商有限公司

货物或应税劳务、服务名称：软件开发服务
金额：￥50,000.00
税率：6%
税额：￥3,000.00
价税合计（大写）：伍万叁仟元整
价税合计（小写）：￥53,000.00

备注：本发票为模拟数据，仅供测试使用。""",

    """合同协议

合同编号：HT-2026-0107-001
签订日期：2026年1月7日

甲方（委托方）：某某科技有限公司
地址：北京市朝阳区某某大街123号
联系电话：010-12345678

乙方（受托方）：测试服务商有限公司
地址：上海市浦东新区某某路456号
联系电话：021-87654321

合同条款：
1. 服务内容：提供软件开发及维护服务
2. 服务期限：2026年1月1日至2026年12月31日
3. 服务费用：总计人民币壹佰万元整（￥1,000,000.00）
4. 付款方式：按季度分期付款

本合同一式两份，甲乙双方各执一份，具有同等法律效力。

甲方（盖章）：                乙方（盖章）：
日期：2026年1月7日            日期：2026年1月7日""",

    """产品说明书

产品名称：智能办公系统 V3.0
产品型号：IOS-3000
生产厂商：某某软件有限公司
生产日期：2026年1月

主要功能：
• 文档管理：支持多种格式文档的在线编辑和协作
• 项目管理：甘特图、看板视图、时间轴等多种视图
• 即时通讯：文字、语音、视频会议功能
• 数据分析：自定义报表、数据可视化
• 移动办公：iOS、Android 双端支持

技术规格：
- 支持并发用户：10000+
- 数据存储：分布式存储，自动备份
- 安全认证：支持SSO、双因素认证
- API接口：RESTful API，完整文档

系统要求：
- 浏览器：Chrome 90+、Firefox 88+、Safari 14+
- 网络：宽带接入，建议10Mbps以上

使用说明：详见用户手册第23-45页""",

    """会议纪要

会议主题：2026年第一季度产品规划会议
会议时间：2026年1月7日 14:00-16:00
会议地点：总部3楼会议室
参会人员：张总、李经理、王工程师、赵设计师等共12人

会议议程：
1. 回顾2025年第四季度产品数据
2. 讨论2026年第一季度产品路线图
3. 确定优先级和资源分配

会议内容：

一、数据回顾（李经理汇报）
- 活跃用户增长35%，达到120万
- 用户留存率提升至75%
- 客户满意度评分：4.6/5.0

二、产品规划（王工程师提议）
- 新增AI助手功能，预计2月底上线
- 优化移动端性能，目标加载时间<2秒
- 开发企业版功能，支持私有部署

三、决议事项
✓ 批准AI助手项目立项，预算50万
✓ 成立移动端性能优化专项小组
✓ 企业版开发延后至第二季度

下次会议：2026年2月7日""",

    """技术文档

# API 接口文档

## 1. 用户认证

### 1.1 登录接口
- **接口地址**：`POST /api/v1/auth/login`
- **请求参数**：
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **返回数据**：
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 7200,
    "user": {
      "id": 12345,
      "name": "张三",
      "email": "zhangsan@example.com"
    }
  }
  ```

### 1.2 注销接口
- **接口地址**：`POST /api/v1/auth/logout`
- **请求头**：`Authorization: Bearer {token}`
- **返回数据**：
  ```json
  {
    "success": true,
    "message": "登出成功"
  }
  ```

## 2. 数据查询

### 2.1 获取用户列表
- **接口地址**：`GET /api/v1/users`
- **查询参数**：
  - page: 页码（默认1）
  - size: 每页数量（默认20）
  - keyword: 搜索关键词

### 2.2 获取用户详情
- **接口地址**：`GET /api/v1/users/{userId}`
- **路径参数**：userId - 用户ID

## 错误码说明
- 200: 成功
- 400: 请求参数错误
- 401: 未授权
- 404: 资源不存在
- 500: 服务器错误""",
]

def generate_random_text() -> str:
    """生成随机的模拟识别文本"""
    return random.choice(SAMPLE_TEXTS)

def generate_task_id() -> str:
    """生成任务ID"""
    timestamp = int(time.time() * 1000)
    random_str = ''.join(random.choices('0123456789abcdefghijklmnopqrstuvwxyz', k=8))
    return f"task_{timestamp}_{random_str}"

# ============================================================================
# 全局变量
# ============================================================================

# 任务缓存：{task_id: {result, inference_time, worker_id, status, created_at, expires_at}}
task_cache: Dict[str, dict] = {}

# 正在处理的任务：{task_id: {status, start_time}}
active_requests: Dict[str, dict] = {}

# ============================================================================
# FastAPI 应用
# ============================================================================

app = FastAPI(
    title="Mock OCR API",
    description="模拟 OCR 服务，用于开发测试",
    version="1.0.0"
)

# 添加 CORS 支持
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# 后台任务
# ============================================================================

async def cleanup_expired_tasks():
    """定期清理过期的任务缓存"""
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL)

        current_time = time.time()
        expired_tasks = [
            task_id for task_id, data in task_cache.items()
            if current_time > data['expires_at']
        ]

        for task_id in expired_tasks:
            del task_cache[task_id]
            print(f"[Cleanup] Removed expired task: {task_id}")

        if expired_tasks:
            print(f"[Cleanup] Cleaned up {len(expired_tasks)} expired tasks")

@app.on_event("startup")
async def startup_event():
    """服务启动时执行"""
    print("=" * 80)
    print("Mock OCR Service Starting...")
    print(f"Server: http://{args.host}:{args.port}")
    print(f"Cache Duration: {CACHE_DURATION} seconds")
    print(f"Cleanup Interval: {CLEANUP_INTERVAL} seconds")
    print("=" * 80)

    # 启动清理任务
    asyncio.create_task(cleanup_expired_tasks())

# ============================================================================
# API 端点
# ============================================================================

@app.websocket("/ws/ocr")
async def websocket_ocr(websocket: WebSocket):
    """WebSocket 端点 - 模拟 OCR 处理"""
    await websocket.accept()

    task_id = None  # 先初始化为 None

    try:
        # 接收任务参数
        data = await websocket.receive_json()

        # 使用前端传来的 task_id，如果没有则生成一个
        task_id = data.get('task_id') or generate_task_id()

        image_base64 = data.get('image')
        prompt_type = data.get('prompt_type', 'Free OCR')
        model_size = data.get('model_size', 'Gundam (Recommended)')

        print(f"[{task_id}] New request: {prompt_type}, {model_size}")

        # 验证图片（可选）
        try:
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            image_size = image.size
            print(f"[{task_id}] Image size: {image_size[0]}x{image_size[1]}")
        except Exception as e:
            print(f"[{task_id}] Failed to decode image: {e}")
            await websocket.send_json({
                'type': 'error',
                'error': f'Failed to decode image: {str(e)}'
            })
            return

        # 发送状态消息
        await websocket.send_json({
            'type': 'status',
            'message': '🔍 验证输入...'
        })
        await asyncio.sleep(0.3)

        await websocket.send_json({
            'type': 'status',
            'message': f'📦 已接收图片: {image_size[0]}x{image_size[1]}'
        })
        await asyncio.sleep(0.3)

        await websocket.send_json({
            'type': 'status',
            'message': f'🚀 提交到处理队列 (模式: {model_size})...'
        })
        await asyncio.sleep(0.3)

        # 标记为处理中
        active_requests[task_id] = {
            'status': 'processing',
            'start_time': time.time()
        }

        await websocket.send_json({
            'type': 'status',
            'message': '⏳ 等待 Worker 处理...'
        })

        # 模拟处理时间（2-5秒）
        process_time = random.uniform(2.0, 5.0)

        # 分段发送处理进度
        chunk_count = random.randint(3, 6)
        for i in range(chunk_count):
            await asyncio.sleep(process_time / chunk_count)
            # 这里可以发送部分结果（流式输出）
            # 为了简单，我们跳过

        # 生成最终结果
        result_text = generate_random_text()
        worker_id = random.randint(0, 7)  # 模拟 8 个 worker
        inference_time = process_time

        # 保存到缓存（10分钟）
        current_time = time.time()
        task_cache[task_id] = {
            'result': result_text,
            'inference_time': inference_time,
            'worker_id': worker_id,
            'status': 'completed',
            'created_at': current_time,
            'expires_at': current_time + CACHE_DURATION
        }

        # 从处理列表移除
        if task_id in active_requests:
            del active_requests[task_id]

        # 发送完成消息
        await websocket.send_json({
            'type': 'complete',
            'result': result_text,
            'inference_time': inference_time,
            'worker_id': worker_id
        })

        print(f"[{task_id}] ✅ Completed in {inference_time:.2f}s by worker {worker_id}")

    except WebSocketDisconnect:
        if task_id:
            print(f"[{task_id}] Client disconnected")
        else:
            print("[unknown] Client disconnected before sending task_id")
        if task_id and task_id in active_requests:
            del active_requests[task_id]
    except Exception as e:
        if task_id:
            print(f"[{task_id}] Error: {e}")
        else:
            print(f"[unknown] Error: {e}")
        try:
            await websocket.send_json({
                'type': 'error',
                'error': str(e)
            })
        except:
            pass
        if task_id and task_id in active_requests:
            del active_requests[task_id]

@app.get("/api/ocr/task/{task_id}")
async def get_task_status(task_id: str):
    """查询任务状态和结果"""

    # 1. 检查缓存中是否有结果
    if task_id in task_cache:
        data = task_cache[task_id]
        expires_in = int(data['expires_at'] - time.time())

        return JSONResponse({
            "status": data["status"],
            "result": data.get("result"),
            "inference_time": data.get("inference_time"),
            "worker_id": data.get("worker_id"),
            "expires_in": max(0, expires_in),  # 不返回负数
            "created_at": datetime.fromtimestamp(data["created_at"]).isoformat()
        })

    # 2. 检查是否还在处理中
    if task_id in active_requests:
        return JSONResponse({
            "status": "processing",
            "expires_in": None
        })

    # 3. 任务不存在或已过期
    return JSONResponse({
        "status": "not_found",
        "error": "Task not found or expired"
    }, status_code=404)

@app.get("/health")
async def health_check():
    """健康检查"""
    return JSONResponse({
        "status": "healthy",
        "workers": 8,  # 模拟 8 个 worker
        "active_requests": len(active_requests),
        "cached_tasks": len(task_cache),
        "timestamp": datetime.now().isoformat()
    })

@app.get("/stats")
async def get_stats():
    """获取服务器统计信息"""
    return JSONResponse({
        "active_requests": len(active_requests),
        "cached_tasks": len(task_cache),
        "cache_duration": CACHE_DURATION,
        "cleanup_interval": CLEANUP_INTERVAL,
        "timestamp": datetime.now().isoformat()
    })

@app.get("/")
async def root():
    """根路径 - 返回服务信息"""
    return JSONResponse({
        "service": "Mock OCR API",
        "version": "1.0.0",
        "description": "模拟 OCR 服务，用于开发测试（无需 GPU）",
        "endpoints": {
            "websocket": "ws://localhost:8000/ws/ocr",
            "query_task": "GET /api/ocr/task/{task_id}",
            "health": "GET /health",
            "stats": "GET /stats"
        }
    })

# ============================================================================
# 主程序
# ============================================================================

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("🚀 Starting Mock OCR Service...")
    print(f"📍 Server will run on http://{args.host}:{args.port}")
    print(f"💾 Cache duration: {CACHE_DURATION} seconds")
    print(f"🧹 Cleanup interval: {CLEANUP_INTERVAL} seconds")
    print("=" * 80 + "\n")

    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level="info"
    )
