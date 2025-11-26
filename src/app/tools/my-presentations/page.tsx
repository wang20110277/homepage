"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CometCard } from "@/components/ui/comet-card";
import {
  Clock,
  Layers,
  Plus,
  AlertCircle,
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import {
  getPresentations,
  type PresentationListItem,
  PPTApiError,
} from "@/lib/api/ppt";
import { cn } from "@/lib/utils";

type LoadingState = "loading" | "success" | "error" | "empty";

export default function MyPresentationsPage() {
  const router = useRouter();
  const [presentations, setPresentations] = useState<PresentationListItem[]>(
    []
  );
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [error, setError] = useState<string | null>(null);

  const fetchPresentations = async () => {
    setLoadingState("loading");
    setError(null);

    try {
      const data = await getPresentations();
      setPresentations(data);
      setLoadingState(data.length > 0 ? "success" : "empty");
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
  };

  useEffect(() => {
    fetchPresentations();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCardClick = (id: string) => {
    router.push(`/tools/my-presentations/${id}`);
  };

  return (
    <main className="container mx-auto max-w-6xl space-y-8 pb-16 pt-20">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">我的演示文稿</h1>
            <p className="text-lg text-muted-foreground">
              查看和管理您生成的所有演示文稿
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={fetchPresentations}
              disabled={loadingState === "loading"}
            >
              <RefreshCw
                className={cn(
                  "mr-2 h-4 w-4",
                  loadingState === "loading" && "animate-spin"
                )}
              />
              刷新
            </Button>
            <Button onClick={() => router.push("/tools/ppt-generator")}>
              <Plus className="mr-2 h-4 w-4" />
              创建新演示文稿
            </Button>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {loadingState === "loading" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="overflow-hidden rounded-2xl border bg-card">
                <div className="h-40 bg-muted" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {loadingState === "error" && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-8 text-center dark:bg-red-950">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold text-red-800 dark:text-red-200">
            加载失败
          </h3>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
          <Button
            onClick={fetchPresentations}
            variant="outline"
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
        </div>
      )}

      {/* Empty State */}
      {loadingState === "empty" && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FolderOpen className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold">暂无演示文稿</h3>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            您还没有生成任何演示文稿。点击下方按钮开始创建您的第一个 AI
            驱动的演示文稿。
          </p>
          <Button
            onClick={() => router.push("/tools/ppt-generator")}
            size="lg"
            className="mt-6"
          >
            <Plus className="mr-2 h-5 w-5" />
            创建第一个演示文稿
          </Button>
        </div>
      )}

      {/* Presentations Grid */}
      {loadingState === "success" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {presentations.map((ppt) => (
            <CometCard key={ppt.id} rotateDepth={8} translateDepth={8}>
              <div
                onClick={() => handleCardClick(ppt.id)}
                className="cursor-pointer overflow-hidden rounded-2xl border bg-card transition-all hover:border-primary/50 hover:shadow-md"
              >
                {/* Thumbnail */}
                <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  {ppt.thumbnail ? (
                    <Image
                      src={ppt.thumbnail}
                      alt={ppt.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <Layers className="h-16 w-16 text-primary/40" />
                  )}
                </div>

                {/* Content */}
                <div className="space-y-3 p-4">
                  <h3 className="line-clamp-2 font-semibold">{ppt.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(ppt.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4" />
                      <span>{ppt.slideCount} 页</span>
                    </div>
                  </div>
                </div>
              </div>
            </CometCard>
          ))}
        </div>
      )}

      {/* Stats */}
      {loadingState === "success" && presentations.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          共 {presentations.length} 个演示文稿
        </div>
      )}
    </main>
  );
}
