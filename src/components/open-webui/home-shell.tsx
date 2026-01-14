"use client";

import type { ToolId } from "@/lib/rbac";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatListPanel } from "./chat-list";
import { ChatWorkspace } from "./chat-workspace";
import { OpenWebuiModelsProvider } from "@/contexts/openWebuiModelsContext";
import { CometCard } from "@/components/ui/comet-card";
import { CalendarWidget } from "@/components/widgets/calendar-widget";
// import { TodoWidget } from "@/components/widgets/todo-widget";
import { AnnouncementsWidget } from "@/components/widgets/announcements-widget";
import { useRouter } from "next/navigation";
import { useSidebarState } from "@/hooks/useSidebarState";
import { MessageSquare, Calendar, Presentation, ScanText, Building2, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarToggle } from "@/components/ui/sidebar-toggle";

// 工具图标和颜色配置
const toolConfig: Record<ToolId, {
  icon: typeof Presentation;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  borderGlow: string;
}> = {
  ppt: {
    icon: Presentation,
    color: "text-tool-blue",
    bgColor: "bg-tool-blue/10",
    gradientFrom: "from-tool-blue/20",
    gradientTo: "to-tool-blue/5",
    borderGlow: "group-hover:shadow-tool-blue/50",
  },
  ocr: {
    icon: ScanText,
    color: "text-tool-green",
    bgColor: "bg-tool-green/10",
    gradientFrom: "from-tool-green/20",
    gradientTo: "to-tool-green/5",
    borderGlow: "group-hover:shadow-tool-green/50",
  },
  tianyancha: {
    icon: Building2,
    color: "text-tool-purple",
    bgColor: "bg-tool-purple/10",
    gradientFrom: "from-tool-purple/20",
    gradientTo: "to-tool-purple/5",
    borderGlow: "group-hover:shadow-tool-purple/50",
  },
  qualityCheck: {
    icon: ClipboardCheck,
    color: "text-tool-orange",
    bgColor: "bg-tool-orange/10",
    gradientFrom: "from-tool-orange/20",
    gradientTo: "to-tool-orange/5",
    borderGlow: "group-hover:shadow-tool-orange/50",
  },
};

interface ToolStatus {
  id: ToolId;
  name: string;
  description: string;
  href: string;
  access: {
    allowed: boolean;
    reason?: string | null;
  };
}

interface OpenWebuiHomeShellProps {
  userName: string;
  tools: ToolStatus[];
}

export function OpenWebuiHomeShell({ userName, tools }: OpenWebuiHomeShellProps) {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar,
  } = useSidebarState();

  return (
    <div className="flex flex-col h-full">
      <OpenWebuiModelsProvider>
        <div className="flex-1 flex gap-4 px-6 py-6 overflow-hidden">
          {/* 左侧边栏 - 对话列表 */}
          <div
            className={cn(
              "relative h-full transition-all duration-300 ease-in-out",
              leftSidebarOpen ? "w-64 lg:w-72 xl:w-80" : "w-16"
            )}
          >
            {/* 侧边栏内容 */}
            <div
              className={cn(
                "h-full overflow-hidden transition-opacity duration-300",
                leftSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <ChatListPanel />
            </div>

            {/* 折叠按钮 */}
            <SidebarToggle
              side="left"
              isOpen={leftSidebarOpen}
              onToggle={toggleLeftSidebar}
              label="对话列表"
              icon={MessageSquare}
            />
          </div>

          {/* 中间区域 - 聊天工作区 */}
          <div className="flex-1 h-full overflow-hidden min-w-0">
            <ChatWorkspace userName={userName} />
          </div>

          {/* 右侧边栏 - Widgets */}
          <div
            className={cn(
              "relative h-full transition-all duration-300 ease-in-out",
              rightSidebarOpen ? "w-64 lg:w-72 xl:w-80" : "w-16"
            )}
          >
            {/* 侧边栏内容 */}
            <div
              className={cn(
                "h-full overflow-y-auto space-y-4 pr-2 transition-opacity duration-300",
                rightSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <CalendarWidget />
              {/* <TodoWidget /> */}
              <AnnouncementsWidget />
              <ToolColumn tools={tools} />
            </div>

            {/* 折叠按钮 */}
            <SidebarToggle
              side="right"
              isOpen={rightSidebarOpen}
              onToggle={toggleRightSidebar}
              label="日历 & 工具"
              icon={Calendar}
            />
          </div>
        </div>
      </OpenWebuiModelsProvider>
    </div>
  );
}

function ToolColumn({ tools }: { tools: ToolStatus[] }) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {tools.map((tool) => {
        const disabled = !tool.access.allowed;
        const config = toolConfig[tool.id];

        // Safety check: if config is undefined or icon is missing, skip this tool
        if (!config || !config.icon) {
          console.error(`Missing config or icon for tool: ${tool.id}`, config);
          return null;
        }

        const Icon = config.icon;

        return (
          <CometCard key={tool.id} disableEffects>
            <div className="relative group">
              {/* Gradient glow background - only visible on hover */}
              {!disabled && (
                <div
                  className={cn(
                    "absolute -inset-0.5 bg-gradient-to-r rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition-all duration-500 ease-out",
                    config.gradientFrom,
                    config.gradientTo
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Main card */}
              <div
                onClick={() => {
                  if (!disabled) {
                    router.push(tool.href);
                  }
                }}
                className={cn(
                  "relative overflow-hidden rounded-2xl transition-all duration-500 ease-out",
                  "border bg-background/80",
                  "border-white/10 dark:border-white/10",
                  disabled
                    ? "cursor-not-allowed opacity-60"
                    : cn(
                        "cursor-pointer",
                        "group-hover:scale-[1.03]",
                        "group-hover:shadow-xl",
                        "group-hover:border-white/20",
                        config.borderGlow,
                        "dark:group-hover:shadow-2xl",
                        "before:absolute before:inset-0",
                        "before:bg-gradient-to-br before:from-background/80 before:to-background/40",
                        "before:opacity-0 before:group-hover:opacity-100",
                        "before:transition-opacity before:duration-500",
                        "backdrop-blur-sm"
                      )
                )}
              >
                {/* Shimmer effect overlay */}
                {!disabled && (
                  <div
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-primary/5 to-transparent"
                    aria-hidden="true"
                  />
                )}

                <CardHeader className="relative z-10">
                  {/* Badge for disabled state - absolute positioning */}
                  {disabled && (
                    <Badge variant="destructive" className="absolute top-3 right-3 text-[10px] px-1.5 py-0.5">
                      {tool.access.reason || "无权限"}
                    </Badge>
                  )}

                  <div className="flex items-start gap-3">
                    {/* Icon container with enhanced effects */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          config.bgColor,
                          !disabled && cn(
                            "transition-all duration-500 ease-out",
                            "group-hover:scale-110",
                            "group-hover:rotate-3",
                            "group-hover:shadow-lg",
                            config.borderGlow,
                            "relative overflow-hidden"
                          )
                        )}
                      >
                        {/* Icon glow effect */}
                        {!disabled && (
                          <div
                            className={cn(
                              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                              config.gradientFrom,
                              config.gradientTo
                            )}
                            aria-hidden="true"
                          />
                        )}
                        <Icon
                          className={cn(
                            "h-6 w-6 relative z-10",
                            config.color,
                            !disabled && "transition-transform duration-500 group-hover:scale-110"
                          )}
                        />
                      </div>
                    </div>

                    {/* Title and description */}
                    <div className="flex-1 min-w-0">
                      <CardTitle
                        className={cn(
                          "text-base transition-colors duration-300",
                          !disabled && "group-hover:text-primary"
                        )}
                      >
                        {tool.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 line-clamp-2">
                        {tool.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </div>
            </div>
          </CometCard>
        );
      })}
    </div>
  );
}
