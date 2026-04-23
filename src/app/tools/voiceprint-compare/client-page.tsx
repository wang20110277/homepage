"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AudioWaveform,
  Loader2,
  Upload,
  X,
  Play,
  CheckCircle2,
  Shield,
  FileAudio,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CompareResult {
  similarity: number;
  similarity_percent: number;
  message: string;
}

const VALID_EXTENSIONS = [".wav", ".mp3"];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function getSimilarityLevel(percent: number) {
  if (percent >= 85) return { label: "高度相似", color: "text-green-500", desc: "极可能是同一人" };
  if (percent >= 70) return { label: "相似", color: "text-yellow-500", desc: "可能是同一人" };
  if (percent >= 50) return { label: "一般相似", color: "text-orange-500", desc: "需要进一步确认" };
  return { label: "不相似", color: "text-red-500", desc: "不太可能是同一人" };
}

function AudioDropzone({
  label,
  file,
  onFileChange,
}: {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const audioUrl = file ? URL.createObjectURL(file) : null;

  const validateFile = (f: File): string | null => {
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
    if (!VALID_EXTENSIONS.includes(ext)) return "只支持 .wav 和 .mp3 格式";
    if (f.size > MAX_FILE_SIZE) return "文件大小不能超过 50MB";
    return null;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) {
        const err = validateFile(f);
        if (err) { toast.error(err); return; }
        onFileChange(f);
      }
    },
    [onFileChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) {
        const err = validateFile(f);
        if (err) { toast.error(err); return; }
        onFileChange(f);
      }
    },
    [onFileChange]
  );

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col p-4">
        <Label className="mb-3 text-sm font-medium">{label}</Label>
        {file ? (
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <FileAudio className="h-8 w-8 flex-shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <button
                onClick={() => onFileChange(null)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="移除文件"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {audioUrl && (
              <audio controls className="w-full" src={audioUrl}>
                您的浏览器不支持音频播放
              </audio>
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">拖拽音频文件到此处</p>
              <p className="text-xs text-muted-foreground">或点击下方按钮选择文件</p>
            </div>
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
                <Upload className="h-3 w-3" />
                选择文件
              </span>
              <input
                type="file"
                accept=".wav,.mp3"
                onChange={handleInputChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground">支持 WAV、MP3，最大 50MB</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const features = [
  { icon: AudioWaveform, text: "基于 CAM++ 模型，192维声纹向量" },
  { icon: Shield, text: "全程加密处理，保障音频隐私" },
  { icon: Play, text: "支持 WAV/MP3 格式，自动重采样" },
  { icon: CheckCircle2, text: "余弦相似度算法，结果可靠稳定" },
];

const usageTips = [
  "请上传有效语音时长不少于 3 秒的音频文件",
  "录音环境安静、说话清晰有助于提升比对准确率",
  "系统自动将音频重采样至 16kHz 并进行带通滤波",
  "相似度 ≥ 85% 为高度相似，≤ 50% 为不相似",
];

export default function VoiceprintCompareClient() {
  const [audio1, setAudio1] = useState<File | null>(null);
  const [audio2, setAudio2] = useState<File | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCompare = async () => {
    if (!audio1 || !audio2) {
      toast.error("请上传两个音频文件");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("audio1", audio1);
      formData.append("audio2", audio2);

      const response = await fetch("/api/voiceprint/compare", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "比对失败");
      }

      setResult(data.data);
      toast.success("声纹比对完成");
    } catch (error) {
      toast.error(
        `比对失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const level = result ? getSimilarityLevel(result.similarity_percent) : null;

  return (
    <main className="flex min-h-screen flex-col pt-14">
      <section className="flex-1 overflow-hidden px-6 py-6 -mt-[3vh]">
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-5 overflow-hidden rounded-3xl dark:bg-neutral-950/70 bg-card p-6 backdrop-blur">
          {/* Header */}
          <div className="rounded-2xl border dark:border-white/10 border-border dark:bg-gradient-to-br dark:from-white/5 dark:via-neutral-900/60 bg-gradient-to-br from-background via-card to-transparent px-8 py-10 text-center shadow-2xl">
            <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-primary">
              <AudioWaveform className="h-4 w-4" />
              <span>Voiceprint Compare</span>
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight dark:text-white text-foreground">
              声纹比对工具
            </h1>
            <p className="mt-3 text-balance text-base text-muted-foreground">
              上传两段音频文件，基于深度学习声纹提取与余弦相似度算法，快速判断是否为同一说话人
            </p>
          </div>

          {/* Upload area */}
          <div className="grid flex-1 min-h-0 grid-cols-2 gap-4">
            <AudioDropzone label="音频文件 1" file={audio1} onFileChange={setAudio1} />
            <AudioDropzone label="音频文件 2" file={audio2} onFileChange={setAudio2} />
          </div>

          {/* Action button */}
          <div className="grid shrink-0 grid-cols-2 gap-4">
            <Button
              size="lg"
              onClick={handleCompare}
              disabled={isProcessing || !audio1 || !audio2}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  比对中...
                </>
              ) : (
                <>
                  <AudioWaveform className="mr-2 h-5 w-5" />
                  开始比对
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setAudio1(null);
                setAudio2(null);
                setResult(null);
              }}
              disabled={isProcessing}
              className="w-full"
            >
              清除重置
            </Button>
          </div>

          {/* Result area */}
          {result && level && (
            <Card className="shrink-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-8">
                  {/* Circular gauge */}
                  <div className="relative flex-shrink-0">
                    <svg width="120" height="120" className="-rotate-90">
                      <circle
                        cx="60" cy="60" r="52"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted/30"
                      />
                      <circle
                        cx="60" cy="60" r="52"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${(result.similarity_percent / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
                        strokeLinecap="round"
                        className={cn(
                          result.similarity_percent >= 85
                            ? "text-green-500"
                            : result.similarity_percent >= 70
                            ? "text-yellow-500"
                            : result.similarity_percent >= 50
                            ? "text-orange-500"
                            : "text-red-500"
                        )}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">
                        {result.similarity_percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Result details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("text-xl font-bold", level.color)}>
                        {level.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        — {level.desc}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      余弦相似度: {result.similarity.toFixed(4)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.message}
                    </p>
                  </div>
                </div>

                {/* Similarity reference */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    { range: "85-100%", label: "高度相似", color: "bg-green-500/20 text-green-600 dark:text-green-400" },
                    { range: "70-85%", label: "相似", color: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" },
                    { range: "50-70%", label: "一般", color: "bg-orange-500/20 text-orange-600 dark:text-orange-400" },
                    { range: "0-50%", label: "不相似", color: "bg-red-500/20 text-red-600 dark:text-red-400" },
                  ].map((ref) => (
                    <div
                      key={ref.range}
                      className={cn("rounded-lg px-3 py-2 text-center text-xs", ref.color)}
                    >
                      <div className="font-semibold">{ref.range}</div>
                      <div>{ref.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info cards */}
          <div className="grid shrink-0 grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">功能亮点</h2>
                  <AudioWaveform className="h-5 w-5 text-primary" />
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
                  <AlertTriangle className="h-5 w-5 text-primary" />
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
      </section>
    </main>
  );
}
