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
        className="flex min-h-svh w-full flex-col items-center justify-center px-6 py-16 text-white"
      >
        <div className="flex w-full max-w-4xl flex-col items-center text-center">
          <div className="flex min-h-[260px] w-full flex-col items-center justify-center space-y-4">
            <p className="text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
              Bank of Beijing
            </p>
            <p className="text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
              Consumer Finance Company
            </p>
            <p className="text-lg text-white/80">
              <span className="font-semibold">
                {"\u805a\u7126\u573a\u666f\uff0c\u8d4b\u80fd\u6d88\u8d39\u91d1\u878d\u6570\u5b57\u5316\u5347\u7ea7"}
              </span>
            </p>
          </div>

          <div className="mt-12 w-full max-w-md rounded-2xl bg-black/40 p-8 shadow-2xl ring-1 ring-white/10 backdrop-blur">
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
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="space-y-2 text-left">
                  <Label htmlFor="username" className="text-white/80">
                    {"\u7528\u6237\u540d"}
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/60 focus-visible:ring-white/60"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="password" className="text-white/80">
                    {"\u5bc6\u7801"}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/60 focus-visible:ring-white/60"
                  />
                </div>
                <div className="flex gap-4">
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
      </WavyBackground>
    </main>
  );
}
