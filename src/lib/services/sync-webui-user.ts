import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { getWebuiUserApiKey, webuiUserExists } from "@/lib/webui-db";

export class WebuiSyncError extends Error {
  constructor(
    message: string,
    public userFriendlyMessage?: string
  ) {
    super(message);
    this.name = "WebuiSyncError";
  }
}

/**
 * 同步用户的 Open WebUI API Key 到 PostgreSQL
 * @param userId 用户 ID
 * @param email 用户邮箱
 * @throws WebuiSyncError 如果用户不存在或没有 API Key
 */
export async function syncOpenWebuiApiKey(
  userId: string,
  email: string
): Promise<void> {
  // 1. 检查用户是否存在于 Open WebUI
  if (!webuiUserExists(email)) {
    throw new WebuiSyncError(
      `User ${email} not found in Open WebUI database`,
      "您的账号尚未激活，请联系管理员开通 AI 聊天功能"
    );
  }

  // 2. 获取用户的 API Key
  const apiKey = getWebuiUserApiKey(email);

  if (!apiKey) {
    throw new WebuiSyncError(
      `User ${email} has no API key in Open WebUI database`,
      "您的账号缺少必要的访问密钥，请联系管理员配置"
    );
  }

  // 3. 同步到 PostgreSQL
  await db
    .update(user)
    .set({
      openwebuiApiKey: apiKey,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}

/**
 * 尝试同步用户的 API Key，不抛出错误
 * @param userId 用户 ID
 * @param email 用户邮箱
 * @returns 是否成功同步
 */
export async function trySyncOpenWebuiApiKey(
  userId: string,
  email: string
): Promise<boolean> {
  try {
    await syncOpenWebuiApiKey(userId, email);
    return true;
  } catch (error) {
    if (error instanceof WebuiSyncError) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[WebuiSync] Failed for ${email}: ${error.message}`);
      }
    } else {
      console.error(`[WebuiSync] Unexpected error for ${email}:`, error);
    }
    return false;
  }
}
