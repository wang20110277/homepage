"use client";

import type { ToolId } from "@/lib/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChatListPanel } from "./chat-list";
import { ChatWorkspace } from "./chat-workspace";
import { OpenWebuiModelsProvider } from "@/contexts/openWebuiModelsContext";

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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back, {userName}</p>
        <h1 className="text-2xl font-semibold text-foreground">
          Your workspace, organized in one place
        </h1>
      </div>

      <OpenWebuiModelsProvider>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="order-2 lg:order-1 lg:col-span-3">
            <ChatListPanel />
          </div>
          <div className="order-1 lg:order-2 lg:col-span-5">
            <ChatWorkspace userName={userName} />
          </div>
          <div className="order-3 lg:order-3 lg:col-span-4">
            <ToolColumn tools={tools} />
          </div>
        </div>
      </OpenWebuiModelsProvider>
    </div>
  );
}

function ToolColumn({ tools }: { tools: ToolStatus[] }) {
  return (
    <div className="space-y-4">
      {tools.map((tool) => {
        const disabled = !tool.access.allowed;
        return (
          <Card key={tool.id} className="border-white/10 bg-background/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{tool.name}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </div>
                {disabled ? (
                  <Badge variant="destructive">
                    {tool.access.reason || "No access"}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Enabled</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {disabled ? (
                <p className="text-sm text-muted-foreground">
                  {tool.access.reason || "Contact your administrator."}
                </p>
              ) : (
                <Link
                  href={tool.href}
                  className="text-sm font-medium text-primary underline underline-offset-2"
                >
                  Open {tool.name}
                </Link>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
