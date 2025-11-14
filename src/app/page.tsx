"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WavyBackground } from "@/components/ui/wavy-background";

const FIXED_USERNAME = "zhangbin";
const FIXED_PASSWORD = "Bobcfc1234";

export default function Home() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState(FIXED_USERNAME);
  const [password, setPassword] = useState(FIXED_PASSWORD);
  const [status, setStatus] = useState<"success" | "error" | null>(null);

  const handleRevealForm = () => {
    setShowForm(true);
    setStatus(null);
  };

  const handleResetForm = () => {
    setShowForm(false);
    setStatus(null);
    setUsername(FIXED_USERNAME);
    setPassword(FIXED_PASSWORD);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isValid = username === FIXED_USERNAME && password === FIXED_PASSWORD;

    if (isValid) {
      setStatus("success");
      router.push("/home");
      return;
    }

    setStatus("error");
  };

  return (
    <main className="min-h-svh bg-background text-foreground">
      <WavyBackground
        containerClassName="relative"
        className="flex min-h-svh w-full flex-col items-center justify-center px-6 pb-16 pt-24 text-white"
      >
        <div className="flex w-full max-w-4xl flex-col items-center text-center">
          <div className="flex min-h-[260px] w-full flex-col items-center justify-center space-y-4 cursor-default">
            <p className="text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
              Bank of Beijing
            </p>
            <p className="text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
              Consumer Finance Company
            </p>
            <p className="text-lg text-white/80">
              <span className="font-semibold">
                {"\u7528\u4eba\u5de5\u667a\u80fd\u91cd\u5851\u5de5\u4f5c\u65b9\u5f0f\uff0c\u9a71\u52a8\u6548\u7387\u8dc3\u5347\u4e0e\u521b\u65b0\u7a81\u7834\uff1b"}
              </span>
            </p>
          </div>

          <div className="mt-12 flex w-full max-w-md justify-center">
            <div className="w-full max-w-sm min-h-[240px]">
              {!showForm ? (
                <Button
                  size="lg"
                  className="w-full bg-white/10 text-white hover:bg-white/20"
                  onClick={handleRevealForm}
                  aria-label="\u7acb\u5373\u4f53\u9a8c"
                >
                  {"\u7acb\u5373\u4f53\u9a8c"}
                </Button>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="flex w-full flex-col items-center gap-6"
                >
                  <div className="flex w-full max-w-sm items-center gap-4">
                  <Label
                    htmlFor="username"
                    className="w-16 text-right text-white/80"
                  >
                    {"\u7528\u6237\u540d"}
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    className="w-48 border-white/20 bg-white/5 text-white placeholder:text-white/60 focus-visible:ring-white/60 sm:w-56"
                  />
                </div>
                  <div className="flex w-full max-w-sm items-center gap-4">
                  <Label
                    htmlFor="password"
                    className="w-16 text-right text-white/80"
                  >
                    {"\u5bc6\u7801"}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="w-48 border-white/20 bg-white/5 text-white placeholder:text-white/60 focus-visible:ring-white/60 sm:w-56"
                  />
                </div>
                  <div className="flex w-full max-w-sm gap-4">
                  <Button type="submit" size="lg" className="flex-1">
                    {"\u767b\u5f55"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-white/40 text-white hover:bg-white/10"
                    onClick={handleResetForm}
                  >
                    {"\u8fd4\u56de"}
                  </Button>
                </div>
                  {status === "error" && (
                    <p className="text-center text-sm text-red-300">
                      {"\u51ed\u8bc1\u4e0d\u6b63\u786e\uff0c\u8bf7\u4f7f\u7528\u6f14\u793a\u8d26\u53f7"} ({FIXED_USERNAME} / {FIXED_PASSWORD})
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </WavyBackground>
    </main>
  );
}
