import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [genericOAuthClient()],
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;

const activeProvider =
  (process.env.NEXT_PUBLIC_OIDC_PROVIDER === "adfs" ? "adfs" : "microsoft") as
    | "adfs"
    | "microsoft";

export async function signInWithOIDC(callbackURL = "/home") {
  await signIn.social({
    provider: activeProvider,
    callbackURL,
  });
}

interface LogoutResponse {
  providerLogoutUrl?: string;
  postLogoutRedirect?: string;
}

export async function signOutFromOIDC() {
  let providerLogoutUrl: string | undefined;
  let fallbackRedirect = "/";

  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) {
      const payload = (await response.json()) as LogoutResponse;
      providerLogoutUrl = payload.providerLogoutUrl;
      fallbackRedirect = payload.postLogoutRedirect ?? fallbackRedirect;
    } else {
      console.warn("Failed to retrieve provider logout URL");
    }
  } catch (error) {
    console.error("Error while calling logout endpoint", error);
  }

  await signOut();

  if (providerLogoutUrl) {
    window.location.href = providerLogoutUrl;
  } else {
    window.location.href = fallbackRedirect;
  }
}

interface CredentialLoginOptions {
  callbackURL?: string;
  rememberMe?: boolean;
}

export async function signInWithCredentials(
  email: string,
  password: string,
  options?: CredentialLoginOptions
) {
  await signIn.email({
    email,
    password,
    callbackURL: options?.callbackURL ?? "/home",
    rememberMe: options?.rememberMe ?? true,
  });
}
