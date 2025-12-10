import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq, inArray } from "drizzle-orm";
import { decodeJwt } from "jose";
import { db } from "./db";
import * as schema from "./schema";
import { mapClaimsToUser, mergeClaimRoles } from "./auth-utils";
import { ensureCoreAuthData } from "./rbac-init";
import { trySyncOpenWebuiApiKey } from "./services/sync-webui-user";

const activeProvider =
  (process.env.OIDC_PROVIDER === "adfs" ? "adfs" : "entra") as "entra" | "adfs";

void ensureCoreAuthData().catch((error) => {
  console.error("Failed to ensure authentication bootstrap data:", error);
});

// ID Token claims 缓存 - 用于在 mapProfileToUser 中访问 ID Token 数据
const idTokenClaimsCache = new Map<string, Record<string, unknown>>();

/**
 * 创建一个日志拦截器包装的 fetch，用于捕获 Token Exchange 响应并缓存 ID Token claims
 */
function createLoggingFetch(): typeof fetch {
  const originalFetch = globalThis.fetch;

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // 只拦截 ADFS Token endpoint
    const isTokenRequest = activeProvider === 'adfs' && url.includes(process.env.ADFS_TOKEN_URL || '');

    if (!isTokenRequest) {
      return originalFetch(input, init);
    }

    // 执行请求
    const response = await originalFetch(input, init);
    const clonedResponse = response.clone();

    // 解析 Token Exchange 响应
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await clonedResponse.json();

        // 检测并处理 ID Token
        if (data.id_token) {
          try {
            const idTokenClaims = decodeJwt(data.id_token) as Record<string, unknown>;
            const sub = idTokenClaims.sub as string;

            // 缓存 ID Token claims（使用 sub 作为 key）
            if (sub) {
              idTokenClaimsCache.set(sub, idTokenClaims);

              console.log("\n╔════════════════════════════════════════════════════════════");
              console.log("║ 🎫 ID TOKEN DECODED CLAIMS");
              console.log("╠════════════════════════════════════════════════════════════");
              console.log("║ " + JSON.stringify(idTokenClaims, null, 2).split('\n').join('\n║ '));
              console.log("╚════════════════════════════════════════════════════════════\n");
            }
          } catch (error) {
            console.error("Failed to decode ID token:", error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to parse token response:", error);
    }

    return response;
  };
}

// 在 ADFS 模式下，覆盖全局 fetch 以拦截 Token Exchange
if (activeProvider === 'adfs') {
  globalThis.fetch = createLoggingFetch();
}

function getMicrosoftProviderConfig() {
  const clientId =
    process.env.ENTRA_CLIENT_ID || process.env.OAUTH_CLIENT_ID || "";
  const clientSecret =
    process.env.ENTRA_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || "";
  const tenantId =
    process.env.ENTRA_TENANT_ID || process.env.TENANT_ID || "common";

  if (!clientId || !clientSecret) {
    throw new Error(
      "ENTRA_CLIENT_ID/OAUTH_CLIENT_ID and ENTRA_CLIENT_SECRET/OAUTH_CLIENT_SECRET are required for the Microsoft provider"
    );
  }

  const authorityBase =
    process.env.ENTRA_AUTHORITY || "https://login.microsoftonline.com";
  const authority = authorityBase.replace(/\/+$/, "");

  return {
    clientId,
    clientSecret,
    tenantId,
    authority,
    scope: ["openid", "profile", "email", "offline_access", "User.Read"],
  };
}


async function syncRolesFromClaims(userId: string, claimRoles: string[]) {
  const normalizedRoles = mergeClaimRoles(claimRoles);
  if (!normalizedRoles.length) {
    return false;
  }

  const existingAssignments = await db.query.userRoles.findMany({
    where: eq(schema.userRoles.userId, userId),
  });

  const existingRoles = await db.query.roles.findMany({
    where: inArray(schema.roles.name, normalizedRoles),
  });
  const existingRoleNames = new Set(existingRoles.map((role) => role.name));

  const missingRoleNames = normalizedRoles.filter(
    (roleName) => !existingRoleNames.has(roleName)
  );

  let createdRoles: { id: string; name: string }[] = [];
  if (missingRoleNames.length) {
    createdRoles = (
      await db
        .insert(schema.roles)
        .values(
          missingRoleNames.map((name) => ({
            id: randomUUID(),
            name,
            displayName: name,
            description: `Auto-created from ${activeProvider} claims`,
            tenantId: "default",
          }))
        )
        .returning({ id: schema.roles.id, name: schema.roles.name })
    ).map((role) => ({ id: role.id, name: role.name }));
  }

  const rolesToAssign = [...existingRoles, ...createdRoles].filter((role) => {
    return !existingAssignments.some(
      (assignment) => assignment.roleId === role.id
    );
  });

  if (rolesToAssign.length) {
    await db.insert(schema.userRoles).values(
      rolesToAssign.map((role) => ({
        id: randomUUID(),
        userId,
        roleId: role.id,
      }))
    );
    return true;
  }

  return false;
}

async function syncUserFromLatestClaims(userId: string) {
  const accountRecord = await db.query.account.findFirst({
    where: eq(schema.account.userId, userId),
  });

  if (!accountRecord || (!accountRecord.claims && !accountRecord.idToken)) {
    return false;
  }

  let claims =
    (accountRecord.claims as Record<string, unknown> | null) ?? null;

  if (!claims && accountRecord.idToken) {
    try {
      claims = decodeJwt(accountRecord.idToken) as Record<string, unknown>;
    } catch (error) {
      console.warn("Failed to decode ID token for user", userId, error);
      return false;
    }
  }

  if (!claims) {
    return false;
  }

  const standardClaims = mapClaimsToUser(claims, activeProvider);

  await db
    .update(schema.user)
    .set({
      providerId: standardClaims.provider,
      providerUserId: standardClaims.providerId,
      username: standardClaims.username,
      lastLoginAt: new Date(),
    })
    .where(eq(schema.user.id, userId));

  if (!accountRecord.claims) {
    await db
      .update(schema.account)
      .set({ claims })
      .where(eq(schema.account.id, accountRecord.id));
  }

  await syncRolesFromClaims(userId, standardClaims.roles);

  // 同步 Open WebUI API Key（不阻塞登录流程）
  const userRecord = await db.query.user.findFirst({
    where: eq(schema.user.id, userId),
    columns: { email: true },
  });

  if (userRecord?.email) {
    void trySyncOpenWebuiApiKey(userId, userRecord.email);
  }

  return true;
}

const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret) {
  throw new Error("BETTER_AUTH_SECRET is required but not configured in environment variables");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000",
  secret: authSecret,
  session: {
    expiresIn: parseInt(process.env.SESSION_MAX_AGE || "28800", 10),
    updateAge: 3600,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    ...(activeProvider === "entra"
      ? {
          microsoft: {
            enabled: true,
            ...getMicrosoftProviderConfig(),
          },
        }
      : {}),
  },
  plugins: [
    ...(activeProvider === "adfs"
      ? [
          genericOAuth({
            config: [
              {
                providerId: "adfs",
                clientId: process.env.ADFS_CLIENT_ID!,
                clientSecret: process.env.ADFS_CLIENT_SECRET!,
                authorizationUrl: process.env.ADFS_AUTHORIZATION_URL!,
                tokenUrl: process.env.ADFS_TOKEN_URL!,
                userInfoUrl: process.env.ADFS_USERINFO_URL!,
                scopes: ["openid", "profile", "email"],
                pkce: true,
                mapProfileToUser: async (profile: Record<string, unknown>) => {
                  try {
                    console.log("\n╔════════════════════════════════════════════════════════════");
                    console.log("║ 👤 USERINFO ENDPOINT RESPONSE");
                    console.log("╠════════════════════════════════════════════════════════════");
                    console.log("║ " + JSON.stringify(profile, null, 2).split('\n').join('\n║ '));
                    console.log("╚════════════════════════════════════════════════════════════\n");

                    // 从缓存中获取 ID Token claims
                    const sub = profile.sub as string || profile.id as string;
                    const idTokenClaims = sub ? idTokenClaimsCache.get(sub) : null;

                    // 合并 ID Token claims 和 UserInfo 数据
                    // 优先使用 ID Token 的数据（因为 UserInfo 可能不完整）
                    const mergedProfile = {
                      ...profile,
                      ...(idTokenClaims || {}),
                    };

                    // 使用合并后的数据进行映射
                    const standardClaims = mapClaimsToUser(mergedProfile, "adfs");

                    // 验证必需字段
                    if (!standardClaims.id || standardClaims.id.trim() === "") {
                      console.error("ADFS claims missing user ID:", mergedProfile);
                      throw new Error("ADFS did not return a valid user ID (sub/unique_name/upn)");
                    }

                    // Better Auth requires a valid email
                    let email = standardClaims.email;
                    if (!email || email.trim() === "") {
                      const identifier = standardClaims.username || standardClaims.id;
                      email = `${identifier}@adfs.local`;
                      console.warn(`No email found in claims, generated fallback: ${email}`);
                    }

                    const mappedUser = {
                      id: standardClaims.id,
                      name: standardClaims.name || standardClaims.username || "Unknown User",
                      email,
                      image: null,
                      emailVerified: true,
                    };

                    console.log("╔════════════════════════════════════════════════════════════");
                    console.log("║ ✅ FINAL MAPPED USER");
                    console.log("╠════════════════════════════════════════════════════════════");
                    console.log("║ " + JSON.stringify(mappedUser, null, 2).split('\n').join('\n║ '));
                    console.log("╚════════════════════════════════════════════════════════════\n");

                    // 清理缓存（可选，避免内存泄漏）
                    if (sub) {
                      idTokenClaimsCache.delete(sub);
                    }

                    return mappedUser;
                  } catch (error) {
                    console.error("Error mapping ADFS profile to user:", error);
                    throw new Error(`Failed to process ADFS user profile: ${error instanceof Error ? error.message : String(error)}`);
                  }
                },
              },
            ],
          }),
        ]
      : []),
  ],
});

export async function ensureUserClaimsSynced(userId: string) {
  return syncUserFromLatestClaims(userId);
}
