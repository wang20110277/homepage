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
import { CometCard } from "@/components/ui/comet-card";
import { mockPPTTemplates } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  FileText,
  Loader2,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import {
  uploadFiles,
  generatePpt,
  type GeneratePptResponse,
  PPTApiError,
} from "@/lib/api/ppt";

// 生成5-20的所有页数选项
const slideOptions = Array.from({ length: 16 }, (_, i) => ({
  label: `${i + 5} 页`,
  value: i + 5,
}));

// Language options matching Presenton API
const languageOptions = [
  { label: "English", value: "English" },
  { label: "中文", value: "Chinese" },
  { label: "日本語", value: "Japanese" },
  { label: "한국어", value: "Korean" },
  { label: "Français", value: "French" },
  { label: "Deutsch", value: "German" },
  { label: "Español", value: "Spanish" },
];

// Generation status type
type GenerationStatus = "idle" | "uploading" | "generating" | "completed" | "error";

export default function PPTGeneratorPage() {
  const [slideCount, setSlideCount] = useState(8);
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("Chinese");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Generation state
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [result, setResult] = useState<GeneratePptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      return;
    }

    setStatus("idle");
    setError(null);
    setResult(null);

    try {
      let fileIds: string[] = [];

      // Step 1: Upload files if any
      if (files.length > 0) {
        setStatus("uploading");
        setStatusMessage(`正在上传 ${files.length} 个文件...`);

        const uploadResults = await uploadFiles(files);
        fileIds = uploadResults.map((r) => r.id);
        setStatusMessage("文件上传完成");
      }

      // Step 2: Generate PPT
      setStatus("generating");
      setStatusMessage("正在生成演示文稿，请稍候...");

      const generationResult = await generatePpt({
        content: prompt,
        n_slides: slideCount,
        language: language,
        template: selectedTemplate || "general",
        files: fileIds,
        tone: "professional",
        verbosity: "standard",
        image_type: "stock",
        include_title_slide: true,
        include_table_of_contents: slideCount > 10,
        export_as: "pptx",
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
  }, [prompt, files, slideCount, language, selectedTemplate]);

  const isGenerating = status === "uploading" || status === "generating";

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
            <Label className="text-sm font-bold text-foreground">语言</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-10 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      {/* Attachments */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-foreground">
            附件（可选）
          </Label>
          {files.length > 0 && (
            <button
              onClick={() => setFiles([])}
              className="text-sm text-primary hover:underline"
              disabled={isGenerating}
            >
              清空全部
            </button>
          )}
        </div>

        {files.length === 0 ? (
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              "rounded-lg border-2 border-dashed p-12 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
              isGenerating && "pointer-events-none opacity-50"
            )}
          >
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm text-foreground">
                  拖放 PDF、图片或 TXT 文件，或{" "}
                  <label className="cursor-pointer text-primary hover:underline">
                    点击浏览
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isGenerating}
                    />
                  </label>
                </p>
                <p className="text-xs text-muted-foreground">
                  支持格式：application/pdf|image/*|text/plain, pdf, txt
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              支持 PDF、图片和文本文件。我们将使用这些内容来改进您的演示文稿。
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                  disabled={isGenerating}
                >
                  移除
                </button>
              </div>
            ))}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="rounded-lg border-2 border-dashed p-6 text-center"
            >
              <label className="cursor-pointer text-sm text-primary hover:underline">
                添加更多文件
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isGenerating}
                />
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Choose a design */}
      <section className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm font-bold text-foreground">
            选择设计风格
          </Label>
          <p className="text-sm text-muted-foreground">
            选择一个设计风格来美化您的演示文稿
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {mockPPTTemplates.slice(0, 6).map((template) => (
            <CometCard key={template.id}>
              <div
                onClick={() =>
                  !isGenerating && setSelectedTemplate(template.id)
                }
                className={cn(
                  "cursor-pointer overflow-hidden rounded-2xl border-2 transition-all",
                  selectedTemplate === template.id
                    ? "border-primary shadow-lg"
                    : "border-transparent hover:border-border",
                  isGenerating && "pointer-events-none opacity-50"
                )}
              >
                <div
                  className="h-40 bg-cover bg-center"
                  style={{ backgroundImage: `url(${template.thumbnail})` }}
                />
                <div className="bg-card p-4">
                  <h3 className="text-sm font-semibold">{template.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </div>
              </div>
            </CometCard>
          ))}
        </div>
      </section>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border p-4",
            status === "completed" && "border-green-500 bg-green-50 dark:bg-green-950",
            status === "error" && "border-red-500 bg-red-50 dark:bg-red-950",
            (status === "uploading" || status === "generating") &&
              "border-blue-500 bg-blue-50 dark:bg-blue-950"
          )}
        >
          {status === "completed" && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
          {status === "error" && (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          {(status === "uploading" || status === "generating") && (
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
            {status === "uploading"
              ? "正在上传文件..."
              : "正在生成演示文稿..."}
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
