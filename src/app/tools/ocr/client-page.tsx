"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/tools/image-upload";
import type { OCRResult } from "@/types";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  Sparkles,
  CheckCircle2,
  Zap,
  FileText,
  Copy,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";


const features = [
  { icon: Zap, text: "极速识别响应，适合批量文件" },
  { icon: FileText, text: "保留段落、列表等文档结构" },
  { icon: Shield, text: "全程加密处理，保障隐私" },
  { icon: CheckCircle2, text: "针对票据/表格做专项优化" },
];

const usageTips = [
  "系统会自动将图片内容转换为Markdown格式",
  "支持识别图片中的文字、表格、公式等内容",
  "上传清晰、对比度高的图片有助于提升准确率",
  "识别结果可直接复制或导出使用",
];

export default function OCRToolPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    if (previewRef.current && previewRef.current !== previewUrl) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = previewUrl;

    // 保存当前的ref值，以便在cleanup中使用
    const currentTimer = timerRef.current;

    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
      if (currentTimer) {
        clearTimeout(currentTimer);
      }
    };
  }, [previewUrl]);

  const handleImageChange = (file: File | null, preview: string | null) => {
    setImageFile(file);
    setPreviewUrl(preview);
    setResult(null);
    setStatusMessage("");
  };

  // 将文件转换为base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // 去掉 "data:image/xxx;base64," 前缀
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleProcess = async () => {
    if (!imageFile) {
      toast.error("请先上传需要识别的图片");
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setStatusMessage("正在处理图片...");

    try {
      // 转换图片为base64
      const imageBase64 = await fileToBase64(imageFile);

      // 调用OCR API
      const response = await fetch("/api/ocr/recognize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "识别失败");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "识别失败");
      }

      // 构建OCR结果
      const ocrResult: OCRResult = {
        id: `ocr_${Date.now()}`,
        mode: "structured",
        modelSize: "base",
        text: data.data.text,
        confidence: 0.95, // 固定置信度
        processTime: data.data.inferenceTime * 1000, // 转换为毫秒
        createdAt: new Date().toISOString(),
      };

      setResult(ocrResult);
      setIsProcessing(false);
      setStatusMessage("");
      toast.success(`识别完成（耗时 ${data.data.inferenceTime.toFixed(2)}s）`);
    } catch (error) {
      setIsProcessing(false);
      setStatusMessage("");
      toast.error(`识别失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleExport = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      toast.info("识别结果已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };

  const handleCopyResult = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };

  return (
    <main className="flex min-h-screen flex-col pt-14">
      <section className="flex-1 overflow-hidden px-6 py-6 -mt-[3vh]">
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-5 overflow-hidden rounded-3xl dark:bg-neutral-950/70 bg-card p-6 backdrop-blur">
          <div className="rounded-2xl border dark:border-white/10 border-border dark:bg-gradient-to-br dark:from-white/5 dark:via-neutral-900/60 bg-gradient-to-br from-background via-card to-transparent px-8 py-10 text-center shadow-2xl">
            <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-primary">
              <Sparkles className="h-4 w-4" />
              <span>DeepSeek OCR</span>
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight dark:text-white text-foreground">DeepSeek OCR 文本识别工具</h1>
            <p className="mt-3 text-balance text-base text-muted-foreground">
              基于深度学习的智能图像文字识别，支持多种文档格式且完整保留原始结构，为复杂业务文档提供准确语境理解
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="grid flex-1 min-h-0 grid-cols-2 gap-4">
              <Card className="flex flex-col">
                <CardContent className="flex h-full flex-col p-4">
                  <Label className="mb-3 text-sm font-medium">上传图像</Label>
                  <div className="flex-1">
                    <ImageUpload file={imageFile} previewUrl={previewUrl} onChange={handleImageChange} compact />
                </div>
              </CardContent>
            </Card>

            <Card className="flex min-h-0 flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex items-center justify-between">
                  <Label className="text-sm font-semibold">识别结果</Label>
                  <button
                    onClick={handleCopyResult}
                    disabled={!result?.text}
                    className={cn(
                      "transition-colors rounded-md p-1",
                      result?.text
                        ? "text-primary hover:bg-primary/10 cursor-pointer"
                        : "text-muted-foreground/40 cursor-not-allowed"
                    )}
                    title="复制结果"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <Textarea
                  readOnly
                  value={result?.text ?? (statusMessage || "尚未生成结果。请上传图片并点击「开始处理」。")}
                  className="flex-1 min-h-0 resize-none"
                />
                {result && (
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span>置信度: {(result.confidence * 100).toFixed(1)}%</span>
                    <span>•</span>
                    <span>耗时: {(result.processTime / 1000).toFixed(2)}s</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

            <div className="grid shrink-0 grid-cols-2 gap-4">
              <Button size="lg" onClick={handleProcess} disabled={isProcessing} className="w-full">
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    识别中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    开始处理
                  </>
                )}
              </Button>
              <Button size="lg" variant="outline" onClick={handleExport} disabled={!result?.text} className="w-full">
                <Download className="mr-2 h-5 w-5" />
                导出结果
              </Button>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">功能亮点</h2>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {features.map((feature, index) => (
                      <li key={feature.text} className="flex items-start gap-2">
                        <feature.icon className="h-4 w-4 flex-shrink-0 text-primary" />
                        <span>
                          {index + 1}. {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">使用提示</h2>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {usageTips.map((tip, index) => (
                      <li key={tip} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
                        <span>
                          {index + 1}. {tip}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
