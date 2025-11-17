import { NextRequest } from "next/server";
import { ok, badRequest, serverError, serviceUnavailable } from "@/lib/core/api-response";
import { logInfo, logError } from "@/lib/core/logger";
import { withOptionalAuth, type BffRouteHandler } from "@/lib/core/bff-auth";
import {
  uploadFile,
  PresentonServiceError,
} from "@/lib/services/presenton";

/**
 * POST /api/ppt/files/upload
 *
 * Upload a file for use in PPT generation
 *
 * Request: multipart/form-data with 'file' field
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     filename: string,
 *     url?: string
 *   },
 *   traceId: string
 * }
 */
const handler: BffRouteHandler = async (request: NextRequest, context) => {
  const { user, traceId } = context;

  logInfo(traceId, "File upload request received", {
    userId: user?.id,
  });

  try {
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return badRequest("No file provided or invalid file format", undefined, traceId);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return badRequest(
        "File size exceeds maximum limit of 10MB",
        { fileSize: file.size, maxSize },
        traceId
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "text/plain",
    ];
    if (!allowedTypes.includes(file.type)) {
      return badRequest(
        "Invalid file type. Allowed: PDF, PNG, JPG, TXT",
        { fileType: file.type, allowedTypes },
        traceId
      );
    }

    logInfo(traceId, "Uploading file to Presenton", {
      filename: file.name,
      size: file.size,
      type: file.type,
    });

    // Create new FormData for forwarding to Presenton
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    // Upload to Presenton
    const result = await uploadFile(uploadFormData, traceId);

    return ok(result, traceId);
  } catch (error) {
    if (error instanceof PresentonServiceError) {
      if (error.code === "SERVICE_ERROR") {
        return serviceUnavailable("Presenton", error.detail, traceId);
      }

      logError(traceId, "Presenton service error in file upload", {
        code: error.code,
        message: error.message,
      });

      return serverError(
        `File upload failed: ${error.message}`,
        { code: error.code },
        traceId
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logError(traceId, "Unexpected error in file upload", {
      error: errorMessage,
    });

    return serverError(
      "An unexpected error occurred during file upload",
      undefined,
      traceId
    );
  }
};

export const POST = withOptionalAuth(handler);
