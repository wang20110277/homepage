# 工作台系统

集成多种实用工具的一站式工作平台，为您提供 PPT 生成、OCR 文字识别、企业信息查询等强大功能。

## 🚀 核心功能

- **🎤 PPT 生成器**: 智能生成专业演示文稿，支持多种模板和自定义设置
- **🔍 OCR 文字识别**: 高精度图片文字识别，支持多种文档类型和输出格式
- **🏢 企业信息查询**: 快速查询企业工商信息，生成专业尽调报告
- **📋 个人工作台**: Todo 待办事项、日历视图、系统公告等实用功能
- **🔐 用户认证**: Better Auth with Google OAuth 集成
- **🎨 现代 UI**: shadcn/ui 组件库 + Tailwind CSS 4
- **⚡ 技术栈**: Next.js 15, React 19, TypeScript
- **📱 响应式设计**: 完美支持桌面端和移动端

## 📋 系统要求

Before you begin, ensure you have the following installed on your machine:

- **Node.js**: Version 18.0 or higher (<a href="https://nodejs.org/" target="_blank">Download here</a>)
- **Git**: For cloning the repository (<a href="https://git-scm.com/" target="_blank">Download here</a>)
- **PostgreSQL**: Either locally installed or access to a hosted service like Vercel Postgres

## 🛠️ Quick Setup

### Automated Setup (Recommended)

Get started with a single command:

```bash
npx create-agentic-app@latest my-app
cd my-app
```

Or create in the current directory:

```bash
npx create-agentic-app@latest .
```

The CLI will:
- Copy all boilerplate files
- Install dependencies with your preferred package manager (pnpm/npm/yarn)
- Set up your environment file

**Next steps after running the command:**

1. Update `.env` with your API keys and database credentials
2. Start the database: `docker compose up -d`
3. Run migrations: `npm run db:migrate`
4. Start dev server: `npm run dev`

### Manual Setup (Alternative)

If you prefer to set up manually:

**1. Clone or Download the Repository**

**Option A: Clone with Git**

```bash
git clone https://github.com/leonvanzyl/agentic-coding-starter-kit.git
cd agentic-coding-starter-kit
```

**Option B: Download ZIP**
Download the repository as a ZIP file and extract it to your desired location.

**2. Install Dependencies**

```bash
npm install
```

**3. Environment Setup**

Copy the example environment file:

```bash
cp env.example .env
```

Fill in your environment variables in the `.env` file:

```env
# Database
POSTGRES_URL="postgresql://username:password@localhost:5432/your_database_name"

# Authentication - Better Auth
BETTER_AUTH_SECRET="your-random-32-character-secret-key-here"

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Integration via OpenRouter (Optional - for chat functionality)
# Get your API key from: https://openrouter.ai/settings/keys
# View available models at: https://openrouter.ai/models
OPENROUTER_API_KEY="sk-or-v1-your-openrouter-api-key-here"
OPENROUTER_MODEL="openai/gpt-5-mini"

# App URL (for production deployments)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**4. Database Setup**

Generate and run database migrations:

```bash
npm run db:generate
npm run db:migrate
```

**5. Start the Development Server**

```bash
npm run dev
```

Your application will be available at [http://localhost:3000](http://localhost:3000)

## ⚙️ Service Configuration

### PostgreSQL Database on Vercel

1. Go to <a href="https://vercel.com/dashboard" target="_blank">Vercel Dashboard</a>
2. Navigate to the **Storage** tab
3. Click **Create** → **Postgres**
4. Choose your database name and region
5. Copy the `POSTGRES_URL` from the `.env.local` tab
6. Add it to your `.env` file

### Google OAuth Credentials

1. Go to <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>
2. Create a new project or select an existing one
3. Navigate to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Set application type to **Web application**
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Copy the **Client ID** and **Client Secret** to your `.env` file

### OpenRouter API Key

1. Go to <a href="https://openrouter.ai/" target="_blank">OpenRouter</a>
2. Sign up or log in to your account
3. Navigate to **Settings** → **Keys** or visit <a href="https://openrouter.ai/settings/keys" target="_blank">Keys Settings</a>
4. Click **Create Key** and give it a name
5. Copy the API key and add it to your `.env` file as `OPENROUTER_API_KEY`
6. Browse available models at <a href="https://openrouter.ai/models" target="_blank">OpenRouter Models</a>

## 🗂️ 项目结构

```
src/
├── app/                          # Next.js 应用目录
│   ├── api/                     # API 路由
│   │   └── auth/                # 认证端点
│   ├── dashboard/               # 个人工作台
│   ├── tools/                   # 工具页面
│   │   ├── ppt-generator/       # PPT 生成器
│   │   ├── ocr/                 # OCR 识别工具
│   │   └── tianyancha/          # 天眼查企业查询
│   └── page.tsx                 # 首页
├── components/                   # React 组件
│   ├── auth/                    # 认证组件
│   ├── dashboard/               # 工作台组件
│   │   ├── digital-clock.tsx    # 数字时钟
│   │   ├── todo-list.tsx        # 待办事项列表
│   │   ├── calendar-view.tsx    # 日历视图
│   │   ├── announcement-board.tsx # 公告栏
│   │   └── tool-cards.tsx       # 工具卡片
│   ├── tools/                   # 工具组件
│   │   ├── file-upload.tsx      # 文件上传
│   │   ├── image-upload.tsx     # 图片上传
│   │   ├── company-info-card.tsx # 企业信息卡片
│   │   └── ...                  # 其他工具组件
│   └── ui/                      # shadcn/ui 组件
├── lib/                         # 工具库和配置
│   ├── auth.ts                  # Better Auth 配置
│   ├── auth-client.ts           # 客户端认证工具
│   ├── db.ts                    # 数据库连接
│   ├── schema.ts                # 数据库模式
│   ├── mock-data.ts             # Mock 数据
│   └── utils.ts                 # 通用工具函数
└── types/                       # TypeScript 类型定义
    └── index.ts                 # 全局类型
```

## 🔧 可用命令

```bash
npm run dev          # 启动开发服务器（Turbopack）
npm run build        # 生产环境构建
npm run start        # 启动生产服务器
npm run lint         # 运行 ESLint 代码检查
npm run typecheck    # TypeScript 类型检查
npm run db:generate  # 生成数据库迁移
npm run db:migrate   # 运行数据库迁移
npm run db:push      # 推送 schema 变更到数据库
npm run db:studio    # 打开 Drizzle Studio（数据库 GUI）
npm run db:dev       # 开发环境推送 schema
npm run db:reset     # 重置数据库（删除所有表）
```

## 📖 页面概览

- **首页 (`/`)**: 欢迎页面，介绍系统功能和特性
- **工作台 (`/dashboard`)**: 个人工作台，包含 Todo、日历、公告栏和工具入口
- **PPT 生成器 (`/tools/ppt-generator`)**: 智能 PPT 生成工具，支持模板选择和自定义设置
- **OCR 识别 (`/tools/ocr`)**: 图片文字识别工具，支持多种识别模式和模型
- **企业查询 (`/tools/tianyancha`)**: 企业工商信息查询和尽调报告生成

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Install the Vercel CLI globally:

   ```bash
   npm install -g vercel
   ```

2. Deploy your application:

   ```bash
   vercel --prod
   ```

3. Follow the prompts to configure your deployment
4. Add your environment variables when prompted or via the Vercel dashboard

### 生产环境变量

确保在生产环境中设置以下变量：

- `POSTGRES_URL` - 生产环境 PostgreSQL 连接字符串
- `BETTER_AUTH_SECRET` - 安全的 32+ 字符随机密钥
- `GOOGLE_CLIENT_ID` - Google OAuth 客户端 ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth 客户端密钥
- `NEXT_PUBLIC_APP_URL` - 生产环境域名

## 🎯 技术特性

### 前端技术
- **Next.js 15** with App Router
- **React 19** with Server Components
- **TypeScript** 严格类型检查
- **Tailwind CSS 4** 现代化样式系统
- **shadcn/ui** 高质量 UI 组件库

### 数据管理
- **PostgreSQL** 数据库
- **Drizzle ORM** 类型安全的数据库操作
- **Mock 数据** 前端开发时使用

### 用户体验
- **响应式设计** 完美适配各种设备
- **暗色模式** 支持明暗主题切换
- **流畅动画** 自定义过渡效果
- **无障碍支持** 符合 WCAG 标准

## 📝 开发说明

当前项目处于前端演示阶段，使用 Mock 数据模拟后端功能：

- **Todo 管理**: 使用本地状态管理
- **PPT 生成**: 模拟生成过程和结果
- **OCR 识别**: 返回预设的识别结果
- **企业查询**: 从 Mock 数据中匹配企业信息

后续可以集成真实的后端服务：
- 添加 RESTful API 或 GraphQL
- 集成 OCR 服务（如 Tesseract.js、云 OCR）
- 集成企业查询 API
- 集成 PPT 生成库（如 pptxgenjs）

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

**开发愉快! 🚀**
