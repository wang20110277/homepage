项目背景

我已经写好了一个统一前端：

技术栈：Next.js（App Router）+ TypeScript + TailwindCSS + shadcn/ui

已有的页面模块（大致）：

/ppt：PPT 生成页面

/ocr：OCR 识别页面

/tianyancha: 企业信息查询

/tools：自定义工具区域（后续会扩展更多工具）

后端服务现状：

已部署一个 Presenton 服务，用来生成 PPT，提供 HTTP API（典型为 POST /api/v1/ppt/presentation/generate）。

之后会陆续接别的服务，比如：OCR（目前是 Gradio 框架）、我自研的其他服务等。

目标：在前端和这些后端服务之间，设计并实现一个 BFF 层（Backend For Frontend），现在先从 Presenton 接入做起，之后可以平滑扩展到其他服务。

核心目标

把 BFF 做进 Next.js 的 /app/api/** 路由中，前端页面只请求自己域名的 /api/...，不直接调用各个后端服务。

封装一层 “服务客户端”，比如 lib/services/presenton.ts，以后新增 ocr.ts、myTool.ts 时可以复用相同模式。

统一：

响应格式（success/data/error）

错误处理

鉴权（预留）

日志 & traceId（预留，先打基础）

为以后扩容和接更多服务留好扩展点，不要写死在某一处。

具体要求
1. 目录结构（建议 + 实现）

请你先给出一个合理的项目结构建议，并直接生成相应的代码/文件骨架，例如：

app/api/ 下的路由：

app/api/ppt/generate/route.ts → BFF：接收前端请求，调用 Presenton

（预留）app/api/ocr/extract-text/route.ts

（预留）app/api/tools/[toolId]/route.ts

app/api/jobs/[id]/route.ts → 用于任务查询（后面可以用于异步任务）

lib/services/ 下的服务客户端：

lib/services/presenton.ts → 封装调用 Presenton 的逻辑

（预留）lib/services/ocr.ts

（预留）lib/services/myTool.ts

lib/core/ 或类似目录放通用基础设施：

lib/core/httpClient.ts → 封装 fetch，统一超时、错误处理、traceId header 等

lib/core/apiResponse.ts → 定义统一响应类型 ApiResponse<T>

lib/core/logger.ts → 日志封装（哪怕现在只是 console.log）

lib/core/auth.ts → 鉴权相关的封装（解析 token / user 信息的函数）


2. 统一响应格式 & 错误处理

设计一个通用的响应类型：

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    detail?: any;
  };
  traceId?: string;
};


所有 app/api/**/route.ts 的返回都用这个结构。

请实现一个辅助函数，比如 ok(data) 和 fail(code, message, detail?)，方便在 BFF 里快速返回。

BFF 在调用下游服务（Presenton、OCR 等）时，如果失败：

将 HTTP 错误或异常转换为统一 error 对象；

在日志中记录原始错误（traceId + 下游返回内容）。

3. Presenton BFF 接入的示例实现

以 Presenton 为例，请你完整写出一套代码，用来展示 BFF 设计模式，包括：

lib/services/presenton.ts：

从环境变量中读取：PRESENTON_BASE_URL

暴露一个函数：

export async function generatePpt(input: {
  content: string;
  n_slides: number;
  language: string;
  template?: string;
  export_as?: string;
}): Promise<GeneratePptResult>


内部使用 httpClient 封装去调用 POST /api/v1/ppt/presentation/generate

对返回结果做类型定义和基本校验

app/api/ppt/generate/route.ts：

POST 接口

接收前端传递的 JSON body（与上面的 input 对应）

做基本的参数校验（可以用 zod 或手写，简化也可以）

调用 generatePpt

使用统一的 ApiResponse 格式返回

在 header 中包含一个 traceId（可选）

如果方便，请顺带示例一个 “job 模型” 的雏形：

即使目前是同步调用，也可以示例一个简单的 jobId 生成 & 内存存储结构，给后续扩展异步任务留一个模式。

4. 鉴权 / 认证服务的预留

目前可以先假设：

前端会通过某种方式（例如 Cookie / Authorization header）携带一个 token（比如 JWT）。

将来会有一个独立的认证服务/用户系统来颁发和校验 token。

请你帮我在 BFF 层预留这些能力：

在 lib/core/auth.ts 中：

写一个 getUserFromRequest(request: NextRequest): User | null 的骨架。

内部暂时可以假装从 Header 中拿一个 x-mock-user 或解析一个简单 token。

给出注释说明，将来如何接入真正的认证服务（例如：调用 Auth 服务、校验 JWT、公钥验证等）。

在 app/api/**/route.ts 中：

示例如何在路由中调用 getUserFromRequest，以及如何在未登录时返回 401。

请注意：

鉴权逻辑应该是“可插拔的”，不要写死在某个特定 API 中，可以考虑抽一个小的辅助函数，比如 withAuth(handler)。

5. 日志 & traceId 设计

希望在 BFF 层预留出比较规范的日志和 traceId 机制：

在 lib/core/logger.ts 中：

实现一个简单的 logger，支持：

logInfo(traceId, message, meta?)

logError(traceId, message, meta?)

现在可以简单用 console.log，但请在设计上考虑将来可以替换成像 pino/winston 之类的库。

在 lib/core/httpClient.ts 中：

每次发起请求时：

接收一个可选的 traceId 参数；

在 header 中附带 X-Trace-Id；

请求前/后打日志（包含 URL、方法、状态码、耗时）。

在 API 路由中：

如果请求头中已有 X-Trace-Id 就复用，否则生成一个新的 traceId。

把 traceId 传给 service 和 httpClient。

在返回的 JSON 中也带上 traceId 字段。

