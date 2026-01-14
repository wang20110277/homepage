/**
 * Client-side API functions for PPT generation
 * These functions call the BFF layer endpoints
 */

import type { ApiResponse } from "@/lib/core/types";

/**
 * PPT generation request parameters
 * Simplified to match actual Presenton API v1/ppt/generate
 * Language is hardcoded to "Chinese (Simplified - 中文, 汉语)"
 * Export format is hardcoded to "pptx"
 * Template is hardcoded to "general"
 */
export interface GeneratePptRequest {
  content: string;
  n_slides?: number;
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
 * Presentation list item (simplified for list view)
 */
export interface PresentationListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  slideCount: number;
  thumbnail?: string;
}

/**
 * Slide content for preview
 */
export interface SlideContent {
  index: number;
  title?: string;
  content: Record<string, unknown>;
  thumbnail?: string;
  type?: string;
}

/**
 * Presentation detail (full data with slides)
 */
export interface PresentationDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  slides: SlideContent[];
  template?: string;
  language?: string;
  downloadUrl?: string;
  previewUrl?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  downloadUrl: string;
  format: "pptx" | "pdf";
  expiresAt?: string;
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
 * Generate PPT (synchronous with extended timeout)
 *
 * Uses AbortController to set a 10-minute timeout (600000ms)
 * to match the backend PRESENTON_TIMEOUT configuration
 */
export async function generatePpt(
  params: GeneratePptRequest
): Promise<GeneratePptResponse> {
  // Create AbortController for 10-minute timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes

  try {
    const response = await fetch("/api/ppt/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...params,
        async: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return handleResponse<GeneratePptResponse>(response);
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort error specifically
    if (error instanceof Error && error.name === "AbortError") {
      throw new PPTApiError(
        "TIMEOUT",
        "PPT 生成超时（超过 10 分钟），请尝试减少页数或使用更简单的内容",
        { timeout: "600000ms" }
      );
    }

    throw error;
  }
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

/**
 * Get all user presentations
 */
export async function getPresentations(): Promise<PresentationListItem[]> {
  const response = await fetch("/api/ppt/presentations");

  interface RawPresentation {
    id: string;
    title?: string;
    slides?: unknown[];
    created_at?: string;
    updated_at?: string;
  }

  const rawData = await handleResponse<RawPresentation[]>(response);

  // Transform the data to match our interface
  return rawData.map((item) => ({
    id: item.id,
    title: item.title || "Untitled Presentation",
    createdAt: item.created_at || new Date().toISOString(),
    updatedAt: item.updated_at,
    slideCount: item.slides?.length || 0,
    thumbnail: undefined, // Will be added if API provides it
  }));
}

/**
 * Get presentation by ID with full details
 */
export async function getPresentationById(
  id: string
): Promise<PresentationDetail> {
  const response = await fetch(`/api/ppt/presentations/${id}`);

  interface RawPresentationDetail {
    id: string;
    title?: string;
    slides?: Array<{
      index?: number;
      title?: string;
      content?: Record<string, unknown>;
      type?: string;
    }>;
    created_at?: string;
    updated_at?: string;
    template?: string;
    language?: string;
    download_url?: string;
    preview_url?: string;
  }

  const rawData = await handleResponse<RawPresentationDetail>(response);

  // Transform the data to match our interface
  return {
    id: rawData.id,
    title: rawData.title || "Untitled Presentation",
    createdAt: rawData.created_at || new Date().toISOString(),
    updatedAt: rawData.updated_at,
    slides: (rawData.slides || []).map((slide, index) => ({
      index: slide.index ?? index,
      title: slide.title,
      content: slide.content || {},
      thumbnail: undefined,
      type: slide.type,
    })),
    template: rawData.template,
    language: rawData.language,
    downloadUrl: rawData.download_url,
    previewUrl: rawData.preview_url,
  };
}

/**
 * Export presentation as PPTX or PDF
 */
export async function exportPresentation(
  id: string,
  format: "pptx" | "pdf" = "pptx"
): Promise<ExportResult> {
  const response = await fetch(`/api/ppt/presentations/${id}/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ format }),
  });

  return handleResponse<ExportResult>(response);
}
