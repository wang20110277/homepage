import { NextRequest } from "next/server";
import { unauthorized, notFound } from "@/lib/core/api-response";
import { getTraceId } from "@/lib/core/trace";
import { getUserFromRequest } from "@/lib/core/bff-auth";
import { logError, logInfo } from "@/lib/core/logger";
import { getOpenWebuiAccessToken } from "@/lib/services/user-tokens";
import { mapOpenWebuiError } from "../../../../open-webui/error-handler";

function getFileIdFromRequest(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const fileIdIndex = segments.indexOf("files") + 1;
  return segments[fileIdIndex];
}

export async function GET(request: NextRequest) {
  const traceId = getTraceId(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    return unauthorized("Authentication required", traceId);
  }

  const fileId = getFileIdFromRequest(request);

  if (!fileId) {
    return notFound("File ID not found in request", traceId);
  }

  try {
    const accessToken = await getOpenWebuiAccessToken(user.id);
    const baseUrl = process.env.OPEN_WEBUI_BASE_URL;

    if (!baseUrl) {
      throw new Error("OPEN_WEBUI_BASE_URL is not configured");
    }

    logInfo(traceId, "Fetching file content from OpenWebUI", {
      fileId,
      userId: user.id,
    });

    // Fetch file from OpenWebUI
    const response = await fetch(`${baseUrl}/api/v1/files/${fileId}/content`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        logError(traceId, "File not found in OpenWebUI", {
          fileId,
          userId: user.id,
          status: response.status,
        });
        return notFound(`File ${fileId} not found`, traceId);
      }

      const errorText = await response.text();
      logError(traceId, "Failed to fetch file from OpenWebUI", {
        fileId,
        userId: user.id,
        status: response.status,
        error: errorText,
      });

      throw new Error(`OpenWebUI returned status ${response.status}: ${errorText}`);
    }

    // Get content type from OpenWebUI response
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentLength = response.headers.get("content-length");

    logInfo(traceId, "File content fetched successfully", {
      fileId,
      userId: user.id,
      contentType,
      contentLength,
    });

    // Stream the file content back to the client
    const fileContent = await response.arrayBuffer();

    return new Response(fileContent, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Trace-Id": traceId,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
      },
    });
  } catch (error) {
    logError(traceId, "Failed to fetch file content", {
      fileId,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapOpenWebuiError(error, traceId);
  }
}
