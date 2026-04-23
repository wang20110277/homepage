import { logInfo, logError } from "@/lib/core/logger";

const VOICEPRINT_SERVICE_URL =
  process.env.VOICEPRINT_SERVICE_URL || "http://10.162.5.210:7862";
const VOICEPRINT_SERVICE_TIMEOUT = parseInt(
  process.env.VOICEPRINT_SERVICE_TIMEOUT || "60000",
  10
);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const VALID_EXTENSIONS = [".wav", ".mp3"];

export interface VoiceprintCompareInput {
  audio1: File;
  audio2: File;
}

export interface VoiceprintCompareResult {
  similarity: number;
  similarity_percent: number;
  message: string;
}

interface VoiceprintApiResponse {
  success: boolean;
  similarity?: number;
  similarity_percent?: number;
  message?: string;
  error?: string;
}

export class VoiceprintServiceError extends Error {
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
    this.name = "VoiceprintServiceError";
    this.code = code;
    this.detail = detail;
    this.traceId = traceId;
  }
}

function validateAudioFile(file: File, label: string): void {
  if (!file || file.size === 0) {
    throw new VoiceprintServiceError(
      "INVALID_INPUT",
      `${label}文件无效或为空`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new VoiceprintServiceError(
      "INVALID_INPUT",
      `${label}文件大小超过 50MB 限制`
    );
  }

  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (!VALID_EXTENSIONS.includes(ext)) {
    throw new VoiceprintServiceError(
      "INVALID_INPUT",
      `${label}只支持 .wav 和 .mp3 格式`
    );
  }
}

export async function voiceprintCompare(
  input: VoiceprintCompareInput,
  traceId?: string
): Promise<VoiceprintCompareResult> {
  const logTraceId = traceId || "no-trace";

  logInfo(logTraceId, "Starting voiceprint comparison", {
    audio1: input.audio1?.name,
    audio2: input.audio2?.name,
  });

  validateAudioFile(input.audio1, "音频1");
  validateAudioFile(input.audio2, "音频2");

  try {
    const formData = new FormData();
    formData.append("audio1", input.audio1);
    formData.append("audio2", input.audio2);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      VOICEPRINT_SERVICE_TIMEOUT
    );

    logInfo(logTraceId, "Calling voiceprint compare API", {
      url: `${VOICEPRINT_SERVICE_URL}/api/compare`,
    });

    const response = await fetch(`${VOICEPRINT_SERVICE_URL}/api/compare`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail: string;
      try {
        const errorBody = (await response.json()) as { error?: string };
        errorDetail =
          errorBody.error || `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      }

      if (response.status === 400) {
        throw new VoiceprintServiceError(
          "INVALID_INPUT",
          errorDetail,
          undefined,
          logTraceId
        );
      }

      throw new VoiceprintServiceError(
        "SERVICE_ERROR",
        `声纹比对服务返回错误: ${errorDetail}`,
        { statusCode: response.status },
        logTraceId
      );
    }

    const data = (await response.json()) as VoiceprintApiResponse;

    if (!data.success || data.similarity === undefined) {
      throw new VoiceprintServiceError(
        "INVALID_RESPONSE",
        data.error || "声纹比对服务返回无效响应",
        data,
        logTraceId
      );
    }

    const result: VoiceprintCompareResult = {
      similarity: data.similarity,
      similarity_percent: data.similarity_percent ?? data.similarity * 100,
      message: data.message || `相似度: ${(data.similarity * 100).toFixed(2)}%`,
    };

    logInfo(logTraceId, "Voiceprint comparison completed", {
      similarity: result.similarity,
      similarity_percent: result.similarity_percent,
    });

    return result;
  } catch (error) {
    if (error instanceof VoiceprintServiceError) {
      throw error;
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new VoiceprintServiceError(
        "TIMEOUT",
        "声纹比对请求超时，请稍后重试",
        undefined,
        logTraceId
      );
    }

    logError(logTraceId, "Voiceprint compare failed", {
      error: errorMessage,
    });

    throw new VoiceprintServiceError(
      "UNKNOWN_ERROR",
      `声纹比对失败: ${errorMessage}`,
      undefined,
      logTraceId
    );
  }
}

export async function checkVoiceprintHealth(
  traceId?: string
): Promise<boolean> {
  const logTraceId = traceId || "health-check";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${VOICEPRINT_SERVICE_URL}/api/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = (await response.json()) as {
      status: string;
      model_loaded: boolean;
    };

    logInfo(logTraceId, "Voiceprint service health check", {
      status: data.status,
      modelLoaded: data.model_loaded,
    });

    return response.ok && data.model_loaded === true;
  } catch {
    logError(logTraceId, "Voiceprint service health check failed");
    return false;
  }
}
