import { createHttpClient, HttpClientError } from "@/lib/core/http-client";
import { logError, logInfo, logWarn } from "@/lib/core/logger";

interface OpenWebuiRequestOptions {
  accessToken: string;
  traceId: string;
  userId: string;
  chatId?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

interface StreamRequestOptions extends OpenWebuiRequestOptions {
  body: Record<string, unknown>;
}

const BASE_URL_ENV = process.env.OPEN_WEBUI_BASE_URL;

if (!BASE_URL_ENV) {
  throw new Error("OPEN_WEBUI_BASE_URL must be configured for Open WebUI integration");
}

const BASE_URL = BASE_URL_ENV;
const API_KEY = process.env.OPEN_WEBUI_API_KEY?.trim();

const DEFAULT_TIMEOUT = parseInt(process.env.OPEN_WEBUI_TIMEOUT || "30000", 10);
const COMPLETION_TIMEOUT = parseInt(
  process.env.OPEN_WEBUI_COMPLETION_TIMEOUT || "120000",
  10
);

export class OpenWebuiClient {
  private maxRetries = 2;
  private baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(API_KEY ? { "X-API-KEY": API_KEY } : {}),
  };
  private circuitStates = new Map<
    string,
    { failureCount: number; openUntil?: number }
  >();
  private circuitBreakerThreshold = 3;
  private circuitBreakerDurationMs = 15_000;
  private httpClient = createHttpClient({
    baseUrl: BASE_URL,
    timeout: DEFAULT_TIMEOUT,
  });

  getCompletionTimeout() {
    return COMPLETION_TIMEOUT;
  }

  private withAuthHeader(
    accessToken: string,
    headers?: Record<string, string>
  ) {
    return {
      ...this.baseHeaders,
      ...headers,
      Authorization: `Bearer ${accessToken}`,
    } satisfies Record<string, string>;
  }

  private getCircuitKey(path: string) {
    return path;
  }

  private throwIfCircuitOpen(
    path: string,
    traceId: string,
    meta: Record<string, unknown>
  ) {
    const key = this.getCircuitKey(path);
    const state = this.circuitStates.get(key);
    if (state?.openUntil && state.openUntil > Date.now()) {
      logWarn(traceId, "OpenWebUI circuit breaker open", {
        ...meta,
        retryAt: state.openUntil,
      });
      throw new HttpClientError(
        "OpenWebUI temporarily unavailable",
        503,
        undefined,
        traceId
      );
    }

    if (state?.openUntil && state.openUntil <= Date.now()) {
      this.circuitStates.delete(key);
    }
  }

  private recordFailure(
    path: string,
    traceId: string,
    meta: Record<string, unknown>
  ) {
    const key = this.getCircuitKey(path);
    const state = this.circuitStates.get(key) ?? { failureCount: 0 };
    state.failureCount += 1;

    if (state.failureCount >= this.circuitBreakerThreshold) {
      state.openUntil = Date.now() + this.circuitBreakerDurationMs;
      logWarn(traceId, "OpenWebUI circuit breaker tripped", {
        ...meta,
        openUntil: state.openUntil,
        failureCount: state.failureCount,
      });
    }

    this.circuitStates.set(key, state);
  }

  private resetCircuit(path: string) {
    const key = this.getCircuitKey(path);
    if (this.circuitStates.has(key)) {
      this.circuitStates.delete(key);
    }
  }

  private logProxySuccess(
    traceId: string,
    meta: Record<string, unknown>
  ) {
    logInfo(traceId, "OpenWebUI proxy success", meta);
  }

  private logProxyFailure(
    traceId: string,
    meta: Record<string, unknown>
  ) {
    logError(traceId, "OpenWebUI proxy failure", meta);
  }

  async request<T>(
    path: string,
    method: "GET" | "POST" | "DELETE" | "PATCH" = "GET",
    body: Record<string, unknown> | undefined,
    options: OpenWebuiRequestOptions
  ): Promise<T> {
    const { accessToken, traceId, timeout, headers, userId, chatId } = options;
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.maxRetries) {
      this.throwIfCircuitOpen(path, traceId, {
        userId,
        chatId,
        path,
        method,
      });
      const startTime = Date.now();
      let responseStatus: number | undefined;

      try {
        const result = await this.httpClient.request<T>(path, {
          method,
          body,
          timeout,
          traceId,
          headers: this.withAuthHeader(accessToken, headers),
          onResponse: ({ statusCode }) => {
            responseStatus = statusCode;
          },
        });

        this.resetCircuit(path);
        this.logProxySuccess(traceId, {
          userId,
          chatId,
          path,
          method,
          attempt,
          status: responseStatus ?? "success",
          elapsedMs: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        lastError = error;
        const elapsed = Date.now() - startTime;
        const statusCode =
          error instanceof HttpClientError ? error.statusCode : undefined;

        this.logProxyFailure(traceId, {
          userId,
          chatId,
          path,
          method,
          attempt,
          status: statusCode ?? "error",
          elapsedMs: elapsed,
          error: error instanceof Error ? error.message : String(error),
        });

        const isServerError =
          error instanceof HttpClientError &&
          (error.statusCode === undefined || error.statusCode >= 500);

        if (isServerError) {
          this.recordFailure(path, traceId, {
            userId,
            chatId,
            path,
            method,
            statusCode,
          });
        } else {
          this.resetCircuit(path);
        }

        if (!isServerError || attempt === this.maxRetries) {
          throw error;
        }

        const delay = 200 * Math.pow(2, attempt);
        logInfo(traceId, "Retrying OpenWebUI request", {
          path,
          method,
          attempt: attempt + 1,
          delay,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Unknown error calling OpenWebUI");
  }

  async stream(
    path: string,
    { body, accessToken, traceId, timeout, userId, chatId }: StreamRequestOptions
  ): Promise<Response> {
    const controller = new AbortController();
    const effectiveTimeout = timeout ?? COMPLETION_TIMEOUT;
    const timer = setTimeout(() => controller.abort(), effectiveTimeout);
    const startTime = Date.now();

    try {
      this.throwIfCircuitOpen(path, traceId, {
        userId,
        chatId,
        path,
        method: "POST",
        stream: true,
      });

      const response = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: this.withAuthHeader(accessToken, {
          "Accept": "text/event-stream",
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new HttpClientError(
          `Streaming request failed with status ${response.status}`,
          response.status,
          text,
          traceId
        );
      }

      this.resetCircuit(path);
      this.logProxySuccess(traceId, {
        userId,
        chatId,
        path,
        method: "POST",
        status: response.status,
        elapsedMs: Date.now() - startTime,
        stream: true,
      });

      return response;
    } catch (error) {
      const statusCode =
        error instanceof HttpClientError ? error.statusCode : undefined;
      if (
        error instanceof HttpClientError &&
        (error.statusCode === undefined || error.statusCode >= 500)
      ) {
        this.recordFailure(path, traceId, {
          userId,
          chatId,
          path,
          method: "POST",
          statusCode,
          stream: true,
        });
      }

      this.logProxyFailure(traceId, {
        userId,
        chatId,
        path,
        method: "POST",
        status: statusCode ?? "error",
        error: error instanceof Error ? error.message : String(error),
        stream: true,
        elapsedMs: Date.now() - startTime,
      });
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const openWebuiClient = new OpenWebuiClient();
