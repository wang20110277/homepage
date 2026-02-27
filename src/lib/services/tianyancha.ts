/**
 * 天眼查后端服务客户端
 * 通过 BFF 模式代理请求到 Flask 后端服务
 */

import { logInfo, logError } from "@/lib/core/logger";

const TIANYAN_SERVICE_URL =
  process.env.TIANYAN_SERVICE_URL || "http://127.0.0.1:5001";

const TIANYAN_TIMEOUT = parseInt(
  process.env.TIANYAN_TIMEOUT || "120000",
  10
);

export class TianyanchaServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public detail?: unknown
  ) {
    super(message);
    this.name = "TianyanchaServiceError";
  }
}

/**
 * 创建带超时的 fetch
 */
function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new TianyanchaServiceError("请求超时，请稍后重试", 408));
    }, timeout);

    fetch(url, {
      ...options,
      signal: controller.signal,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error instanceof TianyanchaServiceError) {
          reject(error);
        } else if (error.name === "AbortError") {
          reject(new TianyanchaServiceError("请求超时，请稍后重试", 408));
        } else {
          reject(error);
        }
      });
  });
}

/**
 * 搜索企业 - 验证企业是否存在
 */
export async function searchCompany(
  companyName: string,
  traceId: string
): Promise<{
  name: string;
  legalRepresentative: string;
  creditCode: string;
  registeredCapital: string;
  establishDate: string;
  status: string;
}> {
  const url = `${TIANYAN_SERVICE_URL}/api/search`;

  logInfo(traceId, "Searching company", {
    url,
    companyName,
  });

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company_name: companyName }),
      },
      30000 // 搜索使用较短超时
    );

    if (!response.ok) {
      let errorMessage = `HTTP error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Ignore JSON parse error
      }

      if (response.status === 404) {
        throw new TianyanchaServiceError(
          `未找到企业「${companyName}」的相关信息，请检查企业名称是否正确`,
          404
        );
      }

      throw new TianyanchaServiceError(errorMessage, response.status);
    }

    const data = await response.json();

    if (data.status !== "success" || !data.data) {
      throw new TianyanchaServiceError(
        data.message || "搜索企业失败",
        response.status
      );
    }

    logInfo(traceId, "Company search successful", {
      companyName,
      companyData: data.data,
    });

    return data.data;
  } catch (error) {
    if (error instanceof TianyanchaServiceError) {
      logError(traceId, "Company search error", {
        error: error.message,
        statusCode: error.statusCode,
        companyName,
      });
      throw error;
    }

    logError(traceId, "Company search request failed", {
      error: error instanceof Error ? error.message : String(error),
      companyName,
    });

    throw new TianyanchaServiceError(
      error instanceof Error ? error.message : "搜索服务请求失败",
      503,
      error
    );
  }
}

/**
 * 生成企业报告（Word 格式）
 */
export async function generateCompanyReport(
  companyName: string,
  traceId: string
): Promise<{ blob: Blob; filename: string }> {
  const url = `${TIANYAN_SERVICE_URL}/api/generate_report`;

  logInfo(traceId, "Calling Tianyancha service", {
    url,
    companyName,
    timeout: TIANYAN_TIMEOUT,
  });

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company_name: companyName }),
      },
      TIANYAN_TIMEOUT
    );

    if (!response.ok) {
      let errorMessage = `HTTP error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Ignore JSON parse error
      }
      throw new TianyanchaServiceError(errorMessage, response.status);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `${companyName}_企业报告.docx`;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(
        /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
      );
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, "");
      }
    }

    logInfo(traceId, "Tianyancha report generated successfully", {
      companyName,
      filename,
      blobSize: blob.size,
    });

    return { blob, filename };
  } catch (error) {
    if (error instanceof TianyanchaServiceError) {
      logError(traceId, "Tianyancha service error", {
        error: error.message,
        statusCode: error.statusCode,
        companyName,
      });
      throw error;
    }

    logError(traceId, "Tianyancha service request failed", {
      error: error instanceof Error ? error.message : String(error),
      companyName,
    });

    throw new TianyanchaServiceError(
      error instanceof Error ? error.message : "服务请求失败",
      503,
      error
    );
  }
}

/**
 * 健康检查
 */
export async function checkTianyanchaHealth(traceId: string): Promise<boolean> {
  const url = `${TIANYAN_SERVICE_URL}/api/health`;

  try {
    const response = await fetchWithTimeout(
      url,
      { method: "GET" },
      5000
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === "ok";
  } catch (error) {
    logError(traceId, "Tianyancha health check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
