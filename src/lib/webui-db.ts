/**
 * WebUI 数据库连接（使用 Node.js 内置 sqlite）
 *
 * 从 Open WebUI 的 SQLite 数据库中读取用户 API Keys
 */

import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

// 数据库路径
const dbPath = join(process.cwd(), "webui.db");

// 数据库连接单例
let db: DatabaseSync | null = null;

/**
 * 获取数据库连接（懒加载）
 */
function getDatabase(): DatabaseSync {
  if (!db) {
    try {
      db = new DatabaseSync(dbPath);
      if (process.env.NODE_ENV === "development") {
        console.log(`[WebuiDB] Connected to database at ${dbPath}`);
      }
    } catch (error) {
      console.error(`[WebuiDB] Failed to open webui.db at ${dbPath}:`, error);
      throw new Error(
        `Unable to connect to Open WebUI database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return db;
}

/**
 * 从 Open WebUI 数据库中查询用户的 API Key
 * @param email 用户邮箱
 * @returns API Key 或 null
 */
export function getWebuiUserApiKey(email: string): string | null {
  try {
    const database = getDatabase();
    const stmt = database.prepare("SELECT api_key FROM user WHERE email = ?");
    const row = stmt.get(email) as { api_key: string | null } | undefined;

    if (row?.api_key) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[WebuiDB] Found API key for ${email}`);
      }
      return row.api_key;
    }

    if (process.env.NODE_ENV === "development") {
      console.warn(`[WebuiDB] No API key found for ${email}`);
    }
    return null;
  } catch (error) {
    console.error(`[WebuiDB] Error getting API key for ${email}:`, error);
    return null;
  }
}

/**
 * 检查用户是否存在于 Open WebUI 数据库中
 * @param email 用户邮箱
 * @returns 用户是否存在
 */
export function webuiUserExists(email: string): boolean {
  try {
    const database = getDatabase();
    const stmt = database.prepare("SELECT 1 FROM user WHERE email = ?");
    const row = stmt.get(email);

    const exists = !!row;
    if (process.env.NODE_ENV === "development") {
      console.log(`[WebuiDB] User ${email} exists: ${exists}`);
    }
    return exists;
  } catch (error) {
    console.error(`[WebuiDB] Error checking user existence for ${email}:`, error);
    return false;
  }
}

/**
 * 关闭数据库连接
 */
export function closeWebuiDatabase(): void {
  if (db) {
    try {
      db.close();
      db = null;
      if (process.env.NODE_ENV === "development") {
        console.log("[WebuiDB] Database connection closed");
      }
    } catch (error) {
      console.error("[WebuiDB] Error closing database:", error);
    }
  }
}
