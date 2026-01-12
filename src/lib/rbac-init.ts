import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  tenants,
  roles,
  permissions,
  rolePermissions,
  user,
  account,
  userRoles,
} from "./schema";

type SeedLogger = (...args: unknown[]) => void;

const baseRoles = [
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
    description: "Standard access across tools",
    tenantId: "default",
    isSystem: true,
  },
  {
    id: "role_ppt_admin",
    name: "ppt_admin",
    displayName: "PPT Administrator",
    description: "Manages PPT tooling",
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

const basePermissions = [
  { resource: "dashboard", action: "read", description: "Access dashboard" },
  { resource: "ppt", action: "read", description: "View PPT" },
  { resource: "ppt", action: "create", description: "Create PPT" },
  { resource: "ppt", action: "delete", description: "Delete PPT" },
  { resource: "ocr", action: "read", description: "Use OCR recognition" },
  { resource: "tianyancha", action: "read", description: "Query company info" },
  { resource: "qualityCheck", action: "read", description: "Query quality audit results" },
];

interface SeedOptions {
  verbose?: boolean;
}

async function ensureDefaultTenant(log: SeedLogger) {
  await db
    .insert(tenants)
    .values({
      id: "default",
      name: "Default Tenant",
      slug: "default",
      description: "System default tenant",
    })
    .onConflictDoNothing();
  log("[seed] default tenant ensured");
}

async function ensureRolesAndPermissions(log: SeedLogger) {
  await db.insert(roles).values(baseRoles).onConflictDoNothing();
  log("[seed] base roles ensured");

  const insertedPermissions = await db
    .insert(permissions)
    .values(basePermissions)
    .onConflictDoNothing()
    .returning();

  log("[seed] base permissions ensured");

  if (!insertedPermissions.length) {
    return;
  }

  const adminPermissions = insertedPermissions.map((perm) => ({
    roleId: "role_admin",
    permissionId: perm.id,
  }));

  const userPerms = insertedPermissions
    .filter((perm) => perm.action === "read" || perm.action === "create")
    .map((perm) => ({
      roleId: "role_user",
      permissionId: perm.id,
    }));

  const viewerPerms = insertedPermissions
    .filter((perm) => perm.action === "read")
    .map((perm) => ({
      roleId: "role_viewer",
      permissionId: perm.id,
    }));

  await db
    .insert(rolePermissions)
    .values([...adminPermissions, ...userPerms, ...viewerPerms])
    .onConflictDoNothing();

  log("[seed] role permissions ensured");
}

async function ensureLocalAdminUser(log: SeedLogger) {
  const email = process.env.LOCAL_ADMIN_EMAIL;
  const password = process.env.LOCAL_ADMIN_PASSWORD;
  const name =
    process.env.LOCAL_ADMIN_NAME || process.env.LOCAL_ADMIN_EMAIL || "Admin";

  if (!email || !password) {
    console.warn(
      "LOCAL_ADMIN_EMAIL or LOCAL_ADMIN_PASSWORD not set - offline admin login disabled."
    );
    return;
  }

  const existingUser = await db.query.user.findFirst({
    where: eq(user.email, email),
    with: {
      userRoles: true,
    },
  });

  const hashedPassword = await hashPassword(password);
  const userId = existingUser?.id ?? randomUUID();

  if (!existingUser) {
    await db.insert(user).values({
      id: userId,
      email,
      name,
      emailVerified: true,
      providerId: "credential",
      providerUserId: email,
      username: email,
      tenantId: "default",
      isActive: true,
    });
    log("[seed] local admin user inserted");
  }

  const credentialAccount = await db.query.account.findFirst({
    where: eq(account.userId, userId),
  });

  if (credentialAccount) {
    await db
      .update(account)
      .set({
        providerId: "credential",
        accountId: email,
        password: hashedPassword,
      })
      .where(eq(account.id, credentialAccount.id));
  } else {
    await db.insert(account).values({
      id: randomUUID(),
      accountId: email,
      providerId: "credential",
      userId,
      password: hashedPassword,
    });
  }

  const adminRole = await db.query.roles.findFirst({
    where: eq(roles.name, "admin"),
  });

  if (!adminRole) {
    throw new Error("Admin role missing while creating local admin user");
  }

  const hasAdminRole = existingUser?.userRoles?.some(
    (assignment) => assignment.roleId === adminRole.id
  );

  if (!hasAdminRole) {
    await db.insert(userRoles).values({
      id: randomUUID(),
      userId,
      roleId: adminRole.id,
    });
  }

  log("[seed] local admin credentials ensured");
}

export async function ensureCoreAuthData(options?: SeedOptions) {
  const log: SeedLogger = options?.verbose ? (...args) => console.log(...args) : () => {};
  await ensureDefaultTenant(log);
  await ensureRolesAndPermissions(log);
  await ensureLocalAdminUser(log);
}
