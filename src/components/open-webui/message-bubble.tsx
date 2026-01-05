"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
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
          ? "border-primary/30 bg-primary/5"
          : "border-white/10 bg-white/5"
      )}
    >
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {MESSAGE_ROLES[message.role] || message.role}
        </span>
        {message.createdAt && (
          <span>
            {format(new Date(message.createdAt), "MMM d, HH:mm")}
          </span>
        )}
      </div>
      <div className="prose max-w-none text-sm [&>*]:my-3 overflow-x-auto">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={markdownComponents}
        >
          {message.content || "..."}
        </ReactMarkdown>
      </div>
    </div>
  );
}
