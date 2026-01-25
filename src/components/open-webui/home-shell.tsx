"use client";

import { ChatListPanel } from "./chat-list";
import { ChatWorkspace } from "./chat-workspace";
import { OpenWebuiModelsProvider } from "@/contexts/openWebuiModelsContext";
import { CalendarWidget } from "@/components/widgets/calendar-widget";
// import { TodoWidget } from "@/components/widgets/todo-widget";
import { AnnouncementsWidget } from "@/components/widgets/announcements-widget";
import { useSidebarState } from "@/hooks/useSidebarState";
import { MessageSquare, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarToggle } from "@/components/ui/sidebar-toggle";

interface OpenWebuiHomeShellProps {
  userName: string;
}

export function OpenWebuiHomeShell({ userName }: OpenWebuiHomeShellProps) {
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
