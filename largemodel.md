# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

工作台系统 - 基于 Next.js 15 的企业级工作平台，集成 Open WebUI 聊天、PPT 生成 (Presenton)、OCR 文字识别 (Deepseek)、质量检查巡检，以及支持多租户 RBAC 和双提供商认证 (ADFS/Entra ID)。

## 技术栈

- **框架**: Next.js 15 (App Router), React 19, TypeScript
- **认证**: Better Auth with OIDC (ADFS/Entra ID)
- **数据库**: PostgreSQL (Drizzle ORM) + SQLite (Open WebUI 同步)
- **AI 集成**: Open WebUI (通过统一 API 进行聊天补全)
- **UI**: shadcn/ui with Tailwind CSS 4, 暗色模式 (next-themes)
- **包管理器**: pnpm

## 关键命令

### 开发工作流
```bash
pnpm install              # 安装依赖
pnpm dev                  # 启动开发服务器（不要自己运行 - 需要时询问用户）
pnpm build                # 生产环境构建（包含 db:migrate）
pnpm start                # 启动生产服务器
```

### 代码质量（更改后务必运行）
```bash
pnpm lint                 # ESLint 检查
pnpm typecheck            # TypeScript 类型验证
pnpm lint && pnpm typecheck  # 同时运行两者（推荐）
```

### 数据库操作
```bash
pnpm db:generate          # 从 schema 变更生成迁移
pnpm db:migrate           # 应用迁移到数据库
pnpm db:push              # 推送 schema 到数据库（仅开发环境 - 跳过迁移）
pnpm db:studio            # 打开 Drizzle Studio GUI
pnpm db:reset             # 删除所有表（破坏性操作）
pnpm test:ppt             # 测试 PPT 生成服务
```

## 架构概述

### 三数据库策略

**PostgreSQL（主应用数据库）**
- 多租户架构 with RBAC
- 用户认证和会话管理
- Open WebUI 的用户 API 密钥存储 (`user.openwebuiApiKey`)
- OAuth 账户元数据和声明缓存
- 位置: `src/lib/db.ts`, schema: `src/lib/schema.ts`

**SQLite (Open WebUI 集成)**
- 从 Open WebUI 嵌入式数据库只读同步
- 单向同步: SQLite → PostgreSQL，首次登录时
- 延迟加载单例模式
- 位置: `src/lib/webui-db.ts`, 文件: `webui.db`

**PostgreSQL（巡检数据库 - 质量检查）**
- 质量检查/巡检模块的独立数据库
- 包含 `collectionAuditResults` 表和审计数据
- 通过 `inspectionDb` 实例访问
- 位置: `src/lib/inspection-db.ts`
- 环境变量: `INSPECTION_POSTGRES_URL`

### 多层认证系统

**第 1 层: Better Auth 配置** (`src/lib/auth.ts`)
- OIDC 提供商: ADFS (Active Directory) + Entra (Azure AD)
- ADFS 的 ID token 声明缓存（拦截 token 交换）
- 声明映射和角色提取与规范化
- 自动创建缺失的角色，同步用户角色到数据库

**第 2 层: BFF 认证中间件** (`src/lib/core/bff-auth.ts`)
- `getUserFromRequest()` - 用租户上下文、角色丰富用户信息
- `withAuth()` - 带基于角色的访问控制的路由装饰器
- `withOptionalAuth()` - 可选认证变体
- 登录时自动同步声明和 WebUI API 密钥

**第 3 层: RBAC 系统** (`src/lib/rbac.ts`)
- 资源:action 权限模型
- 租户功能标志
- 授权快照（每个请求缓存）

### Presenton PPT 生成服务

**服务层** (`src/lib/services/presenton.ts`)
- 同步生成: `generatePpt()` - 直接生成 PPT 并返回下载 URL
- 异步生成: `generatePptAsync()` - 返回 taskId 用于轮询
- 状态检查: `checkGenerationStatus()` - 轮询异步任务进度
- 模板: `getTemplates()`, `getTemplateById()`
- 文件上传: `uploadFile()` - 上传演示文稿资源
- 导出: `exportPresentation()` - 导出为 PPTX 或 PDF
- 自定义错误: `PresentonServiceError`

**BFF 路由** (`src/app/api/ppt/`)
- `/generate` - PPT 生成（通过 `async` 布尔值控制同步/异步）
- `/status/[taskId]` - 检查异步生成状态
- `/templates` - 列出可用模板
- `/files/upload` - 上传文件资源
- `/presentations` - 列出用户演示文稿
- `/presentations/[id]` - 获取演示文稿详情
- `/presentations/[id]/export` - 导出演示文稿
- `/download` - 代理 HTTP 下载以避免混合内容问题

**关键配置:**
- 语言硬编码: "Chinese (Simplified - 中文, 汉语)"
- 导出格式硬编码: "pptx"
- 模板硬编码: "general"
- 超时时间: 10 分钟 (600s) 用于图片生成

### Deepseek OCR 服务

**服务层** (`src/lib/services/deepseek-ocr.ts`)
- 识别: `recognizeImage()` - 通过聊天补全进行 OCR
- 健康检查: `checkDeepseekOcrHealth()`
- 自定义错误: `DeepseekOcrServiceError`

**请求格式:**
```typescript
{
  model: "Deepseek-OCR",
  messages: [{
    role: "user",
    content: [
      { type: "image_url", image_url: { url: "data:image/png;base64,..." } },
      { type: "text", text: "Convert the document to markdown" }
    ]
  }],
  temperature: 0.0,
  extra_body: {
    skip_special_tokens: false,
    vllm_xargs: {
      ngram_size: 30,
      window_size: 90,
      whitelist_token_ids: [128821, 128822]
    }
  }
}
```

**BFF 路由** (`src/app/api/ocr/`)
- `/recognize` - POST 请求，参数: `{ image: base64, prompt?: string }`

### Open WebUI 集成（5 层架构）

**第 1 层: Token 管理** (`src/lib/services/user-tokens.ts`)
```
3 级回退策略:
1. 用户个人 API 密钥 (user.openwebuiApiKey)
2. 共享服务 token (OPEN_WEBUI_SERVICE_TOKEN)
3. 用户的 OIDC access token (account.accessToken)
```

**第 2 层: 用户同步服务** (`src/lib/services/sync-webui-user.ts`)
- 登录时从 SQLite 提取用户 API 密钥
- 存储到 PostgreSQL 供将来使用
- 非阻塞、容错

**第 3 层: HTTP 客户端** (`src/lib/openWebuiClient.ts`)
- 熔断器模式（3 次失败，15s 冷却）
- 指数退避重试策略
- 超时管理（默认 30s，流式 120s）
- 支持 SSE 流式传输

**第 4 层: 服务层** (`src/lib/services/open-webui.ts`)
- 数据规范化（处理多种 OpenWebUI 格式）
- Zod 验证 schema
- 历史记录树遍历（父子关系）
- 模型元数据缓存（每用户 30s TTL）

**第 5 层: BFF 路由** (`src/app/api/open-webui/`)
- `/chats` - 列出和创建聊天
- `/chats/[chatId]` - 读取、更新、删除
- `/chats/[chatId]/messages` - 流式消息补全

### 消息流式传输流程

```
1. 从 OpenWebUI 提取聊天历史（树结构）
2. 构建线性对话上下文
3. 从 OpenWebUI 流式补全 (POST /api/chat/completions)
4. 代理 SSE 数据块到客户端
5. 用新消息重建历史树
6. 从第一条消息自动生成标题（如果是默认标题）
7. POST 更新的历史回 OpenWebUI
8. 在最后的 SSE 数据块中发送完整聊天
```

### 核心基础设施

**请求追踪** (`src/lib/core/trace.ts`)
- 从 X-Trace-Id header 生成/提取 traceId
- 传播到所有服务调用

**日志记录** (`src/lib/core/logger.ts`)
- `logInfo()`, `logError()`, `logWarn()`
- 在所有日志中包含 traceId

**HTTP 客户端** (`src/lib/core/http-client.ts`)
- 带超时管理的通用客户端
- Trace ID 传播
- Content-type 检测

**API 响应** (`src/lib/core/api-response.ts`)
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; detail?: unknown };
  traceId?: string;
}
```

## 环境变量

必需配置（完整列表见 `env.example`）:

```bash
# 数据库
POSTGRES_URL=postgresql://user:pass@localhost:5432/db

# Better Auth
BETTER_AUTH_SECRET=32字符随机字符串
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OIDC 提供商 (adfs 或 entra)
OIDC_PROVIDER=entra
NEXT_PUBLIC_OIDC_PROVIDER=entra

# Azure Entra ID
ENTRA_CLIENT_ID=your-client-id
ENTRA_CLIENT_SECRET=your-client-secret
ENTRA_TENANT_ID=your-tenant-id

# ADFS
ADFS_CLIENT_ID=your-client-id
ADFS_CLIENT_SECRET=your-client-secret
ADFS_AUTHORIZATION_URL=https://adfs.example.com/adfs/oauth2/authorize
ADFS_TOKEN_URL=https://adfs.example.com/adfs/oauth2/token
ADFS_USERINFO_URL=https://adfs.example.com/adfs/userinfo

# 角色映射 (JSON)
ENTRA_ROLE_MAPPINGS={"Global Admin":"admin","User":"user"}
ADFS_ROLE_MAPPINGS={"CN=Admins,OU=Groups,DC=company,DC=com":"admin"}

# Open WebUI 集成
OPEN_WEBUI_BASE_URL=https://gpt.luckybruce.com
OPEN_WEBUI_SERVICE_TOKEN=optional-shared-token
OPEN_WEBUI_API_KEY=optional-api-key
OPEN_WEBUI_TIMEOUT=30000
OPEN_WEBUI_COMPLETION_TIMEOUT=120000

# Presenton PPT 生成
PRESENTON_BASE_URL=http://localhost:5000
PRESENTON_TIMEOUT=600000
PRESENTON_API_KEY=optional-api-key

# Deepseek OCR 服务
DEEPSEEK_OCR_BASE_URL=http://10.162.1.158:8088/v1
DEEPSEEK_OCR_API_KEY=test
DEEPSEEK_OCR_MODEL=Deepseek-OCR
DEEPSEEK_OCR_TIMEOUT=120000

# 巡检数据库（质量检查）
INSPECTION_POSTGRES_URL=postgresql://user:pass@localhost:5432/inspection
```

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/              # Better Auth catch-all
│   │   ├── open-webui/                 # Open WebUI BFF 路由
│   │   │   ├── chats/                  # 聊天 CRUD 操作
│   │   │   └── models/                 # 模型列表
│   │   ├── ppt/                        # Presenton PPT 服务
│   │   │   ├── generate/               # PPT 生成
│   │   │   ├── status/[taskId]/        # 异步状态检查
│   │   │   ├── templates/              # 模板列表
│   │   │   ├── files/upload/           # 文件上传
│   │   │   ├── presentations/          # 演示文稿 CRUD
│   │   │   └── download/               # HTTP→HTTPS 代理
│   │   ├── ocr/recognize/              # Deepseek OCR
│   │   ├── quality-check/              # 巡检查询
│   │   ├── users/                      # 用户管理
│   │   ├── tenants/                    # 租户管理
│   │   ├── chat/route.ts               # 遗留 OpenRouter 聊天
│   │   └── diagnostics/                # 系统诊断
│   ├── home/page.tsx                   # Open WebUI 聊天工作区
│   ├── dashboard/page.tsx              # 个人工作区
│   ├── tools/                          # 工具页面
│   │   ├── ppt-generator/              # PPT 生成工具
│   │   ├── ocr/                        # OCR 识别工具
│   │   ├── quality-check/              # 质量检查工具
│   │   ├── my-presentations/           # 用户演示文稿
│   │   └── tianyancha/                 # 企业查询（占位符）
│   └── page.tsx                        # 首页
├── components/
│   ├── open-webui/                     # Open WebUI 聊天组件
│   │   ├── chat-workspace.tsx          # 主聊天界面
│   │   ├── message-bubble.tsx          # 消息渲染
│   │   ├── markdown-components.tsx     # Markdown 渲染
│   │   └── chat-list.tsx               # 聊天侧边栏
│   ├── auth/                           # 认证组件
│   ├── dashboard/                      # 仪表板小组件
│   └── ui/                             # shadcn/ui 组件
├── lib/
│   ├── auth.ts                         # Better Auth 服务端配置
│   ├── auth-client.ts                  # Better Auth 客户端 hooks
│   ├── auth-utils.ts                   # 声明映射工具
│   ├── db.ts                           # 主 PostgreSQL 连接
│   ├── webui-db.ts                     # SQLite 连接 (Open WebUI)
│   ├── inspection-db.ts                # 巡检 PostgreSQL 连接
│   ├── schema.ts                       # Drizzle schema
│   ├── rbac.ts                         # RBAC 授权
│   ├── openWebuiClient.ts              # 带熔断器的 HTTP 客户端
│   ├── services/
│   │   ├── open-webui.ts               # Open WebUI 服务层
│   │   ├── presenton.ts                # Presenton PPT 服务
│   │   ├── deepseek-ocr.ts             # Deepseek OCR 服务
│   │   ├── user-tokens.ts              # Token 解析
│   │   └── sync-webui-user.ts          # WebUI 用户同步
│   └── core/                           # 核心基础设施
│       ├── bff-auth.ts                 # BFF 认证中间件
│       ├── api-response.ts             # 标准 API 响应
│       ├── http-client.ts              # 通用 HTTP 客户端
│       ├── logger.ts                   # 日志工具
│       └── trace.ts                    # 请求追踪
└── types/                              # TypeScript 类型
```

## 关键模式和最佳实践

### 认证流程

1. 用户点击"使用 ADFS/Entra 登录"
2. OAuth 重定向到 IdP → token 交换
3. ADFS: 拦截响应，缓存 ID token 声明
4. 合并 ID token + UserInfo，映射声明到用户
5. 在 PostgreSQL 中创建/更新用户
6. 提取角色，创建缺失的角色，同步 userRoles
7. 异步: 从 SQLite 同步 WebUI API 密钥（即发即忘）
8. 设置会话 cookie，重定向

### 受保护路由模式

```typescript
// Server Component
import { getUserFromRequest } from "@/lib/core/bff-auth";
import { headers } from "next/headers";

const user = await getUserFromRequest(await headers());
if (!user) redirect("/");
```

### BFF API 路由模式

```typescript
// src/app/api/[route]/route.ts
import { withAuth } from "@/lib/core/bff-auth";
import { ok, badRequest } from "@/lib/core/api-response";

async function handler(req: Request, { user, traceId }: BffContext) {
  // 用 Zod 验证请求
  // 调用服务层
  // 返回 ApiResponse
  return ok({ data: result }, traceId);
}

export const GET = withAuth(handler);
export const POST = withAuth(handler, { requireRoles: ["admin"] });
```

### 服务层模式

```typescript
// src/lib/services/[service].ts
import { getOpenWebuiAccessToken } from "./user-tokens";
import { openWebuiClient } from "../openWebuiClient";

export async function doSomething(userId: string, data: unknown) {
  const token = await getOpenWebuiAccessToken(userId);
  const response = await openWebuiClient.request({
    method: "POST",
    path: "/api/endpoint",
    token,
    body: data,
  });
  return normalizeResponse(response);
}
```

### 数据库 Schema 变更

1. 编辑 `src/lib/schema.ts`
2. 运行 `pnpm db:generate`（在 `drizzle/` 中创建迁移）
3. 检查生成的 SQL: `drizzle/[timestamp].sql`
4. 运行 `pnpm db:migrate`（应用迁移）
5. 仅开发环境: `pnpm db:push`（跳过迁移生成）

### 添加新的受保护路由

1. 在 `src/app/[route]/page.tsx` 创建 Server Component
2. 添加认证检查:
   ```typescript
   const user = await getUserFromRequest(await headers());
   if (!user) redirect("/");
   ```
3. 可选的角色检查:
   ```typescript
   const snapshot = await getAuthorizationSnapshot(user.id);
   if (!snapshot.permissions.has("resource:action")) {
     return <div>Forbidden</div>;
   }
   ```

### 添加新的 BFF 端点

1. 在 `src/app/api/[route]/route.ts` 创建
2. 从 `@/lib/core/bff-auth` 导入 `withAuth`
3. 用 Zod 定义请求/响应 schema
4. 创建处理函数，用 `withAuth` 包装
5. 导出 HTTP 方法: `export const GET = withAuth(handler);`

### 质量检查模式（多数据库）

```typescript
// src/app/api/quality-check/route.ts
import { withAuth } from "@/lib/core/bff-auth";
import { inspectionDb } from "@/lib/inspection-db";
import { collectionAuditResults } from "@/lib/schema";
import { eq, like, sql } from "drizzle-orm";

async function handler(req: Request, { traceId }: BffContext) {
  // 使用 inspectionDb 查询质量检查数据
  const records = await inspectionDb
    .select()
    .from(collectionAuditResults)
    .where(like(collectionAuditResults.collId, `%${queryValue}%`))
    .limit(10);

  return ok({ records }, traceId);
}

export const GET = withAuth(handler);
```

## 非显而易见的架构决策

### 为什么用三个数据库？
OpenWebUI 使用 SQLite 自包含聊天状态。应用需要 PostgreSQL 进行认证和 RBAC。质量检查模块使用独立的 PostgreSQL 实例进行隔离。解决方案: 登录时从 SQLite 只读同步到 PostgreSQL，为巡检数据使用独立的连接池。应用拥有认证，OpenWebUI 拥有聊天，质量检查拥有巡检。

### 为什么用 3 级 Token 回退？
不同的部署场景: 共享服务（所有用户使用单一 token）、每用户（从 WebUI 获取的 API 密钥）、仅 OAuth（使用 access token）。最大灵活性。

### 为什么非阻塞 WebUI 同步？
如果同步失败，不要阻塞登录。即发即忘的异步调用。用户可以没有 OpenWebUI key 继续操作，首次聊天尝试时才会报错。

### 为什么 ID Token 声明缓存（ADFS）？
ADFS 在 UserInfo 端点返回部分数据，在 ID token 中返回完整数据。在全局 fetch 级别拦截 token 交换以在 Better Auth 处理之前捕获 ID token。缓存、合并、清理。

### 为什么用历史树结构？
OpenWebUI 支持对话分支（探索替代路径）。历史对象中的父子链表。从 currentId 导航到 root 以构建线性对话。

### 为什么用熔断器？
OpenWebUI 在推理期间可能缓慢/不可靠。每路径状态，3 失败阈值，15s 冷却。防止级联失败。

### 为什么自动生成标题？
更好的 UX。如果标题是默认的（"New conversation"），从第一条用户消息生成（最多 50 字符）。仅在第一条消息时。

### 为什么下载代理（混合内容解决方案）？
当前端使用 HTTPS 但外部服务（Presenton、OCR）使用 HTTP 时，浏览器因混合内容策略阻止下载。解决方案: BFF 层自动检测 HTTP URL 并重写为通过 `/api/ppt/download?url=<encoded-url>` 代理。后端到后端 HTTP 调用正常工作，用户获得避免浏览器安全警告的 HTTPS 下载链接。

### 为什么 Deepseek OCR Ngram 配置？
Deepseek OCR 使用特定的 vLLM 参数以实现最佳文本识别: `ngram_size: 30`, `window_size: 90`, `whitelist_token_ids: [128821, 128822]`。这些使模型能够更好地识别中文文本模式并减少识别错误。在服务层硬编码以确保一致的结果。

## 关键开发规则

1. **更改后务必运行 `pnpm lint && pnpm typecheck`**
2. **永远不要自己启动开发服务器** - 需要时询问用户输出
3. **使用 pnpm，不是 npm** - 项目使用 pnpm-lock.yaml
4. **PostgreSQL 是主数据库** - SQLite 仅用于 WebUI 同步
5. **Better Auth 用于认证** - 服务端: `@/lib/auth`, 客户端: `@/lib/auth-client`
6. **路由使用 BFF 模式** - 使用 `withAuth()` 装饰器，返回 `ApiResponse<T>`
7. **服务层处理外部 API** - 路由调用服务，服务调用 HTTP 客户端
8. **Zod 用于验证** - 请求/响应 schema，用 `.parse()` 或 `.safeParse()` 解析
9. **追踪所有请求** - 在日志、响应中包含 traceId
10. **支持暗色模式** - 使用 Tailwind dark: 前缀，shadcn/ui tokens

## 常见开发任务

### 添加新的 BFF 服务（外部 API）
1. 在 `src/lib/services/[service].ts` 创建服务
2. 定义请求/响应接口
3. 创建扩展 Error 的自定义错误类
4. 使用 `createHttpClient()` 添加 HTTP 客户端
5. 实现带错误处理的服务方法
6. 在 `src/app/api/[service]/route.ts` 创建 BFF 路由
7. 在 `env.example` 添加环境变量

### 添加 RBAC 权限
1. 在 schema 的 `permissions` 表中添加
2. 运行迁移
3. 通过 `rolePermissions` 分配给角色
4. 在处理函数中检查: `snapshot.permissions.has("resource:action")`

### 添加租户功能标志
1. 在 schema 的 `tenants.features` 中添加布尔字段
2. 运行迁移
3. 在处理函数中检查: `snapshot.tenantFeatures.featureName`

### 添加 OpenWebUI 端点
1. 在 `src/lib/services/open-webui.ts` 添加方法
2. 在 `src/app/api/open-webui/[route]/route.ts` 创建 BFF 路由
3. 使用 `withAuth()`，通过 `getOpenWebuiAccessToken(user.id)` 获取 token
4. 调用服务方法，返回 `ApiResponse<T>`

### 调试认证问题
1. 检查 `account.claims` 中的声明（JSON 列）
2. 验证环境变量中的角色映射（JSON 格式）
3. 检查 `userRoles` 表中的角色分配
4. 在 Better Auth 配置中启用调试日志

### 处理 WebUI 同步失败
1. 检查项目根目录中是否存在 `webui.db`
2. 验证 SQLite 中是否存在用户: `SELECT * FROM user WHERE email = ?`
3. 检查用户是否有 API key: `SELECT api_key FROM user WHERE email = ?`
4. 手动同步: 调用 `trySyncOpenWebuiApiKey(userId, email)`

### 测试 Presenton PPT 生成
1. 运行测试脚本: `pnpm test:ppt`
2. 检查 Presenton 服务健康: `/health` 端点
3. 验证环境变量: `PRESENTON_BASE_URL`, `PRESENTON_API_KEY`
4. 测试少量内容的同步生成（1-2 张幻灯片）
5. 长时间生成使用异步模式: `{ async: true }`

### 测试 Deepseek OCR
1. 验证服务健康: 检查 `DEEPSEEK_OCR_BASE_URL` 可访问
2. 准备 base64 编码的图片（移除 `data:image/` 前缀）
3. 使用默认提示词或自定义提示词测试
4. 检查推理时间 - 应在 2 分钟内完成

## 样式指南

- 使用 Tailwind CSS 工具类
- 使用 shadcn/ui 颜色 tokens: `bg-background`, `text-foreground`, `bg-primary` 等
- 支持暗色模式: `dark:bg-gray-900`, `dark:text-white`
- 除非明确要求，避免自定义颜色
- 使用 shadcn/ui 组件: `Button`, `Card`, `Dialog` 等
- 遵循 `src/components/ui/` 中的现有组件模式

## 错误处理

- 所有 API 路由使用 `ApiResponse<T>` 格式
- 在响应中包含 traceId
- 使用 `logError(traceId, message, meta)` 记录错误
- 在服务层通过 `mapOpenWebuiError()` 映射 OpenWebUI 错误
- 返回用户友好的消息，记录技术细节
- 非阻塞操作（WebUI 同步）: 捕获、记录、继续

## 测试清单

- [ ] 运行 `pnpm lint` - 无 ESLint 错误
- [ ] 运行 `pnpm typecheck` - 无 TypeScript 错误
- [ ] 测试认证流程（登录、登出）
- [ ] 验证 RBAC 权限（尝试未授权访问）
- [ ] 测试 Open WebUI 集成（聊天、列出模型）
- [ ] 测试 PPT 生成（同步和异步模式）
- [ ] 测试 OCR 识别（各种图片类型）
- [ ] 测试质量检查查询（按不同字段搜索）
- [ ] 验证下载代理工作正常（HTTP→HTTPS）
- [ ] 检查数据库迁移（审查 SQL）
- [ ] 验证暗色模式支持（切换主题）
- [ ] 测试错误处理（无效输入、网络错误）

## 文档参考

- Better Auth: https://www.better-auth.com/docs
- Drizzle ORM: https://orm.drizzle.team/docs
- Next.js 15: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com/docs
- Open WebUI API: 检查 `OPEN_WEBUI_BASE_URL/docs`
