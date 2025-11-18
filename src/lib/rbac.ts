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
        permissions.add(`${perm.resource}:${perm.action}`);
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
  const key = `${required.resource}:${required.action}`;
  if (!snapshot.permissions.has(key)) {
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
