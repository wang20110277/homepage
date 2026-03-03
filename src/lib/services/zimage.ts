import { createHttpClient, HttpClientError } from "@/lib/core/http-client";
import { logInfo, logError } from "@/lib/core/logger";

/**
 * Z-Image service configuration
 */
const ZIMAGE_BASE_URL = process.env.ZIMAGE_BASE_URL;

if (!ZIMAGE_BASE_URL) {
  throw new Error(
    "ZIMAGE_BASE_URL environment variable is required. Please configure it in your .env file."
  );
}
const ZIMAGE_TIMEOUT = parseInt(
  process.env.ZIMAGE_TIMEOUT || "120000",
  10
); // 2 minutes default for image generation
const ZIMAGE_MODEL = process.env.ZIMAGE_MODEL || "Z-Image-Turbo";

/**
 * HTTP client instance for Z-Image service
 */
const zimageClient = createHttpClient({
  baseUrl: ZIMAGE_BASE_URL,
  timeout: ZIMAGE_TIMEOUT,
});

/**
 * Input parameters for image generation
 */
export interface GenerateImageInput {
  /** Text prompt for image generation */
  prompt: string;
  /** Number of images to generate (default: 1) */
  n?: number;
  /** Size of the generated image (default: "1024x1024") */
  size?: "256x256" | "512x512" | "1024x1024" | "1024x1792" | "1792x1024";
  /** Response format (default: "url") */
  response_format?: "url" | "b64_json";
}

/**
 * Generated image result
 */
export interface GeneratedImage {
  /** Image URL or base64 data */
  url?: string;
  b64_json?: string;
  /** Revised prompt if the service modified it */
  revised_prompt?: string;
}

/**
 * Image generation result
 */
export interface GenerateImageResult {
  /** Creation timestamp */
  created: number;
  /** Generated images */
  data: GeneratedImage[];
  /** Model used for generation */
  model: string;
  /** Inference time in seconds */
  inferenceTime: number;
}

/**
 * OpenAI Images API response structure
 */
interface OpenAIImagesResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

/**
 * Z-Image service error
 */
export class ZImageServiceError extends Error {
  public readonly code: string;
  public readonly detail?: unknown;
  public readonly traceId?: string;

  constructor(
    code: string,
    message: string,
    detail?: unknown,
    traceId?: string
  ) {
    super(message);
    this.name = "ZImageServiceError";
    this.code = code;
    this.detail = detail;
    this.traceId = traceId;
  }
}

/**
 * Validate input parameters for image generation
 */
function validateGenerateInput(input: GenerateImageInput): void {
  if (!input.prompt || typeof input.prompt !== "string") {
    throw new ZImageServiceError(
      "INVALID_INPUT",
      "Prompt is required and must be a string"
    );
  }

  if (input.prompt.trim().length < 1) {
    throw new ZImageServiceError(
      "INVALID_INPUT",
      "Prompt cannot be empty"
    );
  }

  if (input.prompt.length > 4000) {
    throw new ZImageServiceError(
      "INVALID_INPUT",
      "Prompt must not exceed 4000 characters"
    );
  }

  if (input.n !== undefined && (input.n < 1 || input.n > 10)) {
    throw new ZImageServiceError(
      "INVALID_INPUT",
      "Number of images must be between 1 and 10"
    );
  }
}

/**
 * Generate images from text prompt using Z-Image service
 *
 * Calls the OpenAI-compatible images/generations endpoint
 * POST /images/generations
 *
 * @param input - Generation parameters (prompt, n, size, response_format)
 * @param traceId - Optional trace ID for logging
 * @returns Generation result with images and metadata
 * @throws ZImageServiceError if generation fails
 */
export async function generateImage(
  input: GenerateImageInput,
  traceId?: string
): Promise<GenerateImageResult> {
  const logTraceId = traceId || "no-trace";

  logInfo(logTraceId, "Starting image generation", {
    prompt: input.prompt.substring(0, 100),
    n: input.n || 1,
    size: input.size || "1024x1024",
  });

  // Validate input
  validateGenerateInput(input);

  const startTime = Date.now();

  try {
    // Build request body for OpenAI-compatible API
    const requestBody = {
      model: ZIMAGE_MODEL,
      prompt: input.prompt,
      n: input.n || 1,
      size: input.size || "1024x1024",
      response_format: input.response_format || "url",
    };

    logInfo(logTraceId, "Calling Z-Image API", {
      model: ZIMAGE_MODEL,
      size: requestBody.size,
      n: requestBody.n,
    });

    // Call Z-Image API
    const response = await zimageClient.post<OpenAIImagesResponse>(
      "/images/generations",
      requestBody,
      { traceId }
    );

    const endTime = Date.now();
    const inferenceTime = (endTime - startTime) / 1000; // Convert to seconds

    if (!response.data || response.data.length === 0) {
      throw new ZImageServiceError(
        "INVALID_RESPONSE",
        "Image generation response missing image data",
        response,
        logTraceId
      );
    }

    // 处理返回的图片 URL - 将相对路径转换为完整 URL
    const baseUrlWithoutVersion = ZIMAGE_BASE_URL.replace(/\/v\d*$/, ""); // 移除 /v1 后缀

    const result: GenerateImageResult = {
      created: response.created || Date.now(),
      data: response.data.map((item) => {
        let imageUrl = item.url;
        // 如果是相对路径，转换为完整 URL
        if (imageUrl && !imageUrl.startsWith("http")) {
          // 移除 /root/.xinference 前缀，因为 API 服务器可能直接提供 /image 路径
          imageUrl = imageUrl.replace(/^\/root\/\.xinference/, "");
          imageUrl = `${baseUrlWithoutVersion}${imageUrl}`;
        }
        return {
          url: imageUrl,
          b64_json: item.b64_json,
          revised_prompt: item.revised_prompt,
        };
      }),
      model: ZIMAGE_MODEL,
      inferenceTime,
    };

    logInfo(logTraceId, "Image generation completed successfully", {
      inferenceTime,
      imageCount: result.data.length,
    });

    return result;
  } catch (error) {
    return handleZImageError(error, "Image generation", logTraceId);
  }
}

/**
 * Check Z-Image service health
 */
export async function checkZImageHealth(
  traceId?: string
): Promise<{ healthy: boolean; models?: string[] }> {
  const logTraceId = traceId || "health-check";

  try {
    // Try to get models list to check service availability
    const response = await zimageClient.get<{ data?: Array<{ id: string }> }>(
      "/models",
      { traceId, timeout: 5000 }
    );

    const models = response.data?.map((m) => m.id) || [];

    logInfo(logTraceId, "Z-Image service is healthy", { models });
    return { healthy: true, models };
  } catch (error) {
    logError(logTraceId, "Z-Image service health check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { healthy: false };
  }
}

/**
 * Handle Z-Image service errors consistently
 */
function handleZImageError(
  error: unknown,
  operation: string,
  traceId: string
): never {
  if (error instanceof ZImageServiceError) {
    logError(traceId, `Z-Image service error during ${operation}`, {
      code: error.code,
      message: error.message,
      detail: error.detail,
    });
    throw error;
  }

  if (error instanceof HttpClientError) {
    logError(traceId, `HTTP error during ${operation}`, {
      statusCode: error.statusCode,
      message: error.message,
      responseBody: error.responseBody,
    });

    // Check for specific error codes
    if (error.statusCode === 500) {
      const responseBody = error.responseBody as { error?: string } | undefined;
      const errorMessage = responseBody?.error || error.message;

      throw new ZImageServiceError(
        "SERVICE_ERROR",
        `Image generation service error: ${errorMessage}`,
        {
          statusCode: error.statusCode,
          responseBody: error.responseBody,
        },
        traceId
      );
    }

    throw new ZImageServiceError(
      "SERVICE_ERROR",
      `Failed to communicate with Z-Image service: ${error.message}`,
      {
        statusCode: error.statusCode,
        responseBody: error.responseBody,
      },
      traceId
    );
  }

  // Unknown error
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  logError(traceId, `Unknown error during ${operation}`, {
    error: errorMessage,
  });

  throw new ZImageServiceError(
    "UNKNOWN_ERROR",
    `Unexpected error during ${operation}: ${errorMessage}`,
    undefined,
    traceId
  );
}
