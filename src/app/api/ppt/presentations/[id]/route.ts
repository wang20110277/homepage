import { NextRequest } from "next/server";
import {
  ok,
  badRequest,
  serverError,
  serviceUnavailable,
} from "@/lib/core/api-response";
import { logInfo, logError } from "@/lib/core/logger";
import { getTraceId } from "@/lib/core/trace";
import { getUserFromRequest } from "@/lib/core/bff-auth";
import {
  getPresentationById,
  PresentonServiceError,
} from "@/lib/services/presenton";

/**
 * GET /api/ppt/presentations/[id]
 *
 * Get a single presentation by ID
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     title: string,
 *     slides: SlideContent[],
 *     created_at: string,
 *     updated_at?: string,
 *     download_url?: string,
 *     preview_url?: string
 *   },
 *   traceId: string
 * }
 */
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request);
  const user = await getUserFromRequest(request);
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return badRequest("Presentation ID is required", undefined, traceId);
  }

  logInfo(traceId, "Fetching presentation by ID", {
    userId: user?.id,
    presentationId: id,
  });

  try {
    const presentation = await getPresentationById(id, traceId);

    logInfo(traceId, "Presentation fetched successfully", {
      presentationId: id,
      slidesCount: presentation.slides?.length,
    });

    return ok(presentation, traceId);
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
        `Failed to fetch presentation: ${error.message}`,
        { code: error.code },
        traceId
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logError(traceId, "Unexpected error fetching presentation", {
      error: errorMessage,
    });

    return serverError(
      "An unexpected error occurred while fetching presentation",
      undefined,
      traceId
    );
  }
}

export const GET = handler;
