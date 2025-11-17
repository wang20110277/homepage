/**
 * Client-side API functions for PPT generation
 * These functions call the BFF layer endpoints
 */

import type { ApiResponse } from "@/lib/core/types";

/**
 * PPT generation request parameters
 */
export interface GeneratePptRequest {
  content: string;
  n_slides?: number;
  language?: string;
  template?: string;
  tone?: "default" | "professional" | "casual" | "academic" | "creative";
  verbosity?: "concise" | "standard" | "detailed";
  image_type?: "stock" | "ai" | "none";
  web_search?: boolean;
  include_table_of_contents?: boolean;
  include_title_slide?: boolean;
  files?: string[];
  export_as?: "pptx" | "pdf";
  async?: boolean;
}

/**
 * Presentation data
 */
export interface PresentationData {
  id: string;
  title?: string;
  download_url?: string;
  preview_url?: string;
}

/**
 * PPT generation result (sync)
 */
export interface GeneratePptResponse {
  presentation: PresentationData;
  downloadUrl?: string;
  previewUrl?: string;
}

/**
 * PPT generation result (async)
 */
export interface GeneratePptAsyncResponse {
  taskId: string;
  message?: string;
}

/**
 * Task status response
 */
export interface TaskStatusResponse {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  result?: PresentationData;
  error?: string;
}

/**
 * File upload result
 */
export interface FileUploadResponse {
  id: string;
  filename: string;
  url?: string;
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
 * API error type
 */
export class PPTApiError extends Error {
  public code: string;
  public detail?: unknown;
  public traceId?: string;

  constructor(code: string, message: string, detail?: unknown, traceId?: string) {
    super(message);
    this.name = "PPTApiError";
    this.code = code;
    this.detail = detail;
    this.traceId = traceId;
  }
}

/**
 * Handle API response and extract data or throw error
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success || !data.data) {
    throw new PPTApiError(
      data.error?.code || "API_ERROR",
      data.error?.message || "An error occurred",
      data.error?.detail,
      data.traceId
    );
  }

  return data.data;
}

/**
 * Upload a file for use in PPT generation
 */
export async function uploadFile(file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/ppt/files/upload", {
    method: "POST",
    body: formData,
  });

  return handleResponse<FileUploadResponse>(response);
}

/**
 * Upload multiple files
 */
export async function uploadFiles(files: File[]): Promise<FileUploadResponse[]> {
  const results = await Promise.all(files.map((file) => uploadFile(file)));
  return results;
}

/**
 * Generate PPT (synchronous)
 */
export async function generatePpt(
  params: GeneratePptRequest
): Promise<GeneratePptResponse> {
  const response = await fetch("/api/ppt/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...params,
      async: false,
    }),
  });

  return handleResponse<GeneratePptResponse>(response);
}

/**
 * Generate PPT (asynchronous)
 */
export async function generatePptAsync(
  params: GeneratePptRequest
): Promise<GeneratePptAsyncResponse> {
  const response = await fetch("/api/ppt/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...params,
      async: true,
    }),
  });

  return handleResponse<GeneratePptAsyncResponse>(response);
}

/**
 * Check task status
 */
export async function checkTaskStatus(
  taskId: string
): Promise<TaskStatusResponse> {
  const response = await fetch(`/api/ppt/status/${taskId}`);
  return handleResponse<TaskStatusResponse>(response);
}

/**
 * Get available templates
 */
export async function getTemplates(): Promise<TemplateInfo[]> {
  const response = await fetch("/api/ppt/templates");
  return handleResponse<TemplateInfo[]>(response);
}

/**
 * Poll for task completion
 * Returns the final result when completed or throws on failure
 */
export async function pollTaskUntilComplete(
  taskId: string,
  onProgress?: (status: TaskStatusResponse) => void,
  pollInterval: number = 2000,
  maxAttempts: number = 300 // 10 minutes max
): Promise<PresentationData> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await checkTaskStatus(taskId);
    onProgress?.(status);

    if (status.status === "completed" && status.result) {
      return status.result;
    }

    if (status.status === "failed") {
      throw new PPTApiError(
        "GENERATION_FAILED",
        status.error || "PPT generation failed",
        undefined,
        taskId
      );
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    attempts++;
  }

  throw new PPTApiError(
    "TIMEOUT",
    "PPT generation timed out",
    { attempts, taskId },
    taskId
  );
}
