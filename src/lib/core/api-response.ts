import { NextResponse } from "next/server";
import type { ApiResponse, ApiError } from "./types";

/**
 * Create a successful API response
 */
export function ok<T>(data: T, traceId?: string): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (traceId) {
    response.traceId = traceId;
  }

  return NextResponse.json(response, {
    status: 200,
    headers: traceId ? { "X-Trace-Id": traceId } : undefined,
  });
}

/**
 * Create a failure API response
 */
export function fail(
  code: string,
  message: string,
  detail?: unknown,
  traceId?: string,
  statusCode: number = 500
): NextResponse<ApiResponse<never>> {
  const error: ApiError = {
    code,
    message,
  };

  if (detail !== undefined) {
    error.detail = detail;
  }

  const response: ApiResponse<never> = {
    success: false,
    error,
  };

  if (traceId) {
    response.traceId = traceId;
  }

  return NextResponse.json(response, {
    status: statusCode,
    headers: traceId ? { "X-Trace-Id": traceId } : undefined,
  });
}

/**
 * Create a 400 Bad Request response
 */
export function badRequest(
  message: string,
  detail?: unknown,
  traceId?: string
): NextResponse<ApiResponse<never>> {
  return fail("BAD_REQUEST", message, detail, traceId, 400);
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorized(
  message: string = "Authentication required",
  traceId?: string
): NextResponse<ApiResponse<never>> {
  return fail("UNAUTHORIZED", message, undefined, traceId, 401);
}

/**
 * Create a 403 Forbidden response
 */
export function forbidden(
  message: string = "Access denied",
  traceId?: string
): NextResponse<ApiResponse<never>> {
  return fail("FORBIDDEN", message, undefined, traceId, 403);
}

/**
 * Create a 404 Not Found response
 */
export function notFound(
  message: string = "Resource not found",
  traceId?: string
): NextResponse<ApiResponse<never>> {
  return fail("NOT_FOUND", message, undefined, traceId, 404);
}

/**
 * Create a 500 Internal Server Error response
 */
export function serverError(
  message: string = "Internal server error",
  detail?: unknown,
  traceId?: string
): NextResponse<ApiResponse<never>> {
  return fail("INTERNAL_ERROR", message, detail, traceId, 500);
}

/**
 * Create a response for service unavailable (downstream service failure)
 */
export function serviceUnavailable(
  serviceName: string,
  detail?: unknown,
  traceId?: string
): NextResponse<ApiResponse<never>> {
  return fail(
    "SERVICE_UNAVAILABLE",
    `Service ${serviceName} is currently unavailable`,
    detail,
    traceId,
    503
  );
}
