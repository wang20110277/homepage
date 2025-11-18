"use client";

import { useSession, signInWithOIDC } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <Button disabled>Loading...</Button>;
  }

  if (session) {
    return null;
  }

  return (
    <Button
      onClick={async () => {
        await signInWithOIDC("/dashboard");
      }}
    >
      Sign in
    </Button>
  );
}
