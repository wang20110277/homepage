# 天眼查后端服务

这是一个独立的 Flask 服务，用于调用天眼查 API 生成企业尽调报告（Word 格式）。

## 目录结构

```
tianyan_server/
├── api.py                      # Flask 主程序
├── requirements.txt            # Python 依赖
├── README.md                   # 说明文档
├── temp_files/                 # 临时文件夹（运行时创建）
└── tianyanprocess/             # 天眼查处理模块
    ├── __init__.py
    ├── getBaseInfo.py          # 天眼查 API 调用
    ├── compressAllStuff.py     # 数据提取和处理
    ├── createReport.py         # Word 报告生成
    └── template.docx           # Word 模板文件
```

## 环境要求

- Python 3.8+
- pip

## 安装依赖

```bash
cd tianyan_server
pip install -r requirements.txt
```

## 配置

### 天眼查 API Token

默认 Token 硬编码在 `tianyanprocess/getBaseInfo.py` 文件中。如需更换，可以：

1. 修改 `tianyanprocess/getBaseInfo.py` 文件中的 `token` 变量
2. 或者设置环境变量 `TIANYAN_API_TOKEN`

```bash
# Windows
set TIANYAN_API_TOKEN=your_token_here

# Linux/Mac
export TIANYAN_API_TOKEN=your_token_here
```

## 启动服务

```bash
cd tianyan_server
python api.py
```

服务将在 `http://127.0.0.1:5000` 启动。

### 生产环境部署

推荐使用 gunicorn：

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 api:app
```

## API 接口

### 生成报告

**POST** `/api/generate_report`

请求体：
```json
{
  "company_name": "企业名称"
}
```

响应：
- 成功：返回 Word 文件（`.docx`）
- 失败：返回 JSON 错误信息

示例：
```bash
curl -X POST http://127.0.0.1:5000/api/generate_report \
  -H "Content-Type: application/json" \
  -d '{"company_name": "阿里巴巴"}' \
  --output report.docx
```

### 健康检查

**GET** `/api/health`

响应：
```json
{
  "status": "ok",
  "message": "天眼查API服务运行正常"
}
```

## 与前端集成

前端通过环境变量 `NEXT_PUBLIC_TIANYAN_SERVICE_URL` 配置服务地址。

在 `.env` 文件中配置：
```
TIANYAN_SERVICE_URL=http://127.0.0.1:5000
NEXT_PUBLIC_TIANYAN_SERVICE_URL=http://127.0.0.1:5000
```

## 注意事项

1. **API 费用**：调用天眼查 API 会消耗账户余额，请注意控制调用频率
2. **临时文件**：生成的临时文件会在 30 秒后自动清理
3. **并发支持**：服务支持多线程并发请求
4. **跨域**：如需支持跨域请求，请在 `api.py` 中添加 CORS 配置
