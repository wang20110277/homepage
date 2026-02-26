import { NextRequest, NextResponse } from "next/server";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/core/api-response";
import { logError, logInfo } from "@/lib/core/logger";
import { getTraceId } from "@/lib/core/trace";
import { getUserFromRequest } from "@/lib/core/bff-auth";
import {
  generateCompanyReport,
  TianyanchaServiceError,
} from "@/lib/services/tianyancha";

/**
 * POST /api/tianyancha/generate-report
 *
 * 生成天眼查企业报告（Word 格式）
 *
 * Request body:
 * {
 *   company_name: string (必填)
 * }
 *
 * Response:
 * 成功: Word 文件 (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
 * 失败: JSON 错误信息
 */
async function handler(request: NextRequest) {
  const traceId = getTraceId(request);
  const user = await getUserFromRequest(request);

  // 检查用户认证
  if (!user) {
    return unauthorized("请先登录", traceId);
  }

  try {
    if (!request.body) {
      return badRequest("请求体不能为空", traceId);
    }

    const body = await request.json();
    const companyName = body.company_name?.toString().trim();

    if (!companyName) {
      return badRequest("必须提供企业名称", traceId);
    }

    logInfo(traceId, "Generating Tianyancha report", {
      userId: user.id,
      companyName,
    });

    const { blob, filename } = await generateCompanyReport(companyName, traceId);

    logInfo(traceId, "Tianyancha report generated successfully", {
      userId: user.id,
      companyName,
      filename,
      blobSize: blob.size,
    });

    // 直接返回文件流
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "X-Trace-Id": traceId,
      },
    });
  } catch (error) {
    logError(traceId, "Generate report failed", {
      userId: user?.id,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof TianyanchaServiceError) {
      return serviceUnavailable("天眼查服务", error.message, traceId);
    }

    return serviceUnavailable(
      "天眼查服务",
      error instanceof Error ? error.message : "生成报告失败",
      traceId
    );
  }
}

export const POST = handler;
