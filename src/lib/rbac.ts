import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

export type ToolId = "ppt" | "ocr" | "tianyancha";

const TOOL_PERMISSION_MAP: Record<
  ToolId,
  { resource: string; action: string }
> = {
  ppt: { resource: "ppt", action: "read" },
  ocr: { resource: "ocr", action: "read" },
  tianyancha: { resource: "tianyancha", action: "read" },
};

interface AccessResult {
  allowed: boolean;
  reason?: string;
}

interface AuthorizationSnapshot {
  isActive: boolean;
  tenantFeatures: Record<string, boolean>;
  permissions: Set<string>;
}

function toPermissionKey(resource: string, action: string) {
  return `${resource}:${action}`;
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await db.query.userRoles.findMany({
    where: eq(schema.userRoles.userId, userId),
    with: {
      role: true,
    },
  });

  return userRoles
    .map((assignment) => assignment.role?.name)
    .filter((roleName): roleName is string => Boolean(roleName));
}

export async function hasRole(
  userId: string,
  roleName: string
): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes(roleName);
}

export async function hasAnyRole(
  userId: string,
  roleNames: string[]
): Promise<boolean> {
  if (!roleNames.length) {
    return false;
  }

  const roles = await getUserRoles(userId);
  return roleNames.some((roleName) => roles.includes(roleName));
}

export async function hasPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const snapshot = await loadAuthorizationSnapshot(userId);
  if (!snapshot) {
    return false;
  }

  return snapshot.permissions.has(toPermissionKey(resource, action));
}

async function loadAuthorizationSnapshot(
  userId: string
): Promise<AuthorizationSnapshot | null> {
  const userRecord = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    columns: {
      id: true,
      isActive: true,
    },
    with: {
      tenant: {
        columns: {
          features: true,
        },
      },
      userRoles: {
        columns: {},
        with: {
      role: {
        columns: { id: true },
        with: {
          permissions: {
            columns: { permissionId: true },
                with: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!userRecord) {
    return null;
  }

  const tenantFeatures = (userRecord.tenant?.features ?? {}) as Record<
    string,
    boolean
  >;

  const permissions = new Set<string>();
  for (const assignment of userRecord.userRoles) {
    const rolePermissions = assignment.role?.permissions ?? [];
    for (const rolePermission of rolePermissions) {
      const perm = rolePermission.permission;
      if (perm) {
        permissions.add(toPermissionKey(perm.resource, perm.action));
      }
    }
  }

  return {
    isActive: userRecord.isActive ?? true,
    tenantFeatures,
    permissions,
  };
}

function evaluateAccess(
  snapshot: AuthorizationSnapshot,
  toolId: ToolId
): AccessResult {
  if (!snapshot.isActive) {
    return { allowed: false, reason: "Account inactive" };
  }

  const featureEnabled = snapshot.tenantFeatures?.[toolId];
  if (featureEnabled === false) {
    return { allowed: false, reason: "Disabled for tenant" };
  }

  const required = TOOL_PERMISSION_MAP[toolId];
  if (!snapshot.permissions.has(toPermissionKey(required.resource, required.action))) {
    return { allowed: false, reason: "Role required" };
  }

  return { allowed: true };
}

export async function checkToolAccess(
  userId: string,
  toolId: ToolId
): Promise<AccessResult> {
  const snapshot = await loadAuthorizationSnapshot(userId);
  if (!snapshot) {
    return { allowed: false, reason: "User not found" };
  }

  return evaluateAccess(snapshot, toolId);
}

export async function getToolAccessSummary(
  userId: string
): Promise<
  Array<{
    tool: ToolId;
    access: AccessResult;
  }>
> {
  const snapshot = await loadAuthorizationSnapshot(userId);
  if (!snapshot) {
    return (Object.keys(TOOL_PERMISSION_MAP) as ToolId[]).map((tool) => ({
      tool,
      access: { allowed: false, reason: "User not found" },
    }));
  }

  return (Object.keys(TOOL_PERMISSION_MAP) as ToolId[]).map((tool) => ({
    tool,
    access: evaluateAccess(snapshot, tool),
  }));
}
