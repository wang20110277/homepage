/**
 * Core types for BFF layer
 */

/**
 * Unified API response format
 * All BFF endpoints should return this structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  traceId?: string;
}

/**
 * Standardized error structure
 */
export interface ApiError {
  code: string;
  message: string;
  detail?: unknown;
}

/**
 * User information extracted from authentication
 */
export interface User {
  id: string;
  email?: string;
  name?: string;
  roles?: string[];
}

/**
 * HTTP client options
 */
export interface HttpClientOptions {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  traceId?: string;
}

/**
 * Logger metadata
 */
export interface LogMeta {
  [key: string]: unknown;
}

/**
 * Job status for async task management
 */
export type JobStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Job record for async task tracking
 */
export interface Job<T = unknown> {
  id: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  result?: T;
  error?: ApiError;
  traceId?: string;
}
