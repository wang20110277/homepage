# OIDC Integration Requirements

## Project Information

- **Project Name**: Workbench System OIDC Authentication Integration
- **Version**: v1.0.0
- **Created**: 2025-01-18
- **Status**: Planning

---

## Project Objectives

Transform the current Mock user-based authentication system into an enterprise-grade OIDC (OpenID Connect) authentication system, supporting both Azure Entra ID and ADFS identity providers, with tenant identification and Role-Based Access Control (RBAC) at the BFF layer.

### Core Goals

- [ ] Replace Mock authentication - Remove all hardcoded user data and use real OIDC auth flow
- [ ] Multi-provider support - Easy switching between Azure Entra ID and ADFS via environment variables
- [ ] Internal network deployment ready - Ensure system runs completely in enterprise intranet
- [ ] RBAC permission system - Implement single-tenant multi-role permission management
- [ ] Tool access control - Dynamically control tool availability based on tenant configuration
- [ ] Scalable architecture - Reserve multi-tenant expansion capability

---

## Authentication Requirements

### 1. Identity Provider Support

#### 1.1 Azure Entra ID (Microsoft Entra ID)
- **Protocol**: OpenID Connect 1.0
- **Discovery Endpoint**: `https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration`
- **Scopes**: `openid profile email`
- **Claims Structure**:
  ```json
  {
    "sub": "user-unique-id",
    "name": "John Doe",
    "email": "john@company.com",
    "preferred_username": "john@company.com",
    "oid": "object-id",
    "tid": "tenant-id",
    "roles": ["Admin", "User"],
    "groups": ["group-id-1", "group-id-2"]
  }
  ```

#### 1.2 ADFS (Active Directory Federation Services)
- **Protocol**: OpenID Connect 1.0 / WS-Federation (compatible mode)
- **Discovery Endpoint**: `https://adfs.company.com/adfs/.well-known/openid-configuration`
- **Scopes**: `openid profile email allatclaims`
- **Claims Structure**:
  ```json
  {
    "sub": "user-principal-name",
    "name": "John Doe",
    "email": "john@company.com",
    "upn": "john@company.com",
    "unique_name": "DOMAIN\\john",
    "role": "Admin",
    "group": ["CN=Admins,OU=Groups,DC=company,DC=com"]
  }
  ```

#### 1.3 Provider Switching Mechanism
- Use environment variable `OIDC_PROVIDER` to specify current provider: `entra` or `adfs`
- Claims mapping layer automatically handles claims structure differences between providers
- Support configuring multiple providers simultaneously (future expansion)

### 2. Authentication Flow

#### 2.1 Standard OIDC Authorization Code Flow
```
User visits application
  ↓
Not logged in → Redirect to /login
  ↓
Click "Enterprise Login" button
  ↓
Redirect to OIDC Provider authorization endpoint
  ↓
User completes login at Provider
  ↓
Provider callbacks to application (callback URL)
  ↓
Application exchanges authorization code for tokens
  ↓
Parse ID Token, extract user info and claims
  ↓
Claims mapping → Standardized user attributes
  ↓
Create/update database user record
  ↓
Assign default role (if new user)
  ↓
Create session
  ↓
Redirect to /home
```

#### 2.2 Session Management
- **Session Storage**: PostgreSQL (via Better Auth `session` table)
- **Session Expiry**: 8 hours (configurable)
- **Refresh Token**: Support token refresh to extend session (if Provider supports)
- **Logout**: Clear both local session and Provider session (single sign-out)

### 3. Claims Mapping Requirements

#### 3.1 Standardized User Claims
Regardless of Provider, map to unified user attributes:

| Standard Attribute | Entra ID Source | ADFS Source | Description |
|-------------------|----------------|-------------|-------------|
| `id` | `oid` or `sub` | `sub` or `upn` | User unique ID |
| `name` | `name` | `name` | User full name |
| `email` | `email` or `preferred_username` | `email` or `upn` | Email |
| `username` | `preferred_username` | `upn` | Username |
| `provider` | `entra` | `adfs` | Provider identifier |
| `providerId` | `oid` | `sub` | Provider-side user ID |

#### 3.2 Role Mapping
- **Entra ID**: Extract from `roles` claim or `groups` claim
- **ADFS**: Extract from `role` claim or `group` claim
- **Mapping Rules** (configurable):
  ```typescript
  {
    "entraRoleMappings": {
      "Global Admin": "admin",
      "User": "user",
      "PPT Admin": "ppt_admin"
    },
    "adfsRoleMappings": {
      "CN=Admins,OU=Groups,DC=company,DC=com": "admin",
      "CN=Users,OU=Groups,DC=company,DC=com": "user"
    }
  }
  ```

#### 3.3 Role Synchronization & Persistence
- After every successful sign-in, normalized roles derived from the IdP **must** be synchronized into the RBAC tables (`roles`, `user_roles`).
- When a mapped role name does not exist yet, create it (or map it) automatically under the tenant before assignment, while still applying the configured default role as a fallback.
- Keep a record of which roles originated from claims vs. were assigned manually to support future audits.
- If no claim-based role is available, log the event and continue with the default user role without blocking login.

---

## Database Design

### Existing Tables (Retain and Extend)

#### 1. `user` Table
```sql
-- Existing fields (keep)
id TEXT PRIMARY KEY,
name TEXT NOT NULL,
email TEXT UNIQUE NOT NULL,
emailVerified BOOLEAN DEFAULT false,
image TEXT,
createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

-- New fields
providerId TEXT,           -- OIDC provider identifier (entra/adfs)
providerUserId TEXT,       -- Provider-side user ID
username TEXT,             -- Username (upn or preferred_username)
tenantId TEXT NOT NULL DEFAULT 'default',  -- Tenant ID
isActive BOOLEAN DEFAULT true,             -- Account active status
lastLoginAt TIMESTAMP                      -- Last login timestamp
```

#### 2. `session` Table (No Changes)
Better Auth manages automatically, supports OIDC sessions.

#### 3. `account` Table
```sql
-- Existing fields (keep)
id TEXT PRIMARY KEY,
accountId TEXT NOT NULL,     -- Same as providerUserId
providerId TEXT NOT NULL,     -- Same as user.providerId
userId TEXT NOT NULL,
accessToken TEXT,
refreshToken TEXT,
idToken TEXT,                 -- OIDC ID Token
accessTokenExpiresAt TIMESTAMP,
refreshTokenExpiresAt TIMESTAMP,
scope TEXT,
createdAt TIMESTAMP,
updatedAt TIMESTAMP,

-- New field
claims JSONB                  -- Store raw claims (for debugging and audit)
```

### New Tables

#### 4. `tenants` Table
```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,           -- URL-friendly identifier
  description TEXT,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- OIDC config (JSON)
  oidcConfig JSONB,                    -- Tenant-specific OIDC config

  -- Feature toggles
  features JSONB DEFAULT '{
    "ppt": true,
    "ocr": true,
    "tianyancha": true
  }'::jsonb
);

-- Insert default tenant
INSERT INTO tenants (id, name, slug)
VALUES ('default', 'Default Tenant', 'default');
```

#### 5. `roles` Table
```sql
CREATE TABLE roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,           -- admin, user, ppt_admin, viewer
  displayName TEXT NOT NULL,           -- Display name
  description TEXT,
  tenantId TEXT NOT NULL DEFAULT 'default',
  isSystem BOOLEAN DEFAULT false,      -- System predefined role
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Insert system roles
INSERT INTO roles (id, name, displayName, description, isSystem) VALUES
('role_admin', 'admin', 'Administrator', 'System admin with all permissions', true),
('role_user', 'user', 'Regular User', 'Can use all tools', true),
('role_ppt_admin', 'ppt_admin', 'PPT Administrator', 'Can manage PPT features', true),
('role_viewer', 'viewer', 'Viewer', 'Read-only access', true);
```

#### 6. `user_roles` Table
```sql
CREATE TABLE user_roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId TEXT NOT NULL,
  roleId TEXT NOT NULL,
  assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assignedBy TEXT,                     -- Assigner user ID

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,

  UNIQUE(userId, roleId)
);

-- Indexes
CREATE INDEX idx_user_roles_user ON user_roles(userId);
CREATE INDEX idx_user_roles_role ON user_roles(roleId);
```

#### 7. `permissions` Table (Optional, fine-grained permissions)
```sql
CREATE TABLE permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  resource TEXT NOT NULL,              -- Resource type: ppt, ocr, tianyancha, dashboard
  action TEXT NOT NULL,                -- Action: read, write, delete, admin
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(resource, action)
);

-- Insert base permissions
INSERT INTO permissions (resource, action, description) VALUES
('ppt', 'read', 'View PPT'),
('ppt', 'create', 'Create PPT'),
('ppt', 'delete', 'Delete PPT'),
('ocr', 'read', 'Use OCR recognition'),
('tianyancha', 'read', 'Query company info'),
('dashboard', 'read', 'Access dashboard');
```

#### 8. `role_permissions` Table
```sql
CREATE TABLE role_permissions (
  roleId TEXT NOT NULL,
  permissionId TEXT NOT NULL,

  PRIMARY KEY (roleId, permissionId),
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permissionId) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Assign permissions to system roles
-- Admin: all permissions
INSERT INTO role_permissions (roleId, permissionId)
SELECT 'role_admin', id FROM permissions;

-- User: basic usage permissions
INSERT INTO role_permissions (roleId, permissionId)
SELECT 'role_user', id FROM permissions
WHERE action IN ('read', 'create');
```

#### 9. `audit_logs` Table (Optional, audit logging)
```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId TEXT,
  action TEXT NOT NULL,                -- login, logout, access_denied, role_changed
  resource TEXT,                       -- Related resource
  details JSONB,                       -- Detailed info
  ipAddress TEXT,
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_user ON audit_logs(userId);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(createdAt);
```

---

## Architecture Design

### 1. Technology Stack

- **Auth Library**: Better Auth v1.3.34 (retain existing config)
- **OIDC Support**: Better Auth native OIDC plugin
- **Database**: PostgreSQL + Drizzle ORM
- **Session Storage**: PostgreSQL (Better Auth managed)
- **Frontend**: Next.js 15 App Router + React 19

### 2. BFF Layer Design

```typescript
// src/lib/core/bff-auth.ts - Refactored
export interface AuthContext {
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    roles: string[];
    tenantId: string;
  } | null;
  session: Session | null;
  tenant: Tenant | null;
}

export async function getAuthContext(
  request: Request
): Promise<AuthContext> {
  // 1. Get session token from cookie
  const sessionToken = getCookie('better-auth.session_token');

  // 2. Validate session
  const session = await auth.api.getSession({
    headers: request.headers
  });

  if (!session) {
    return { user: null, session: null, tenant: null };
  }

  // 3. Load complete user info (including roles)
  const user = await db.query.user.findFirst({
    where: eq(users.id, session.user.id),
    with: {
      roles: {
        with: { role: true }
      }
    }
  });

  // 4. Load tenant info
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, user.tenantId)
  });

  return {
    user: {
      ...user,
      roles: user.roles.map(r => r.role.name)
    },
    session,
    tenant
  };
}

// Permission check middleware
export function withAuth(
  handler: (req: Request, ctx: AuthContext) => Promise<Response>,
  options?: {
    requiredRoles?: string[];
    requiredPermissions?: Array<{ resource: string; action: string }>;
  }
) {
  return async (req: Request) => {
    const ctx = await getAuthContext(req);

    if (!ctx.user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Role check
    if (options?.requiredRoles?.length) {
      const hasRole = options.requiredRoles.some(
        role => ctx.user!.roles.includes(role)
      );
      if (!hasRole) {
        return Response.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    // Permission check
    if (options?.requiredPermissions?.length) {
      const hasPermission = await checkPermissions(
        ctx.user.id,
        options.requiredPermissions
      );
      if (!hasPermission) {
        return Response.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    return handler(req, ctx);
  };
}
```

### 3. Claims Mapping Utilities

```typescript
// src/lib/auth-utils.ts
export interface StandardUserClaims {
  id: string;
  name: string;
  email: string;
  username: string;
  provider: 'entra' | 'adfs';
  providerId: string;
  roles: string[];
}

export function mapClaimsToUser(
  claims: any,
  provider: 'entra' | 'adfs'
): StandardUserClaims {
  if (provider === 'entra') {
    return {
      id: claims.oid || claims.sub,
      name: claims.name,
      email: claims.email || claims.preferred_username,
      username: claims.preferred_username,
      provider: 'entra',
      providerId: claims.oid,
      roles: extractEntraRoles(claims)
    };
  } else {
    return {
      id: claims.sub || claims.upn,
      name: claims.name,
      email: claims.email || claims.upn,
      username: claims.upn,
      provider: 'adfs',
      providerId: claims.sub,
      roles: extractAdfsRoles(claims)
    };
  }
}

function extractEntraRoles(claims: any): string[] {
  const roles = claims.roles || [];
  const groups = claims.groups || [];

  // Read mapping config from env
  const mappings = JSON.parse(
    process.env.ENTRA_ROLE_MAPPINGS || '{}'
  );

  return [...roles, ...groups]
    .map(r => mappings[r] || r)
    .filter(Boolean);
}

function extractAdfsRoles(claims: any): string[] {
  const role = claims.role;
  const group = claims.group;

  const roles = Array.isArray(role) ? role : role ? [role] : [];
  const groups = Array.isArray(group) ? group : group ? [group] : [];

  const mappings = JSON.parse(
    process.env.ADFS_ROLE_MAPPINGS || '{}'
  );

  return [...roles, ...groups]
    .map(r => mappings[r] || r)
    .filter(Boolean);
}
```

---

## API Design

### 1. Authentication API (Better Auth auto-provided)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/sign-in/social` | POST | Initiate OIDC login |
| `/api/auth/callback/oidc` | GET | OIDC callback endpoint |
| `/api/auth/session` | GET | Get current session |
| `/api/auth/sign-out` | POST | Logout |

### 2. User API

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `/api/users/me` | GET | Get current user info | Authenticated |
| `/api/users/me/roles` | GET | Get current user roles | Authenticated |
| `/api/users` | GET | Get user list | admin |
| `/api/users/:id/roles` | PUT | Update user roles | admin |

### 3. Tenant API

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `/api/tenants/current` | GET | Get current tenant info | Authenticated |
| `/api/tenants/current/features` | GET | Get tenant feature toggles | Authenticated |
| `/api/tenants/current/features` | PUT | Update feature toggles | admin |

> Tenant feature APIs must expose the full feature flag object used by the dashboard, enforce RBAC (only tenant admins can mutate), and return explicit denial reasons so the UI can surface “Not Available” messaging.

---

## Security Requirements

### 1. Authentication Security
- [x] Use standard OIDC authorization code flow (with PKCE)
- [x] Store tokens in httpOnly cookies
- [x] Support CSRF protection
- [x] Session fixation attack prevention
- [x] Enforce HTTPS (production environment)
- [x] Invoke IdP end-session / logout endpoints (Azure Entra & ADFS) to guarantee single sign-out in addition to clearing local Better Auth sessions

### 2. Authorization Security
- [x] All API routes require authentication by default
- [x] Role-Based Access Control (RBAC)
- [x] Principle of least privilege
- [x] Audit logging for sensitive operations

### 3. Data Security
- [x] Encrypt sensitive data at rest (tokens)
- [x] SQL injection protection (Drizzle ORM)
- [x] XSS protection (Next.js built-in)
- [x] Personal data protection compliance

---

## Environment Variables

```env
# Database
POSTGRES_URL=postgresql://user:password@internal-db:5432/workbench

# Better Auth
BETTER_AUTH_SECRET=<32-char-random-string>
BETTER_AUTH_URL=https://workbench.company.com

# OIDC Provider Selection
OIDC_PROVIDER=entra  # or adfs

# Azure Entra ID Configuration
ENTRA_CLIENT_ID=<azure-client-id>
ENTRA_CLIENT_SECRET=<azure-client-secret>
ENTRA_TENANT_ID=<azure-tenant-id>
ENTRA_ISSUER=https://login.microsoftonline.com/${ENTRA_TENANT_ID}/v2.0

# ADFS Configuration
ADFS_CLIENT_ID=<adfs-client-id>
ADFS_CLIENT_SECRET=<adfs-client-secret>
ADFS_ISSUER=https://adfs.company.com/adfs

# Claims Mapping (JSON)
ENTRA_ROLE_MAPPINGS={"Global Admin":"admin","User":"user"}
ADFS_ROLE_MAPPINGS={"CN=Admins,OU=Groups,DC=company,DC=com":"admin"}

# Session Configuration
SESSION_MAX_AGE=28800  # 8 hours in seconds

# Feature Flags
ENABLE_AUDIT_LOGS=true
DEFAULT_USER_ROLE=user
```

---

## UI/UX Requirements

### 1. Login Page
- [ ] Clean enterprise login interface
- [ ] "Login with Enterprise Account" button
- [ ] Loading state indication
- [ ] Error messages (auth failed, insufficient permissions, etc.)

### 2. Unauthorized Page
- [ ] Friendly permission denied message
- [ ] Guide users to contact admin
- [ ] Return to home link

### 3. User Profile Display
- [ ] Show username, email
- [ ] Show current roles
- [ ] Show available tools list
- [ ] Logout button
- [ ] Fetch tenant features + role info from APIs so the profile can label which tools are enabled/disabled for the signed-in user

### 4. Tool Access Control
- [ ] Dynamically show/hide tool cards based on tenant feature toggles
- [ ] Show "Not Available" message when permission denied
- [ ] Redirect to unauthorized page when access denied
- [ ] Dashboard cards must include inline badges (e.g., “Disabled for tenant”, “Role required”) rather than just redirecting

---

## Testing Requirements

### 1. Functional Tests
- [ ] Entra ID login flow
- [ ] ADFS login flow
- [ ] Claims mapping accuracy
- [ ] Role assignment and validation
- [ ] Tool access permission checks
- [ ] Logout flow

### 2. Security Tests
- [ ] Session hijacking test
- [ ] CSRF protection test
- [ ] Unauthorized access test
- [ ] Role escalation test

### 3. Performance Tests
- [ ] Session query performance
- [ ] Permission check performance
- [ ] Concurrent login stress test

> Document the manual steps and expected outcomes for each functional, security, and performance test inside the implementation plan/PR so reviewers can reproduce them.

---

## Future Expansion

### Phase 2: Multi-Tenant Support
- Tenant-level data isolation
- Tenant management portal
- Tenant-level configuration

### Phase 3: Advanced Permissions
- Fine-grained resource permissions
- Dynamic permission policies
- Permission approval workflows

### Phase 4: SSO Enhancement
- Multiple provider simultaneous support
- Account linking functionality
- Social account login

---

## Acceptance Criteria

- [x] Completely remove mock authentication code
- [x] Support switching between Entra ID and ADFS via environment variables
- [x] Claims correctly mapped to standard user attributes
- [x] Roles correctly assigned and validated
- [x] Tool access permissions correctly controlled
- [x] Session management stable and reliable
- [x] All test cases pass
- [x] Successfully deployed and running in internal network

---

## Related Resources

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Azure Entra ID OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [ADFS OIDC](https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/development/ad-fs-openid-connect-oauth-concepts)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
