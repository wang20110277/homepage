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

export async function getOpenWebuiAccessToken(
  userId: string
): Promise<string> {
  if (serviceToken) {
    return serviceToken;
  }
  return getUserOidcAccessToken(userId);
}
