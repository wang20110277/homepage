import { logInfo, logError } from "./logger";
import { TRACE_ID_HEADER, generateTraceId } from "./trace";
import type { HttpClientOptions, HttpRequestOptions } from "./types";

/**
 * HTTP client error
 */
export class HttpClientError extends Error {
  public readonly statusCode?: number;
  public readonly responseBody?: unknown;
  public readonly traceId?: string;

  constructor(
    message: string,
    statusCode?: number,
    responseBody?: unknown,
    traceId?: string
  ) {
    super(message);
    this.name = "HttpClientError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.traceId = traceId;
  }
}

/**
 * HTTP client wrapper for consistent service calls
 * Features:
 * - Unified timeout handling
 * - Automatic trace ID propagation
 * - Request/response logging
 * - Error standardization
 */
export class HttpClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.defaultTimeout = options.timeout ?? 30000; // 30 seconds default
    this.defaultHeaders = options.headers ?? {};
  }

  /**
   * Make an HTTP request
   */
  async request<T>(
    path: string,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    const {
      method = "GET",
      headers = {},
      body,
      timeout = this.defaultTimeout,
      traceId = generateTraceId(),
      onResponse,
    } = options;

    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const startTime = Date.now();

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers,
      [TRACE_ID_HEADER]: traceId,
    };

    // Add Content-Type for JSON body
    if (body && !requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }

    // Log request start
    logInfo(traceId, `HTTP ${method} ${url}`, {
      timeout,
    });

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const elapsedTime = Date.now() - startTime;

      // Try to parse response as JSON
      let responseData: unknown;
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Log response
      if (response.ok) {
        onResponse?.({ statusCode: response.status });
        logInfo(traceId, `HTTP ${method} ${url} completed`, {
          statusCode: response.status,
          elapsedMs: elapsedTime,
        });
      } else {
        logError(traceId, `HTTP ${method} ${url} failed`, {
          statusCode: response.status,
          elapsedMs: elapsedTime,
          response: responseData,
        });

        throw new HttpClientError(
          `HTTP request failed with status ${response.status}`,
          response.status,
          responseData,
          traceId
        );
      }

      return responseData as T;
    } catch (error) {
      const elapsedTime = Date.now() - startTime;

      if (error instanceof HttpClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          logError(traceId, `HTTP ${method} ${url} timed out`, {
            timeout,
            elapsedMs: elapsedTime,
          });
          throw new HttpClientError(
            `Request timed out after ${timeout}ms`,
            undefined,
            undefined,
            traceId
          );
        }

        logError(traceId, `HTTP ${method} ${url} error`, {
          error: error.message,
          elapsedMs: elapsedTime,
        });
        throw new HttpClientError(error.message, undefined, undefined, traceId);
      }

      throw new HttpClientError(
        "Unknown error occurred",
        undefined,
        undefined,
        traceId
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Convenience method for GET requests
   */
  async get<T>(path: string, options?: Omit<HttpRequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  /**
   * Convenience method for POST requests
   */
  async post<T>(
    path: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T>(
    path: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "PUT", body });
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T>(path: string, options?: Omit<HttpRequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  /**
   * Convenience method for PATCH requests
   */
  async patch<T>(
    path: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: "PATCH", body });
  }
}

/**
 * Create a new HTTP client instance
 */
export function createHttpClient(options: HttpClientOptions): HttpClient {
  return new HttpClient(options);
}
