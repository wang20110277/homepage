# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

工作台系统 - A Next.js 15 enterprise workspace platform integrating Open WebUI chat, PPT generation (Presenton), OCR recognition (Deepseek), quality check inspections, and multi-tenant RBAC with dual-provider authentication (ADFS/Entra ID).

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Authentication**: Better Auth with OIDC (ADFS/Entra ID)
- **Databases**: PostgreSQL (Drizzle ORM) + SQLite (Open WebUI sync)
- **AI Integration**: Open WebUI (chat completions via unified API)
- **UI**: shadcn/ui with Tailwind CSS 4, dark mode (next-themes)
- **Package Manager**: pnpm

## Critical Commands

### Development Workflow
```bash
pnpm install              # Install dependencies
pnpm dev                  # Start dev server (DON'T run yourself - ask user)
pnpm build                # Production build (includes db:migrate)
pnpm start                # Start production server
```

### Code Quality (ALWAYS RUN AFTER CHANGES)
```bash
pnpm lint                 # ESLint check
pnpm typecheck            # TypeScript validation
pnpm lint && pnpm typecheck  # Run both (recommended)
```

### Database Operations
```bash
pnpm db:generate          # Generate migration from schema changes
pnpm db:migrate           # Apply migrations to database
pnpm db:push              # Push schema to DB (dev only - skips migrations)
pnpm db:studio            # Open Drizzle Studio GUI
pnpm db:reset             # Drop all tables (destructive)
pnpm test:ppt             # Test PPT generation service
```

## Architecture Overview

### Triple Database Strategy

**PostgreSQL (Primary Application Database)**
- Multi-tenant architecture with RBAC
- User authentication and session management
- User API key storage for Open WebUI (`user.openwebuiApiKey`)
- OAuth account metadata and claims caching
- Location: `src/lib/db.ts`, schema: `src/lib/schema.ts`

**SQLite (Open WebUI Integration)**
- Read-only sync from Open WebUI's embedded database
- One-way sync: SQLite → PostgreSQL on first login
- Lazy-loaded singleton pattern
- Location: `src/lib/webui-db.ts`, file: `webui.db`

**PostgreSQL (Inspection Database - Quality Check)**
- Separate database for quality check/inspection module
- Contains `collectionAuditResults` table with audit data
- Accessed via `inspectionDb` instance
- Location: `src/lib/inspection-db.ts`
- Environment: `INSPECTION_POSTGRES_URL`

### Multi-Layered Authentication System

**Layer 1: Better Auth Configuration** (`src/lib/auth.ts`)
- OIDC providers: ADFS (Active Directory) + Entra (Azure AD)
- ID token claims caching for ADFS (intercepts token exchange)
- Claims mapping with role extraction and normalization
- Auto-creates missing roles, syncs user roles to database

**Layer 2: BFF Auth Middleware** (`src/lib/core/bff-auth.ts`)
- `getUserFromRequest()` - Enriches user with tenant context, roles
- `withAuth()` - Route decorator with role-based access control
- `withOptionalAuth()` - Optional authentication variant
- Auto-syncs claims and WebUI API keys on login

**Layer 3: RBAC System** (`src/lib/rbac.ts`)
- Resource:action permission model
- Tenant feature flags
- Authorization snapshots (cached per request)

### Presenton PPT Generation Service

**Service Layer** (`src/lib/services/presenton.ts`)
- Sync generation: `generatePpt()` - Direct PPT generation with download URL
- Async generation: `generatePptAsync()` - Returns taskId for polling
- Status checking: `checkGenerationStatus()` - Poll async task progress
- Templates: `getTemplates()`, `getTemplateById()`
- File upload: `uploadFile()` - Upload assets for presentation
- Export: `exportPresentation()` - Export as PPTX or PDF
- Custom error: `PresentonServiceError`

**BFF Routes** (`src/app/api/ppt/`)
- `/generate` - PPT generation (sync/async via `async` boolean)
- `/status/[taskId]` - Check async generation status
- `/templates` - List available templates
- `/files/upload` - Upload file assets
- `/presentations` - List user presentations
- `/presentations/[id]` - Get presentation details
- `/presentations/[id]/export` - Export presentation
- `/download` - Proxy HTTP downloads to avoid mixed content

**Key Configuration:**
- Language hardcoded: "Chinese (Simplified - 中文, 汉语)"
- Export format hardcoded: "pptx"
- Template hardcoded: "general"
- Timeout: 10 minutes (600s) for image generation

### Deepseek OCR Service

**Service Layer** (`src/lib/services/deepseek-ocr.ts`)
- Recognition: `recognizeImage()` - OCR via chat completions
- Health check: `checkDeepseekOcrHealth()`
- Custom error: `DeepseekOcrServiceError`

**Request Format:**
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

**BFF Route** (`src/app/api/ocr/`)
- `/recognize` - POST with `{ image: base64, prompt?: string }`

### Open WebUI Integration (5-Tier Architecture)

**Tier 1: Token Management** (`src/lib/services/user-tokens.ts`)
```
3-Level Fallback Strategy:
1. User personal API key (user.openwebuiApiKey)
2. Shared service token (OPEN_WEBUI_SERVICE_TOKEN)
3. User's OIDC access token (account.accessToken)
```

**Tier 2: User Sync Service** (`src/lib/services/sync-webui-user.ts`)
- Extracts user API key from SQLite on login
- Stores in PostgreSQL for future use
- Non-blocking, error-tolerant

**Tier 3: HTTP Client** (`src/lib/openWebuiClient.ts`)
- Circuit breaker pattern (3 failures, 15s cooldown)
- Retry strategy with exponential backoff
- Timeout management (30s default, 120s streaming)
- Streaming support for SSE

**Tier 4: Service Layer** (`src/lib/services/open-webui.ts`)
- Data normalization (handles multiple OpenWebUI formats)
- Zod validation schemas
- History tree traversal (parent-child relationships)
- Model metadata caching (30s TTL per user)

**Tier 5: BFF Routes** (`src/app/api/open-webui/`)
- `/chats` - List & create chats
- `/chats/[chatId]` - Read, update, delete
- `/chats/[chatId]/messages` - Stream message completions

### Message Streaming Flow

```
1. Extract chat history from OpenWebUI (tree structure)
2. Build linear conversation context
3. Stream completion from OpenWebUI (POST /api/chat/completions)
4. Proxy SSE chunks to client
5. Rebuild history tree with new messages
6. Auto-generate title from first message (if default)
7. POST updated history back to OpenWebUI
8. Send complete chat in final SSE chunk
```

### Core Infrastructure

**Request Tracing** (`src/lib/core/trace.ts`)
- Generate/extract traceId from X-Trace-Id header
- Propagate through all service calls

**Logging** (`src/lib/core/logger.ts`)
- `logInfo()`, `logError()`, `logWarn()`
- Include traceId in all logs

**HTTP Client** (`src/lib/core/http-client.ts`)
- Generic client with timeout management
- Trace ID propagation
- Content-type detection

**API Response** (`src/lib/core/api-response.ts`)
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; detail?: unknown };
  traceId?: string;
}
```

## Environment Variables

Required configuration (see `env.example` for complete list):

```bash
# Database
POSTGRES_URL=postgresql://user:pass@localhost:5432/db

# Better Auth
BETTER_AUTH_SECRET=32-char-random-string
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OIDC Provider (adfs or entra)
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

# Role Mappings (JSON)
ENTRA_ROLE_MAPPINGS={"Global Admin":"admin","User":"user"}
ADFS_ROLE_MAPPINGS={"CN=Admins,OU=Groups,DC=company,DC=com":"admin"}

# Open WebUI Integration
OPEN_WEBUI_BASE_URL=https://gpt.luckybruce.com
OPEN_WEBUI_SERVICE_TOKEN=optional-shared-token
OPEN_WEBUI_API_KEY=optional-api-key
OPEN_WEBUI_TIMEOUT=30000
OPEN_WEBUI_COMPLETION_TIMEOUT=120000

# Presenton PPT Generation
PRESENTON_BASE_URL=http://localhost:5000
PRESENTON_TIMEOUT=600000
PRESENTON_API_KEY=optional-api-key

# Deepseek OCR Service
DEEPSEEK_OCR_BASE_URL=http://10.162.1.158:8088/v1
DEEPSEEK_OCR_API_KEY=test
DEEPSEEK_OCR_MODEL=Deepseek-OCR
DEEPSEEK_OCR_TIMEOUT=120000

# Inspection Database (Quality Check)
INSPECTION_POSTGRES_URL=postgresql://user:pass@localhost:5432/inspection
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/              # Better Auth catch-all
│   │   ├── open-webui/                 # Open WebUI BFF routes
│   │   │   ├── chats/                  # Chat CRUD operations
│   │   │   └── models/                 # Model listing
│   │   ├── ppt/                        # Presenton PPT service
│   │   │   ├── generate/               # PPT generation
│   │   │   ├── status/[taskId]/        # Async status check
│   │   │   ├── templates/              # Template listing
│   │   │   ├── files/upload/           # File upload
│   │   │   ├── presentations/          # Presentation CRUD
│   │   │   └── download/               # HTTP→HTTPS proxy
│   │   ├── ocr/recognize/              # Deepseek OCR
│   │   ├── quality-check/              # Inspection queries
│   │   ├── users/                      # User management
│   │   ├── tenants/                    # Tenant management
│   │   ├── chat/route.ts               # Legacy OpenRouter chat
│   │   └── diagnostics/                # System diagnostics
│   ├── home/page.tsx                   # Open WebUI chat workspace
│   ├── dashboard/page.tsx              # Personal workspace
│   ├── tools/                          # Tool pages
│   │   ├── ppt-generator/              # PPT generation tool
│   │   ├── ocr/                        # OCR recognition tool
│   │   ├── quality-check/              # Quality check tool
│   │   ├── my-presentations/           # User presentations
│   │   └── tianyancha/                 # Enterprise lookup (placeholder)
│   └── page.tsx                        # Landing page
├── components/
│   ├── open-webui/                     # Open WebUI chat components
│   │   ├── chat-workspace.tsx          # Main chat interface
│   │   ├── message-bubble.tsx          # Message rendering
│   │   ├── markdown-components.tsx     # Markdown rendering
│   │   └── chat-list.tsx               # Chat sidebar
│   ├── auth/                           # Auth components
│   ├── dashboard/                      # Dashboard widgets
│   └── ui/                             # shadcn/ui components
├── lib/
│   ├── auth.ts                         # Better Auth server config
│   ├── auth-client.ts                  # Better Auth client hooks
│   ├── auth-utils.ts                   # Claims mapping utilities
│   ├── db.ts                           # Primary PostgreSQL connection
│   ├── webui-db.ts                     # SQLite connection (Open WebUI)
│   ├── inspection-db.ts                # Inspection PostgreSQL connection
│   ├── schema.ts                       # Drizzle schema
│   ├── rbac.ts                         # RBAC authorization
│   ├── openWebuiClient.ts              # HTTP client with circuit breaker
│   ├── services/
│   │   ├── open-webui.ts               # Open WebUI service layer
│   │   ├── presenton.ts                # Presenton PPT service
│   │   ├── deepseek-ocr.ts             # Deepseek OCR service
│   │   ├── user-tokens.ts              # Token resolution
│   │   └── sync-webui-user.ts          # WebUI user sync
│   └── core/                           # Core infrastructure
│       ├── bff-auth.ts                 # BFF auth middleware
│       ├── api-response.ts             # Standard API responses
│       ├── http-client.ts              # Generic HTTP client
│       ├── logger.ts                   # Logging utilities
│       └── trace.ts                    # Request tracing
└── types/                              # TypeScript types
```

## Key Patterns and Practices

### Authentication Flow

1. User clicks "Login with ADFS/Entra"
2. OAuth redirect to IdP → token exchange
3. ADFS: Intercept response, cache ID token claims
4. Merge ID token + UserInfo, map claims to user
5. Create/update user in PostgreSQL
6. Extract roles, create missing roles, sync userRoles
7. Async: Sync WebUI API key from SQLite (fire-and-forget)
8. Set session cookie, redirect

### Protected Route Pattern

```typescript
// Server Component
import { getUserFromRequest } from "@/lib/core/bff-auth";
import { headers } from "next/headers";

const user = await getUserFromRequest(await headers());
if (!user) redirect("/");
```

### BFF API Route Pattern

```typescript
// src/app/api/[route]/route.ts
import { withAuth } from "@/lib/core/bff-auth";
import { ok, badRequest } from "@/lib/core/api-response";

async function handler(req: Request, { user, traceId }: BffContext) {
  // Validate request with Zod
  // Call service layer
  // Return ApiResponse
  return ok({ data: result }, traceId);
}

export const GET = withAuth(handler);
export const POST = withAuth(handler, { requireRoles: ["admin"] });
```

### Service Layer Pattern

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

### Database Schema Changes

1. Edit `src/lib/schema.ts`
2. Run `pnpm db:generate` (creates migration in `drizzle/`)
3. Review generated SQL in `drizzle/[timestamp].sql`
4. Run `pnpm db:migrate` (applies migration)
5. For dev only: `pnpm db:push` (skip migration generation)

### Adding New Protected Route

1. Create Server Component in `src/app/[route]/page.tsx`
2. Add authentication check:
   ```typescript
   const user = await getUserFromRequest(await headers());
   if (!user) redirect("/");
   ```
3. Optionally check roles:
   ```typescript
   const snapshot = await getAuthorizationSnapshot(user.id);
   if (!snapshot.permissions.has("resource:action")) {
     return <div>Forbidden</div>;
   }
   ```

### Adding New BFF Endpoint

1. Create in `src/app/api/[route]/route.ts`
2. Import `withAuth` from `@/lib/core/bff-auth`
3. Define request/response schemas with Zod
4. Create handler function, wrap with `withAuth`
5. Export HTTP methods: `export const GET = withAuth(handler);`

### Quality Check Pattern (Multi-Database)

```typescript
// src/app/api/quality-check/route.ts
import { withAuth } from "@/lib/core/bff-auth";
import { inspectionDb } from "@/lib/inspection-db";
import { collectionAuditResults } from "@/lib/schema";
import { eq, like, sql } from "drizzle-orm";

async function handler(req: Request, { traceId }: BffContext) {
  // Use inspectionDb for quality check data
  const records = await inspectionDb
    .select()
    .from(collectionAuditResults)
    .where(like(collectionAuditResults.collId, `%${queryValue}%`))
    .limit(10);

  return ok({ records }, traceId);
}

export const GET = withAuth(handler);
```

## Non-Obvious Architectural Decisions

### Why Triple Databases?
OpenWebUI is self-contained with SQLite for chat state. The app needs PostgreSQL for auth and RBAC. Quality check module uses a separate PostgreSQL instance for isolation. Solutions: Read-only sync from SQLite → PostgreSQL on login, separate connection pool for inspection data. App owns auth, OpenWebUI owns chat, Quality check owns inspection.

### Why 3-Level Token Fallback?
Different deployment scenarios: shared service (single token for all users), per-user (API keys from WebUI), OAuth-only (use access token). Maximum flexibility.

### Why Non-Blocking WebUI Sync?
Don't block login if sync fails. Fire-and-forget async calls. User can proceed without OpenWebUI key, gets error on first chat attempt.

### Why ID Token Claims Caching (ADFS)?
ADFS returns partial data in UserInfo endpoint, full data in ID token. Intercept token exchange at global fetch level to capture ID token before Better Auth processes it. Cache, merge, cleanup.

### Why History Tree Structure?
OpenWebUI supports conversation branching (explore alternative paths). Parent-child linked list in history object. Navigate from currentId to root to build linear conversation.

### Why Circuit Breaker?
OpenWebUI can be slow/unreliable during inference. Per-path state, 3-failure threshold, 15s cooldown. Prevents cascading failures.

### Why Auto-Generate Title?
Better UX. If title is default ("New conversation"), generate from first user message (max 50 chars). Only on first message.

### Why Download Proxy (Mixed Content Solution)?
When frontend runs on HTTPS but external services (Presenton, OCR) use HTTP, browsers block downloads due to mixed content policies. Solution: BFF layer auto-detects HTTP URLs and rewrites them to proxy through `/api/ppt/download?url=<encoded-url>`. Backend-to-backend HTTP calls work fine, and users get HTTPS download links that avoid browser security warnings.

### Why Deepseek OCR Ngram Configuration?
Deepseek OCR uses specific vLLM parameters for optimal text recognition: `ngram_size: 30`, `window_size: 90`, `whitelist_token_ids: [128821, 128822]`. These enable the model to better recognize Chinese text patterns and reduce recognition errors. Hardcoded in service layer to ensure consistent results.

## Critical Development Rules

1. **ALWAYS run `pnpm lint && pnpm typecheck` after changes**
2. **NEVER start dev server yourself** - Ask user for output if needed
3. **Use pnpm, not npm** - Project uses pnpm-lock.yaml
4. **PostgreSQL is primary database** - SQLite only for WebUI sync
5. **Better Auth for authentication** - Server: `@/lib/auth`, Client: `@/lib/auth-client`
6. **BFF pattern for routes** - Use `withAuth()` decorator, return `ApiResponse<T>`
7. **Service layer handles external APIs** - Routes call services, services call HTTP clients
8. **Zod for validation** - Request/response schemas, parse with `.parse()` or `.safeParse()`
9. **Trace all requests** - Include traceId in logs, responses
10. **Support dark mode** - Use Tailwind dark: prefix, shadcn/ui tokens

## Common Development Tasks

### Add New BFF Service (External API)
1. Create service in `src/lib/services/[service].ts`
2. Define interfaces for request/response
3. Create custom error class extending Error
4. Add HTTP client using `createHttpClient()`
5. Implement service methods with error handling
6. Create BFF route in `src/app/api/[service]/route.ts`
7. Add environment variables to `env.example`

### Add RBAC Permission
1. Add to `permissions` table in schema
2. Run migration
3. Assign to roles via `rolePermissions`
4. Check in handler: `snapshot.permissions.has("resource:action")`

### Add Tenant Feature Flag
1. Add boolean field to `tenants.features` in schema
2. Run migration
3. Check in handler: `snapshot.tenantFeatures.featureName`

### Add OpenWebUI Endpoint
1. Add method to `src/lib/services/open-webui.ts`
2. Create BFF route in `src/app/api/open-webui/[route]/route.ts`
3. Use `withAuth()`, get token via `getOpenWebuiAccessToken(user.id)`
4. Call service method, return `ApiResponse<T>`

### Debug Authentication Issues
1. Check claims in `account.claims` (JSON column)
2. Verify role mappings in env vars (JSON format)
3. Check `userRoles` table for role assignments
4. Enable debug logs in Better Auth config

### Handle WebUI Sync Failures
1. Check `webui.db` exists in project root
2. Verify user exists in SQLite: `SELECT * FROM user WHERE email = ?`
3. Check user has API key: `SELECT api_key FROM user WHERE email = ?`
4. Manual sync: Call `trySyncOpenWebuiApiKey(userId, email)`

### Test Presenton PPT Generation
1. Run test script: `pnpm test:ppt`
2. Check Presenton service health: `/health` endpoint
3. Verify environment variables: `PRESENTON_BASE_URL`, `PRESENTON_API_KEY`
4. Test sync generation with small content (1-2 slides)
5. For long-running generations, use async mode: `{ async: true }`

### Test Deepseek OCR
1. Verify service health: Check `DEEPSEEK_OCR_BASE_URL` accessible
2. Prepare base64-encoded image (remove `data:image/` prefix)
3. Test with default prompt or custom prompt
4. Check inference time - should complete within 2 minutes

## Styling Guidelines

- Use Tailwind CSS utility classes
- Use shadcn/ui color tokens: `bg-background`, `text-foreground`, `bg-primary`, etc.
- Support dark mode: `dark:bg-gray-900`, `dark:text-white`
- Avoid custom colors unless explicitly requested
- Use shadcn/ui components: `Button`, `Card`, `Dialog`, etc.
- Follow existing component patterns in `src/components/ui/`

## Error Handling

- Use `ApiResponse<T>` format for all API routes
- Include traceId in responses
- Log errors with `logError(traceId, message, meta)`
- Map OpenWebUI errors via `mapOpenWebuiError()` in service layer
- Return user-friendly messages, log technical details
- Non-blocking operations (WebUI sync): Catch, log, continue

## Testing Checklist

- [ ] Run `pnpm lint` - No ESLint errors
- [ ] Run `pnpm typecheck` - No TypeScript errors
- [ ] Test authentication flow (login, logout)
- [ ] Verify RBAC permissions (try unauthorized access)
- [ ] Test Open WebUI integration (chat, list models)
- [ ] Test PPT generation (sync and async modes)
- [ ] Test OCR recognition (various image types)
- [ ] Test quality check queries (search by different fields)
- [ ] Verify download proxy works (HTTP→HTTPS)
- [ ] Check database migrations (review SQL)
- [ ] Verify dark mode support (toggle theme)
- [ ] Test error handling (invalid input, network errors)

## Documentation References

- Better Auth: https://www.better-auth.com/docs
- Drizzle ORM: https://orm.drizzle.team/docs
- Next.js 15: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com/docs
- Open WebUI API: Check `OPEN_WEBUI_BASE_URL/docs`
