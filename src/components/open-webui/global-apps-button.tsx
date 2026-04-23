"use client";

import { useEffect, useState, useRef } from "react";
import { AppsDrawer, type ToolStatus } from "./apps-drawer";
import { Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";

// 定义工具访问类型
interface ToolAccess {
  tool: string;
  access: {
    allowed: boolean;
    reason?: string | null;
  };
}

// 所有可用的工具定义
const ALL_TOOLS: Omit<ToolStatus, "access">[] = [
  {
    id: "ppt",
    name: "PPT 生成器",
    description: "快速构建企业级演示文稿",
    href: "/tools/ppt-generator",
  },
  {
    id: "ocr",
    name: "OCR 识别",
    description: "从扫描文档中提取文字",
    href: "/tools/ocr",
  },
  {
    id: "tianyancha",
    name: "天眼查",
    description: "企业信息查询和背景调查",
    href: "/tools/tianyancha",
  },
  {
    id: "fileCompare",
    name: "文档对比工具",
    description: "Word 和 PDF 文档内容对比分析",
    href: "/tools/file-compare",
  },
  {
    id: "zimage",
    name: "AI 图像生成",
    description: "输入文字描述生成高质量图像",
    href: "/tools/zimage",
  },
  {
    id: "voiceprintCompare",
    name: "声纹比对",
    description: "上传音频文件进行声纹比对分析",
    href: "/tools/voiceprint-compare",
  },
];

export function GlobalAppsButton() {
  const [tools, setTools] = useState<ToolStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessibleCount, setAccessibleCount] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function fetchToolAccess() {
      try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const data = await response.json();
          const toolAccessMap = new Map<string, { allowed: boolean; reason?: string | null }>(
            data.data.toolAccess.map((item: ToolAccess) => [item.tool, item.access])
          );

          // 合并工具定义和访问权限
          const toolsWithAccess = ALL_TOOLS.map((tool) => ({
            ...tool,
            access: toolAccessMap.get(tool.id) ?? { allowed: false, reason: "Unknown tool" },
          }));

          setTools(toolsWithAccess);
          setAccessibleCount(toolsWithAccess.filter((t) => t.access.allowed).length);
        }
      } catch (error) {
        console.error("Failed to fetch tool access:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchToolAccess();
  }, []);

  // 快捷键支持 (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        triggerRef.current?.click();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <AppsDrawer
      tools={tools}
      trigger={
        <button
          ref={triggerRef}
          className={cn(
            "group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl",
            "bg-gradient-to-r from-primary via-primary/95 to-primary/90",
            "text-primary-foreground font-medium text-sm",
            "shadow-lg shadow-primary/30",
            "hover:shadow-xl hover:shadow-primary/40 hover:scale-105",
            "active:scale-100",
            "transition-all duration-300 ease-out",
            "border border-primary/50",
            // 发光效果
            "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r",
            "before:from-primary/20 before:via-primary/10 before:to-primary/20",
            "before:opacity-0 before:blur-md before:transition-opacity before:duration-500",
            "hover:before:opacity-100 before:z-[-1]"
          )}
        >
          {/* 按钮内容 */}
          <div className="flex items-center gap-2.5">
            {/* 图标 */}
            <div className="relative">
              <Grid3x3 className="h-4 w-4 transition-transform group-hover:rotate-90 duration-500" />

              {/* 徽章 */}
              {!isLoading && accessibleCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground border border-accent-foreground/20">
                  {accessibleCount}
                </span>
              )}
            </div>

            {/* 文本 */}
            <span>全部应用</span>

            {/* 快捷键提示 - 在按钮内部 */}
            <kbd
              className={cn(
                "hidden md:inline-flex items-center gap-1",
                "px-1.5 py-0.5 rounded-md",
                "bg-primary-foreground/15 text-primary-foreground/90",
                "text-[10px] font-mono font-medium",
                "border border-primary-foreground/25"
              )}
            >
              Ctrl+K
            </kbd>
          </div>

          {/* 闪光动画效果 */}
          <div className="absolute inset-0 rounded-xl overflow-hidden">
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </button>
      }
    />
  );
}
