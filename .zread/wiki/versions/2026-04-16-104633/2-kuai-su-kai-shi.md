本文档为初次接触本项目的开发者提供完整的本地开发环境搭建指南。通过本文，你将了解如何配置环境变量、启动数据库服务，以及运行应用程序。

---

## 项目概述

本项目是一个基于 **Next.js 15** 和 **React 19** 构建的企业级工作台系统，集成了 PPT 生成、OCR 识别、企业信息查询等多种 AI 能力。系统采用 **Better Auth** 实现 OAuth 2.0 认证，支持 Microsoft Entra ID 和 ADFS 两种身份提供商，并基于 PostgreSQL + Drizzle ORM 构建了完整的多租户 RBAC 权限体系。

Sources: [CLAUDE.md](CLAUDE.md#L1-L20)

---

## 环境准备

### 前置要求

| 工具 | 版本要求 | 安装说明 |
|------|----------|----------|
| Node.js | ≥20.x | [官网下载](https://nodejs.org/) |
| pnpm | ≥8.x | `npm install -g pnpm` |
| Docker | ≥24.x | [官网下载](https://www.docker.com/) |

Sources: [package.json](package.json#L1-L20)

### 1. 克隆项目

```bash
git clone <repository-url>
cd homepage2
pnpm install
```

Sources: [CLAUDE.md](CLAUDE.md#L15-L17)

### 2. 启动 PostgreSQL 数据库

项目使用 Docker Compose 管理数据库服务：

```bash
docker-compose up -d
```

这将启动一个 PostgreSQL 18 实例，监听 `5432` 端口。

Sources: [docker-compose.yml](docker-compose.yml#L1-L10)

### 3. 配置环境变量

从示例文件复制配置模板：

```bash
cp env.example .env.local
```

编辑 `.env.local` 文件，填入以下必填项：

```env
# 数据库连接（默认与 docker-compose 保持一致）
POSTGRES_URL=postgresql://dev_user:dev_password@localhost:5432/postgres_dev

# 认证密钥（32位以上随机字符串）
BETTER_AUTH_SECRET=your-super-secret-key-at-least-32-chars

# 应用 URL（开发环境使用本地地址）
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OIDC 提供商（entra 或 adfs）
OIDC_PROVIDER=entra
NEXT_PUBLIC_OIDC_PROVIDER=entra
```

> **提示**：本地离线开发时，系统会自动创建管理员账户。设置以下环境变量即可通过邮箱密码登录：
> ```env
> LOCAL_ADMIN_EMAIL=admin@local.dev
> LOCAL_ADMIN_PASSWORD=ChangeMe123!
> LOCAL_ADMIN_NAME=Offline Admin
> ```

Sources: [env.example](env.example#L1-L25), [src/lib/rbac-init.ts](src/lib/rbac-init.ts#L120-L140)

---

## 初始化数据库

### 1. 推送数据库模式

首次运行时，需要将 TypeScript Schema 同步到数据库：

```bash
pnpm db:push
```

这会创建所有表结构，包括 tenants、user、roles、permissions 等核心表。

Sources: [CLAUDE.md](CLAUDE.md#L22-L24)

### 2. 初始化种子数据

运行数据库填充脚本，创建默认租户、角色和权限：

```bash
pnpm db:seed
```

系统会自动创建以下基础数据：

| 数据类型 | 说明 |
|----------|------|
| default 租户 | 系统默认租户 |
| admin 角色 | 管理员角色（拥有所有权限） |
| user 角色 | 普通用户角色 |
| viewer 角色 | 只读访问角色 |

Sources: [src/lib/rbac-init.ts](src/lib/rbac-init.ts#L30-L60)

---

## 启动开发服务器

### 开发模式

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可看到登录页面。

Sources: [CLAUDE.md](CLAUDE.md#L15-L17)

### 构建生产版本

```bash
pnpm build
```

> **注意**：`build` 命令会自动执行 `pnpm db:migrate`，确保数据库迁移文件已应用。

Sources: [CLAUDE.md](CLAUDE.md#L18-L20)

---

## 项目架构总览

```mermaid
flowchart TB
    subgraph Client["前端 (Next.js 15)"]
        Landing["登录页 /"]
        Dashboard["工作台 /dashboard"]
        Tools["工具页面 /tools/*"]
    end

    subgraph Auth["认证层 (Better Auth)"]
        Middleware["中间件"]
        OAuth["OAuth 2.0 Provider<br/>Entra ID / ADFS"]
    end

    subgraph API["API 层"]
        AuthAPI["/api/auth/*"]
        PPTAPI["/api/ppt/*"]
        OCRAPI["/api/ocr/*"]
        OpenWebUI["/api/open-webui/*"]
    end

    subgraph Database["数据层 (PostgreSQL + Drizzle)"]
        Users["用户表"]
        Tenants["租户表"]
        Roles["角色表"]
        Permissions["权限表"]
    end

    subgraph Services["外部服务"]
        Presenton["Presenton 服务<br/>PPT 生成"]
        DeepseekOCR["Deepseek OCR<br/>文字识别"]
        OpenWebUIService["Open WebUI<br/>AI 对话"]
    end

    Client -->|OAuth 跳转| Auth
    Auth --> Middleware
    Middleware -->|验证会话| Dashboard
    Dashboard -->|调用| API
    Tools -->|调用| API
    API --> Database
    API -->|HTTP| Services
```

Sources: [CLAUDE.md](CLAUDE.md#L40-L70)

---

## 认证流程详解

```mermaid
sequenceDiagram
    participant User as 用户
    participant App as Next.js App
    participant OAuth as OAuth Provider<br/>Entra ID / ADFS
    participant DB as PostgreSQL

    User->>App: 访问受保护页面
    App->>App: 检查 Session Token
    App-->>User: 重定向到登录页
    User->>App: 点击"立即体验"
    App->>OAuth: 发起 OAuth 授权请求
    OAuth-->>User: 显示登录界面
    User->>OAuth: 完成身份验证
    OAuth->>App: 回调 + Authorization Code
    App->>OAuth: 交换 Access Token
    OAuth-->>App: 返回 Token + 用户信息
    App->>DB: 创建/更新用户记录
    App->>DB: 同步用户角色
    App-->>User: 登录成功，跳转主页
```

### 认证中间件逻辑

系统通过 `src/middleware.ts` 实现路由保护：

```mermaid
flowchart LR
    Request["请求"] --> Check{"检查 Session"}
    Check -->|有 Token| Public{"公共路径?"}
    Check -->|无 Token| API{"API 路由?"}
    API -->|是| Return401["返回 401"]
    API -->|否| Redirect["重定向首页"]
    Public -->|是| Pass["继续处理"]
    Public -->|否| Redirect
```

Sources: [src/middleware.ts](src/middleware.ts#L1-L36)

---

## 数据库连接配置

系统使用 `postgres-js` 驱动（注意：不是 `pg`）：

```mermaid
flowchart LR
    Config["drizzle.config.ts"] -->|schema| Schema["src/lib/schema.ts"]
    Config -->|connection| DB["src/lib/db.ts"]
    DB -->|连接池| Postgres[("PostgreSQL")]
    
    subgraph PoolConfig["连接池配置"]
        MaxConn["max: 50"]
        IdleTimeout["idle_timeout: 60s"]
        MaxLifetime["max_lifetime: 30min"]
    end
```

Sources: [drizzle.config.ts](drizzle.config.ts#L1-L11), [src/lib/db.ts](src/lib/db.ts#L15-L35)

---

## 常见问题排查

### 数据库连接失败

```
Error: Invalid POSTGRES_URL format
```

**解决方案**：检查 `.env.local` 中的 `POSTGRES_URL` 格式是否正确：

```env
# 正确格式
POSTGRES_URL=postgresql://dev_user:dev_password@localhost:5432/postgres_dev
```

Sources: [src/lib/db.ts](src/lib/db.ts#L10-L20)

### OAuth 配置错误

确保 OAuth Provider 配置与环境变量匹配：

| Provider | 关键环境变量 |
|----------|-------------|
| Microsoft Entra ID | `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `ENTRA_TENANT_ID` |
| ADFS | `ADFS_AUTHORIZATION_URL`, `ADFS_TOKEN_URL`, `ADFS_USERINFO_URL` |

Sources: [env.example](env.example#L20-L40)

### 权限问题

首次登录后若无法访问某些功能，检查：

1. 用户是否分配了对应角色（通过 `user_roles` 表）
2. 租户是否启用了相应功能（通过 `tenants.features` 字段）

Sources: [CLAUDE.md](CLAUDE.md#L50-L75)

---

## 下一步

完成环境搭建后，建议按以下顺序阅读文档：

1. [项目概述](1-xiang-mu-gai-shu) - 深入了解项目功能与技术选型
2. [技术栈与目录结构](3-ji-zhu-zhan-yu-mu-lu-jie-gou) - 掌握代码组织方式
3. [Better Auth 配置](7-better-auth-pei-zhi) - 学习认证系统配置

---

## 开发者命令速查表

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm db:push` | 同步 Schema 到数据库（开发用） |
| `pnpm db:migrate` | 应用迁移文件 |
| `pnpm db:seed` | 填充种子数据 |
| `pnpm db:studio` | 打开 Drizzle 数据库管理工具 |
| `pnpm lint` | 运行 ESLint 检查 |
| `pnpm typecheck` | 运行 TypeScript 类型检查 |
| `pnpm test` | 运行 Vitest 测试 |