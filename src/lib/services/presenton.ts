import { createHttpClient, HttpClientError } from "@/lib/core/http-client";
import { logInfo, logError } from "@/lib/core/logger";

/**
 * Presenton service configuration
 */
const PRESENTON_BASE_URL =
  process.env.PRESENTON_BASE_URL || "http://localhost:5000";
const PRESENTON_TIMEOUT = parseInt(
  process.env.PRESENTON_TIMEOUT || "600000",
  10
); // 10 minutes default for PPT generation (includes image generation time)
const PRESENTON_API_KEY = process.env.PRESENTON_API_KEY || "";

/**
 * HTTP client instance for Presenton service
 */
const presentonClient = createHttpClient({
  baseUrl: PRESENTON_BASE_URL,
  timeout: PRESENTON_TIMEOUT,
  headers: PRESENTON_API_KEY
    ? { Authorization: `Bearer ${PRESENTON_API_KEY}` }
    : {},
});

/**
 * Supported tones for presentation generation
 */
export type PresentationTone =
  | "default"
  | "professional"
  | "casual"
  | "academic"
  | "creative";

/**
 * Supported verbosity levels
 */
export type PresentationVerbosity = "concise" | "standard" | "detailed";

/**
 * Supported image types
 */
export type ImageType = "stock" | "ai" | "none";

/**
 * Supported export formats
 */
export type ExportFormat = "pptx" | "pdf";

/**
 * Input parameters for PPT generation
 * Matches the actual Presenton API
 */
export interface GeneratePptInput {
  /** Main content/topic for the presentation */
  content: string;
  /** Pre-defined slides markdown (optional) */
  slides_markdown?: string[];
  /** Additional instructions for generation */
  instructions?: string;
  /** Tone of the presentation */
  tone?: PresentationTone;
  /** Level of detail in content */
  verbosity?: PresentationVerbosity;
  /** Use markdown emphasis in content */
  markdown_emphasis?: boolean;
  /** Enable web search for content */
  web_search?: boolean;
  /** Type of images to use */
  image_type?: ImageType;
  /** Theme name or ID */
  theme?: string;
  /** Number of slides to generate (default 8) */
  n_slides?: number;
  /** Language for the presentation (e.g., "English", "Chinese", "Japanese") */
  language?: string;
  /** Template to use (e.g., "general", "business", "education") */
  template?: string;
  /** Include table of contents slide */
  include_table_of_contents?: boolean;
  /** Include title slide */
  include_title_slide?: boolean;
  /** Allow access to user info */
  allow_access_to_user_info?: boolean;
  /** Array of file IDs (from previous upload) */
  files?: string[];
  /** Export format */
  export_as?: ExportFormat;
  /** Trigger webhook on completion */
  trigger_webhook?: boolean;
}

/**
 * Slide content structure
 */
export interface SlideContent {
  index?: number;
  id?: string;
  title?: string;
  content?: Record<string, unknown>;
  type?: string;
}

/**
 * Presentation data structure
 */
export interface PresentationData {
  id: string;
  title?: string;
  slides?: SlideContent[];
  download_url?: string;
  preview_url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Result of PPT generation (sync)
 */
export interface GeneratePptResult {
  /** Presentation data */
  presentation: PresentationData;
  /** Download URL for the generated file */
  downloadUrl?: string;
  /** Preview URL */
  previewUrl?: string;
}

/**
 * Result of async PPT generation
 */
export interface GeneratePptAsyncResult {
  /** Task ID for status checking */
  taskId: string;
  /** Status message */
  message?: string;
}

/**
 * Task status response
 */
export interface TaskStatusResult {
  /** Task ID */
  taskId: string;
  /** Current status */
  status: "pending" | "processing" | "completed" | "failed";
  /** Progress percentage (0-100) */
  progress?: number;
  /** Result data when completed */
  result?: PresentationData;
  /** Error message if failed */
  error?: string;
}

/**
 * Template information
 */
export interface TemplateInfo {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category?: string;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  id: string;
  filename: string;
  url?: string;
}

/**
 * Presenton service error
 */
export class PresentonServiceError extends Error {
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
    this.name = "PresentonServiceError";
    this.code = code;
    this.detail = detail;
    this.traceId = traceId;
  }
}

/**
 * Validate input parameters for PPT generation
 */
function validateGeneratePptInput(input: GeneratePptInput): void {
  if (!input.content || typeof input.content !== "string") {
    throw new PresentonServiceError(
      "INVALID_INPUT",
      "Content is required and must be a string"
    );
  }

  if (input.content.trim().length < 10) {
    throw new PresentonServiceError(
      "INVALID_INPUT",
      "Content must be at least 10 characters long"
    );
  }

  if (input.n_slides !== undefined) {
    if (
      typeof input.n_slides !== "number" ||
      input.n_slides < 1 ||
      input.n_slides > 50
    ) {
      throw new PresentonServiceError(
        "INVALID_INPUT",
        "Number of slides must be between 1 and 50"
      );
    }
  }
}

/**
 * Generate a PPT presentation synchronously
 *
 * @param input - Generation parameters
 * @param traceId - Optional trace ID for logging
 * @returns Generated presentation result
 * @throws PresentonServiceError if generation fails
 */
export async function generatePpt(
  input: GeneratePptInput,
  traceId?: string
): Promise<GeneratePptResult> {
  const logTraceId = traceId || "no-trace";

  logInfo(logTraceId, "Starting sync PPT generation", {
    nSlides: input.n_slides,
    language: input.language,
    template: input.template,
    tone: input.tone,
    contentLength: input.content?.length || 0,
    contentPreview: input.content?.substring(0, 100) || "NO_CONTENT",
  });

  // Validate input
  validateGeneratePptInput(input);

  try {
    // Build request body with defaults
    const requestBody = {
      content: input.content,
      slides_markdown: input.slides_markdown,
      instructions: input.instructions,
      tone: input.tone || "default",
      verbosity: input.verbosity || "standard",
      markdown_emphasis: input.markdown_emphasis ?? true,
      web_search: input.web_search ?? false,
      image_type: input.image_type || "stock",
      theme: input.theme,
      n_slides: input.n_slides || 8,
      language: input.language || "English",
      template: input.template || "general",
      include_table_of_contents: input.include_table_of_contents ?? false,
      include_title_slide: input.include_title_slide ?? true,
      allow_access_to_user_info: input.allow_access_to_user_info ?? true,
      files: input.files || [],
      export_as: input.export_as || "pptx",
      trigger_webhook: input.trigger_webhook ?? false,
    };

    // Call Presenton API
    const response = await presentonClient.post<PresentationData>(
      "/api/v1/ppt/presentation/generate",
      requestBody,
      { traceId }
    );

    const result: GeneratePptResult = {
      presentation: response,
      downloadUrl: response.download_url,
      previewUrl: response.preview_url,
    };

    logInfo(logTraceId, "PPT generation completed successfully", {
      presentationId: response.id,
      slidesCount: response.slides?.length,
    });

    return result;
  } catch (error) {
    return handlePresentonError(error, "PPT generation", logTraceId);
  }
}

/**
 * Generate a PPT presentation asynchronously
 * Returns a task ID that can be used to check status
 */
export async function generatePptAsync(
  input: GeneratePptInput,
  traceId?: string
): Promise<GeneratePptAsyncResult> {
  const logTraceId = traceId || "no-trace";

  logInfo(logTraceId, "Starting async PPT generation", {
    nSlides: input.n_slides,
    language: input.language,
    template: input.template,
  });

  validateGeneratePptInput(input);

  try {
    const requestBody = {
      content: input.content,
      slides_markdown: input.slides_markdown,
      instructions: input.instructions,
      tone: input.tone || "default",
      verbosity: input.verbosity || "standard",
      markdown_emphasis: input.markdown_emphasis ?? true,
      web_search: input.web_search ?? false,
      image_type: input.image_type || "stock",
      theme: input.theme,
      n_slides: input.n_slides || 8,
      language: input.language || "English",
      template: input.template || "general",
      include_table_of_contents: input.include_table_of_contents ?? false,
      include_title_slide: input.include_title_slide ?? true,
      allow_access_to_user_info: input.allow_access_to_user_info ?? true,
      files: input.files || [],
      export_as: input.export_as || "pptx",
      trigger_webhook: input.trigger_webhook ?? false,
    };

    const response = await presentonClient.post<{ task_id: string }>(
      "/api/v1/ppt/presentation/generate/async",
      requestBody,
      { traceId }
    );

    logInfo(logTraceId, "Async PPT generation started", {
      taskId: response.task_id,
    });

    return {
      taskId: response.task_id,
      message: "Generation started",
    };
  } catch (error) {
    return handlePresentonError(error, "async PPT generation", logTraceId);
  }
}

/**
 * Check the status of an async generation task
 */
export async function checkGenerationStatus(
  taskId: string,
  traceId?: string
): Promise<TaskStatusResult> {
  const logTraceId = traceId || "no-trace";

  logInfo(logTraceId, "Checking generation status", { taskId });

  try {
    const response = await presentonClient.get<{
      status: string;
      progress?: number;
      result?: PresentationData;
      error?: string;
    }>(`/api/v1/ppt/presentation/status/${taskId}`, { traceId });

    return {
      taskId,
      status: response.status as TaskStatusResult["status"],
      progress: response.progress,
      result: response.result,
      error: response.error,
    };
  } catch (error) {
    return handlePresentonError(error, "status check", logTraceId);
  }
}

/**
 * Get all available templates
 */
export async function getTemplates(
  traceId?: string
): Promise<TemplateInfo[]> {
  const logTraceId = traceId || "no-trace";

  logInfo(logTraceId, "Fetching templates");

  try {
    const response =
      await presentonClient.get<TemplateInfo[]>(
        "/api/v1/ppt/template/all",
        { traceId }
      );

    logInfo(logTraceId, "Templates fetched successfully", {
      count: response.length,
    });

    return response;
  } catch (error) {
    return handlePresentonError(error, "template fetch", logTraceId);
  }
}

/**
 * Get template by ID
 */
export async function getTemplateById(
  templateId: string,
  traceId?: string
): Promise<TemplateInfo> {
  const logTraceId = traceId || "no-trace";

  logInfo(logTraceId, "Fetching template", { templateId });

  try {
    const response = await presentonClient.get<TemplateInfo>(
      `/api/v1/ppt/template/${templateId}`,
      { traceId }
    );

    return response;
  } catch (error) {
    return handlePresentonError(error, "template fetch", logTraceId);
  }
}

/**
 * Upload a file for use in presentation
 * Note: This expects FormData to be passed from the route handler
 */
export async function uploadFile(
  formData: FormData,
  traceId?: string
): Promise<FileUploadResult> {
  const logTraceId = traceId || "no-trace";

  logInfo(logTraceId, "Uploading file");

  try {
    // For file upload, we need to use fetch directly since httpClient
    // assumes JSON body
    const response = await fetch(
      `${PRESENTON_BASE_URL}/api/v1/ppt/files/upload`,
      {
        method: "POST",
        headers: PRESENTON_API_KEY
          ? {
              Authorization: `Bearer ${PRESENTON_API_KEY}`,
              "X-Trace-Id": logTraceId,
            }
          : { "X-Trace-Id": logTraceId },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new HttpClientError(
        `File upload failed with status ${response.status}`,
        response.status,
        errorBody,
        logTraceId
      );
    }

    const result = (await response.json()) as FileUploadResult;

    logInfo(logTraceId, "File uploaded successfully", {
      fileId: result.id,
      filename: result.filename,
    });

    return result;
  } catch (error) {
    return handlePresentonError(error, "file upload", logTraceId);
  }
}

/**
 * Get all user presentations
 */
export async function getAllPresentations(
  traceId?: string
): Promise<PresentationData[]> {
  const logTraceId = traceId || "no-trace";

  logInfo(logTraceId, "Fetching all presentations");

  try {
    const response = await presentonClient.get<PresentationData[]>(
      "/api/v1/ppt/presentation/all",
      { traceId }
    );

    logInfo(logTraceId, "All presentations fetched successfully", {
      count: response.length,
    });

    return response;
  } catch (error) {
    return handlePresentonError(error, "presentations fetch", logTraceId);
  }
}

/**
 * Get presentation by ID
 */
export async function getPresentationById(
  presentationId: string,
  traceId?: string
): Promise<PresentationData> {
  const logTraceId = traceId || "no-trace";

  logInfo(logTraceId, "Fetching presentation", { presentationId });

  try {
    const response = await presentonClient.get<PresentationData>(
      `/api/v1/ppt/presentation/${presentationId}`,
      { traceId }
    );

    return response;
  } catch (error) {
    return handlePresentonError(error, "presentation fetch", logTraceId);
  }
}

/**
 * Export presentation as PPTX or PDF
 */
export async function exportPresentation(
  presentationId: string,
  format: ExportFormat = "pptx",
  traceId?: string
): Promise<{ download_url: string }> {
  const logTraceId = traceId || "no-trace";

  logInfo(logTraceId, "Exporting presentation", { presentationId, format });

  try {
    // According to Presenton API docs:
    // POST /api/v1/ppt/presentation/export
    // Body: { id: string (UUID), export_as: "pptx" | "pdf" }
    // Response: { presentation_id, path, edit_path, credits_consumed }
    const response = await presentonClient.post<{
      presentation_id: string;
      path: string;
      edit_path: string;
      credits_consumed: number;
    }>(
      `/api/v1/ppt/presentation/export`,
      {
        id: presentationId,
        export_as: format,
      },
      { traceId }
    );

    // The path from API might be relative (e.g., /static/user_data/xxx/file.pptx)
    // Need to prepend the Presenton base URL if it's a relative path
    let downloadUrl = response.path;
    if (downloadUrl && !downloadUrl.startsWith("http")) {
      // Remove leading slash if present to avoid double slashes
      const relativePath = downloadUrl.startsWith("/")
        ? downloadUrl
        : `/${downloadUrl}`;
      downloadUrl = `${PRESENTON_BASE_URL}${relativePath}`;
    }

    logInfo(logTraceId, "Presentation exported successfully", {
      downloadUrl,
      creditsConsumed: response.credits_consumed,
    });

    // Return the full URL as download_url
    return { download_url: downloadUrl };
  } catch (error) {
    return handlePresentonError(error, "presentation export", logTraceId);
  }
}

/**
 * Check Presenton service health
 */
export async function checkPresentonHealth(
  traceId?: string
): Promise<boolean> {
  const logTraceId = traceId || "health-check";

  try {
    await presentonClient.get("/health", { traceId, timeout: 5000 });
    logInfo(logTraceId, "Presenton service is healthy");
    return true;
  } catch {
    logError(logTraceId, "Presenton service health check failed");
    return false;
  }
}

/**
 * Handle Presenton service errors consistently
 */
function handlePresentonError(
  error: unknown,
  operation: string,
  traceId: string
): never {
  if (error instanceof PresentonServiceError) {
    logError(traceId, `Presenton service error during ${operation}`, {
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

    throw new PresentonServiceError(
      "SERVICE_ERROR",
      `Failed to communicate with Presenton service: ${error.message}`,
      {
        statusCode: error.statusCode,
        responseBody: error.responseBody,
      },
      traceId
    );
  }

  // Unknown error
  const errorMessage =
    error instanceof Error ? error.message : "Unknown error";
  logError(traceId, `Unknown error during ${operation}`, {
    error: errorMessage,
  });

  throw new PresentonServiceError(
    "UNKNOWN_ERROR",
    `Unexpected error during ${operation}: ${errorMessage}`,
    undefined,
    traceId
  );
}
