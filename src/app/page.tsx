"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithOIDC } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { WavyBackground } from "@/components/ui/wavy-background";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LandingPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithOIDC(callbackUrl || "/home");
      // OIDC will handle the redirect after successful login
    } catch (err) {
      console.error("OIDC login failed", err);
      setError("登录失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-svh bg-white text-gray-900 -mt-[72px]">
      <WavyBackground
        containerClassName="relative bg-white"
        backgroundFill="white"
        className="flex min-h-svh w-full flex-col items-center justify-center px-6 pb-16 pt-24 text-gray-900"
      >
        <div className="flex w-full max-w-4xl flex-col items-center text-center">
          {/* Hero Section */}
          <div className="flex min-h-[260px] w-full flex-col items-center justify-center space-y-4 cursor-default select-none">
            <p className="text-4xl font-semibold leading-tight text-gray-900 md:text-5xl lg:text-6xl">
              Bank of Beijing
            </p>
            <p className="text-4xl font-semibold leading-tight text-gray-900 md:text-5xl lg:text-6xl">
              Consumer Finance Company
            </p>
            <p className="text-2xl font-bold text-gray-800 md:text-3xl">
              大模型服务平台
            </p>
          </div>

          {/* Login Button */}
          <div className="mt-6 flex w-full max-w-md flex-col items-center justify-center">
            <div className="w-full max-w-sm space-y-4">
              {callbackUrl && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-900">
                    请登录后继续访问
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert
                  variant="destructive"
                  className="bg-red-50 border-red-200"
                >
                  <AlertDescription className="text-red-900">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                size="lg"
                className="w-full bg-gray-900 text-white hover:bg-gray-800"
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
            </div>

            <p className="mt-8 text-lg text-gray-900">
              <span className="font-semibold">
                用人工智能重塑工作方式，驱动效率跃升与创新突破
              </span>
            </p>
          </div>
        </div>
      </WavyBackground>
    </main>
  );
}
