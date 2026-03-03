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
import { checkToolAccess } from "@/lib/rbac";
import {
  generateImage,
  ZImageServiceError,
  type GenerateImageInput,
} from "@/lib/services/zimage";

/**
 * Request body schema for image generation
 */
const GenerateRequestSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(4000, "Prompt must not exceed 4000 characters"),
  n: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(1),
  size: z
    .enum(["256x256", "512x512", "1024x1024", "1024x1792", "1792x1024"])
    .optional()
    .default("1024x1024"),
  response_format: z
    .enum(["url", "b64_json"])
    .optional()
    .default("url"),
});

/**
 * POST /api/zimage/generate
 *
 * Generate images from text prompt using Z-Image service
 *
 * Request body:
 * - prompt: string (required, max 4000 chars) - Text description for image generation
 * - n: number (optional, 1-10, default 1) - Number of images to generate
 * - size: string (optional, default "1024x1024") - Image size
 * - response_format: string (optional, default "url") - Response format
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     created: number,
 *     data: Array<{ url?: string, b64_json?: string }>,
 *     model: string,
 *     inferenceTime: number
 *   },
 *   traceId: string
 * }
 */
const handler: BffRouteHandler = async (request: NextRequest, context) => {
  const { user, traceId } = context;

  // Check tool access
  if (user?.id) {
    const access = await checkToolAccess(user.id, "zimage");
    if (!access.allowed) {
      return badRequest(
        access.reason || "Access denied to Z-Image tool",
        undefined,
        traceId
      );
    }
  }

  logInfo(traceId, "Image generation request received", {
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
    const validationResult = GenerateRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      logInfo(traceId, "Validation failed for image generation", { errors });

      return badRequest("Validation failed", errors, traceId);
    }

    const input: GenerateImageInput = validationResult.data;

    logInfo(traceId, "Calling Z-Image service", {
      promptLength: input.prompt.length,
      n: input.n,
      size: input.size,
    });

    // Call Z-Image service
    const result = await generateImage(input, traceId);

    return ok(result, traceId);
  } catch (error) {
    if (error instanceof ZImageServiceError) {
      // Handle known service errors
      if (error.code === "INVALID_INPUT") {
        return badRequest(error.message, error.detail, traceId);
      }

      if (error.code === "SERVICE_ERROR") {
        return serviceUnavailable("Z-Image", error.detail, traceId);
      }

      // Other service errors
      logError(traceId, "Z-Image service error in route", {
        code: error.code,
        message: error.message,
        detail: error.detail,
      });

      return serverError(
        `Image generation failed: ${error.message}`,
        { code: error.code },
        traceId
      );
    }

    // Unknown errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logError(traceId, "Unexpected error in image generation route", {
      error: errorMessage,
    });

    return serverError(
      "An unexpected error occurred during image generation",
      undefined,
      traceId
    );
  }
};

export const POST = withAuth(handler);
