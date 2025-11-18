import { NextRequest } from "next/server";
import { z } from "zod";
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
  exportPresentation,
  PresentonServiceError,
} from "@/lib/services/presenton";

/**
 * Request body schema for PPT export
 */
const ExportPptSchema = z.object({
  format: z.enum(["pptx", "pdf"]).optional().default("pptx"),
});

/**
 * POST /api/ppt/presentations/[id]/export
 *
 * Export a presentation as PPTX or PDF
 *
 * Request body:
 * {
 *   format?: "pptx" | "pdf" (default: "pptx")
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     downloadUrl: string,
 *     format: "pptx" | "pdf",
 *     expiresAt?: string
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

  logInfo(traceId, "Exporting presentation", {
    userId: user?.id,
    presentationId: id,
  });

  try {
    // Parse request body
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      return badRequest("Invalid JSON in request body", undefined, traceId);
    }

    // Validate request body
    const validationResult = ExportPptSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      logInfo(traceId, "Validation failed for PPT export", { errors });

      return badRequest("Validation failed", errors, traceId);
    }

    const { format } = validationResult.data;

    const result = await exportPresentation(id, format, traceId);

    logInfo(traceId, "Presentation exported successfully", {
      presentationId: id,
      format,
      downloadUrl: result.download_url,
    });

    return ok(
      {
        downloadUrl: result.download_url,
        format,
      },
      traceId
    );
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
        `Failed to export presentation: ${error.message}`,
        { code: error.code },
        traceId
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logError(traceId, "Unexpected error exporting presentation", {
      error: errorMessage,
    });

    return serverError(
      "An unexpected error occurred while exporting presentation",
      undefined,
      traceId
    );
  }
}

export const POST = handler;
