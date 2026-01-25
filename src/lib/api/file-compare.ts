/**
 * File Compare API Client
 *
 * Calls the Flask backend service for document comparison.
 */

const SERVICE_URL = process.env.NEXT_PUBLIC_FILE_COMPARE_SERVICE_URL || "";

if (!SERVICE_URL) {
  console.warn(
    "NEXT_PUBLIC_FILE_COMPARE_SERVICE_URL is not configured. File compare feature will not work."
  );
}

/**
 * Supported comparison scripts
 */
export type CompareScript = "default" | "script1" | "script2";

/**
 * Script descriptions
 */
export const SCRIPT_DESCRIPTIONS: Record<
  CompareScript,
  { name: string; description: string }
> = {
  default: {
    name: "默认比较脚本（正文+表格）",
    description:
      "比较Word文档正文和表格内容与PDF文档的差异，生成详细的差异报告。",
  },
  script1: {
    name: "风控专用脚本",
    description:
      "针对风控场景优化，专注于识别文档中的关键信息差异，忽略编号等无关内容。",
  },
  script2: {
    name: "敏感信息检测脚本",
    description:
      "针对敏感信息检测优化，识别文档中的敏感内容差异，提供增强的隐私保护分析。",
  },
};

/**
 * Compare request parameters
 */
export interface CompareRequest {
  /** Word file (.doc or .docx) */
  word: File;
  /** Array of PDF files */
  pdfs: File[];
  /** Comparison script to use */
  script: CompareScript;
}

/**
 * Compare API response
 */
export interface CompareResponse {
  /** Response status */
  status: "success" | "error";
  /** Download URL for the result Excel file */
  download_url?: string;
  /** Process log entries */
  process_log?: string[];
  /** Error message (if status is "error") */
  message?: string;
}

/**
 * Error class for File Compare API errors
 */
export class FileCompareApiError extends Error {
  constructor(
    message: string,
    public detail?: unknown
  ) {
    super(message);
    this.name = "FileCompareApiError";
  }
}

/**
 * Process log entry type
 */
export interface ProcessLog {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

/**
 * Parse raw log strings into structured logs
 */
function parseProcessLogs(rawLogs: string[]): ProcessLog[] {
  return rawLogs.map((log) => {
    // Try to extract timestamp from log format like "[10:23:45] message"
    const timeMatch = log.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.+)/);
    if (timeMatch) {
      const [, timestamp, message] = timeMatch;
      let type: ProcessLog["type"] = "info";
      if (message.includes("成功") || message.includes("完成")) {
        type = "success";
      } else if (message.includes("错误") || message.includes("失败")) {
        type = "error";
      } else if (message.includes("警告")) {
        type = "warning";
      }
      return { timestamp, message, type };
    }
    return { timestamp: "", message: log, type: "info" };
  });
}

/**
 * Compare documents using the Flask backend service
 *
 * @param params - Compare request parameters
 * @returns Promise with download URL or error info
 * @throws FileCompareApiError on API errors
 */
export async function compareDocuments(
  params: CompareRequest
): Promise<{
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  logs?: ProcessLog[];
  error?: string;
}> {
  if (!SERVICE_URL) {
    throw new FileCompareApiError(
      "File compare service is not configured. Please set NEXT_PUBLIC_FILE_COMPARE_SERVICE_URL."
    );
  }

  const { word, pdfs, script } = params;

  // Validate inputs
  if (!word) {
    throw new FileCompareApiError("Please upload a Word document.");
  }
  if (!pdfs || pdfs.length === 0) {
    throw new FileCompareApiError("Please upload at least one PDF document.");
  }

  // Validate file types
  const validWordTypes = [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!validWordTypes.includes(word.type)) {
    throw new FileCompareApiError(
      "Please upload a valid Word document (.doc or .docx)"
    );
  }

  for (const pdf of pdfs) {
    if (pdf.type !== "application/pdf") {
      throw new FileCompareApiError("Please upload valid PDF documents.");
    }
  }

  // Build FormData
  const formData = new FormData();
  formData.append("word", word);
  formData.append("script", script);
  pdfs.forEach((pdf) => formData.append("pdfs", pdf));

  try {
    const response = await fetch(`${SERVICE_URL}/compare`, {
      method: "POST",
      body: formData,
    });

    // 检查响应类型
    const contentType = response.headers.get("Content-Type") || "";

    // 如果返回的是文件流 (Excel)
    if (contentType.includes("application/vnd.openxmlformats") || contentType.includes("application/octet-stream")) {
      // 直接返回文件流
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const filename = getFilenameFromResponse(response) || `对比结果_${new Date().toISOString().slice(0, 10)}.xlsx`;

      return {
        success: true,
        downloadUrl,
        filename,
      };
    }

    // 如果返回的是 JSON (错误信息)
    const result: CompareResponse = await response.json();

    if (result.status === "success") {
      return {
        success: true,
        logs: parseProcessLogs(result.process_log || []),
        downloadUrl: result.download_url ? `${SERVICE_URL}${result.download_url}` : undefined,
      };
    } else {
      return {
        success: false,
        logs: result.process_log ? parseProcessLogs(result.process_log) : [],
        error: result.message || "Comparison failed",
      };
    }
  } catch (err) {
    if (err instanceof Error) {
      throw new FileCompareApiError(`Request failed: ${err.message}`);
    }
    throw new FileCompareApiError("Unknown error occurred");
  }
}

/**
 * 从响应头中获取文件名
 */
function getFilenameFromResponse(response: Response): string | null {
  const contentDisposition = response.headers.get("Content-Disposition");
  if (!contentDisposition) {
    return null;
  }

  // 解析 Content-Disposition 头获取文件名
  // 格式: attachment; filename="文件名.xlsx"
  const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
  if (matches && matches[1]) {
    // 移除引号
    return matches[1].replace(/['"]/g, "");
  }
  return null;
}

/**
 * Get the full download URL from a relative path
 *
 * @param relativePath - Relative path from the API response
 * @returns Full URL for downloading the file
 */
export function getDownloadUrl(relativePath: string): string {
  return `${SERVICE_URL}${relativePath}`;
}
