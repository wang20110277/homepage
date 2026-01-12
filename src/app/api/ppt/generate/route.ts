import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ok,
  badRequest,
  serverError,
  serviceUnavailable,
} from "@/lib/core/api-response";
import { logInfo, logError } from "@/lib/core/logger";
import { withOptionalAuth, type BffRouteHandler } from "@/lib/core/bff-auth";
import {
  generatePpt,
  generatePptAsync,
  PresentonServiceError,
  type GeneratePptInput,
} from "@/lib/services/presenton";

/**
 * Request body schema for PPT generation
 * Simplified to match actual Presenton API v1/ppt/generate
 * Language is hardcoded to "Chinese (Simplified - 中文, 汉语)"
 * Export format is hardcoded to "pptx"
 * Template is hardcoded to "general"
 */
const GeneratePptSchema = z.object({
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(50000, "Content must not exceed 50000 characters"),
  n_slides: z
    .number()
    .int()
    .min(1, "Must generate at least 1 slide")
    .max(50, "Cannot generate more than 50 slides")
    .optional()
    .default(8),
  // BFF-specific option for async generation
  async: z.boolean().optional().default(false),
});

/**
 * POST /api/ppt/generate
 *
 * Generate a PPT presentation using Presenton service
 *
 * Request body (simplified):
 * - content: string (required, 10-50000 chars) - PPT content/topic
 * - n_slides: number (optional, 1-50, default 8) - Number of slides
 * - async: boolean (optional, default false) - Async generation mode
 *
 * Note: Language is hardcoded to "Chinese (Simplified - 中文, 汉语)"
 * Note: Export format is hardcoded to "pptx"
 * Note: Template is hardcoded to "general"
 *
 * Response (sync):
 * {
 *   success: true,
 *   data: {
 *     presentation: { id, download_url, ... },
 *     downloadUrl: string
 *   },
 *   traceId: string
 * }
 *
 * Response (async):
 * {
 *   success: true,
 *   data: {
 *     taskId: string,
 *     message: string
 *   },
 *   traceId: string
 * }
 */
const handler: BffRouteHandler = async (request: NextRequest, context) => {
  const { user, traceId } = context;

  logInfo(traceId, "PPT generation request received", {
    userId: user?.id,
    ip: request.headers.get("x-forwarded-for") || "unknown",
  });

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON in request body", undefined, traceId);
    }

    // Validate request body
    const validationResult = GeneratePptSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      logInfo(traceId, "Validation failed for PPT generation", { errors });

      return badRequest("Validation failed", errors, traceId);
    }

    const { async: isAsync, ...input } = validationResult.data;
    const generationInput: GeneratePptInput = input;

    logInfo(traceId, "Calling Presenton service", {
      nSlides: generationInput.n_slides,
      async: isAsync,
      contentLength: generationInput.content?.length || 0,
      hasContent: !!generationInput.content,
    });

    // Call Presenton service (sync or async)
    if (isAsync) {
      const result = await generatePptAsync(generationInput, traceId);
      return ok(result, traceId);
    } else {
      const result = await generatePpt(generationInput, traceId);
      return ok(result, traceId);
    }
  } catch (error) {
    if (error instanceof PresentonServiceError) {
      // Handle known service errors
      if (error.code === "INVALID_INPUT") {
        return badRequest(error.message, error.detail, traceId);
      }

      if (error.code === "SERVICE_ERROR") {
        return serviceUnavailable("Presenton", error.detail, traceId);
      }

      // Other service errors
      logError(traceId, "Presenton service error in route", {
        code: error.code,
        message: error.message,
        detail: error.detail,
      });

      return serverError(
        `PPT generation failed: ${error.message}`,
        { code: error.code },
        traceId
      );
    }

    // Unknown errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logError(traceId, "Unexpected error in PPT generation route", {
      error: errorMessage,
    });

    return serverError(
      "An unexpected error occurred during PPT generation",
      undefined,
      traceId
    );
  }
};

export const POST = withOptionalAuth(handler);
