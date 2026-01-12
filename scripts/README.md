# Presenton API Direct Test Script

这是一个直接调用 Presenton 服务 API 的测试脚本，用于验证 PPT 生成接口是否正常工作。

**注意**：此脚本**绕过项目的 BFF 层**，直接向 Presenton 服务发送请求。

## 使用方法

### 方式1：使用 npm script（推荐）

```bash
# 使用默认测试内容和页数（8页）
pnpm test:ppt

# 自定义内容和页数
pnpm test:ppt "你的演示主题" 10
```

### 方式2：直接运行脚本

```bash
# 使用默认测试内容
pnpm tsx scripts/test-ppt-generation.ts

# 自定义内容
pnpm tsx scripts/test-ppt-generation.ts "你的演示主题"

# 自定义内容和页数
pnpm tsx scripts/test-ppt-generation.ts "你的演示主题" 10
```

## 参数说明

- **第一个参数**: PPT 主题内容（字符串）
  - 如果不提供，使用默认的 AI 技术主题
  - 最少 10 个字符，最多 50000 个字符

- **第二个参数**: 页数（数字）
  - 如果不提供，默认为 8 页
  - 范围：1-50 页

## 示例

```bash
# 示例1：生成一个关于 React 的 10 页 PPT
pnpm test:ppt "创建一个关于 React 框架的演示文稿，包括基础概念、Hooks、性能优化等内容" 10

# 示例2：生成一个关于产品介绍的 15 页 PPT
pnpm test:ppt "公司新产品发布会，介绍产品特点、市场分析、竞争优势" 15

# 示例3：生成一个简短的 5 页 PPT
pnpm test:ppt "团队周会总结，本周工作进展和下周计划" 5
```

## 前置条件

**配置环境变量**

在 `.env` 文件中配置 Presenton 服务地址：

```bash
# Presenton 服务配置（必填）
PRESENTON_BASE_URL=http://your-presenton-service:5000

# Presenton API Key（可选，如果服务需要认证）
PRESENTON_API_KEY=your-api-key-here
```

**注意**：
- ✅ **不需要**启动开发服务器（`pnpm dev`）
- ✅ **只需要** Presenton 服务在运行

## 脚本发送的请求

### 请求详情

```
POST {PRESENTON_BASE_URL}/v1/ppt/generate

Headers:
  Content-Type: application/json
  Authorization: Bearer {PRESENTON_API_KEY}  # 如果配置了

Body:
{
  "content": "你的演示内容",
  "n_slides": 8,
  "language": "Chinese (Simplified - 中文, 汉语)",
  "template": "general",
  "export_as": "pptx"
}
```

### 预期响应

```json
{
  "url": "http://presenton.example.com/download/xxx.pptx"
}
```

或相对路径：

```json
{
  "url": "/static/user_data/xxx/presentation.pptx"
}
```

## 脚本功能

脚本会自动：
1. ✅ 从 `.env` 加载 Presenton 配置
2. ✅ 验证环境变量是否配置
3. ✅ 发送 POST 请求到 Presenton API
4. ✅ 显示详细的请求信息（URL、Headers、Body）
5. ✅ 显示详细的响应信息（Status、Headers、Body）
6. ✅ 显示生成时间（响应耗时）
7. ✅ 显示下载链接（成功时）
8. ✅ 自动处理相对路径和绝对路径
9. ✅ 显示错误详情和故障排查提示（失败时）

## 输出示例

### 成功示例

```
🚀 Presenton API Direct Test
============================================================
🌐 Presenton URL: http://presenton.example.com:5000
🔑 API Key: ✅ Configured
📝 Content: 创建一个关于人工智能技术的演示文稿，包括以下内容：...
📄 Slides: 8
🌍 Language: Chinese (Simplified - 中文, 汉语)
📋 Template: general
📦 Export: pptx
============================================================

📤 Request Body:
{
  "content": "创建一个关于人工智能技术的演示文稿...",
  "n_slides": 8,
  "language": "Chinese (Simplified - 中文, 汉语)",
  "template": "general",
  "export_as": "pptx"
}

🎯 Target URL: http://presenton.example.com:5000/v1/ppt/generate

⏳ Sending request to Presenton...

✅ Response received in 12345ms (12.35s)
📊 Status: 200 OK
📄 Content-Type: application/json

📥 Response Body (JSON):
{
  "url": "/static/user_data/xxx/presentation.pptx"
}

============================================================
✨ PPT Generation Successful!
============================================================
⬇️  Download URL: /static/user_data/xxx/presentation.pptx
🔗 Full URL: http://presenton.example.com:5000/static/user_data/xxx/presentation.pptx
============================================================
```

### 失败示例

```
❌ PPT Generation Failed!
============================================================
🚫 HTTP Status: 400 Bad Request
💬 Error: {
  "detail": "Content is too short"
}
============================================================
```

## 故障排查

### 问题1：PRESENTON_BASE_URL 未配置

```
❌ Error: PRESENTON_BASE_URL is not configured
```

**解决**：在 `.env` 文件中添加：
```bash
PRESENTON_BASE_URL=http://your-presenton-service:5000
```

---

### 问题2：ECONNREFUSED (连接被拒绝)

```
❌ Error: connect ECONNREFUSED 127.0.0.1:5000
```

**原因**：Presenton 服务未运行或地址错误

**解决**：
1. 确认 Presenton 服务是否正在运行
2. 检查 `PRESENTON_BASE_URL` 地址是否正确
3. 检查端口是否正确
4. 检查防火墙设置

---

### 问题3：ENOTFOUND (域名无法解析)

```
❌ Error: getaddrinfo ENOTFOUND presenton.example.com
```

**原因**：域名无法解析

**解决**：
1. 检查域名拼写是否正确
2. 确认 DNS 配置是否正确
3. 尝试使用 IP 地址代替域名

---

### 问题4：401 Unauthorized

```
📊 Status: 401 Unauthorized
```

**原因**：需要 API Key 或 API Key 错误

**解决**：在 `.env` 文件中添加或更新：
```bash
PRESENTON_API_KEY=your-correct-api-key
```

---

### 问题5：400 Bad Request

```
📊 Status: 400 Bad Request
💬 Detail: { "error": "Invalid request body" }
```

**原因**：请求参数不符合 Presenton API 要求

**解决**：
1. 检查内容长度（至少 10 个字符）
2. 检查页数范围（1-50）
3. 查看响应体中的错误详情

---

### 问题5：504 Gateway Timeout

```
📊 Status: 504 Gateway Timeout
```

**原因**：Presenton 处理时间过长

**解决**：
1. 检查 Presenton 服务状态
2. 尝试减少页数
3. 检查 Presenton 服务器资源

## 技术细节

### 固定参数

脚本会自动设置以下参数（无法修改）：

- **语言**: `"Chinese (Simplified - 中文, 汉语)"`
- **模板**: `"general"`
- **导出格式**: `"pptx"`

### API 端点

- **同步生成**: `POST /v1/ppt/generate`
- **响应格式**: `{ "url": "download_url" }`

### 相关文件

- 测试脚本: `scripts/test-ppt-generation.ts`
- 服务层实现: `src/lib/services/presenton.ts`
- BFF 路由: `src/app/api/ppt/generate/route.ts`

## 与 BFF 层的区别

| 特性 | 直接调用 Presenton | 通过 BFF 层 |
|------|-------------------|-------------|
| **URL** | `{PRESENTON_BASE_URL}/v1/ppt/generate` | `{APP_URL}/api/ppt/generate` |
| **认证** | Presenton API Key | Better Auth Session |
| **响应格式** | `{ url: string }` | `ApiResponse<GeneratePptResponse>` |
| **错误处理** | Presenton 原始错误 | 标准化 BFF 错误格式 |
| **日志** | 无 | 包含 traceId 和完整日志 |
| **优点** | 直接测试 Presenton | 完整的错误处理和日志 |
