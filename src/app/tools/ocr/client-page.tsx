"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/tools/image-upload";
import { mockOCRResults } from "@/lib/mock-data";
import type { OCRResult } from "@/types";
import { toast } from "sonner";
import {
  BadgeCheck,
  Download,
  Loader2,
  Sparkles,
  CheckCircle2,
  Zap,
  FileText,
  Shield,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const modeOptions = [
  { value: "normal", label: "普通识别", description: "快速提取图片文字" },
  { value: "structured", label: "文档结构输出", description: "保留标题 / 列表结构" },
] as const;

const modelOptions = [
  { value: "mini", label: "迷你", description: "极速返回" },
  { value: "small", label: "小型", description: "速度与准确平衡" },
  { value: "base", label: "基础", description: "通用场景" },
  { value: "large", label: "大型", description: "高精度复杂文本" },
] as const;

type OCRMode = (typeof modeOptions)[number]["value"];
type ModelSize = (typeof modelOptions)[number]["value"];

const features = [
  { icon: Zap, text: "极速识别响应，适合批量文件" },
  { icon: FileText, text: "保留段落、列表等文档结构" },
  { icon: Shield, text: "全程加密处理，保障隐私" },
  { icon: CheckCircle2, text: "针对票据/表格做专项优化" },
];

const usageTips = [
  "基础模型覆盖大多数场景，系统会自动裁剪噪声边缘",
  "文档结构输出更适合长文档或带层级的资料",
  "普通识别可快速提取短文本或截图内容",
  "上传清晰、对比度高的图片有助于提升准确率",
];

export default function OCRToolPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<OCRMode>("normal");
  const [modelSize, setModelSize] = useState<ModelSize>("base");
  const [result, setResult] = useState<OCRResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    if (previewRef.current && previewRef.current !== previewUrl) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = previewUrl;
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [previewUrl]);

  const handleImageChange = (file: File | null, preview: string | null) => {
    setImageFile(file);
    setPreviewUrl(preview);
    setResult(null);
  };

  const buildResult = (selectedMode: OCRMode, selectedModel: ModelSize): OCRResult => {
    const base = mockOCRResults[selectedMode];
    const multiplier =
      selectedModel === "mini" ? 0.6 : selectedModel === "small" ? 0.8 : selectedModel === "large" ? 1.2 : 1;
    return {
      ...base,
      id: `${base.id}-${selectedModel}`,
      modelSize: selectedModel,
      processTime: Math.round(base.processTime * multiplier),
      text: `${base.text}\n\n—— 模式：${modeOptions.find((item) => item.value === selectedMode)?.label} · 模型：${
        modelOptions.find((item) => item.value === selectedModel)?.label
      }`,
    };
  };

  const handleProcess = () => {
    if (!imageFile) {
      toast.error("请先上传需要识别的图片");
      return;
    }
    setIsProcessing(true);
    setResult(null);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const nextResult = buildResult(mode, modelSize);
      setResult(nextResult);
      setIsProcessing(false);
      toast.success("OCR 识别完成");
    }, 3000);
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
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-5 overflow-hidden rounded-3xl bg-neutral-950/70 p-6 backdrop-blur">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-neutral-900/60 to-transparent px-8 py-10 text-center shadow-2xl">
            <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-primary">
              <Sparkles className="h-4 w-4" />
              <span>DeepSeek OCR</span>
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-white">DeepSeek OCR 文本识别工具</h1>
            <p className="mt-3 text-balance text-base text-muted-foreground">
              基于深度学习的智能图像文字识别，支持多种文档格式且完整保留原始结构，为复杂业务文档提供准确语境理解
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="grid flex-1 min-h-0 grid-cols-[1.05fr,0.95fr] grid-rows-[260px_minmax(0,1fr)] gap-4">
              <Card className="row-span-1">
                <CardContent className="flex h-full flex-col p-4">
                  <Label className="mb-3 text-sm font-medium">上传图像</Label>
                  <div className="flex-1">
                    <ImageUpload file={imageFile} previewUrl={previewUrl} onChange={handleImageChange} compact />
                </div>
              </CardContent>
            </Card>

            <div className="row-start-2 row-end-3 grid grid-cols-2 gap-4 h-full">
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">识别类型</Label>
                    <BadgeCheck className="h-4 w-4 text-primary" />
                  </div>
                  <RadioGroup
                    value={mode}
                    onValueChange={(value) => setMode(value as OCRMode)}
                    className="grid grid-cols-2 gap-3"
                  >
                    {modeOptions.map((option) => (
                      <label
                        key={option.value}
                        htmlFor={option.value}
                        className={cn(
                          "flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2 text-left transition-colors",
                          mode === option.value ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:bg-muted/70"
                        )}
                      >
                        <RadioGroupItem className="sr-only" id={option.value} value={option.value} />
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">模型大小</Label>
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <RadioGroup
                    value={modelSize}
                    onValueChange={(value) => setModelSize(value as ModelSize)}
                    className="grid grid-cols-2 gap-3"
                  >
                    {modelOptions.map((option) => (
                      <label
                        key={option.value}
                        htmlFor={option.value}
                        className={cn(
                          "flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2 text-left transition-colors",
                          modelSize === option.value ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:bg-muted/70"
                        )}
                      >
                        <RadioGroupItem className="sr-only" id={option.value} value={option.value} />
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            <Card className="col-start-2 row-span-2 flex min-h-0 flex-col">
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
                  value={result?.text ?? "尚未生成结果。请上传图片并点击「开始处理」。"}
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
