import { serverError, serviceUnavailable, unauthorized } from "@/lib/core/api-response";
import { HttpClientError } from "@/lib/core/http-client";
import { UserAccessTokenError } from "@/lib/services/user-tokens";

export function mapOpenWebuiError(
  error: unknown,
  traceId?: string
): ReturnType<typeof serverError> | ReturnType<typeof serviceUnavailable> | ReturnType<typeof unauthorized> {
  if (error instanceof UserAccessTokenError) {
    return unauthorized("Missing or expired OIDC token", traceId);
  }

  if (error instanceof HttpClientError) {
    return serviceUnavailable("OpenWebUI", error.responseBody, traceId);
  }

  return serverError("OpenWebUI request failed", undefined, traceId);
}
