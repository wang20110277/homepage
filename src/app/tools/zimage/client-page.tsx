"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  Zap,
  ImageIcon,
  Download,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GeneratedImage {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

interface GenerationResult {
  created: number;
  data: GeneratedImage[];
  model: string;
  inferenceTime: number;
}

const features = [
  { icon: Zap, text: "快速生成高质量图像" },
  { icon: ImageIcon, text: "支持多种图像尺寸" },
  { icon: Wand2, text: "智能理解文字描述" },
  { icon: CheckCircle2, text: "一键保存生成结果" },
];

const usageTips = [
  "输入详细的描述词可获得更好的效果",
  "支持中英文提示词",
  "可以指定图像风格、颜色、构图等细节",
  "生成后可下载图片到本地",
];

const imageSizes = [
  { value: "1024x1024", label: "1024×1024 (方形)" },
  { value: "1024x1792", label: "1024×1792 (竖版)" },
  { value: "1792x1024", label: "1792×1024 (横版)" },
  { value: "512x512", label: "512×512 (小图)" },
];

const examplePrompts = [
  "一只可爱的橘猫坐在窗台上，阳光透过窗户洒在它的毛发上，温馨的氛围",
  "赛博朋克风格的城市夜景，霓虹灯闪烁，雨后街道倒映着灯光",
  "水墨画风格的山水画，远山含黛，近水如镜，意境悠远",
  "一个宇航员站在火星表面，背景是地球，科幻电影风格",
];

export default function ZImageClientPage() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<string>("1024x1024");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("请输入图像描述");
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch("/api/zimage/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          n: 1,
          size,
          response_format: "b64_json", // 使用 base64 格式，避免 URL 路径问题
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "生成失败");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "生成失败");
      }

      setResult(data.data);
      toast.success(`图像生成完成（耗时 ${data.data.inferenceTime.toFixed(2)}s）`);
    } catch (error) {
      toast.error(`生成失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const imageData = result?.data?.[0];
    if (!imageData) return;

    try {
      const timestamp = Date.now();

      if (imageData.b64_json) {
        // 处理 Base64 图片
        const byteArray = Uint8Array.from(atob(imageData.b64_json), (c) =>
          c.charCodeAt(0)
        );
        const blob = new Blob([byteArray], { type: "image/png" });

        // 使用 blob URL 下载
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `zimage-${timestamp}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (imageData.url) {
        // 处理 URL 图片 - 直接使用 a 标签下载避免 CORS
        const a = document.createElement("a");
        a.href = imageData.url;
        a.download = `zimage-${timestamp}.png`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      toast.success("图片已下载");
    } catch {
      toast.error("下载失败");
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  const generatedImageUrl = result?.data?.[0]?.url;
  const hasBase64Image = result?.data?.[0]?.b64_json;

  return (
    <main className="flex min-h-screen flex-col pt-14">
      <section className="flex-1 overflow-hidden px-6 py-6 -mt-[3vh]">
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-5 overflow-hidden rounded-3xl bg-neutral-950/70 p-6 backdrop-blur">
          {/* Header */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-neutral-900/60 to-transparent px-8 py-10 text-center shadow-2xl">
            <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-tool-cyan">
              <ImageIcon className="h-4 w-4" />
              <span>Z-Image</span>
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-white">AI 图像生成工具</h1>
            <p className="mt-3 text-balance text-base text-muted-foreground">
              输入文字描述，AI 将根据您的描述生成高质量图像。支持多种尺寸和风格，让创意变为现实
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            {/* Main Content */}
            <div className="grid flex-1 min-h-0 grid-cols-2 gap-4">
              {/* Input Panel */}
              <Card className="flex flex-col">
                <CardContent className="flex h-full flex-col p-4 gap-4">
                  <div className="flex-1 flex flex-col gap-3">
                    <Label className="text-sm font-medium">图像描述</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="请输入您想要生成的图像描述，例如：一只可爱的猫咪在草地上玩耍，阳光明媚..."
                      className="flex-1 min-h-[200px] resize-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-medium whitespace-nowrap">图像尺寸</Label>
                      <Select value={size} onValueChange={setSize}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="选择尺寸" />
                        </SelectTrigger>
                        <SelectContent>
                          {imageSizes.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">示例提示词</Label>
                      <div className="flex flex-wrap gap-2">
                        {examplePrompts.map((example, index) => (
                          <button
                            key={index}
                            onClick={() => handleExampleClick(example)}
                            className="text-xs px-2 py-1 rounded-full bg-secondary/50 hover:bg-secondary text-secondary-foreground transition-colors truncate max-w-[200px]"
                            title={example}
                          >
                            {example.substring(0, 20)}...
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Output Panel */}
              <Card className="flex min-h-0 flex-col">
                <CardContent className="flex flex-1 flex-col p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Label className="text-sm font-semibold">生成结果</Label>
                    {result && (
                      <span className="text-xs text-muted-foreground">
                        模型: {result.model} | 耗时: {result.inferenceTime.toFixed(2)}s
                      </span>
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 overflow-hidden">
                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Loader2 className="h-10 w-10 animate-spin" />
                        <span className="text-sm">AI 正在创作中...</span>
                      </div>
                    ) : generatedImageUrl ? (
                      <img
                        src={generatedImageUrl}
                        alt="Generated"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : hasBase64Image ? (
                      <img
                        src={`data:image/png;base64,${result.data[0].b64_json}`}
                        alt="Generated"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <ImageIcon className="h-10 w-10" />
                        <span className="text-sm">输入描述并点击生成</span>
                      </div>
                    )}
                  </div>
                  {result?.data?.[0]?.revised_prompt && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">优化后的提示词：</span>
                      {result.data[0].revised_prompt}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid shrink-0 grid-cols-2 gap-4">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    生成图像
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleDownload}
                disabled={!generatedImageUrl && !hasBase64Image}
                className="w-full"
              >
                <Download className="mr-2 h-5 w-5" />
                下载图片
              </Button>
            </div>

            {/* Info Cards */}
            <div className="grid shrink-0 grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">功能亮点</h2>
                    <Sparkles className="h-5 w-5 text-tool-cyan" />
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {features.map((feature, index) => (
                      <li key={feature.text} className="flex items-start gap-2">
                        <feature.icon className="h-4 w-4 flex-shrink-0 text-tool-cyan" />
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
                    <CheckCircle2 className="h-5 w-5 text-tool-cyan" />
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {usageTips.map((tip, index) => (
                      <li key={tip} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-tool-cyan" />
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
