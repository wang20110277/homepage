import { NextRequest, NextResponse } from "next/server";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/core/api-response";
import { logError, logInfo } from "@/lib/core/logger";
import { getTraceId } from "@/lib/core/trace";
import { getUserFromRequest } from "@/lib/core/bff-auth";
import {
  searchCompany,
  TianyanchaServiceError,
} from "@/lib/services/tianyancha";

/**
 * POST /api/tianyancha/search
 *
 * 搜索企业 - 验证企业是否存在
 *
 * Request body:
 * {
 *   company_name: string (必填)
 * }
 *
 * Response:
 * 成功: { status: "success", data: { name, legalRepresentative, ... } }
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

    logInfo(traceId, "Searching company", {
      userId: user.id,
      companyName,
    });

    const companyData = await searchCompany(companyName, traceId);

    logInfo(traceId, "Company search successful", {
      userId: user.id,
      companyName,
    });

    return NextResponse.json(
      {
        status: "success",
        data: companyData,
      },
      {
        status: 200,
        headers: {
          "X-Trace-Id": traceId,
        },
      }
    );
  } catch (error) {
    logError(traceId, "Company search failed", {
      userId: user?.id,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof TianyanchaServiceError) {
      // 404 表示企业不存在
      if (error.statusCode === 404) {
        return NextResponse.json(
          {
            status: "error",
            error: {
              message: error.message,
              code: "COMPANY_NOT_FOUND",
            },
          },
          { status: 404 }
        );
      }

      return serviceUnavailable("天眼查服务", error.message, traceId);
    }

    return serviceUnavailable(
      "天眼查服务",
      error instanceof Error ? error.message : "搜索企业失败",
      traceId
    );
  }
}

export const POST = handler;
