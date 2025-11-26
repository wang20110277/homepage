import { NextRequest } from "next/server";
import { ok, serverError, serviceUnavailable } from "@/lib/core/api-response";
import { logInfo, logError } from "@/lib/core/logger";
import { withOptionalAuth, type BffRouteHandler } from "@/lib/core/bff-auth";
import {
  getTemplates,
  PresentonServiceError,
} from "@/lib/services/presenton";

/**
 * GET /api/ppt/templates
 *
 * Get all available presentation templates
 *
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: string,
 *       name: string,
 *       description?: string,
 *       thumbnail?: string,
 *       category?: string
 *     },
 *     ...
 *   ],
 *   traceId: string
 * }
 */
const handler: BffRouteHandler = async (request: NextRequest, context) => {
  const { traceId } = context;

  logInfo(traceId, "Templates request received");

  try {
    const templates = await getTemplates(traceId);
    return ok(templates, traceId);
  } catch (error) {
    if (error instanceof PresentonServiceError) {
      if (error.code === "SERVICE_ERROR") {
        return serviceUnavailable("Presenton", error.detail, traceId);
      }

      logError(traceId, "Presenton service error fetching templates", {
        code: error.code,
        message: error.message,
      });

      return serverError(
        `Failed to fetch templates: ${error.message}`,
        { code: error.code },
        traceId
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logError(traceId, "Unexpected error fetching templates", {
      error: errorMessage,
    });

    return serverError(
      "An unexpected error occurred while fetching templates",
      undefined,
      traceId
    );
  }
};

export const GET = withOptionalAuth(handler);
