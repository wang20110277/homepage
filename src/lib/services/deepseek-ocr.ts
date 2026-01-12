import { createHttpClient, HttpClientError } from "@/lib/core/http-client";
import { logInfo, logError } from "@/lib/core/logger";

/**
 * Deepseek OCR service configuration
 */
const DEEPSEEK_OCR_BASE_URL =
  process.env.DEEPSEEK_OCR_BASE_URL || "http://10.162.1.158:8088/v1";
const DEEPSEEK_OCR_TIMEOUT = parseInt(
  process.env.DEEPSEEK_OCR_TIMEOUT || "120000",
  10
); // 2 minutes default for OCR processing
const DEEPSEEK_OCR_API_KEY = process.env.DEEPSEEK_OCR_API_KEY || "test";
const DEEPSEEK_OCR_MODEL =
  process.env.DEEPSEEK_OCR_MODEL || "Deepseek-OCR";

/**
 * HTTP client instance for Deepseek OCR service
 */
const deepseekOcrClient = createHttpClient({
  baseUrl: DEEPSEEK_OCR_BASE_URL,
  timeout: DEEPSEEK_OCR_TIMEOUT,
  headers: {
    Authorization: `Bearer ${DEEPSEEK_OCR_API_KEY}`,
  },
});

/**
 * Input parameters for OCR recognition
 */
export interface RecognizeImageInput {
  /** Base64-encoded image data (without data:image prefix) */
  image: string;
  /** Optional prompt for OCR (default: "Convert the document to markdown") */
  prompt?: string;
}

/**
 * OCR recognition result
 */
export interface RecognizeImageResult {
  /** Recognized text in Markdown format */
  text: string;
  /** Inference time in seconds */
  inferenceTime: number;
  /** Model used for recognition */
  model: string;
}

/**
 * Deepseek OCR chat completion response structure
 */
interface ChatCompletionResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Deepseek OCR service error
 */
export class DeepseekOcrServiceError extends Error {
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
    this.name = "DeepseekOcrServiceError";
    this.code = code;
    this.detail = detail;
    this.traceId = traceId;
  }
}

/**
 * Validate input parameters for OCR recognition
 */
function validateRecognizeInput(input: RecognizeImageInput): void {
  if (!input.image || typeof input.image !== "string") {
    throw new DeepseekOcrServiceError(
      "INVALID_INPUT",
      "Image data is required and must be a base64 string"
    );
  }

  if (input.image.trim().length < 10) {
    throw new DeepseekOcrServiceError(
      "INVALID_INPUT",
      "Image data appears to be invalid or too short"
    );
  }

  // Check if image contains data URL prefix (it shouldn't)
  if (input.image.startsWith("data:")) {
    throw new DeepseekOcrServiceError(
      "INVALID_INPUT",
      "Image data should not include data URL prefix (data:image/...)"
    );
  }
}

/**
 * Recognize text from an image using Deepseek OCR
 *
 * Calls the Deepseek OCR API via chat completions endpoint
 * POST /chat/completions
 * Body: {
 *   model: string,
 *   messages: [{ role, content: [{ type: "image_url", image_url }, { type: "text", text }] }],
 *   temperature: 0.0,
 *   extra_body: { skip_special_tokens, vllm_xargs }
 * }
 * Response: { choices: [{ message: { content: string } }] }
 *
 * @param input - Recognition parameters (image, optional prompt)
 * @param traceId - Optional trace ID for logging
 * @returns Recognition result with text and inference time
 * @throws DeepseekOcrServiceError if recognition fails
 */
export async function recognizeImage(
  input: RecognizeImageInput,
  traceId?: string
): Promise<RecognizeImageResult> {
  const logTraceId = traceId || "no-trace";

  logInfo(logTraceId, "Starting OCR recognition", {
    imageLength: input.image?.length || 0,
    hasPrompt: !!input.prompt,
  });

  // Validate input
  validateRecognizeInput(input);

  const startTime = Date.now();

  try {
    // Build request body for Deepseek OCR API
    const requestBody = {
      model: DEEPSEEK_OCR_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${input.image}`,
              },
            },
            {
              type: "text",
              text: input.prompt || "Convert the document to markdown",
            },
          ],
        },
      ],
      temperature: 0.0,
      extra_body: {
        skip_special_tokens: false,
        vllm_xargs: {
          ngram_size: 30,
          window_size: 90,
          whitelist_token_ids: [128821, 128822],
        },
      },
    };

    logInfo(logTraceId, "Calling Deepseek OCR API", {
      model: DEEPSEEK_OCR_MODEL,
      prompt: input.prompt || "Convert the document to markdown",
    });

    // Call Deepseek OCR API
    const response = await deepseekOcrClient.post<ChatCompletionResponse>(
      "/chat/completions",
      requestBody,
      { traceId }
    );

    const endTime = Date.now();
    const inferenceTime = (endTime - startTime) / 1000; // Convert to seconds

    // Extract recognized text from response
    const recognizedText = response.choices?.[0]?.message?.content || "";

    if (!recognizedText) {
      throw new DeepseekOcrServiceError(
        "INVALID_RESPONSE",
        "OCR response missing recognized text content",
        response,
        logTraceId
      );
    }

    const result: RecognizeImageResult = {
      text: recognizedText,
      inferenceTime,
      model: DEEPSEEK_OCR_MODEL,
    };

    logInfo(logTraceId, "OCR recognition completed successfully", {
      inferenceTime,
      textLength: recognizedText.length,
    });

    return result;
  } catch (error) {
    return handleDeepseekOcrError(error, "OCR recognition", logTraceId);
  }
}

/**
 * Check Deepseek OCR service health
 */
export async function checkDeepseekOcrHealth(
  traceId?: string
): Promise<boolean> {
  const logTraceId = traceId || "health-check";

  try {
    // Try a minimal request to check service availability
    // Some services don't have /health endpoint, so we use a lightweight test
    await deepseekOcrClient.get("/health", { traceId, timeout: 5000 });
    logInfo(logTraceId, "Deepseek OCR service is healthy");
    return true;
  } catch {
    logError(logTraceId, "Deepseek OCR service health check failed");
    return false;
  }
}

/**
 * Handle Deepseek OCR service errors consistently
 */
function handleDeepseekOcrError(
  error: unknown,
  operation: string,
  traceId: string
): never {
  if (error instanceof DeepseekOcrServiceError) {
    logError(traceId, `Deepseek OCR service error during ${operation}`, {
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

    throw new DeepseekOcrServiceError(
      "SERVICE_ERROR",
      `Failed to communicate with Deepseek OCR service: ${error.message}`,
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

  throw new DeepseekOcrServiceError(
    "UNKNOWN_ERROR",
    `Unexpected error during ${operation}: ${errorMessage}`,
    undefined,
    traceId
  );
}
