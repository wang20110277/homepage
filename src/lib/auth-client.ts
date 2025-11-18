import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;

export async function signInWithOIDC(callbackURL = "/home") {
  await signIn.social({
    provider: "microsoft",
    callbackURL,
  });
}

interface LogoutResponse {
  providerLogoutUrl?: string;
  postLogoutRedirect?: string;
}

export async function signOutFromOIDC() {
  const response = await fetch("/api/auth/logout", { method: "POST" });

  if (!response.ok) {
    throw new Error("Failed to sign out from OIDC provider");
  }

  const payload = (await response.json()) as LogoutResponse;

  await signOut();

  const fallbackRedirect = payload.postLogoutRedirect ?? "/login";

  if (payload.providerLogoutUrl) {
    window.location.href = payload.providerLogoutUrl;
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
