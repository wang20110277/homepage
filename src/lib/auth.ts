import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq, inArray } from "drizzle-orm";
import { decodeJwt } from "jose";
import { db } from "./db";
import * as schema from "./schema";
import { mapClaimsToUser, mergeClaimRoles } from "./auth-utils";
import { ensureCoreAuthData } from "./rbac-init";

const activeProvider =
  (process.env.OIDC_PROVIDER === "adfs" ? "adfs" : "entra") as "entra" | "adfs";

void ensureCoreAuthData().catch((error) => {
  console.error("Failed to ensure authentication bootstrap data:", error);
});

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

  return true;
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
  secret: process.env.BETTER_AUTH_SECRET!,
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
            async profile(profile: Record<string, unknown>) {
              const standardClaims = mapClaimsToUser(profile, activeProvider);

              return {
                id: standardClaims.id,
                name: standardClaims.name,
                email: standardClaims.email,
                image: (profile as { picture?: string }).picture || null,
                emailVerified: true,
              };
            },
          },
        }
      : {}),
  } as Record<string, unknown>,
});

export async function ensureUserClaimsSynced(userId: string) {
  return syncUserFromLatestClaims(userId);
}
