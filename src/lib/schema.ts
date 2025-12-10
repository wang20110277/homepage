import { randomUUID } from "node:crypto";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================================
// Tenants Table
// ============================================================================
export const tenants = pgTable("tenants", {
  id: text("id")
    .$defaultFn(() => randomUUID())
    .primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  oidcConfig: jsonb("oidc_config").$type<{
    provider?: string;
    clientId?: string;
    issuer?: string;
  }>(),
  features: jsonb("features")
    .$type<{
      ppt: boolean;
      ocr: boolean;
      tianyancha: boolean;
    }>()
    .default(sql`'{"ppt":true,"ocr":true,"tianyancha":true}'::jsonb`)
    .notNull(),
});

// ============================================================================
// Users Table (Extended)
// ============================================================================
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  emailVerified: boolean("email_verified").default(false),
  image: text("image"),
  providerId: text("provider_id"),
  providerUserId: text("provider_user_id"),
  username: text("username").unique(),
  tenantId: text("tenant_id")
    .default("default")
    .references(() => tenants.id, { onDelete: "set default" }),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  openwebuiApiKey: text("openwebui_api_key"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  claims: jsonb("claims").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// RBAC Tables
// ============================================================================
export const roles = pgTable("roles", {
  id: text("id")
    .$defaultFn(() => randomUUID())
    .primaryKey(),
  name: text("name").unique().notNull(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  tenantId: text("tenant_id")
    .default("default")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").defaultNow(),
    assignedBy: text("assigned_by"),
  },
  (table) => ({
    uniqueUserRole: uniqueIndex("idx_user_role_unique").on(
      table.userId,
      table.roleId
    ),
    userIdIdx: index("idx_user_roles_user").on(table.userId),
    roleIdIdx: index("idx_user_roles_role").on(table.roleId),
  })
);

export const permissions = pgTable(
  "permissions",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    resource: text("resource").notNull(),
    action: text("action").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueResourceAction: uniqueIndex("idx_permissions_unique").on(
      table.resource,
      table.action
    ),
  })
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  })
);

// ============================================================================
// Relations
// ============================================================================
export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  userRoles: many(userRoles),
  tenant: one(tenants, {
    fields: [user.tenantId],
    references: [tenants.id],
  }),
}));

export const tenantRelations = relations(tenants, ({ many }) => ({
  users: many(user),
  roles: many(roles),
}));

export const roleRelations = relations(roles, ({ many, one }) => ({
  assignments: many(userRoles),
  permissions: many(rolePermissions),
  tenant: one(tenants, {
    fields: [roles.tenantId],
    references: [tenants.id],
  }),
}));

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
