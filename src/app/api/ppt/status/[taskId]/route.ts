import { NextRequest } from "next/server";
import { ok, notFound, serverError, serviceUnavailable } from "@/lib/core/api-response";
import { logInfo, logError } from "@/lib/core/logger";
import { withOptionalAuth, type BffRouteHandler } from "@/lib/core/bff-auth";
import {
  checkGenerationStatus,
  PresentonServiceError,
} from "@/lib/services/presenton";

/**
 * GET /api/ppt/status/[taskId]
 *
 * Check the status of an async PPT generation task
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     taskId: string,
 *     status: 'pending' | 'processing' | 'completed' | 'failed',
 *     progress?: number,
 *     result?: PresentationData,
 *     error?: string
 *   },
 *   traceId: string
 * }
 */
const handler: BffRouteHandler = async (request: NextRequest, context) => {
  const { traceId } = context;

  // Extract task ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const taskId = pathParts[pathParts.length - 1];

  if (!taskId || taskId === "status") {
    return notFound("Task ID is required", traceId);
  }

  logInfo(traceId, "Task status request", { taskId });

  try {
    const status = await checkGenerationStatus(taskId, traceId);
    return ok(status, traceId);
  } catch (error) {
    if (error instanceof PresentonServiceError) {
      if (error.code === "SERVICE_ERROR") {
        // Check if it's a 404 from Presenton
        const detail = error.detail as { statusCode?: number } | undefined;
        if (detail?.statusCode === 404) {
          return notFound(`Task ${taskId} not found`, traceId);
        }
        return serviceUnavailable("Presenton", error.detail, traceId);
      }

      logError(traceId, "Presenton service error checking status", {
        code: error.code,
        message: error.message,
      });

      return serverError(
        `Failed to check task status: ${error.message}`,
        { code: error.code },
        traceId
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logError(traceId, "Unexpected error checking task status", {
      error: errorMessage,
    });

    return serverError(
      "An unexpected error occurred while checking task status",
      undefined,
      traceId
    );
  }
};

export const GET = withOptionalAuth(handler);
