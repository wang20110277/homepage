import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { User, ApiResponse, TenantContext } from "./types";
import { unauthorized, forbidden } from "./api-response";
import { getTraceId } from "./trace";
import { logInfo, logWarn } from "./logger";
import { auth, ensureUserClaimsSynced } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

export interface AuthOptions {
  requiredRoles?: string[];
  unauthorizedMessage?: string;
  forbiddenMessage?: string;
}

export async function getUserFromRequest(
  request: NextRequest
): Promise<User | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return null;
  }

  let userRecord = await db.query.user.findFirst({
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

  if (!userRecord) {
    return null;
  }

  const needsSync =
    !userRecord.providerUserId ||
    !userRecord.username ||
    !userRecord.lastLoginAt ||
    userRecord.userRoles.length === 0;

  if (needsSync) {
    const synced = await ensureUserClaimsSynced(userRecord.id);
    if (synced) {
      userRecord = await db.query.user.findFirst({
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

      if (!userRecord) {
        return null;
      }
    }
  }

  const tenantContext: TenantContext | undefined = userRecord.tenant
    ? {
        id: userRecord.tenant.id,
        name: userRecord.tenant.name ?? undefined,
        slug: userRecord.tenant.slug ?? undefined,
        features: (userRecord.tenant.features ??
          {}) as Record<string, boolean>,
      }
    : undefined;

  return {
    id: userRecord.id,
    email: userRecord.email ?? undefined,
    name: userRecord.name ?? undefined,
    roles: userRecord.userRoles
      .map((assignment) => assignment.role?.name)
      .filter((roleName): roleName is string => Boolean(roleName)),
    tenantId: userRecord.tenantId ?? undefined,
    tenant: tenantContext,
  };
}

export function hasRequiredRoles(user: User, requiredRoles: string[]): boolean {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  const userRoles = user.roles || [];
  return requiredRoles.some((role) => userRoles.includes(role));
}

export interface BffContext {
  user?: User;
  tenant?: TenantContext;
  traceId: string;
}

export type BffRouteHandler = (
  request: NextRequest,
  context: BffContext
) => Promise<NextResponse<ApiResponse>>;

export function withAuth(
  handler: BffRouteHandler,
  options: AuthOptions = {}
): (request: NextRequest) => Promise<NextResponse<ApiResponse>> {
  return async (request: NextRequest) => {
    const traceId = getTraceId(request);
    const user = await getUserFromRequest(request);

    if (!user) {
      logWarn(traceId, "Unauthorized access attempt", {
        path: request.nextUrl.pathname,
        method: request.method,
      });

      return unauthorized(
        options.unauthorizedMessage || "Authentication required",
        traceId
      );
    }

    if (
      options.requiredRoles &&
      !hasRequiredRoles(user, options.requiredRoles)
    ) {
      logWarn(traceId, "Forbidden access attempt - insufficient roles", {
        path: request.nextUrl.pathname,
        method: request.method,
        userId: user.id,
        userRoles: user.roles,
        requiredRoles: options.requiredRoles,
      });

      return forbidden(
        options.forbiddenMessage || "Insufficient permissions",
        traceId
      );
    }

    logInfo(traceId, "Authenticated request", {
      path: request.nextUrl.pathname,
      method: request.method,
      userId: user.id,
    });

    return handler(request, { user, tenant: user.tenant, traceId });
  };
}

export function withOptionalAuth(
  handler: BffRouteHandler
): (request: NextRequest) => Promise<NextResponse<ApiResponse>> {
  return async (request: NextRequest) => {
    const traceId = getTraceId(request);
    const user = await getUserFromRequest(request);

    if (user) {
      logInfo(traceId, "Authenticated request", {
        path: request.nextUrl.pathname,
        method: request.method,
        userId: user.id,
      });
    } else {
      logInfo(traceId, "Unauthenticated request", {
        path: request.nextUrl.pathname,
        method: request.method,
      });
    }

    return handler(request, {
      user: user || undefined,
      tenant: user?.tenant,
      traceId,
    });
  };
}
