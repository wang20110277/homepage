本项目是一个基于 **Next.js 15** 的现代化全栈应用，集成了多种企业级工具和服务。本页面详细说明项目的技术选型、核心依赖以及目录组织结构，帮助开发者快速理解项目架构。

## 技术栈概览

### 核心框架

| 层级 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| 前端框架 | **Next.js** | 15.4.6 | 采用 App Router 架构，支持 React Server Components |
| UI 库 | **React** | 19.1.0 | 使用最新 React 19 的并发特性 |
| 样式方案 | **Tailwind CSS** | 4.1.16 | 采用 Tailwind v4 配置式 CSS |
| 状态管理 | **Zustand** | 5.0.8 | 轻量级状态管理库 |
| 数据获取 | **TanStack Query** | 5.90.10 | 服务端状态管理与缓存 |

### 数据库与 ORM

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| 数据库 | **PostgreSQL** (pgvector) | 集成向量搜索能力 |
| ORM | **Drizzle ORM** | 0.44.7，轻量级 TypeScript ORM |
| 迁移工具 | **Drizzle Kit** | 数据库 schema 管理和迁移 |
| SQLite | **better-sqlite3** | 用于本地开发或轻量级存储 |

数据库配置通过 `POSTGRES_URL` 环境变量连接 PostgreSQL 实例。Drizzle 配置指定了 schema 路径为 `./src/lib/schema.ts`，迁移输出目录为 `./drizzle`。

```typescript
// drizzle.config.ts
export default {
  dialect: "postgresql",
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
} satisfies Config;
```

Sources: [drizzle.config.ts](drizzle.config.ts#L1-L11)

### 认证系统

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| 认证框架 | **Better Auth** | 1.3.34，开源认证解决方案 |
| OAuth 提供商 | **Microsoft Entra ID / ADFS** | 支持企业 SSO |
| JWT 处理 | **jose** | JWT 编解码库 |

Better Auth 提供完整的认证流程，通过 `[...all]/route.ts` 暴露 GET/POST 处理器。认证支持 Microsoft Entra ID 和 ADFS 两种 OIDC 提供商，通过 `OIDC_PROVIDER` 环境变量切换。

Sources: [src/app/api/auth/[...all]/route.ts](src/app/api/auth/[...all]/route.ts#L1-L4)
Sources: [src/lib/auth.ts](src/lib/auth.ts#L1-L20)

### AI 与流式处理

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| AI SDK | **Vercel AI SDK** | 5.0.86，支持流式响应 |
| 模型提供商 | **OpenAI / OpenRouter** | 多模型支持 |
| AI 界面 | **Open WebUI** | 自托管 AI 聊天界面 |
| Markdown 渲染 | **react-markdown** | 10.1.0 |

项目通过 `ai` SDK 实现流式聊天功能，支持 OpenAI 和 OpenRouter 两种模型提供商。Open WebUI 集成允许用户访问自托管的 AI 模型。

Sources: [package.json](package.json#L25-L27)

### UI 组件库

项目基于 **Radix UI** 原语构建自定义组件，配合 **Tailwind CSS** 实现样式：

| 组件 | 来源 | 说明 |
|------|------|------|
| 对话框 | @radix-ui/react-dialog | 模态框组件 |
| 下拉菜单 | @radix-ui/react-dropdown-menu | 导航菜单 |
| 选择器 | @radix-ui/react-select | 下拉选择 |
| 标签页 | @radix-ui/react-tabs | 页面切换 |
| 提示 | Sonner | Toast 通知 |
| 动画 | **Motion** | 12.23.24，动画库 |

Sources: [package.json](package.json#L29-L50)

## 目录结构详解

```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/               # API 路由 (BFF 层)
│   ├── dashboard/        # 工作台页面
│   ├── home/             # 首页
│   ├── login/            # 登录页
│   ├── tools/            # 工具页面集合
│   └── unauthorized/      # 无权限页面
├── components/            # React 组件
│   ├── auth/             # 认证相关组件
│   ├── dashboard/        # 工作台组件
│   ├── open-webui/       # AI 聊天界面组件
│   ├── tools/            # 工具组件
│   ├── ui/               # 设计系统基础组件
│   └── widgets/          # 可复用小部件
├── lib/                   # 核心业务逻辑
│   ├── api/              # API 客户端封装
│   ├── core/             # 核心基础设施
│   ├── services/         # 外部服务集成
│   ├── auth.ts           # Better Auth 配置
│   ├── schema.ts         # Drizzle 数据库 Schema
│   └── rbac.ts           # 权限管理逻辑
├── hooks/                # React 自定义 Hooks
├── contexts/            # React Context
├── config/               # 应用配置
├── types/                # TypeScript 类型定义
└── middleware.ts         # 请求中间件
```

### App Router 架构

`app/` 目录采用 Next.js 15 的 App Router 架构，每个子目录代表一个路由段：

- **`/api/`**: BFF (Backend-for-Frontend) 层，处理前端请求并聚合后端服务
- **`/dashboard/`**: 用户工作台，包含租户设置和用户访问管理
- **`/tools/`**: 工具页面集合，包括 PPT 生成器、OCR 识别、企业查询等

全局布局在 `layout.tsx` 中定义，包含主题提供者、站点头部、底部以及动画背景组件。

Sources: [src/app/layout.tsx](src/app/layout.tsx#L1-L54)

### 组件分层设计

```
components/
├── ui/           # 原子级组件 (Button, Input, Card)
├── auth/         # 认证组件 (SignInButton, UserProfile)
├── dashboard/    # 业务组件 (TodoList, CalendarView)
├── open-webui/   # AI 聊天组件 (ChatWorkspace, MessageBubble)
├── tools/        # 工具组件 (FileUpload, ImageUpload)
└── widgets/      # 可组合小部件 (AnnouncementsWidget)
```

组件采用原子设计原则：`ui/` 目录包含最小化可复用组件，业务逻辑组件按功能域划分。

Sources: [get_dir_structure](src/components)

### 核心库分层

`lib/` 目录按照关注点分离原则组织：

| 目录 | 职责 |
|------|------|
| `core/` | 基础设施：HTTP 客户端、日志、链路追踪、作业管理 |
| `services/` | 外部服务：OCR、天眼查、Open WebUI、PPT 生成 |
| `api/` | API 封装：文件对比、AI 模型调用 |
| `open-webui/` | 流式处理工具函数 |

```typescript
// lib/core/http-client.ts 提供的统一 HTTP 请求能力
export class HttpClient {
  constructor(options: HttpClientOptions)
  async request<T>(path: string, options?: HttpRequestOptions): Promise<T>
}
```

Sources: [src/lib/core/http-client.ts](src/lib/core/http-client.ts#L1-L60)

### 数据库 Schema 设计

`schema.ts` 定义了完整的数据库模型：

```mermaid
erDiagram
    TENANTS ||--o{ USER : "租户-用户"
    USER ||--o{ SESSION : "用户会话"
    USER ||--o{ ACCOUNT : "OAuth账户"
    USER ||--o{ USER_ROLES : "用户角色"
    ROLES ||--o{ USER_ROLES : "角色分配"
    ROLES ||--o{ ROLE_PERMISSIONS : "角色权限"
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "权限定义"
```

核心表包括：`tenants` (多租户支持)、`user` (用户信息)、`session` (会话管理)、`roles` / `permissions` (RBAC 权限模型)。

Sources: [src/lib/schema.ts](src/lib/schema.ts#L1-L100)

## 环境配置

### 必需环境变量

```bash
# 数据库
POSTGRES_URL=postgresql://user:pass@localhost:5432/db

# Microsoft Entra ID OAuth
ENTRA_CLIENT_ID=
ENTRA_CLIENT_SECRET=
ENTRA_TENANT_ID=common

# ADFS OAuth (二选一)
ADFS_CLIENT_ID=
ADFS_CLIENT_SECRET=
ADFS_TOKEN_URL=

# Open WebUI
OPEN_WEBUI_URL=http://localhost:3001
OPEN_WEBUI_API_KEY=
```

Sources: [env.example](env.example)

### 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 (Turbo 模式) |
| `pnpm build` | 构建生产版本 |
| `pnpm db:migrate` | 执行数据库迁移 |
| `pnpm db:seed` | 填充初始数据 |
| `pnpm db:studio` | 打开 Drizzle Studio |
| `pnpm test` | 运行 Vitest 测试 |

Sources: [package.json](package.json#L7-L17)

## 核心技术特性

### 1. 多租户架构

通过 `tenants` 表实现多租户隔离，每个租户拥有独立的：
- 用户列表
- 角色与权限配置
- 功能开关 (`features` JSON 字段)

租户配置支持 OIDC 自定义，允许不同租户使用不同的身份提供商。

### 2. RBAC 权限模型

完整的基于角色的访问控制实现：

```mermaid
graph LR
    User --> UserRoles
    UserRoles --> Roles
    Roles --> RolePermissions
    RolePermissions --> Permissions
```

权限粒度控制到资源 + 操作级别，支持资源包括：`ppt`、`ocr`、`tianyancha`、`qualityCheck`、`fileCompare`、`zimage`。

### 3. 流式响应处理

通过 Vercel AI SDK 实现 AI 响应的流式传输，配合 Open WebUI 代理实现无缝的聊天体验。流式数据通过 `stream-utils.ts` 中的工具函数处理。

### 4. 中间件认证

`middleware.ts` 实现了统一的请求拦截：

- 公开路径 (`/`, `/login`, `/api/auth`) 无需认证
- 受保护路径无会话时：
  - API 路由返回 401 JSON 错误
  - 页面路由重定向到首页

Sources: [src/middleware.ts](src/middleware.ts#L1-L36)

## 快速导航

完成本页面后，建议按以下顺序继续阅读：

1. **[BFF 认证模式](4-bff-ren-zheng-mo-shi)** — 深入了解前后端认证流程和数据流
2. **[Better Auth 配置](7-better-auth-pei-zhi)** — 掌握认证系统的配置细节
3. **[数据库模式设计](10-shu-ju-ku-mo-shi-she-ji)** — 了解完整的数据模型设计