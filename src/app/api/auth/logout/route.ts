import { NextRequest } from "next/server";
import { ok, unauthorized, serviceUnavailable } from "@/lib/core/api-response";
import { auth } from "@/lib/auth";
import { getTraceId } from "@/lib/core/trace";
import { logError, logInfo, logWarn } from "@/lib/core/logger";

function getBaseRedirectUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  );
}

function getProviderLogoutUrl() {
  const postLogoutRedirect = `${getBaseRedirectUrl()}/login`;
  const provider = process.env.OIDC_PROVIDER === "adfs" ? "adfs" : "entra";

  if (provider === "adfs") {
    const issuer = process.env.ADFS_ISSUER;
    if (!issuer) {
      return undefined;
    }

    return `${issuer}/ls/?wa=wsignout1.0&post_logout_redirect_uri=${encodeURIComponent(
      postLogoutRedirect
    )}`;
  }

  const tenantId = process.env.ENTRA_TENANT_ID || "common";
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(
    postLogoutRedirect
  )}`;
}

export const POST = async (request: NextRequest) => {
  const traceId = getTraceId(request);
  const sessionCookie = request.cookies.get("better-auth.session_token");

  if (!sessionCookie) {
    logWarn(traceId, "Logout requested without session cookie");
    return unauthorized("Authentication required", traceId);
  }

  try {
    await auth.api.signOut({ headers: request.headers });

    logInfo(traceId, "User signed out");

    return ok(
      {
        providerLogoutUrl: getProviderLogoutUrl(),
        postLogoutRedirect: "/login",
      },
      traceId
    );
  } catch (error) {
    logError(traceId, "Failed to sign out user", {
      error: error instanceof Error ? error.message : String(error),
    });

    return serviceUnavailable("auth", "Unable to complete logout", traceId);
  }
};
