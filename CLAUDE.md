# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

This is a **Workstation System** (工作台系统) - an integrated productivity platform built with Next.js 15, React 19, and TypeScript. It provides:

- **PPT Generator**: Intelligent presentation generation with template support
- **OCR Recognition**: Image text recognition with multiple modes
- **Enterprise Information Query**: Business registry information lookup
- **Personal Dashboard**: Todo list, calendar view, announcements
- **Multi-tenant SaaS**: Built-in tenant isolation and RBAC

**Authentication**: Better Auth with dual OAuth provider support (Microsoft Entra ID / ADFS)

**Database**: PostgreSQL with Drizzle ORM

---

## Development Commands

```bash
# Development
pnpm dev              # Start dev server with Turbopack
pnpm build            # Build for production (runs migrations first)
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript type checking
pnpm test             # Run Vitest tests

# Database Operations
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run pending migrations
pnpm db:push          # Push schema changes directly (dev only)
pnpm db:studio        # Open Drizzle Studio (DB GUI)
pnpm db:reset         # Drop all tables and push schema
pnpm db:seed          # Seed database with initial data
```

**Important**: The `pnpm build` command automatically runs `pnpm db:migrate` before building.

---

## Architecture Overview

### Authentication Flow

This application uses **Better Auth** with a custom dual-provider OAuth setup:

- **Provider Selection**: Controlled by `OIDC_PROVIDER` env var (`"entra"` or `"adfs"`)
- **Microsoft Entra ID**: Uses built-in `better-auth` social provider
- **ADFS**: Uses `genericOAuth` plugin with custom token exchange
- **ID Token Handling**: The auth system intercepts token exchange to cache ID token claims for role mapping
- **Role Synchronization**: User roles are automatically synced from OIDC claims on each login

**Key Files**:
- `src/lib/auth.ts` - Better Auth configuration with custom providers
- `src/lib/auth-utils.ts` - Claims mapping utilities
- `src/lib/auth-client.ts` - Client-side auth helpers
- `src/middleware.ts` - Route protection middleware

### Multi-Tenancy & RBAC

The application implements a sophisticated multi-tenant RBAC system:

**Schema** (`src/lib/schema.ts`):
- `tenants` - Tenant records with feature flags and OIDC config
- `user` - Extended Better Auth user table with `tenantId`
- `roles` - Tenant-scoped roles
- `user_roles` - User-to-role assignments
- `permissions` - Resource:action permissions
- `role_permissions` - Role-to-permission assignments

**Access Control** (`src/lib/rbac.ts`):
- `hasRole(userId, roleName)` - Check if user has specific role
- `hasPermission(userId, resource, action)` - Check resource-action permission
- `checkToolAccess(userId, toolId)` - Tool-level access control with tenant feature flags
- `getToolAccessSummary(userId)` - Get all tool access for a user

**Authorization Logic**:
1. User must be `isActive`
2. Tenant must have feature enabled (`tenant.features[toolId] === true`)
3. User must have role with required permission, OR tenant explicitly enables feature for all users

**Tool IDs**: `"ppt" | "ocr" | "tianyancha" | "qualityCheck"`

### Database Layer

**Configuration** (`drizzle.config.ts`):
- Uses `postgres-js` driver (not node-postgres)
- Schema located at `src/lib/schema.ts`
- Migrations output to `./drizzle`

**Connection Pooling** (`src/lib/db.ts`):
- Max connections: 50 (configurable via `POSTGRES_MAX_CONNECTIONS`)
- Idle timeout: 60 seconds
- Max lifetime: 30 minutes
- Prepared statements disabled for compatibility

**Important**: The app uses `postgres-js` (not `pg`). Import from `postgres`, not `pg`.

### Route Structure

```
/                      - Landing page (public)
/login                 - Login page (public)
/unauthorized          - Access denied page
/home                  - Post-login redirect
/dashboard             - Main dashboard
/dashboard/tenant-settings   - Tenant configuration
/dashboard/user-access       - User management
/tools/ppt-generator         - PPT tool
/tools/my-presentations      - Saved presentations
/tools/ocr                   - OCR tool
/tools/tianyancha            - Enterprise query
/tools/quality-check         - Quality inspection
/api/auth/[...all]           - Better Auth handler
/api/ppt/*                   - PPT generation endpoints
/api/open-webui/*            - Open WebUI proxy
/api/tenants/current/*       - Tenant management
/api/users/me/*              - Current user operations
```

Route constants are centralized in `src/config/routes.ts`.

---

## Key Integration Patterns

### Open WebUI Integration

The app acts as a BFF (Backend for Frontend) to Open WebUI:

- **Proxy Routes**: `/api/open-webui/*` forwards to Open WebUI API
- **API Key Sync**: User Open WebUI API keys stored in `user.openwebuiApiKey`
- **Token Management**: Service syncs keys on login via `trySyncOpenWebuiApiKey()`
- **Streaming**: SSE streaming utilities in `src/lib/open-webui/stream-utils.ts`

**Key Files**:
- `src/lib/api/open-webui.ts` - API client
- `src/lib/openWebuiClient.ts` - Legacy client (being phased out)
- `src/contexts/openWebuiModelsContext.tsx` - React context for models

### PPT Generation Architecture

The PPT generator uses a job-based async pattern:

1. **Upload**: Client uploads file → `/api/ppt/files/upload`
2. **Create**: Request presentation → `/api/ppt/presentations` (POST)
3. **Job Queue**: Job queued in background job manager
4. **Poll**: Client polls `/api/ppt/status/[taskId]` for progress
5. **Export**: Download via `/api/ppt/presentations/[id]/export`

**Job Manager** (`src/lib/core/job-manager.ts`):
- In-memory job queue (not persisted)
- Supports job status tracking
- Useful for long-running operations

---

## Environment Variables

**Required**:
- `POSTGRES_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - 32+ character random string for sessions
- `NEXT_PUBLIC_APP_URL` - Base URL for OAuth redirects

**For Microsoft Entra ID** (`OIDC_PROVIDER=entra`):
- `ENTRA_CLIENT_ID` / `OAUTH_CLIENT_ID`
- `ENTRA_CLIENT_SECRET` / `OAUTH_CLIENT_SECRET`
- `ENTRA_TENANT_ID` / `TENANT_ID` (default: "common")

**For ADFS** (`OIDC_PROVIDER=adfs`):
- `ADFS_CLIENT_ID`
- `ADFS_CLIENT_SECRET`
- `ADFS_AUTHORIZATION_URL`
- `ADFS_TOKEN_URL`
- `ADFS_USERINFO_URL`

**Optional**:
- `SESSION_MAX_AGE` - Session duration in seconds (default: 28800 = 8 hours)
- `POSTGRES_MAX_CONNECTIONS` - Connection pool size (default: 50)
- `OPENROUTER_API_KEY` - For AI features
- `OPENROUTER_MODEL` - Default AI model

---

## Common Patterns

### Adding New Pages with Auth

```typescript
// src/app/new-page/page.tsx
import { auth } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export default async function NewPage() {
  const session = await auth.getSession();
  if (!session) {
    redirect("/login");
  }

  // Page content
}
```

### Checking Tool Access

```typescript
import { checkToolAccess } from "@/lib/rbac";

// In API route or server component
const access = await checkToolAccess(userId, "ppt");
if (!access.allowed) {
  return new Response(access.reason || "Forbidden", { status: 403 });
}
```

### Database Queries with Relations

```typescript
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";

const userWithRoles = await db.query.user.findFirst({
  where: eq(schema.user.id, userId),
  with: {
    userRoles: {
      with: {
        role: true,
      },
    },
    tenant: true,
  },
});
```

### Adding New Database Fields

1. Add field to table in `src/lib/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:migrate` to apply migration
4. Update Drizzle queries to include new field

---

## Component Patterns

### UI Components

Uses `shadcn/ui` pattern - components are in `src/components/ui/`. To add new components:

```bash
pnpm dlx shadcn@latest add [component-name]
```

Or use MCP: `mcp__shadcn__get_add_command_for_items`

### Custom Hooks

- `useChatStore.ts` - Open WebUI chat state management
- `useSidebarState.ts` - Sidebar toggle state

---

## File Upload Handling

For file uploads, use the components in `src/components/tools/`:
- `file-upload.tsx` - Generic file upload with drag-drop
- `image-upload.tsx` - Image-specific upload with preview

---

## Special Notes

### Claims Debug Logging

The ADFS integration includes verbose logging for ID token claims. When a user logs in via ADFS, you'll see detailed console output showing:
- ID Token decoded claims
- UserInfo endpoint response
- Final mapped user object

This is intentional for debugging OAuth flows.

### Session Cookie Names

- Production: `__Secure-better-auth.session_token`
- Development: `better-auth.session_token`

Both checked in `src/middleware.ts`.

### TypeScript Strict Mode

This project uses strict TypeScript. Always run `pnpm typecheck` before committing.
