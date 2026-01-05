"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Megaphone,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Announcement } from "@/types";
import { mockAnnouncements } from "@/lib/mock-data";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AnnouncementBoard() {
  const [announcements] = useState<Announcement[]>(mockAnnouncements);

  const getPriorityVariant = (
    priority: "high" | "medium" | "low"
  ): "destructive" | "default" | "secondary" => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
    }
  };

  const getPriorityLabel = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "高";
      case "medium":
        return "中";
      case "low":
        return "低";
    }
  };

  const getTypeIcon = (type?: "info" | "warning" | "success" | "error") => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "error":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type?: "info" | "warning" | "success" | "error") => {
    switch (type) {
      case "warning":
        return "text-yellow-500";
      case "success":
        return "text-green-500";
      case "error":
        return "text-red-500";
      default:
        return "text-blue-500";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          公告栏
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无公告</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${getTypeColor(announcement.type)}`}>
                      {getTypeIcon(announcement.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium leading-tight">
                          {announcement.title}
                        </h4>
                        <Badge
                          variant={getPriorityVariant(announcement.priority)}
                          className="shrink-0"
                        >
                          {getPriorityLabel(announcement.priority)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2 prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-foreground text-base block mb-1.5">
                                {children}
                              </strong>
                            ),
                            hr: () => (
                              <hr className="my-4 border-border opacity-30" />
                            ),
                            ul: ({ children }) => (
                              <ul className="space-y-1.5 ml-0">{children}</ul>
                            ),
                            li: ({ children }) => (
                              <li className="text-sm leading-relaxed flex items-start gap-2">
                                <span className="text-foreground mt-0.5 select-none">•</span>
                                <span className="flex-1">{children}</span>
                              </li>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-0 pl-0 my-2 opacity-50">
                                {children}
                              </blockquote>
                            ),
                          }}
                        >
                          {announcement.content}
                        </ReactMarkdown>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(announcement.publishedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
