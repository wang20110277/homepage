import { NextResponse } from "next/server";
import { ok } from "@/lib/core/api-response";
import { auth } from "@/lib/auth";
import { withAuth } from "@/lib/core/bff-auth";

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

export const POST = withAuth(async (req, { traceId }) => {
  await auth.api.signOut({ headers: req.headers });

  return ok(
    {
      providerLogoutUrl: getProviderLogoutUrl(),
      postLogoutRedirect: "/login",
    },
    traceId
  );
});
