import { NextRequest } from "next/server";
import { ok, badRequest, serverError, serviceUnavailable } from "@/lib/core/api-response";
import { logInfo, logError } from "@/lib/core/logger";
import { withAuth, type BffRouteHandler } from "@/lib/core/bff-auth";
import {
  voiceprintCompare,
  VoiceprintServiceError,
} from "@/lib/services/voiceprint-compare";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const VALID_EXTENSIONS = [".wav", ".mp3"];

function getFileExtension(filename: string): string {
  return filename.toLowerCase().slice(filename.lastIndexOf("."));
}

const handler: BffRouteHandler = async (request: NextRequest, context) => {
  const { traceId } = context;

  try {
    const formData = await request.formData();
    const audio1 = formData.get("audio1") as File | null;
    const audio2 = formData.get("audio2") as File | null;

    if (!audio1 || !audio2) {
      return badRequest("请上传两个音频文件", undefined, traceId);
    }

    if (audio1.size === 0 || audio2.size === 0) {
      return badRequest("音频文件不能为空", undefined, traceId);
    }

    const ext1 = getFileExtension(audio1.name);
    const ext2 = getFileExtension(audio2.name);

    if (!VALID_EXTENSIONS.includes(ext1) || !VALID_EXTENSIONS.includes(ext2)) {
      return badRequest(
        "只支持 .wav 和 .mp3 格式的音频文件",
        { audio1: audio1.name, audio2: audio2.name },
        traceId
      );
    }

    if (audio1.size > MAX_FILE_SIZE || audio2.size > MAX_FILE_SIZE) {
      return badRequest(
        "音频文件大小不能超过 50MB",
        {
          audio1Size: `${(audio1.size / 1024 / 1024).toFixed(1)}MB`,
          audio2Size: `${(audio2.size / 1024 / 1024).toFixed(1)}MB`,
        },
        traceId
      );
    }

    logInfo(traceId, "Voiceprint compare request received", {
      audio1: `${audio1.name} (${(audio1.size / 1024 / 1024).toFixed(1)}MB)`,
      audio2: `${audio2.name} (${(audio2.size / 1024 / 1024).toFixed(1)}MB)`,
    });

    const result = await voiceprintCompare({ audio1, audio2 }, traceId);

    return ok(result, traceId);
  } catch (error) {
    if (error instanceof VoiceprintServiceError) {
      logError(traceId, "Voiceprint service error", {
        code: error.code,
        message: error.message,
      });

      if (error.code === "INVALID_INPUT") {
        return badRequest(error.message, error.detail, traceId);
      }

      if (error.code === "TIMEOUT" || error.code === "SERVICE_ERROR") {
        return serviceUnavailable(
          "Voiceprint Compare",
          error.detail,
          traceId
        );
      }

      return serverError(
        `声纹比对失败: ${error.message}`,
        { code: error.code },
        traceId
      );
    }

    logError(traceId, "Unexpected error in voiceprint compare", {
      error: error instanceof Error ? error.message : "Unknown",
    });

    return serverError("声纹比对服务发生未知错误", undefined, traceId);
  }
};

export const POST = withAuth(handler);
