import { NextRequest } from "next/server";
import { randomUUID } from "crypto";

/**
 * Header name for trace ID
 */
export const TRACE_ID_HEADER = "X-Trace-Id";

/**
 * Generate a new trace ID
 */
export function generateTraceId(): string {
  return randomUUID();
}

/**
 * Extract trace ID from request headers or generate a new one
 */
export function getTraceId(request: NextRequest): string {
  const existingTraceId = request.headers.get(TRACE_ID_HEADER);
  return existingTraceId || generateTraceId();
}

/**
 * Create headers object with trace ID
 */
export function traceIdHeaders(traceId: string): Record<string, string> {
  return {
    [TRACE_ID_HEADER]: traceId,
  };
}
