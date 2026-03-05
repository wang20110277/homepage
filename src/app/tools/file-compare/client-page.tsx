"use client";

import { useState, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import {
  FileText,
  Files,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Copy,
  Check,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/tools/file-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { getMarkdownComponents } from "@/components/open-webui/markdown-components";

type ProcessingStatus = "idle" | "processing" | "completed" | "error";

interface PunctuationResult {
  originalText: string;
  correctedText: string;
}

// 标点纠错组件
function PunctuationCheckTab() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PunctuationResult | null>(null);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedCorrected, setCopiedCorrected] = useState(false);

  const markdownComponents = useMemo(() => getMarkdownComponents(), []);

  const isProcessing = status === "processing";

  const handleCheck = useCallback(async () => {
    if (!file) {
      setError("请上传 Word 文档");
      return;
    }

    setStatus("processing");
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/punctuation-check", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "处理失败");
      }

      setResult({
        originalText: data.originalText,
        correctedText: data.correctedText,
      });
      setStatus("completed");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "处理失败");
    }
  }, [file]);

  const copyToClipboard = async (text: string, type: "original" | "corrected") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "original") {
        setCopiedOriginal(true);
        setTimeout(() => setCopiedOriginal(false), 2000);
      } else {
        setCopiedCorrected(true);
        setTimeout(() => setCopiedCorrected(false), 2000);
      }
    } catch {
      console.error("复制失败");
    }
  };

  return (
    <div className="space-y-6">
      {/* 文件上传 */}
      <section className="space-y-3">
        <Label className="text-sm font-bold text-foreground">
          <FileText className="mr-2 h-4 w-4 inline" />
          上传 Word 文档 (.doc, .docx)
        </Label>
        <FileUpload
          files={file ? [file] : []}
          onFilesChange={(files) => {
            if (!isProcessing) {
              setFile(files[0] || null);
              setResult(null);
              setError(null);
              setStatus("idle");
            }
          }}
          accept={[".doc", ".docx"]}
          maxSizeMB={20}
          helperText="支持 .doc 和 .docx 格式，单个文件不超过 20MB"
        />
      </section>

      {/* 处理按钮 */}
      <Button
        onClick={handleCheck}
        disabled={isProcessing || !file}
        size="lg"
        className="h-14 w-full text-base font-semibold"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            正在分析文档...
          </>
        ) : (
          <>
            开始标点纠错
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      {/* 错误信息 */}
      {error && status === "error" && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-4 dark:bg-red-950">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800 dark:text-red-200">
              处理失败
            </span>
          </div>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* 结果展示 */}
      {result && status === "completed" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">处理完成</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 原文 */}
            <div className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="font-semibold text-foreground">原文内容</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(result.originalText, "original")}
                  className="h-8"
                >
                  {copiedOriginal ? (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" />
                      复制
                    </>
                  )}
                </Button>
              </div>
              <div className="max-h-[500px] overflow-auto p-4">
                <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
                  {result.originalText}
                </pre>
              </div>
            </div>

            {/* 纠错后内容 */}
            <div className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="font-semibold text-foreground">纠错后内容</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(result.correctedText, "corrected")}
                  className="h-8"
                >
                  {copiedCorrected ? (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" />
                      复制
                    </>
                  )}
                </Button>
              </div>
              <div className="max-h-[500px] overflow-auto p-4 prose dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={markdownComponents}
                >
                  {result.correctedText}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 文档对比组件
function DocumentCompareTab() {
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
    <div className="space-y-6">
      {/* Word File Upload */}
      <section className="space-y-3">
        <Label className="text-sm font-bold text-foreground">
          <FileText className="mr-2 h-4 w-4 inline" />
          上传 Word 文档 (.doc, .docx)
        </Label>
        <FileUpload
          files={wordFile ? [wordFile] : []}
          onFilesChange={(files) => !isProcessing && setWordFile(files[0] || null)}
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
          onFilesChange={(files) => !isProcessing && setPdfFiles(files)}
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
                文件 &quot;{filename}&quot; 已下载到您的浏览器下载文件夹
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FileCompareClient() {
  return (
    <main className="container mx-auto max-w-5xl space-y-8 pb-16 pt-20">
      {/* Header */}
      <header className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <Files className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">
            文档处理工具
          </h1>
        </div>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          文档对比与标点符号纠错工具
        </p>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="compare" className="w-full">
        <TabsList className="mx-auto grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="compare" className="gap-2">
            <Files className="h-4 w-4" />
            文档对比
          </TabsTrigger>
          <TabsTrigger value="punctuation" className="gap-2">
            <Pencil className="h-4 w-4" />
            标点纠错
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compare" className="mt-6">
          <DocumentCompareTab />
        </TabsContent>

        <TabsContent value="punctuation" className="mt-6">
          <PunctuationCheckTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}
