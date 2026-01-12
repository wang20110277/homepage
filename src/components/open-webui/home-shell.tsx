"use client";

import type { ToolId } from "@/lib/rbac";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatListPanel } from "./chat-list";
import { ChatWorkspace } from "./chat-workspace";
import { OpenWebuiModelsProvider } from "@/contexts/openWebuiModelsContext";
import { CometCard } from "@/components/ui/comet-card";
import { CalendarWidget } from "@/components/widgets/calendar-widget";
import { TodoWidget } from "@/components/widgets/todo-widget";
import { AnnouncementsWidget } from "@/components/widgets/announcements-widget";
import { useRouter } from "next/navigation";
import { useSidebarState } from "@/hooks/useSidebarState";
import { MessageSquare, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarToggle } from "@/components/ui/sidebar-toggle";

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
              <TodoWidget />
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
        return (
          <CometCard key={tool.id} disableEffects>
            <div
              onClick={() => {
                if (!disabled) {
                  router.push(tool.href);
                }
              }}
              className={`border border-white/10 bg-background/80 rounded-2xl ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{tool.name}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </div>
                  {disabled && (
                    <Badge variant="destructive">
                      {tool.access.reason || "无权限"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              {disabled && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {tool.access.reason || "请联系管理员"}
                  </p>
                </CardContent>
              )}
            </div>
          </CometCard>
        );
      })}
    </div>
  );
}
