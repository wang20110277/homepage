import { NextRequest } from "next/server";
import { ok, serverError, serviceUnavailable } from "@/lib/core/api-response";
import { logInfo, logError } from "@/lib/core/logger";
import { withOptionalAuth, type BffRouteHandler } from "@/lib/core/bff-auth";
import {
  getAllPresentations,
  PresentonServiceError,
} from "@/lib/services/presenton";

/**
 * GET /api/ppt/presentations
 *
 * Get all user presentations
 *
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: string,
 *       title: string,
 *       slides: SlideContent[],
 *       created_at: string,
 *       updated_at?: string,
 *       download_url?: string,
 *       preview_url?: string
 *     }
 *   ],
 *   traceId: string
 * }
 */
const handler: BffRouteHandler = async (request: NextRequest, context) => {
  const { user, traceId } = context;

  logInfo(traceId, "Fetching all presentations", {
    userId: user?.id,
  });

  try {
    const presentations = await getAllPresentations(traceId);

    logInfo(traceId, "Presentations fetched successfully", {
      count: presentations.length,
    });

    return ok(presentations, traceId);
  } catch (error) {
    if (error instanceof PresentonServiceError) {
      if (error.code === "SERVICE_ERROR") {
        return serviceUnavailable("Presenton", error.detail, traceId);
      }

      logError(traceId, "Presenton service error", {
        code: error.code,
        message: error.message,
        detail: error.detail,
      });

      return serverError(
        `Failed to fetch presentations: ${error.message}`,
        { code: error.code },
        traceId
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logError(traceId, "Unexpected error fetching presentations", {
      error: errorMessage,
    });

    return serverError(
      "An unexpected error occurred while fetching presentations",
      undefined,
      traceId
    );
  }
};

export const GET = withOptionalAuth(handler);
