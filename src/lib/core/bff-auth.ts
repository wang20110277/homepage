import { NextRequest, NextResponse } from "next/server";
import type { User, ApiResponse } from "./types";
import { unauthorized, forbidden } from "./api-response";
import { getTraceId } from "./trace";
import { logInfo, logWarn } from "./logger";

/**
 * Auth configuration options
 */
export interface AuthOptions {
  /** Required roles for access (if not specified, any authenticated user can access) */
  requiredRoles?: string[];
  /** Custom error message for unauthorized */
  unauthorizedMessage?: string;
  /** Custom error message for forbidden */
  forbiddenMessage?: string;
}

/**
 * Extract user information from request
 *
 * Current implementation:
 * - Checks for x-mock-user header (for development/testing)
 * - Checks for Authorization Bearer token (JWT placeholder)
 *
 * Future implementation:
 * 1. Parse JWT from Authorization header
 * 2. Verify JWT signature with public key from auth service
 * 3. Check token expiration
 * 4. Extract user claims from token payload
 * 5. Optionally call auth service to validate session
 *
 * Example future integration:
 * ```typescript
 * import { verifyJwt } from './jwt-utils';
 * import { authServiceClient } from '@/lib/services/auth-service';
 *
 * export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
 *   const authHeader = request.headers.get('Authorization');
 *   if (!authHeader?.startsWith('Bearer ')) {
 *     return null;
 *   }
 *
 *   const token = authHeader.substring(7);
 *
 *   try {
 *     // Option 1: Local JWT verification
 *     const payload = await verifyJwt(token, publicKey);
 *     return {
 *       id: payload.sub,
 *       email: payload.email,
 *       name: payload.name,
 *       roles: payload.roles || [],
 *     };
 *
 *     // Option 2: Remote validation
 *     // const session = await authServiceClient.validateToken(token);
 *     // return session.user;
 *   } catch (error) {
 *     return null;
 *   }
 * }
 * ```
 */
export async function getUserFromRequest(
  request: NextRequest
): Promise<User | null> {
  // Development/testing: Check for mock user header
  const mockUserHeader = request.headers.get("x-mock-user");
  if (mockUserHeader) {
    try {
      const mockUser = JSON.parse(mockUserHeader);
      return {
        id: mockUser.id || "mock-user-id",
        email: mockUser.email,
        name: mockUser.name,
        roles: mockUser.roles || [],
      };
    } catch {
      // Invalid mock user header, ignore
    }
  }

  // Check for Authorization header (Bearer token)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    // TODO: Implement actual JWT verification here
    // For now, just extract a simple base64 encoded user object
    // This is a placeholder for development purposes
    try {
      // Simple placeholder: token is base64 encoded JSON user object
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const user = JSON.parse(decoded);
      return {
        id: user.id || "unknown",
        email: user.email,
        name: user.name,
        roles: user.roles || [],
      };
    } catch {
      // Invalid token format
      return null;
    }
  }

  // Check for session cookie (integration with Better Auth)
  // This can be extended to call the existing Better Auth session validation
  const sessionCookie = request.cookies.get("better-auth.session_token");
  if (sessionCookie) {
    // TODO: Validate session with Better Auth
    // For now, presence of cookie indicates some form of authentication
    // In production, you would call your auth service to validate the session

    // Placeholder: return null to indicate session validation not yet implemented
    // When implemented, this should:
    // 1. Call Better Auth to get session details
    // 2. Extract user information from session
    // 3. Return User object
    return null;
  }

  return null;
}

/**
 * Check if user has required roles
 */
export function hasRequiredRoles(user: User, requiredRoles: string[]): boolean {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  const userRoles = user.roles || [];
  return requiredRoles.some((role) => userRoles.includes(role));
}

/**
 * Request handler type for BFF routes
 */
export type BffRouteHandler = (
  request: NextRequest,
  context: { user?: User; traceId: string }
) => Promise<NextResponse<ApiResponse>>;

/**
 * Middleware wrapper for authenticated routes
 *
 * Usage:
 * ```typescript
 * export const POST = withAuth(async (request, { user, traceId }) => {
 *   // user is guaranteed to be defined here
 *   return ok({ message: `Hello ${user.name}` }, traceId);
 * });
 * ```
 *
 * With role requirements:
 * ```typescript
 * export const POST = withAuth(
 *   async (request, { user, traceId }) => {
 *     return ok({ data: 'admin only' }, traceId);
 *   },
 *   { requiredRoles: ['admin'] }
 * );
 * ```
 */
export function withAuth(
  handler: BffRouteHandler,
  options: AuthOptions = {}
): (request: NextRequest) => Promise<NextResponse<ApiResponse>> {
  return async (request: NextRequest) => {
    const traceId = getTraceId(request);

    // Attempt to get user from request
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

    // Check role requirements
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

    // Call the actual handler with user context
    return handler(request, { user, traceId });
  };
}

/**
 * Middleware wrapper for optional authentication
 * User may or may not be authenticated
 *
 * Usage:
 * ```typescript
 * export const GET = withOptionalAuth(async (request, { user, traceId }) => {
 *   if (user) {
 *     return ok({ message: `Hello ${user.name}` }, traceId);
 *   }
 *   return ok({ message: 'Hello guest' }, traceId);
 * });
 * ```
 */
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

    return handler(request, { user: user || undefined, traceId });
  };
}
