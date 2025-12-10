import Database from "better-sqlite3";
import { existsSync } from "fs";

const WEBUI_DB_PATH = process.env.WEBUI_DB_PATH || "./webui.db";

interface WebuiUser {
  id: string;
  api_key: string | null;
}

// 单例数据库连接
let dbInstance: Database.Database | null = null;
let dbError: Error | null = null;

/**
 * 获取数据库连接（单例模式）
 * @returns Database 实例或 null（如果数据库不可用）
 */
function getDatabase(): Database.Database | null {
  // 如果之前尝试失败过，直接返回 null
  if (dbError) {
    return null;
  }

  // 如果已有连接，返回
  if (dbInstance) {
    return dbInstance;
  }

  // 检查文件是否存在
  if (!existsSync(WEBUI_DB_PATH)) {
    dbError = new Error(`WebUI database not found at: ${WEBUI_DB_PATH}`);
    console.warn(`[WebuiDB] ${dbError.message}, API key sync disabled`);
    return null;
  }

  try {
    dbInstance = new Database(WEBUI_DB_PATH, { readonly: true });
    console.info(`[WebuiDB] Connected to ${WEBUI_DB_PATH}`);
    return dbInstance;
  } catch (error) {
    dbError = error instanceof Error ? error : new Error(String(error));
    console.error(`[WebuiDB] Failed to connect to database:`, dbError);
    return null;
  }
}

/**
 * 验证 API Key 格式
 * @param apiKey API Key 字符串
 * @returns 是否有效
 */
function isValidApiKey(apiKey: string | null | undefined): boolean {
  if (!apiKey || typeof apiKey !== "string") {
    return false;
  }

  const trimmed = apiKey.trim();
  // Open WebUI 的 API Key 格式通常是 sk- 开头
  return trimmed.length > 10 && trimmed.startsWith("sk-");
}

/**
 * 从 Open WebUI 数据库中查询用户的 API Key
 * @param email 用户邮箱
 * @returns API Key 或 null
 */
export function getWebuiUserApiKey(email: string): string | null {
  const db = getDatabase();
  if (!db) {
    return null; // 数据库不可用，优雅降级
  }

  try {
    // 统一转小写处理大小写不敏感
    const normalizedEmail = email.toLowerCase().trim();

    const row = db
      .prepare<string, WebuiUser>(
        "SELECT id, api_key FROM user WHERE LOWER(email) = ?"
      )
      .get(normalizedEmail);

    if (!row) {
      return null;
    }

    const apiKey = row.api_key?.trim() || null;

    // 验证 API Key 格式
    if (!isValidApiKey(apiKey)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[WebuiDB] Invalid API key format for user: ${email}`);
      }
      return null;
    }

    return apiKey;
  } catch (error) {
    console.error(`[WebuiDB] Error querying user API key:`, error);
    return null;
  }
}

/**
 * 检查用户是否存在于 Open WebUI 数据库中
 * @param email 用户邮箱
 * @returns 用户是否存在
 */
export function webuiUserExists(email: string): boolean {
  const db = getDatabase();
  if (!db) {
    return false; // 数据库不可用，返回 false
  }

  try {
    // 统一转小写处理大小写不敏感
    const normalizedEmail = email.toLowerCase().trim();

    const row = db
      .prepare<string, { id: string }>(
        "SELECT id FROM user WHERE LOWER(email) = ?"
      )
      .get(normalizedEmail);

    return !!row;
  } catch (error) {
    console.error(`[WebuiDB] Error checking user existence:`, error);
    return false;
  }
}

/**
 * 关闭数据库连接（用于应用关闭时清理）
 */
export function closeWebuiDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
      console.info("[WebuiDB] Database connection closed");
    } catch (error) {
      console.error("[WebuiDB] Error closing database:", error);
    } finally {
      dbInstance = null;
    }
  }
}
