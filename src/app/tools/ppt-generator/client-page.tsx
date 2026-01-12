"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Loader2,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import {
  generatePpt,
  type GeneratePptResponse,
  PPTApiError,
} from "@/lib/api/ppt";

// 生成5-20的所有页数选项
const slideOptions = Array.from({ length: 16 }, (_, i) => ({
  label: `${i + 5} 页`,
  value: i + 5,
}));

// Generation status type
type GenerationStatus = "idle" | "generating" | "completed" | "error";

export default function PPTGeneratorPage() {
  const [slideCount, setSlideCount] = useState(8);
  const [prompt, setPrompt] = useState("");

  // Generation state
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [result, setResult] = useState<GeneratePptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      return;
    }

    setStatus("idle");
    setError(null);
    setResult(null);

    try {
      // Generate PPT
      setStatus("generating");
      setStatusMessage("正在生成演示文稿，请稍候...");

      const generationResult = await generatePpt({
        content: prompt,
        n_slides: slideCount,
      });

      setResult(generationResult);
      setStatus("completed");
      setStatusMessage("演示文稿生成成功！");
    } catch (err) {
      setStatus("error");

      if (err instanceof PPTApiError) {
        setError(`${err.message} (${err.code})`);
        if (err.detail) {
          console.error("API Error details:", err.detail);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("生成过程中发生未知错误");
      }

      setStatusMessage("");
    }
  }, [prompt, slideCount]);

  const isGenerating = status === "generating";

  return (
    <main className="container mx-auto max-w-4xl space-y-12 pb-16 pt-20">
      {/* Header */}
      <header className="space-y-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          AI 智能演示文稿生成
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          选择设计风格，设置偏好，几分钟内生成精美的演示文稿
        </p>
      </header>

      {/* Prompt with slide count */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-foreground">提示词</Label>
          <div className="flex items-center gap-3">
            <Label className="text-sm font-bold text-foreground">
              选择演示文稿的页数
            </Label>
            <Select
              value={String(slideCount)}
              onValueChange={(v) => setSlideCount(Number(v))}
            >
              <SelectTrigger className="h-10 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {slideOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="告诉我们关于您的演示文稿..."
          className="min-h-[200px] resize-none text-base"
          disabled={isGenerating}
        />
      </section>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border p-4",
            status === "completed" && "border-green-500 bg-green-50 dark:bg-green-950",
            status === "error" && "border-red-500 bg-red-50 dark:bg-red-950",
            status === "generating" &&
              "border-blue-500 bg-blue-50 dark:bg-blue-950"
          )}
        >
          {status === "completed" && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
          {status === "error" && (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          {status === "generating" && (
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          )}
          <span className="text-sm">{statusMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-4 dark:bg-red-950">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800 dark:text-red-200">
              生成失败
            </span>
          </div>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      {/* Result Section */}
      {result && status === "completed" && (
        <div className="space-y-4 rounded-lg border border-green-500 bg-green-50 p-6 dark:bg-green-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
              演示文稿已生成
            </h3>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-green-700 dark:text-green-300">
              演示文稿 ID: {result.presentation.id}
            </p>
            {result.presentation.title && (
              <p className="text-sm text-green-700 dark:text-green-300">
                标题: {result.presentation.title}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            {result.downloadUrl && (
              <Button
                asChild
                className="bg-green-600 hover:bg-green-700"
              >
                <a
                  href={result.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Download className="mr-2 h-4 w-4" />
                  下载演示文稿
                </a>
              </Button>
            )}
            {result.previewUrl && (
              <Button variant="outline" asChild>
                <a
                  href={result.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  预览
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        size="lg"
        className="h-14 w-full text-base font-semibold"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            正在生成演示文稿...
          </>
        ) : (
          <>
            生成演示文稿
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>
    </main>
  );
}
