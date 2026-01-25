"use client";

import { useState, useCallback } from "react";
import { FileText, Files, ArrowRight, Loader2, Download, CheckCircle2, AlertCircle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/tools/file-upload";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  compareDocuments,
  SCRIPT_DESCRIPTIONS,
  type CompareScript,
  FileCompareApiError,
} from "@/lib/api/file-compare";

type ProcessingStatus = "idle" | "processing" | "completed" | "error";

export default function FileCompareClient() {
  // File states
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);

  // Script selection
  const [selectedScript, setSelectedScript] = useState<CompareScript>("default");

  // Processing state
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isProcessing = status === "processing";

  const handleCompare = useCallback(async () => {
    if (!wordFile) {
      setError("请上传 Word 文档");
      return;
    }
    if (pdfFiles.length === 0) {
      setError("请至少上传一个 PDF 文档");
      return;
    }

    setStatus("processing");
    setFilename(null);
    setError(null);

    try {
      const result = await compareDocuments({
        word: wordFile,
        pdfs: pdfFiles,
        script: selectedScript,
      });

      if (result.success && result.downloadUrl) {
        setStatus("completed");
        const downloadFilename = result.filename || "对比结果.xlsx";
        setFilename(downloadFilename);

        // 立即触发浏览器下载
        const link = document.createElement("a");
        link.href = result.downloadUrl;
        link.download = downloadFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 释放 Blob URL 内存（延迟释放以确保下载完成）
        setTimeout(() => {
          if (result.downloadUrl) {
            URL.revokeObjectURL(result.downloadUrl);
          }
        }, 1000);
      } else {
        setStatus("error");
        setError(result.error || "对比失败");
      }
    } catch (err) {
      setStatus("error");
      if (err instanceof FileCompareApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("处理过程中发生未知错误");
      }
    }
  }, [wordFile, pdfFiles, selectedScript]);

  return (
    <main className="container mx-auto max-w-4xl space-y-12 pb-16 pt-20">
      {/* Header */}
      <header className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <Files className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">
            文档对比工具
          </h1>
        </div>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          上传 Word 和 PDF 文档，选择对比脚本生成差异报告
        </p>
      </header>

      {/* Word File Upload */}
      <section className="space-y-3">
        <Label className="text-sm font-bold text-foreground">
          <FileText className="mr-2 h-4 w-4 inline" />
          上传 Word 文档 (.doc, .docx)
        </Label>
        <FileUpload
          files={wordFile ? [wordFile] : []}
          onFilesChange={(files) => setWordFile(files[0] || null)}
          accept={[".doc", ".docx"]}
          maxSizeMB={20}
          helperText="支持 .doc 和 .docx 格式，单个文件不超过 20MB"
        />
      </section>

      {/* PDF Files Upload */}
      <section className="space-y-3">
        <Label className="text-sm font-bold text-foreground">
          <Files className="mr-2 h-4 w-4 inline" />
          上传 PDF 文档（可多选）
        </Label>
        <FileUpload
          files={pdfFiles}
          onFilesChange={setPdfFiles}
          accept={[".pdf"]}
          maxSizeMB={20}
          helperText="支持 .pdf 格式，可同时上传多个文件"
        />
      </section>

      {/* Script Selection */}
      <section className="space-y-4 rounded-lg border p-6 bg-card">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">选择对比脚本</Label>
        </div>
        <RadioGroup
          value={selectedScript}
          onValueChange={(v) => setSelectedScript(v as CompareScript)}
          disabled={isProcessing}
        >
          {Object.entries(SCRIPT_DESCRIPTIONS).map(([key, info]) => (
            <div
              key={key}
              className={cn(
                "flex items-start space-x-3 rounded-lg border p-4 transition-colors",
                selectedScript === key
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
                isProcessing && "opacity-50 pointer-events-none"
              )}
            >
              <RadioGroupItem value={key} id={key} className="mt-1" />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={key}
                  className="font-medium cursor-pointer flex-1"
                >
                  {info.name}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {info.description}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </section>

      {/* Process Button */}
      <Button
        onClick={handleCompare}
        disabled={isProcessing || !wordFile || pdfFiles.length === 0}
        size="lg"
        className="h-14 w-full text-base font-semibold"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            正在对比文档...
          </>
        ) : (
          <>
            开始对比
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      {/* Error Message */}
      {error && status === "error" && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-4 dark:bg-red-950">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800 dark:text-red-200">
              对比失败
            </span>
          </div>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      {/* Success Message */}
      {status === "completed" && (
        <div className="rounded-lg border border-green-500 bg-green-50 p-6 dark:bg-green-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                对比完成！
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                文件 "{filename}" 已下载到您的浏览器下载文件夹
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
