# OCR HTTPS 配置说明

## 当前配置

本项目的 OCR 服务已配置为**直接使用 HTTPS**，无需通过 Next.js API 代理。

### 架构

```
浏览器 (HTTPS) --[WSS]--> OCR 服务 (HTTPS/WSS)
✅ 直连，最佳性能
```

### 配置要求

#### 环境变量 (`.env`)

```bash
# OCR Service - 使用 HTTPS 协议
NEXT_PUBLIC_OCR_SERVICE_URL=https://your-ocr-server-ip:8443

# 如果使用自签名证书，需要禁用 Node.js 的 SSL 验证（仅开发环境）
NODE_TLS_REJECT_UNAUTHORIZED=0
```

#### OCR 服务端配置

OCR 服务需要使用 SSL 证书启动：

```bash
# 生成自签名证书（内网环境）
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -days 365 \
  -subj "/CN=your-server-ip" \
  -addext "subjectAltName=IP:your-server-ip,IP:127.0.0.1"

# 启动 HTTPS OCR 服务
python scripts/fastapi_ocr_server_real.py \
  --port 8443 \
  --host 0.0.0.0 \
  --ssl-keyfile ./certs/key.pem \
  --ssl-certfile ./certs/cert.pem
```

### 前端实现

前端代码会自动根据 `NEXT_PUBLIC_OCR_SERVICE_URL` 的协议选择连接方式：

- `http://...` → 使用 WebSocket (`ws://`)
- `https://...` → 使用 WebSocket Secure (`wss://`)

```typescript
// src/app/tools/ocr/client-page.tsx
const wsUrl = OCR_SERVICE_URL.replace(/^http/, 'ws').replace(/^https/, 'wss') + '/ws/ocr';
const ws = new WebSocket(wsUrl);
```

### 测试验证

```bash
# 测试 OCR 服务是否正常
curl -k https://your-server-ip:8443/health

# 应返回：
# {"status":"healthy","workers":8,...}
```

### 证书信任（可选）

如果不想使用 `NODE_TLS_REJECT_UNAUTHORIZED=0`，可以将自签名证书添加到系统信任列表：

**Linux:**
```bash
# Ubuntu/Debian
sudo cp certs/cert.pem /usr/local/share/ca-certificates/ocr-server.crt
sudo update-ca-certificates

# CentOS/RHEL
sudo cp certs/cert.pem /etc/pki/ca-trust/source/anchors/ocr-server.crt
sudo update-ca-trust
```

**Windows:**
```powershell
# 以管理员身份运行
certutil -addstore -enterprise -f "Root" cert.pem
```

### 故障排查

**问题 1：前端连接失败**
- 检查环境变量是否正确：`NEXT_PUBLIC_OCR_SERVICE_URL=https://...`
- 检查 OCR 服务是否启动：`curl -k https://...8443/health`
- 查看浏览器控制台 WebSocket 连接错误

**问题 2：证书验证失败**
- 临时方案：设置 `NODE_TLS_REJECT_UNAUTHORIZED=0`
- 长期方案：安装证书到系统信任列表

**问题 3：WSS 连接被阻止**
- 确认 OCR 服务使用 HTTPS/WSS
- 检查防火墙是否放行 8443 端口
- 确认域名/IP 在证书的 SAN (Subject Alternative Name) 中

## 历史记录

- **2026-01-09**: 还原 Next.js API 代理方案，改为直接使用 HTTPS OCR 服务
- **2026-01-07**: 创建 Next.js API 代理方案（已废弃）
