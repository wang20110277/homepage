"use client";

import { useState } from "react";
import { signInWithOIDC } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { WavyBackground } from "@/components/ui/wavy-background";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithOIDC();
      // OIDC will handle the redirect after successful login
    } catch (err) {
      console.error("OIDC login failed", err);
      setError("登录失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-svh bg-white text-black">
      <WavyBackground
        containerClassName="relative bg-white"
        backgroundFill="#ffffff"
        className="flex min-h-svh w-full flex-col items-center justify-center px-6 pb-16 pt-24 text-black"
      >
        <div className="flex w-full max-w-4xl flex-col items-center text-center">
          {/* Hero Section */}
          <div className="flex min-h-[260px] w-full flex-col items-center justify-center space-y-4 cursor-default select-none">
            <p className="text-4xl font-semibold leading-tight text-black md:text-5xl lg:text-6xl">
              Bank of Beijing
            </p>
            <p className="text-4xl font-semibold leading-tight text-black md:text-5xl lg:text-6xl">
              Consumer Finance Company
            </p>
            <p className="text-lg text-black">
              <span className="font-semibold">
                用人工智能重塑工作方式，驱动效率跃升与创新突破
              </span>
            </p>
          </div>

          {/* Login Button */}
          <div className="mt-12 flex w-full max-w-md justify-center">
            <div className="w-full max-w-sm space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/50">
                  <AlertDescription className="text-slate-900">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                size="lg"
                className="w-full bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-950"
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在跳转...
                  </>
                ) : (
                  "立即体验"
                )}
              </Button>

              <p className="text-center text-xs text-slate-500">
                登录即表示您同意我们的服务条款和隐私政策
              </p>
            </div>
          </div>
        </div>
      </WavyBackground>
    </main>
  );
}
