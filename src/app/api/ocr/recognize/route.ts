import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ok,
  badRequest,
  serverError,
  serviceUnavailable,
} from "@/lib/core/api-response";
import { logInfo, logError } from "@/lib/core/logger";
import { withAuth, type BffRouteHandler } from "@/lib/core/bff-auth";
import {
  recognizeImage,
  DeepseekOcrServiceError,
  type RecognizeImageInput,
} from "@/lib/services/deepseek-ocr";

/**
 * Request body schema for OCR recognition
 */
const RecognizeRequestSchema = z.object({
  image: z
    .string()
    .min(10, "Image data must be at least 10 characters")
    .max(10485760, "Image data must not exceed 10MB (base64)"), // ~10MB base64 limit
  prompt: z
    .string()
    .max(500, "Prompt must not exceed 500 characters")
    .optional(),
});

/**
 * POST /api/ocr/recognize
 *
 * Recognize text from an image using Deepseek OCR service
 *
 * Request body:
 * - image: string (required, base64-encoded without data: prefix) - Image data
 * - prompt: string (optional, max 500 chars) - Custom OCR prompt
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     text: string,
 *     inferenceTime: number,
 *     model: string
 *   },
 *   traceId: string
 * }
 */
const handler: BffRouteHandler = async (request: NextRequest, context) => {
  const { user, traceId } = context;

  logInfo(traceId, "OCR recognition request received", {
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
    const validationResult = RecognizeRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      logInfo(traceId, "Validation failed for OCR recognition", { errors });

      return badRequest("Validation failed", errors, traceId);
    }

    const input: RecognizeImageInput = validationResult.data;

    logInfo(traceId, "Calling Deepseek OCR service", {
      imageLength: input.image?.length || 0,
      hasPrompt: !!input.prompt,
    });

    // Call Deepseek OCR service
    const result = await recognizeImage(input, traceId);

    return ok(result, traceId);
  } catch (error) {
    if (error instanceof DeepseekOcrServiceError) {
      // Handle known service errors
      if (error.code === "INVALID_INPUT") {
        return badRequest(error.message, error.detail, traceId);
      }

      if (error.code === "SERVICE_ERROR") {
        return serviceUnavailable("Deepseek OCR", error.detail, traceId);
      }

      // Other service errors
      logError(traceId, "Deepseek OCR service error in route", {
        code: error.code,
        message: error.message,
        detail: error.detail,
      });

      return serverError(
        `OCR recognition failed: ${error.message}`,
        { code: error.code },
        traceId
      );
    }

    // Unknown errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logError(traceId, "Unexpected error in OCR recognition route", {
      error: errorMessage,
    });

    return serverError(
      "An unexpected error occurred during OCR recognition",
      undefined,
      traceId
    );
  }
};

export const POST = withAuth(handler);
