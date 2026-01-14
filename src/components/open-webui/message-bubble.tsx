"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { OpenWebuiMessage } from "@/types/open-webui";
import { getMarkdownComponents } from "./markdown-components";

const MESSAGE_ROLES: Record<OpenWebuiMessage["role"], string> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
  tool: "Tool",
  observation: "Observation",
};

interface MessageBubbleProps {
  message: OpenWebuiMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const markdownComponents = useMemo(() => getMarkdownComponents(), []);

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm shadow-sm break-words",
        isAssistant
          ? "border-primary/30 bg-primary/5 dark:border-primary/40 dark:bg-primary/10"
          : "border-border/50 bg-muted/30 dark:border-border dark:bg-muted/50"
      )}
    >
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">
          {MESSAGE_ROLES[message.role] || message.role}
        </span>
        {message.createdAt && (
          <span className="text-muted-foreground">
            {format(new Date(message.createdAt), "MMM d, HH:mm")}
          </span>
        )}
      </div>
      <div className="prose dark:prose-invert max-w-none text-sm text-foreground [&>*]:my-3 overflow-x-auto">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={markdownComponents}
        >
          {message.content || "..."}
        </ReactMarkdown>
      </div>
    </div>
  );
}
