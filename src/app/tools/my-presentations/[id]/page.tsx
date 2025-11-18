"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  AlertCircle,
  Layers,
  Clock,
  RefreshCw,
  User,
  Calendar,
} from "lucide-react";
import {
  getPresentationById,
  exportPresentation,
  type PresentationDetail,
  type SlideContent,
  PPTApiError,
} from "@/lib/api/ppt";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

type LoadingState = "loading" | "success" | "error";

export default function PresentationPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [presentation, setPresentation] = useState<PresentationDetail | null>(
    null
  );
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isExporting, setIsExporting] = useState<"pptx" | "pdf" | null>(null);

  const fetchPresentation = useCallback(async () => {
    if (!id) return;

    setLoadingState("loading");
    setError(null);

    try {
      const data = await getPresentationById(id);
      setPresentation(data);
      setLoadingState("success");
    } catch (err) {
      setLoadingState("error");
      if (err instanceof PPTApiError) {
        setError(`${err.message} (${err.code})`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("加载演示文稿时发生未知错误");
      }
    }
  }, [id]);

  useEffect(() => {
    fetchPresentation();
  }, [fetchPresentation]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!presentation) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setCurrentSlideIndex((prev) =>
          Math.min(presentation.slides.length - 1, prev + 1)
        );
      } else if (e.key === "Home") {
        setCurrentSlideIndex(0);
      } else if (e.key === "End") {
        setCurrentSlideIndex(presentation.slides.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [presentation]);

  const handleDownload = async (format: "pptx" | "pdf") => {
    if (!id) return;

    setIsExporting(format);
    try {
      const result = await exportPresentation(id, format);

      if (!result.downloadUrl) {
        toast.error("下载链接无效");
        return;
      }

      // Create a temporary anchor element to trigger download
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.download = `${presentation?.title || "presentation"}.${format}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${format.toUpperCase()} 文件下载已开始`);
    } catch (err) {
      if (err instanceof PPTApiError) {
        toast.error(`导出失败: ${err.message}`);
      } else {
        toast.error("导出失败，请重试");
      }
    } finally {
      setIsExporting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return null;
    // If it's a relative path, prepend the Presenton base URL
    if (imagePath.startsWith("/")) {
      const baseUrl = process.env.NEXT_PUBLIC_PRESENTON_BASE_URL || "http://localhost:5000";
      return `${baseUrl}${imagePath}`;
    }
    return imagePath;
  };

  const renderSlideContent = (slide: SlideContent) => {
    const content = slide.content as Record<string, unknown>;
    if (!content) {
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <Layers className="mx-auto mb-4 h-12 w-12 opacity-40" />
          <p>幻灯片 {slide.index + 1}</p>
        </div>
      );
    }

    const title = (content.title as string) || "";
    const description = content.description as string | undefined;
    const image = content.image as { __image_url__?: string } | undefined;
    const bulletPoints = content.bulletPoints as Array<{
      title: string;
      description: string;
      icon?: { __icon_url__?: string };
    }> | undefined;
    const chartData = content.chartData as {
      type: string;
      data: Array<{ name: string; value: number }>;
    } | undefined;
    const metrics = content.metrics as Array<{
      label: string;
      value: string;
      description: string;
    }> | undefined;
    const presenterName = content.presenterName as string | undefined;
    const presentationDate = content.presentationDate as string | undefined;

    return (
      <div className="flex h-full flex-col p-6 md:p-8">
        {/* Title */}
        {title && (
          <h2 className="mb-4 text-xl font-bold md:text-2xl lg:text-3xl">
            {title}
          </h2>
        )}

        {/* Presenter info (for intro slides) */}
        {(presenterName || presentationDate) && (
          <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
            {presenterName && (
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>{presenterName}</span>
              </div>
            )}
            {presentationDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{presentationDate}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-6 overflow-auto lg:flex-row">
          {/* Main content area */}
          <div className={cn("flex-1 space-y-4", image?.__image_url__ && "lg:w-1/2")}>
            {/* Description with Markdown */}
            {description && (
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                <ReactMarkdown>{description}</ReactMarkdown>
              </div>
            )}

            {/* Bullet Points */}
            {bulletPoints && bulletPoints.length > 0 && (
              <div className="space-y-3">
                {bulletPoints.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    {point.icon?.__icon_url__ ? (
                      <img
                        src={getImageUrl(point.icon.__icon_url__) || ""}
                        alt=""
                        className="mt-1 h-5 w-5 flex-shrink-0"
                      />
                    ) : (
                      <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                    )}
                    <div>
                      <div className="font-semibold">{point.title}</div>
                      <div className="prose prose-sm dark:prose-invert text-sm text-muted-foreground">
                        <ReactMarkdown>{point.description}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chart Data */}
            {chartData && chartData.data && (
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="mb-2 text-sm font-medium">
                  {chartData.type === "bar" ? "柱状图" : "图表"}
                </div>
                <div className="space-y-2">
                  {chartData.data.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min(100, (item.value / Math.max(...chartData.data.map(d => d.value))) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics */}
            {metrics && metrics.length > 0 && (
              <div className="space-y-4">
                {metrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border bg-card p-4"
                  >
                    <div className="text-lg font-semibold">{metric.label}</div>
                    <div className="mt-1 font-mono text-sm text-primary">
                      {metric.value}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {metric.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Image */}
          {image?.__image_url__ && (
            <div className="flex items-center justify-center lg:w-1/2">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <img
                  src={getImageUrl(image.__image_url__) || ""}
                  alt={title}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Loading State
  if (loadingState === "loading") {
    return (
      <main className="container mx-auto max-w-7xl space-y-8 pb-16 pt-20">
        <div className="flex h-[70vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">
              加载演示文稿中...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Error State
  if (loadingState === "error") {
    return (
      <main className="container mx-auto max-w-7xl space-y-8 pb-16 pt-20">
        <div className="flex h-[70vh] items-center justify-center">
          <div className="max-w-md text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-4 text-lg font-semibold text-red-800 dark:text-red-200">
              加载失败
            </h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                onClick={() => router.push("/tools/my-presentations")}
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回列表
              </Button>
              <Button onClick={fetchPresentation}>
                <RefreshCw className="mr-2 h-4 w-4" />
                重试
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!presentation) {
    return null;
  }

  const currentSlide = presentation.slides[currentSlideIndex];

  return (
    <main className="container mx-auto max-w-7xl space-y-6 pb-16 pt-20">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/tools/my-presentations")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{presentation.title}</h1>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{formatDate(presentation.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                <span>{presentation.slides.length} 页</span>
              </div>
            </div>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleDownload("pptx")}
            disabled={isExporting !== null}
          >
            {isExporting === "pptx" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            下载 PPTX
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDownload("pdf")}
            disabled={isExporting !== null}
          >
            {isExporting === "pdf" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            下载 PDF
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Slide Thumbnails (Sidebar) */}
        <aside className="order-2 lg:order-1">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 font-semibold">幻灯片导航</h3>
            <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-x-visible">
              {presentation.slides.map((slide, index) => (
                <button
                  key={slide.index}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={cn(
                    "group relative flex-shrink-0 rounded-lg border-2 transition-all",
                    index === currentSlideIndex
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  <div className="relative flex h-20 w-32 items-center justify-center rounded-md bg-muted lg:h-24 lg:w-full">
                    {slide.thumbnail ? (
                      <Image
                        src={slide.thumbnail}
                        alt={`幻灯片 ${index + 1}`}
                        fill
                        className="rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-xs text-muted-foreground">
                        <Layers className="mb-1 h-6 w-6 opacity-40" />
                        <span className="font-medium">第 {index + 1} 页</span>
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-xs font-medium",
                      index === currentSlideIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="mt-4 hidden rounded-lg border bg-muted/50 p-4 text-xs text-muted-foreground lg:block">
            <p className="mb-2 font-medium">键盘快捷键：</p>
            <ul className="space-y-1">
              <li>← / ↑ : 上一页</li>
              <li>→ / ↓ : 下一页</li>
              <li>Home : 第一页</li>
              <li>End : 最后一页</li>
            </ul>
          </div>
        </aside>

        {/* Main Slide Preview */}
        <div className="order-1 lg:order-2">
          <div className="relative overflow-hidden rounded-lg border bg-card">
            {/* Slide Content */}
            <div className="relative min-h-[400px] md:min-h-[500px]">
              {currentSlide && renderSlideContent(currentSlide)}
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border bg-background/90 px-4 py-2 backdrop-blur-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCurrentSlideIndex((prev) => Math.max(0, prev - 1))
                }
                disabled={currentSlideIndex === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="min-w-[80px] text-center text-sm font-medium">
                {currentSlideIndex + 1} / {presentation.slides.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCurrentSlideIndex((prev) =>
                    Math.min(presentation.slides.length - 1, prev + 1)
                  )
                }
                disabled={currentSlideIndex === presentation.slides.length - 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Slide Type/Info */}
          {currentSlide?.type && (
            <div className="mt-2 text-right text-sm text-muted-foreground">
              类型: {currentSlide.type}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
