"use client";

import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarToggleProps {
  side: "left" | "right";
  isOpen: boolean;
  onToggle: () => void;
  label: string;
  icon: LucideIcon;
}

export function SidebarToggle({
  side,
  isOpen,
  onToggle,
  label,
  icon: Icon,
}: SidebarToggleProps) {
  const isLeft = side === "left";

  // 确定箭头方向
  const ChevronIcon = isOpen
    ? isLeft ? ChevronLeft : ChevronRight
    : isLeft ? ChevronRight : ChevronLeft;

  return (
    <>
      {/* 折叠按钮 - 细长竖直样式，放在gap中紧贴侧边栏 */}
      <Button
        variant="ghost"
        onClick={onToggle}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-20 h-20 w-3 rounded-xl p-0 transition-all duration-200",
          "bg-gray-500/30 backdrop-blur-md border border-gray-400/30",
          "hover:w-5 hover:bg-gray-500/40 hover:border-gray-400/50",
          isLeft ? "sidebar-toggle-left" : "sidebar-toggle-right"
        )}
      >
        <div className="flex flex-col items-center justify-center gap-0.5">
          <ChevronIcon className="h-3 w-3 text-gray-700 dark:text-gray-300" />
          <div className="flex flex-col gap-0.5">
            <div className="w-0.5 h-0.5 rounded-full bg-gray-600/50" />
            <div className="w-0.5 h-0.5 rounded-full bg-gray-600/50" />
            <div className="w-0.5 h-0.5 rounded-full bg-gray-600/50" />
          </div>
        </div>
      </Button>

      {/* 折叠状态的预览 */}
      {!isOpen && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 text-muted-foreground">
          <Icon className="h-5 w-5" />
          <div className="writing-mode-vertical text-xs font-medium">
            {label}
          </div>
        </div>
      )}
    </>
  );
}
