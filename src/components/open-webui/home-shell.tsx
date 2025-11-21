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
  return (
    <div className="flex flex-col h-screen pt-16">
      <div className="px-6 py-4 border-b border-white/5">
        <p className="text-sm text-muted-foreground">欢迎回来，{userName}</p>
        <h1 className="text-2xl font-semibold text-foreground">
          您的工作台，一站式管理
        </h1>
      </div>

      <OpenWebuiModelsProvider>
        <div className="flex-1 grid gap-4 lg:grid-cols-12 px-6 py-4 overflow-hidden">
          <div className="order-2 lg:order-1 lg:col-span-3 h-full">
            <ChatListPanel />
          </div>
          <div className="order-1 lg:order-2 lg:col-span-5 h-full">
            <ChatWorkspace userName={userName} />
          </div>
          <div className="order-3 lg:order-3 lg:col-span-4 h-full overflow-y-auto space-y-4 pr-2">
            <CalendarWidget />
            <TodoWidget />
            <AnnouncementsWidget />
            <ToolColumn tools={tools} />
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
