"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function MyPresentationsPage() {
  const router = useRouter();

  return (
    <main className="container mx-auto max-w-6xl space-y-8 pb-16 pt-20">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">我的演示文稿</h1>
            <p className="text-lg text-muted-foreground">
              此功能暂时不可用
            </p>
          </div>
        </div>
      </header>

      {/* Disabled Notice */}
      <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-12 text-center dark:bg-yellow-950">
        <AlertCircle className="mx-auto h-16 w-16 text-yellow-600" />
        <h3 className="mt-4 text-xl font-semibold text-yellow-800 dark:text-yellow-200">
          功能暂时禁用
        </h3>
        <p className="mx-auto mt-2 max-w-md text-yellow-700 dark:text-yellow-300">
          &ldquo;我的演示文稿&rdquo;功能目前暂时不可用。请使用 PPT 生成器创建新的演示文稿。
        </p>
        <Button
          onClick={() => router.push("/tools/ppt-generator")}
          size="lg"
          className="mt-6"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          返回 PPT 生成器
        </Button>
      </div>
    </main>
  );
}
