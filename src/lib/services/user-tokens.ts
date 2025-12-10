import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

const serviceToken = process.env.OPEN_WEBUI_SERVICE_TOKEN?.trim();

export class UserAccessTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAccessTokenError";
  }
}

export async function getUserOidcAccessToken(userId: string): Promise<string> {
  const accountRecord = await db.query.account.findFirst({
    where: eq(schema.account.userId, userId),
  });

  if (!accountRecord || !accountRecord.accessToken) {
    throw new UserAccessTokenError(
      "No OIDC access token is stored for this user"
    );
  }

  if (
    accountRecord.accessTokenExpiresAt &&
    accountRecord.accessTokenExpiresAt < new Date()
  ) {
    throw new UserAccessTokenError("OIDC access token has expired");
  }

  return accountRecord.accessToken;
}

/**
 * 获取 OpenWebUI 访问令牌 - 三层优先级
 * 1. 用户自己的 API key（从 PostgreSQL user.openwebuiApiKey）
 * 2. 共享 service token（OPEN_WEBUI_SERVICE_TOKEN）
 * 3. OIDC token（从 account.accessToken）
 */
export async function getOpenWebuiAccessToken(
  userId: string
): Promise<string> {
  // 第一优先级：用户自己的 API key
  const userRecord = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    columns: { openwebuiApiKey: true },
  });

  if (userRecord?.openwebuiApiKey) {
    return userRecord.openwebuiApiKey;
  }

  // 第二优先级：共享 service token（降级方案）
  if (serviceToken) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[OpenWebUI] User ${userId} has no API key, using service token`
      );
    }
    return serviceToken;
  }

  // 第三优先级：OIDC token
  try {
    return await getUserOidcAccessToken(userId);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[OpenWebUI] OIDC token unavailable for user ${userId}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // 所有方式都失败
  throw new UserAccessTokenError(
    "未找到 Open WebUI API Key，请重新登录以同步，或联系管理员"
  );
}
