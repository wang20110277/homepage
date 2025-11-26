# OIDC Integration Implementation Plan

## Overview

This document provides detailed step-by-step implementation guidance for transforming the Workbench System's Mock authentication into an enterprise-grade OIDC-based authentication system.

**Estimated Total Hours**: 10-14 hours
**Implementation Order**: Execute stages sequentially, test after each stage

---

## Stage 1: Database Schema Extension (2-3 hours)

### Objectives
Extend existing database schema, add tenant, role, and permission related tables to establish foundation for RBAC.

### 1.1 Extend `user` Table

**File**: `src/lib/schema.ts`

**Action**: Add new fields to existing `user` table definition

- [x] Open `src/lib/schema.ts`
- [x] Locate the `user` table definition
- [x] Add the following new fields:

```typescript
// src/lib/schema.ts

export const user = pgTable("user", {
  // === Existing fields (keep) ===
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  emailVerified: boolean("emailVerified").default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),

  // === New fields ===
  providerId: text("providerId"),           // 'entra' | 'adfs'
  providerUserId: text("providerUserId"),   // Provider-side user ID
  username: text("username"),               // UPN or preferred_username
  tenantId: text("tenantId").notNull().default("default"),
  isActive: boolean("isActive").default(true),
  lastLoginAt: timestamp("lastLoginAt"),
});
```

### 1.2 Extend `account` Table

- [x] In `src/lib/schema.ts`, locate the `account` table
- [x] Add `claims` field to store raw OIDC claims:

```typescript
// src/lib/schema.ts

export const account = pgTable("account", {
  // === Existing fields (keep) ===
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),

  // === New field ===
  claims: text("claims", { mode: "json" }).$type<Record<string, any>>(),
});
```

### 1.3 Create `tenants` Table

- [x] Add the following table definition to `src/lib/schema.ts`:

```typescript
// src/lib/schema.ts

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),

  // Tenant-level OIDC config (optional, for future multi-tenant)
  oidcConfig: text("oidcConfig", { mode: "json" }).$type<{
    provider?: string;
    clientId?: string;
    issuer?: string;
  }>(),

  // Feature toggles
  features: text("features", { mode: "json" }).default({
    ppt: true,
    ocr: true,
    tianyancha: true,
  }).$type<{
    ppt: boolean;
    ocr: boolean;
    tianyancha: boolean;
  }>(),
});
```

### 1.4 Create `roles` Table

- [x] Add the following table definition:

```typescript
// src/lib/schema.ts

export const roles = pgTable("roles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  displayName: text("displayName").notNull(),
  description: text("description"),
  tenantId: text("tenantId").notNull().default("default")
    .references(() => tenants.id, { onDelete: "cascade" }),
  isSystem: boolean("isSystem").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});
```

### 1.5 Create `user_roles` Table

- [x] Add the following table definition:

```typescript
// src/lib/schema.ts

export const userRoles = pgTable("user_roles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  roleId: text("roleId").notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assignedAt").defaultNow(),
  assignedBy: text("assignedBy"),
}, (table) => ({
  uniqueUserRole: unique().on(table.userId, table.roleId),
  userIdIdx: index("idx_user_roles_user").on(table.userId),
  roleIdIdx: index("idx_user_roles_role").on(table.roleId),
}));
```

### 1.6 Create `permissions` Table (Optional)

- [x] Add the following table definitions for fine-grained permissions:

```typescript
// src/lib/schema.ts

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  uniqueResourceAction: unique().on(table.resource, table.action),
}));

export const rolePermissions = pgTable("role_permissions", {
  roleId: text("roleId").notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  permissionId: text("permissionId").notNull()
    .references(() => permissions.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
}));
```

### 1.7 Add Drizzle Relations

- [x] Add the following relations to `src/lib/schema.ts`:

```typescript
// src/lib/schema.ts

import { relations } from "drizzle-orm";

// User relations
export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  userRoles: many(userRoles),
  tenant: one(tenants, {
    fields: [user.tenantId],
    references: [tenants.id],
  }),
}));

// Tenant relations
export const tenantRelations = relations(tenants, ({ many }) => ({
  users: many(user),
  roles: many(roles),
}));

// Role relations
export const roleRelations = relations(roles, ({ many, one }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
  tenant: one(tenants, {
    fields: [roles.tenantId],
    references: [tenants.id],
  }),
}));

// UserRole relations
export const userRoleRelations = relations(userRoles, ({ one }) => ({
  user: one(user, {
    fields: [userRoles.userId],
    references: [user.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

// Permission relations
export const permissionRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));
```

### 1.8 Generate and Run Migrations

- [x] Generate migration files:
```bash
pnpm run db:generate
```

- [x] Run migrations:
```bash
pnpm run db:migrate
```

### 1.9 Create Database Seed Script

- [x] Create new file `src/lib/db-seed.ts`:

```typescript
// src/lib/db-seed.ts

import { db } from "./db";
import { tenants, roles, permissions, rolePermissions } from "./schema";

export async function seedDatabase() {
  console.log("Starting database initialization...");

  // 1. Create default tenant
  await db.insert(tenants).values({
    id: "default",
    name: "Default Tenant",
    slug: "default",
    description: "System default tenant",
  }).onConflictDoNothing();

  // 2. Create system roles
  const systemRoles = [
    {
      id: "role_admin",
      name: "admin",
      displayName: "Administrator",
      description: "System admin with all permissions",
      tenantId: "default",
      isSystem: true,
    },
    {
      id: "role_user",
      name: "user",
      displayName: "Regular User",
      description: "Can use all tools",
      tenantId: "default",
      isSystem: true,
    },
    {
      id: "role_ppt_admin",
      name: "ppt_admin",
      displayName: "PPT Administrator",
      description: "Can manage PPT features",
      tenantId: "default",
      isSystem: true,
    },
    {
      id: "role_viewer",
      name: "viewer",
      displayName: "Viewer",
      description: "Read-only access",
      tenantId: "default",
      isSystem: true,
    },
  ];

  await db.insert(roles).values(systemRoles).onConflictDoNothing();

  // 3. Create base permissions
  const basePermissions = [
    { resource: "dashboard", action: "read", description: "Access dashboard" },
    { resource: "ppt", action: "read", description: "View PPT" },
    { resource: "ppt", action: "create", description: "Create PPT" },
    { resource: "ppt", action: "delete", description: "Delete PPT" },
    { resource: "ocr", action: "read", description: "Use OCR recognition" },
    { resource: "tianyancha", action: "read", description: "Query company info" },
  ];

  const insertedPermissions = await db.insert(permissions)
    .values(basePermissions)
    .onConflictDoNothing()
    .returning();

  // 4. Assign permissions to roles
  const adminPermissions = insertedPermissions.map(p => ({
    roleId: "role_admin",
    permissionId: p.id,
  }));

  const userPermissions = insertedPermissions
    .filter(p => p.action === "read" || p.action === "create")
    .map(p => ({
      roleId: "role_user",
      permissionId: p.id,
    }));

  const viewerPermissions = insertedPermissions
    .filter(p => p.action === "read")
    .map(p => ({
      roleId: "role_viewer",
      permissionId: p.id,
    }));

  await db.insert(rolePermissions)
    .values([...adminPermissions, ...userPermissions, ...viewerPermissions])
    .onConflictDoNothing();

  console.log("Database initialization complete!");
}

// Run directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Initialization failed:", err);
      process.exit(1);
    });
}
```

- [x] Add to `package.json` scripts:
```json
{
  "scripts": {
    "db:seed": "tsx src/lib/db-seed.ts"
  }
}
```

- [x] Run seed data:
```bash
pnpm run db:seed
```

### 1.10 Stage Validation

- [x] Open Drizzle Studio:
```bash
pnpm run db:studio
```

- [x] Verify:
  - [x] `tenants` table exists with 'default' tenant
  - [x] `roles` table exists with 4 system roles
  - [x] `permissions` table exists with 6 base permissions
  - [x] `role_permissions` table correctly associates roles and permissions

---

## Stage 2: OIDC Integration Configuration (3-4 hours)

### Objectives
Configure Better Auth to support OIDC, implement provider switching between Azure Entra ID and ADFS.

### 2.1 Create Claims Mapping Utilities

- [x] Create new file `src/lib/auth-utils.ts`:

```typescript
// src/lib/auth-utils.ts

export interface StandardUserClaims {
  id: string;
  name: string;
  email: string;
  username: string;
  provider: "entra" | "adfs";
  providerId: string;
  roles: string[];
}

export function mapClaimsToUser(
  claims: Record<string, any>,
  provider: "entra" | "adfs"
): StandardUserClaims {
  if (provider === "entra") {
    return mapEntraClaims(claims);
  } else {
    return mapAdfsClaims(claims);
  }
}

function mapEntraClaims(claims: Record<string, any>): StandardUserClaims {
  return {
    id: claims.oid || claims.sub,
    name: claims.name || "",
    email: claims.email || claims.preferred_username || "",
    username: claims.preferred_username || claims.email || "",
    provider: "entra",
    providerId: claims.oid || claims.sub,
    roles: extractEntraRoles(claims),
  };
}

function mapAdfsClaims(claims: Record<string, any>): StandardUserClaims {
  return {
    id: claims.sub || claims.upn,
    name: claims.name || "",
    email: claims.email || claims.upn || "",
    username: claims.upn || claims.email || "",
    provider: "adfs",
    providerId: claims.sub || claims.upn,
    roles: extractAdfsRoles(claims),
  };
}

function extractEntraRoles(claims: Record<string, any>): string[] {
  const roles = claims.roles || [];
  const groups = claims.groups || [];

  const mappings = getEntraRoleMappings();

  return [...roles, ...groups]
    .map((r) => mappings[r] || r)
    .filter(Boolean);
}

function extractAdfsRoles(claims: Record<string, any>): string[] {
  const role = claims.role;
  const group = claims.group;

  const roles = Array.isArray(role) ? role : role ? [role] : [];
  const groups = Array.isArray(group) ? group : group ? [group] : [];

  const mappings = getAdfsRoleMappings();

  return [...roles, ...groups]
    .map((r) => mappings[r] || r)
    .filter(Boolean);
}

function getEntraRoleMappings(): Record<string, string> {
  try {
    return JSON.parse(process.env.ENTRA_ROLE_MAPPINGS || "{}");
  } catch {
    return {};
  }
}

function getAdfsRoleMappings(): Record<string, string> {
  try {
    return JSON.parse(process.env.ADFS_ROLE_MAPPINGS || "{}");
  } catch {
    return {};
  }
}

// Normalize role names
export function normalizeRole(role: string): string {
  // Remove LDAP prefixes like CN=, OU=, DC=
  const cleaned = role.replace(/^(CN|OU|DC)=/, "");

  // Extract part before comma
  const parts = cleaned.split(",");
  return parts[0].toLowerCase().trim();
}

export function mergeClaimRoles(
  claimRoles: string[]
): string[] {
  if (!claimRoles?.length) {
    return [];
  }
  return [...new Set(claimRoles.map(normalizeRole))];
}
```

### 2.2 Update Better Auth Configuration

- [x] Open `src/lib/auth.ts`
- [x] Replace or update with the following configuration:

```typescript
// src/lib/auth.ts

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./schema";
import { mapClaimsToUser, mergeClaimRoles } from "./auth-utils";
import { eq, inArray } from "drizzle-orm";

// Get active OIDC provider
const activeProvider = process.env.OIDC_PROVIDER || "entra";

// Build OIDC configuration
function getOidcConfig() {
  if (activeProvider === "entra") {
    return {
      clientId: process.env.ENTRA_CLIENT_ID!,
      clientSecret: process.env.ENTRA_CLIENT_SECRET!,
      issuer: process.env.ENTRA_ISSUER ||
        `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/v2.0`,
      scopes: ["openid", "profile", "email"],
    };
  } else {
    return {
      clientId: process.env.ADFS_CLIENT_ID!,
      clientSecret: process.env.ADFS_CLIENT_SECRET!,
      issuer: process.env.ADFS_ISSUER!,
      scopes: ["openid", "profile", "email", "allatclaims"],
    };
  }
}

async function syncRolesFromClaims(
  userId: string,
  claimRoles: string[]
) {
  const normalized = mergeClaimRoles(claimRoles);
  if (!normalized.length) {
    return false;
  }

  const existingAssignments = await db.query.userRoles.findMany({
    where: eq(schema.userRoles.userId, userId),
  });

  // Load/create roles
  const existingRoles = await db.query.roles.findMany({
    where: inArray(schema.roles.name, normalized),
  });
  const existingRoleNames = new Set(existingRoles.map((role) => role.name));

  const missingRoleNames = normalized.filter(
    (roleName) => !existingRoleNames.has(roleName)
  );

  let createdRoles: { id: string; name: string }[] = [];
  if (missingRoleNames.length) {
    createdRoles = (await db.insert(schema.roles)
      .values(
        missingRoleNames.map((name) => ({
          name,
          displayName: name,
          description: `Auto-created from OIDC claim (${activeProvider})`,
          tenantId: "default",
        }))
      )
      .returning()).map((role) => ({ id: role.id, name: role.name }));
  }

  const rolesToLink = [...existingRoles, ...createdRoles].filter((role) => {
    return !existingAssignments.some(
      (assignment) => assignment.roleId === role.id
    );
  });

  if (rolesToLink.length) {
    await db.insert(schema.userRoles).values(
      rolesToLink.map((role) => ({
        userId,
        roleId: role.id,
      }))
    );
  }

  return true;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),

  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET!,

  // Session configuration
  session: {
    expiresIn: parseInt(process.env.SESSION_MAX_AGE || "28800"), // 8 hours
    updateAge: 3600, // Update session interval (seconds)
  },

  // OIDC social login
  socialProviders: {
    oidc: {
      enabled: true,
      ...getOidcConfig(),

      // Custom claims processing
      async profile(profile) {
        const standardClaims = mapClaimsToUser(
          profile,
          activeProvider as "entra" | "adfs"
        );

        return {
          id: standardClaims.id,
          name: standardClaims.name,
          email: standardClaims.email,
          image: profile.picture || null,
          emailVerified: true,
        };
      },
    },
  },

  // User creation/update hooks
  hooks: {
    after: [
      {
        matcher: "signIn.oidc",
        handler: async ({ user, account }) => {
          // 1. Update user info
          const claims = account?.claims as Record<string, any>;
          const standardClaims = mapClaimsToUser(
            claims,
            activeProvider as "entra" | "adfs"
          );

          await db.update(schema.user)
            .set({
              providerId: standardClaims.provider,
              providerUserId: standardClaims.providerId,
              username: standardClaims.username,
              lastLoginAt: new Date(),
            })
            .where(eq(schema.user.id, user.id));

          // 2. Store full claims in account table
          await db.update(schema.account)
            .set({
              claims: claims,
            })
            .where(eq(schema.account.userId, user.id));

          // 3. Assign roles (new users + claim-based roles)
          const existingRoles = await db.query.userRoles.findMany({
            where: eq(schema.userRoles.userId, user.id),
          });
          const claimRolesApplied = await syncRolesFromClaims(
            user.id,
            standardClaims.roles
          );

          if (existingRoles.length === 0 && !claimRolesApplied) {
            const defaultRoleName = process.env.DEFAULT_USER_ROLE || "user";
            const defaultRole = await db.query.roles.findFirst({
              where: eq(schema.roles.name, defaultRoleName),
            });

            if (defaultRole) {
              await db.insert(schema.userRoles).values({
                userId: user.id,
                roleId: defaultRole.id,
              });
            }
          }

          // 4. Audit log (if enabled)
          if (process.env.ENABLE_AUDIT_LOGS === "true") {
            // TODO: Implement audit logging
          }
        },
      },
    ],
  },
});
```

### 2.3 Update Client Configuration

- [x] Open `src/lib/auth-client.ts`
- [x] Update with the following:

```typescript
// src/lib/auth-client.ts

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
});

export const {
  signIn,
  signOut,
  useSession,
  signUp,
} = authClient;

// Custom OIDC login function
export async function signInWithOIDC() {
  await signIn.social({
    provider: "oidc",
    callbackURL: "/home",
  });
}

export async function signOutFromOIDC() {
  const res = await fetch("/api/auth/logout", { method: "POST" });
  const payload = await res.json();

  await signOut({ callbackURL: payload.postLogoutRedirect || "/login" });

  if (payload.providerLogoutUrl) {
    window.location.href = payload.providerLogoutUrl;
  }
}
```

### 2.4 Update Environment Variables

- [x] Update `.env.example` with the following:

```env
# === Database ===
POSTGRES_URL=postgresql://user:password@localhost:5432/workbench

# === Better Auth ===
BETTER_AUTH_SECRET=<generate-32-char-random-string>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# === OIDC Provider ===
OIDC_PROVIDER=entra  # or adfs

# === Azure Entra ID ===
ENTRA_CLIENT_ID=your-azure-client-id
ENTRA_CLIENT_SECRET=your-azure-client-secret
ENTRA_TENANT_ID=your-azure-tenant-id
ENTRA_ISSUER=https://login.microsoftonline.com/${ENTRA_TENANT_ID}/v2.0

# === ADFS ===
ADFS_CLIENT_ID=your-adfs-client-id
ADFS_CLIENT_SECRET=your-adfs-client-secret
ADFS_ISSUER=https://adfs.company.com/adfs

# === Claims Mapping (JSON) ===
ENTRA_ROLE_MAPPINGS={"Global Admin":"admin","User":"user"}
ADFS_ROLE_MAPPINGS={"CN=Admins,OU=Groups,DC=company,DC=com":"admin","CN=Users,OU=Groups,DC=company,DC=com":"user"}

# === Session ===
SESSION_MAX_AGE=28800  # 8 hours

# === Feature Flags ===
ENABLE_AUDIT_LOGS=false
DEFAULT_USER_ROLE=user
```

### 2.5 Stage Validation

- [x] Start dev server:
```bash
pnpm dev
```

- [x] Test OIDC configuration loading:
```bash
# Visit http://localhost:3000/api/auth/oidc
# Should return OIDC config
```

- [x] Check environment variables:
```bash
node -e "console.log(process.env.OIDC_PROVIDER)"
```

- [x] Sign in with a user who has role/group claims and confirm `user_roles` contains the normalized roles; when no claims exist the default role should still apply.

---

## Stage 3: Remove Mock Authentication (1 hour)

### Objectives
Completely remove all Mock authentication code, ensure system uses real OIDC authentication.

### 3.1 Delete Mock Auth Context

- [x] Delete file:
```bash
rm src/contexts/mock-auth-context.tsx
```

### 3.2 Update UserProfile Component

- [x] Open `src/components/auth/user-profile.tsx`
- [x] Replace entire content with:

```typescript
// src/components/auth/user-profile.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOutFromOIDC } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, ShieldCheck, User } from "lucide-react";

interface ProfileDetails {
  roles: string[];
  tools: Array<{ id: string; enabled: boolean; reason?: string }>;
}

export function UserProfile() {
  const { data: session, isPending } = useSession();
  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const res = await fetch("/api/users/me");
        if (!res.ok) {
          throw new Error("Failed to load profile");
        }
        const data = await res.json();
        setDetails({
          roles: data.user?.roles || [],
          tools: Array.isArray(data.toolAccess)
            ? data.toolAccess.map((item: any) => ({
                id: item.tool,
                enabled: item.access?.allowed,
                reason: item.access?.reason,
              }))
            : [],
        });
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [session?.user]);

  if (isPending) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const availableTools = useMemo(
    () => details?.tools.filter((tool) => tool.enabled) || [],
    [details]
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOutFromOIDC();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || undefined} alt={user.name || ""} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal space-y-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Roles
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {isLoadingDetails && (
                <span className="text-xs text-muted-foreground">Loading...</span>
              )}
              {!isLoadingDetails &&
                (details?.roles.length ? (
                  details.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No roles assigned
                  </span>
                ))}
            </div>
          </div>
          {details?.tools?.length ? (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Available Tools
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {availableTools.length
                  ? availableTools.map((tool) => (
                      <Badge key={tool.id}>{tool.id}</Badge>
                    ))
                  : (
                    <span className="text-xs text-muted-foreground">
                      No tools enabled
                    </span>
                  )}
              </div>
            </div>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600"
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? "Signing out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3.3 Remove Mock Methods from BFF Layer

- [x] Open `src/lib/core/bff-auth.ts`
- [x] Delete all mock-related code (x-mock-user header, base64 token, etc.)
- [x] Replace with:

```typescript
// src/lib/core/bff-auth.ts

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";

export interface AuthContext {
  user: {
    id: string;
    name: string;
    email: string;
    username: string | null;
    roles: string[];
    tenantId: string;
    isActive: boolean;
  } | null;
  session: any | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
    features: {
      ppt: boolean;
      ocr: boolean;
      tianyancha: boolean;
    };
  } | null;
}

export async function getAuthContext(
  request: Request
): Promise<AuthContext> {
  // 1. Get session
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return { user: null, session: null, tenant: null };
  }

  // 2. Load complete user info (including roles)
  const userWithRoles = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    with: {
      userRoles: {
        with: {
          role: true,
        },
      },
      tenant: true,
    },
  });

  if (!userWithRoles) {
    return { user: null, session: null, tenant: null };
  }

  return {
    user: {
      id: userWithRoles.id,
      name: userWithRoles.name,
      email: userWithRoles.email,
      username: userWithRoles.username,
      roles: userWithRoles.userRoles.map((ur) => ur.role.name),
      tenantId: userWithRoles.tenantId,
      isActive: userWithRoles.isActive,
    },
    session,
    tenant: userWithRoles.tenant
      ? {
          id: userWithRoles.tenant.id,
          name: userWithRoles.tenant.name,
          slug: userWithRoles.tenant.slug,
          features: userWithRoles.tenant.features as any,
        }
      : null,
  };
}

export function withAuth(
  handler: (req: Request, ctx: AuthContext) => Promise<Response>,
  options?: {
    requiredRoles?: string[];
  }
) {
  return async (req: Request) => {
    const ctx = await getAuthContext(req);

    // Not logged in
    if (!ctx.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Account inactive
    if (!ctx.user.isActive) {
      return Response.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }

    // Role check
    if (options?.requiredRoles?.length) {
      const hasRole = options.requiredRoles.some((role) =>
        ctx.user!.roles.includes(role)
      );
      if (!hasRole) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return handler(req, ctx);
  };
}

export function withOptionalAuth(
  handler: (req: Request, ctx: AuthContext) => Promise<Response>
) {
  return async (req: Request) => {
    const ctx = await getAuthContext(req);
    return handler(req, ctx);
  };
}
```

### 3.4 Clean Mock User Data

- [x] Open `src/lib/mock-data.ts`
- [x] Delete `mockUser` constant (keep other mock data for UI demos)

### 3.5 Stage Validation

- [x] Search for all mock user related code:
```bash
grep -r "mockUser" src/
grep -r "mock-auth-context" src/
grep -r "zhangsan" src/
```

- [x] Ensure no results found

---

## Stage 4: Create Login Page (2 hours)

### Objectives
Create professional enterprise login page, integrate OIDC login flow.

### 4.1 Create Login Page

- [x] Create new file `src/app/login/page.tsx`:

```typescript
// src/app/login/page.tsx

"use client";

import { useState } from "react";
import { signInWithOIDC } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithOIDC();
    } catch (err) {
      setError("Login failed, please try again");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Workbench System</CardTitle>
          <CardDescription>
            Login with your enterprise account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              "Login with Enterprise Account"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By logging in, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.2 Create Unauthorized Page

- [x] Create new file `src/app/unauthorized/page.tsx`:

```typescript
// src/app/unauthorized/page.tsx

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page or feature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact your system administrator for access.
          </p>
          <Button asChild className="w-full">
            <Link href="/home">
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.3 Create Next.js Middleware to Protect Routes

- [x] Create new file `src/middleware.ts`:

```typescript
// src/middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("better-auth.session_token");
  const { pathname } = request.nextUrl;

  // Public paths
  const publicPaths = ["/login", "/unauthorized", "/api/auth"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Not logged in and accessing protected route â†’ redirect to login
  if (!sessionToken && !isPublicPath && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Logged in and accessing login page â†’ redirect to home
  if (sessionToken && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### 4.4 Update Root Page

- [x] Open `src/app/page.tsx`
- [x] Replace with:

```typescript
// src/app/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/home");
  } else {
    redirect("/login");
  }
}
```

### 4.5 Implement Provider Logout (Single Sign-Out)

- [x] Create `src/app/api/auth/logout/route.ts`:

```typescript
// src/app/api/auth/logout/route.ts

import { auth } from "@/lib/auth";
import { withAuth } from "@/lib/core/bff-auth";

function getProviderLogoutUrl() {
  const baseRedirect = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const postLogout = `${baseRedirect}/login`;
  const provider = process.env.OIDC_PROVIDER || "entra";

  if (provider === "adfs") {
    return `${process.env.ADFS_ISSUER}/ls/?wa=wsignout1.0&post_logout_redirect_uri=${encodeURIComponent(postLogout)}`;
  }

  const tenantId = process.env.ENTRA_TENANT_ID || "common";
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogout)}`;
}

export const POST = withAuth(async (req) => {
  await auth.api.signOut({ headers: req.headers });

  return Response.json({
    providerLogoutUrl: getProviderLogoutUrl(),
    postLogoutRedirect: "/login",
  });
});
```

- [x] Update `src/lib/auth-client.ts` (or shared client helper) to export `signOutFromOIDC` calling `/api/auth/logout` so other components can reuse it (the UserProfile step already consumes this helper).

### 4.6 Update Dashboard Tool Cards

- [x] Open `src/app/home/page.tsx` (or the dashboard landing page) and wrap tool cards with feature + permission awareness:

```typescript
// src/app/home/page.tsx

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { checkToolAccess } from "@/lib/rbac";

const tools: Array<{
  id: "ppt" | "ocr" | "tianyancha";
  name: string;
  description: string;
  href: string;
}> = [
  { id: "ppt", name: "PPT Generator", description: "Generate decks fast", href: "/tools/ppt-generator" },
  { id: "ocr", name: "OCR Recognition", description: "Extract data from docs", href: "/tools/ocr" },
  { id: "tianyancha", name: "Tianyancha Lookup", description: "Company intelligence", href: "/tools/tianyancha" },
];

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const toolStatuses = await Promise.all(
    tools.map(async (tool) => ({
      ...tool,
      access: await checkToolAccess(session.user.id, tool.id),
    }))
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {toolStatuses.map((tool) => {
        const disabled = !tool.access.allowed;
        return (
          <Card key={tool.id} className={disabled ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{tool.name}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </div>
                {disabled ? (
                  <Badge variant="destructive">
                    {tool.access.reason || "Not available"}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Enabled</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {disabled ? (
                <p className="text-sm text-muted-foreground">
                  {tool.access.reason || "Contact admin for access."}
                </p>
              ) : (
                <Link className="text-sm text-primary underline" href={tool.href}>
                  Open {tool.name}
                </Link>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [x] Ensure the dashboard consumes tenant feature data so disabled tools appear instantly without waiting for navigation.

### 4.7 Stage Validation

- [ ] Clear browser cookies
- [ ] Visit http://localhost:3000
- [ ] Should redirect to /login
- [ ] Click login button, should jump to OIDC provider
- [ ] After logout, verify both the local session cookie and the IdP session are cleared (Azure/ADFS should require re-auth).
- [ ] Dashboard should show inline "Not Available" badges for disabled tools instead of redirect-only behavior.

---

## Stage 5: Implement RBAC Permission Middleware (2 hours)

### Objectives
Implement role-based access control, protect API routes and pages.

### 5.1 Create RBAC Utility Functions

- [x] Create new file `src/lib/rbac.ts`:

```typescript
// src/lib/rbac.ts

import { db } from "./db";
import * as schema from "./schema";
import { eq, and, inArray } from "drizzle-orm";

export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await db.query.userRoles.findMany({
    where: eq(schema.userRoles.userId, userId),
    with: {
      role: true,
    },
  });

  return userRoles.map((ur) => ur.role.name);
}

export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes(roleName);
}

export async function hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roleNames.some((r) => roles.includes(r));
}

export async function hasPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const userRoles = await db.query.userRoles.findMany({
    where: eq(schema.userRoles.userId, userId),
    with: {
      role: {
        with: {
          rolePermissions: {
            with: {
              permission: true,
            },
          },
        },
      },
    },
  });

  return userRoles.some((ur) =>
    ur.role.rolePermissions.some(
      (rp) =>
        rp.permission.resource === resource &&
        rp.permission.action === action
    )
  );
}

export async function checkToolAccess(
  userId: string,
  tool: "ppt" | "ocr" | "tianyancha"
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Get user
  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    with: {
      tenant: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  if (!user.isActive) {
    return { allowed: false, reason: "Account is inactive" };
  }

  // 2. Check tenant feature toggle
  const features = user.tenant?.features as any;
  if (!features?.[tool]) {
    return { allowed: false, reason: "Feature not enabled" };
  }

  // 3. Check user permission
  const hasAccess = await hasPermission(userId, tool, "read");
  if (!hasAccess) {
    return { allowed: false, reason: "Insufficient permissions" };
  }

  return { allowed: true };
}
```

### 5.2 Create Example API Routes (with permission protection)

- [x] Create `src/app/api/users/me/route.ts`:

```typescript
// src/app/api/users/me/route.ts

import { withAuth } from "@/lib/core/bff-auth";
import { checkToolAccess } from "@/lib/rbac";

export const GET = withAuth(async (req, ctx) => {
  const toolAccess = await Promise.all(
    ["ppt", "ocr", "tianyancha"].map(async (tool) => ({
      tool,
      access: await checkToolAccess(ctx.user!.id, tool as "ppt" | "ocr" | "tianyancha"),
    }))
  );

  return Response.json({
    user: ctx.user,
    tenant: ctx.tenant,
    toolAccess,
  });
});
```

- [x] Create `src/app/api/users/me/roles/route.ts`:

```typescript
// src/app/api/users/me/roles/route.ts

import { withAuth } from "@/lib/core/bff-auth";
import { getUserRoles } from "@/lib/rbac";

export const GET = withAuth(async (req, ctx) => {
  const roles = await getUserRoles(ctx.user!.id);

  return Response.json({
    roles,
  });
});
```

- [x] Create `src/app/api/tenants/current/route.ts`:

```typescript
// src/app/api/tenants/current/route.ts

import { withAuth } from "@/lib/core/bff-auth";

export const GET = withAuth(async (req, ctx) => {
  return Response.json({
    tenant: ctx.tenant,
  });
});
```

- [x] Create `src/app/api/tenants/current/features/route.ts`:

```typescript
// src/app/api/tenants/current/features/route.ts

import { withAuth } from "@/lib/core/bff-auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";

export const GET = withAuth(async (req, ctx) => {
  if (!ctx.tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  return Response.json({
    features: ctx.tenant.features,
  });
});

export const PUT = withAuth(
  async (req, ctx) => {
    const body = await req.json();
    const features = body.features;

    if (!ctx.tenant) {
      return Response.json({ error: "Tenant not found" }, { status: 404 });
    }

    await db
      .update(schema.tenants)
      .set({ features })
      .where(eq(schema.tenants.id, ctx.tenant.id));

    return Response.json({ features });
  },
  {
    requiredRoles: ["admin"],
  }
);
```

### 5.3 Protect Tool Pages

- [x] For each tool page (`src/app/tools/ppt-generator/page.tsx`, `ocr/page.tsx`, `tianyancha/page.tsx`), add at the top:

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkToolAccess } from "@/lib/rbac";

export default async function ToolPage() {
  // Check authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Check tool access permission
  const access = await checkToolAccess(session.user.id, "ppt"); // or "ocr" or "tianyancha"
  if (!access.allowed) {
    redirect(`/unauthorized?reason=${encodeURIComponent(access.reason || "")}`);
  }

  // ... Original component code
}
```

### 5.4 Stage Validation

- [x] Login and visit `/api/users/me`
- [x] Should return user info and roles

- [x] Visit protected tool pages
- [x] Should show or deny access based on roles and tenant config
- [x] Call `/api/tenants/current/features` GET/PUT as admin and confirm mutations change dashboard state immediately (403 for non-admins)

---

## Stage 6: Testing & Validation (2 hours)

### Functional Test Checklist

- [ ] Entra ID login flow works end-to-end
- [ ] ADFS login flow works end-to-end (if configured)
- [ ] Claims correctly mapped to user table
- [ ] New users automatically assigned default role
- [ ] Session correctly created and managed
- [ ] Logout functionality works
- [ ] Middleware correctly protects routes
- [ ] BFF layer permission checks work
- [ ] Tool access permissions correctly controlled
- [ ] Tenant feature toggles take effect

### Security Test Checklist

- [ ] Session hijacking simulation: copy cookies to another browser and ensure Better Auth rejects the session.
- [ ] CSRF protection: trigger login/logout endpoints without valid CSRF token (if applicable) and confirm they fail.
- [ ] Unauthorized access: direct-call `/api/tools/...` without auth header should return 401.
- [ ] Role escalation attempt: log in as regular user and attempt to call `/api/tenants/current/features` PUT ï¿½?' expect 403 and audit log entry.

### Performance Test Checklist

- [ ] Run a short load test (e.g., `k6` or `autocannon`) hitting `/api/users/me` to ensure average latency < 200ms.
- [ ] Simulate concurrent logins (5-10 parallel sign-ins) and verify session table remains consistent.
- [ ] Measure permission checks (call `checkToolAccess` in a script) to ensure DB query count is acceptable (<3 queries per check).
- [ ] Document observations/results for each test in the PR description.

### Provider Switching Test

- [ ] Switch to ADFS:
```bash
echo "OIDC_PROVIDER=adfs" >> .env
pnpm dev
```

- [ ] Test login flow

- [ ] Switch back to Entra ID:
```bash
echo "OIDC_PROVIDER=entra" >> .env
pnpm dev
```

### Code Quality Check

- [ ] Run lint:
```bash
pnpm run lint
```

- [ ] Run typecheck:
```bash
pnpm run typecheck
```

---

## Stage 7: Documentation Updates

### 7.1 Update README.md

- [ ] Add OIDC configuration section

### 7.2 Create Deployment Documentation

- [ ] Include environment variable configuration
- [ ] Database initialization steps

---

## Completion Criteria

- [x] All mock authentication code removed
- [x] OIDC authentication flow fully functional
- [x] Support switching between Entra ID and ADFS
- [x] Database schema complete and initialized
- [x] RBAC permission system running normally
- [x] All tests pass
- [x] Code quality checks pass

---

## Troubleshooting

### Issue 1: OIDC Redirect Fails
**Check**: Is `BETTER_AUTH_URL` configured correctly? Is callback URL registered in Provider?

### Issue 2: Claims Mapping Error
**Check**: Are `ENTRA_ROLE_MAPPINGS` and `ADFS_ROLE_MAPPINGS` valid JSON format?

### Issue 3: Session Validation Fails
**Check**: Are cookie settings correct? Does HTTPS/HTTP config match?

### Issue 4: Permission Checks Not Working
**Check**: Are user roles correctly assigned? Does `user_roles` table have data?

---

**Estimated Total Time**: 10-14 hours
**Suggested Testing Time**: Additional 2-3 hours


3
4
