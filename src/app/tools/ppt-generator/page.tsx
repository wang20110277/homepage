"use client";

import { useState } from "react";
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
} from "lucide-react";

// 生成5-20的所有页数选项
const slideOptions = Array.from({ length: 16 }, (_, i) => ({
  label: `${i + 5} 页`,
  value: i + 5,
}));

export default function PPTGeneratorPage() {
  const [slideCount, setSlideCount] = useState(8);
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleGenerate = () => {
    if (!prompt.trim()) {
      return;
    }
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto py-16 space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            AI 智能演示文稿生成
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            选择设计风格，设置偏好，几分钟内生成精美的演示文稿
          </p>
        </header>

        {/* Prompt with slide count */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold text-foreground">提示词</Label>
            <div className="flex items-center gap-3">
              <Label className="text-sm font-bold text-foreground">选择演示文稿的页数</Label>
              <Select value={String(slideCount)} onValueChange={(v) => setSlideCount(Number(v))}>
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
            className="min-h-[200px] text-base resize-none"
          />
        </section>

        {/* Attachments */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold text-foreground">附件（可选）</Label>
            {files.length > 0 && (
              <button
                onClick={() => setFiles([])}
                className="text-sm text-primary hover:underline"
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
                "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
            >
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-10 h-10 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm text-foreground">
                    拖放 PDF、图片或 TXT 文件，或{" "}
                    <label className="text-primary cursor-pointer hover:underline">
                      点击浏览
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    支持格式：application/pdf|image/*|text/plain, pdf, txt
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                支持 PDF、图片和文本文件。我们将使用这些内容来改进您的演示文稿。
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                >
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-xs text-muted-foreground hover:text-destructive"
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
                className="border-2 border-dashed rounded-lg p-6 text-center"
              >
                <label className="text-sm text-primary cursor-pointer hover:underline">
                  添加更多文件
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </section>

        {/* Choose a design */}
        <section className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-bold text-foreground">选择设计风格</Label>
            <p className="text-sm text-muted-foreground">
              选择一个设计风格来美化您的演示文稿
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {mockPPTTemplates.slice(0, 6).map((template) => (
              <CometCard key={template.id}>
                <div
                  onClick={() => setSelectedTemplate(template.id)}
                  className={cn(
                    "cursor-pointer overflow-hidden rounded-2xl border-2 transition-all",
                    selectedTemplate === template.id
                      ? "border-primary shadow-lg"
                      : "border-transparent hover:border-border"
                  )}
                >
                  <div
                    className="h-40 bg-cover bg-center"
                    style={{ backgroundImage: `url(${template.thumbnail})` }}
                  />
                  <div className="p-4 bg-card">
                    <h3 className="font-semibold text-sm">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  </div>
                </div>
              </CometCard>
            ))}
          </div>
        </section>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          size="lg"
          className="w-full h-14 text-base font-semibold"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              正在生成演示文稿...
            </>
          ) : (
            <>
              生成演示文稿
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
