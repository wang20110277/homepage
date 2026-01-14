import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/core/api-response";
import { logInfo, logError } from "@/lib/core/logger";
import { getUserFromRequest } from "@/lib/core/bff-auth";
import { getTraceId } from "@/lib/core/trace";

/**
 * GET /api/ppt/download?url=<encoded-url>
 *
 * Proxy download endpoint to avoid mixed content issues
 * When the frontend is HTTPS but Presenton is HTTP, this allows
 * downloading files through the HTTPS BFF layer
 *
 * Query parameters:
 * - url: The download URL from Presenton (URL-encoded)
 *
 * Response:
 * - Streams the file content with appropriate headers
 * - Sets Content-Disposition to trigger browser download
 */
export async function GET(request: NextRequest) {
  // Get trace ID
  const traceId = getTraceId(request);

  // Optional auth check (allow unauthenticated downloads if URL is valid)
  await getUserFromRequest(request);

  logInfo(traceId, "Download proxy request received");

  try {
    // Get download URL from query parameters
    const { searchParams } = new URL(request.url);
    const downloadUrl = searchParams.get("url");

    if (!downloadUrl) {
      return NextResponse.json(
        badRequest("Missing 'url' query parameter", undefined, traceId),
        { status: 400 }
      );
    }

    // Validate URL format
    let targetUrl: URL;
    try {
      targetUrl = new URL(downloadUrl);
    } catch {
      return NextResponse.json(
        badRequest("Invalid URL format", undefined, traceId),
        { status: 400 }
      );
    }

    logInfo(traceId, "Proxying download request", {
      targetUrl: targetUrl.toString(),
    });

    // Fetch the file from Presenton
    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        "X-Trace-Id": traceId,
      },
    });

    if (!response.ok) {
      logError(traceId, "Failed to fetch file from Presenton", {
        status: response.status,
        statusText: response.statusText,
      });

      return NextResponse.json(
        serverError(
          "Failed to download file from upstream service",
          { status: response.status },
          traceId
        ),
        { status: 500 }
      );
    }

    // Get filename from Content-Disposition header or URL
    let filename = "presentation.pptx";
    const contentDisposition = response.headers.get("content-disposition");
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, "");
      }
    } else {
      // Extract filename from URL path
      const pathParts = targetUrl.pathname.split("/");
      const urlFilename = pathParts[pathParts.length - 1];
      if (urlFilename) {
        filename = urlFilename;
      }
    }

    logInfo(traceId, "Streaming file to client", {
      filename,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });

    // Create response with appropriate headers
    const headers = new Headers();
    headers.set(
      "Content-Type",
      response.headers.get("content-type") ||
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    if (response.headers.get("content-length")) {
      headers.set(
        "Content-Length",
        response.headers.get("content-length") || ""
      );
    }

    // Stream the response body
    return new Response(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logError(traceId, "Unexpected error in download proxy", {
      error: errorMessage,
    });

    return NextResponse.json(
      serverError(
        "An unexpected error occurred during file download",
        undefined,
        traceId
      ),
      { status: 500 }
    );
  }
}
