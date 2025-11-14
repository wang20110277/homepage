"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ImageUpload } from "@/components/tools/image-upload";
import { mockOCRResults } from "@/lib/mock-data";
import type { OCRResult } from "@/types";
import { toast } from "sonner";
import {
  BadgeCheck,
  Copy,
  Layers,
  Loader2,
  ScanText,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

const featureBadges = ["免费识别", "结构化输出", "多模型选择", "多格式支持"];

const modeOptions = [
  { value: "normal", label: "普通识别", description: "快速提取图片文字" },
  { value: "structured", label: "文档结构输出", description: "保持标题 / 列表结构" },
  { value: "custom", label: "自定义模式", description: "对票据、表格等自定义模板" },
] as const;

const modelOptions = [
  { value: "mini", label: "迷你", description: "极速返回" },
  { value: "small", label: "小型", description: "速度与准确平衡" },
  { value: "base", label: "基础", description: "通用场景" },
  { value: "large", label: "大型", description: "高精度复杂文本" },
  { value: "recommended", label: "推荐", description: "由系统智能决策" },
] as const;

type OCRMode = (typeof modeOptions)[number]["value"];
type ModelSize = (typeof modelOptions)[number]["value"];

export default function OCRToolPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<OCRMode>("normal");
  const [modelSize, setModelSize] = useState<ModelSize>("recommended");
  const [result, setResult] = useState<OCRResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("等待上传图片");
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
    setStatusMessage(file ? "已上传图片，配置识别参数" : "等待上传图片");
  };

  const buildResult = (selectedMode: OCRMode, selectedModel: ModelSize): OCRResult => {
    const base = mockOCRResults[selectedMode];
    const multiplier = selectedModel === "mini" ? 0.6 : selectedModel === "small" ? 0.8 : selectedModel === "large" ? 1.2 : 1;
    return {
      ...base,
      id: `${base.id}-${selectedModel}`,
      modelSize: selectedModel,
      processTime: Math.round(base.processTime * multiplier),
      text: `${base.text}\n\n—— 模式：${modeOptions.find((item) => item.value === selectedMode)?.label} · 模型：${modelOptions.find((item) => item.value === selectedModel)?.label}`,
    };
  };

  const handleProcess = () => {
    if (!imageFile) {
      toast.error("请先上传需要识别的图片");
      return;
    }
    setIsProcessing(true);
    setStatusMessage("正在进行 OCR 识别……");
    setResult(null);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const nextResult = buildResult(mode, modelSize);
      setResult(nextResult);
      setStatusMessage("识别完成，可复制结果");
      setIsProcessing(false);
      toast.success("OCR 识别完成");
    }, 3000);
  };

  const handleCopy = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      toast.info("识别结果已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };

  const processingProgress = isProcessing ? 70 : result ? 100 : 0;

  return (
    <div className="container py-10 space-y-8">
      <header className="space-y-4">
        <Badge variant="secondary" className="w-fit gap-2">
          <ScanText className="h-4 w-4" /> OCR 文本识别工具
        </Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">图像一键转文本，保留结构更懂语境</h1>
          <p className="max-w-3xl text-muted-foreground">
            支持截图、合同、扫描件等多场景 OCR 识别，提供结构化输出和多模型选择。上传图片后配置识别模式与模型，几秒钟即可得到可复制的文档。
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {featureBadges.map((item) => (
            <div key={item} className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.3fr,0.7fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>上传素材</CardTitle>
              <CardDescription>拖拽或点击上传需要识别的图片文件</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload file={imageFile} previewUrl={previewUrl} onChange={handleImageChange} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>识别配置</CardTitle>
              <CardDescription>选择识别模式与模型，结合业务场景调优</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="space-y-3">
                <Label className="text-xs uppercase text-muted-foreground">识别模式</Label>
                <RadioGroup value={mode} onValueChange={(value) => setMode(value as OCRMode)} className="grid gap-3 lg:grid-cols-3">
                  {modeOptions.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-xl border p-3",
                        mode === option.value ? "border-primary bg-primary/5" : "border-muted"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id={option.value} value={option.value} />
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </label>
                  ))}
                </RadioGroup>
              </section>

              <section className="space-y-3">
                <Label className="text-xs uppercase text-muted-foreground">模型大小</Label>
                <RadioGroup value={modelSize} onValueChange={(value) => setModelSize(value as ModelSize)} className="grid gap-3 md:grid-cols-3">
                  {modelOptions.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-xl border p-3",
                        modelSize === option.value ? "border-primary bg-primary/5" : "border-muted"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id={option.value} value={option.value} />
                        <span className="font-medium">{option.label}</span>
                        {option.value === "recommended" && <BadgeCheck className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </label>
                  ))}
                </RadioGroup>
              </section>

              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" onClick={handleProcess} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      识别中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      开始处理
                    </>
                  )}
                </Button>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>当前模式：{modeOptions.find((item) => item.value === mode)?.label}</p>
                  <p>模型：{modelOptions.find((item) => item.value === modelSize)?.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertTitle>使用提示</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4 text-sm">
                <li>推荐模型适用于大多数文档场景，系统会自动裁剪图像边缘。</li>
                <li>文档结构输出更适合保留标题、列表、层级结构。</li>
                <li>普通识别可快速提取短文本或截图内容。</li>
                <li>使用高分辨率清晰图片可显著提升识别准确率。</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>识别状态</CardTitle>
              <CardDescription>{statusMessage}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{isProcessing ? "处理中" : result ? "已完成" : "待开始"}</span>
                <span className="text-muted-foreground">{processingProgress}%</span>
              </div>
              <Progress value={processingProgress} />
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>模式：{modeOptions.find((item) => item.value === (result?.mode ?? mode))?.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>模型：{modelOptions.find((item) => item.value === (result?.modelSize ?? modelSize))?.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary" />
                  <span>
                    耗时：{result ? `${(result.processTime / 1000).toFixed(2)}s` : isProcessing ? "识别中" : "--"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>识别结果</CardTitle>
                <CardDescription>文本可直接复制到知识库或 PPT</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy} disabled={!result?.text}>
                <Copy className="mr-2 h-4 w-4" /> 复制结果
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label>识别文本</Label>
              <Textarea
                readOnly
                value={result?.text ?? "还未生成结果。请上传图片并点击“开始处理”。"}
                className="min-h-[400px] resize-none"
              />
              {result && (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">置信度 {(result.confidence * 100).toFixed(1)}%</Badge>
                  <Badge variant="outline">生成时间 {(result.processTime / 1000).toFixed(2)}s</Badge>
                  <Badge variant="outline">模型 {modelOptions.find((item) => item.value === result.modelSize)?.label}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
