"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchChatById,
  openWebuiKeys,
  streamChatMessage,
} from "@/lib/api/open-webui";
import type {
  OpenWebuiChatDetail,
  OpenWebuiChatSummary,
  OpenWebuiMessage,
} from "@/types/open-webui";
import { useChatStore } from "@/hooks/useChatStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  Sparkles,
  StopCircle,
  Wand2,
} from "lucide-react";
import { format } from "date-fns";
import { useOpenWebuiModels } from "@/contexts/openWebuiModelsContext";

interface ChatWorkspaceProps {
  userName: string;
}

const MESSAGE_ROLES: Record<OpenWebuiMessage["role"], string> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
  tool: "Tool",
  observation: "Observation",
};

export function ChatWorkspace({ userName }: ChatWorkspaceProps) {
  const queryClient = useQueryClient();
  const {
    activeChatId,
    composerValue,
    setComposerValue,
    isStreaming,
    setStreaming,
    selectedModels,
    setSelectedModel,
  } = useChatStore();
  const [streamedResponse, setStreamedResponse] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const chatQuery = useQuery({
    queryKey: activeChatId ? openWebuiKeys.chatDetail(activeChatId) : ["openwebui", "chat", "empty"],
    queryFn: () => fetchChatById(activeChatId!),
    enabled: Boolean(activeChatId),
    staleTime: 5_000,
  });

  const modelsQuery = useOpenWebuiModels();

  useEffect(() => {
    if (chatQuery.data?.model && activeChatId) {
      setSelectedModel(activeChatId, chatQuery.data.model);
    }
  }, [chatQuery.data?.model, activeChatId, setSelectedModel]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatQuery.data?.messages, streamedResponse, isStreaming]);

  const resolvedModel = useMemo(() => {
    if (!activeChatId) {
      return modelsQuery.data?.[0]?.id;
    }
    return (
      selectedModels[activeChatId] ||
      chatQuery.data?.model ||
      modelsQuery.data?.[0]?.id
    );
  }, [activeChatId, selectedModels, chatQuery.data?.model, modelsQuery.data]);

  const updateChatCache = useCallback(
    (
      chatId: string,
      updater: (current: OpenWebuiChatDetail | undefined) =>
        OpenWebuiChatDetail | undefined
    ) => {
      queryClient.setQueryData(openWebuiKeys.chatDetail(chatId), updater);
    },
    [queryClient]
  );

  const updateChatListPreview = useCallback(
    (chatId: string, preview: string) => {
      queryClient.setQueryData<OpenWebuiChatSummary[]>(
        openWebuiKeys.chats,
        (existing = []) =>
          existing.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  lastMessagePreview: preview,
                  updatedAt: new Date().toISOString(),
                }
              : chat
          )
      );
    },
    [queryClient]
  );

  const sendMessage = useCallback(async () => {
    if (!activeChatId || !composerValue.trim()) {
      return;
    }

    if (!resolvedModel) {
      toast.error("No model available yet. Refresh to load models and try again.");
      return;
    }

    const messageId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const userMessage = composerValue.trim();
    setComposerValue("");
    setStreaming(true);
    setStreamedResponse("");

    updateChatCache(activeChatId, (current) => {
      const base =
        current ??
        ({
          id: activeChatId,
          title: "New chat",
          model: resolvedModel,
          messages: [],
        } as OpenWebuiChatDetail);

      return {
        ...base,
        messages: [
          ...base.messages,
          {
            id: `user-${messageId}`,
            role: "user",
            content: userMessage,
            createdAt: new Date().toISOString(),
          },
          {
            id: messageId,
            role: "assistant",
            content: "",
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });

    updateChatListPreview(activeChatId, userMessage);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamChatMessage({
        chatId: activeChatId,
        message: userMessage,
        model: resolvedModel,
        messageId,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === "token") {
            setStreamedResponse((prev) => {
              const next = prev + event.token;
              updateChatCache(activeChatId, (current) =>
                current
                  ? {
                      ...current,
                      messages: current.messages.map((message) =>
                        message.id === messageId
                          ? { ...message, content: next }
                          : message
                      ),
                    }
                  : current
              );
              return next;
            });
          } else if (event.type === "chat") {
            updateChatCache(activeChatId, () => event.chat);
            updateChatListPreview(
              activeChatId,
              event.chat.lastMessagePreview || userMessage
            );
          } else if (event.type === "error") {
            toast.error(
              event.error
                ? `${event.error}. Try sending your message again.`
                : "The assistant stopped responding. Please try again."
            );
          }
        },
      });
    } catch (error) {
      if (controller.signal.aborted) {
        toast.error("Generation cancelled");
      } else {
        toast.error(
          error instanceof Error
            ? `${error.message}. Please try again.`
            : "Failed to send message. Please try again."
        );
      }
      updateChatCache(activeChatId, (current) =>
        current
          ? {
              ...current,
              messages: current.messages.filter(
                (message) => message.id !== messageId
              ),
            }
          : current
      );
    } finally {
      setStreaming(false);
      setStreamedResponse("");
      abortControllerRef.current = null;
    }
  }, [
    activeChatId,
    composerValue,
    resolvedModel,
    setComposerValue,
    setStreaming,
    updateChatCache,
    updateChatListPreview,
  ]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setStreaming(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  if (!activeChatId) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-background/70 p-6 text-center">
        <Sparkles className="mb-4 h-10 w-10 text-primary" />
        <p className="text-lg font-semibold">选择一个对话开始</p>
        <p className="text-sm text-muted-foreground">
          选择现有对话或创建新对话开始聊天
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-background/90 shadow-xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/5 px-5 py-3">
        <div className="flex flex-1 flex-col">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            对话
          </p>
          <p className="text-lg font-semibold">
            {chatQuery.data?.title || "未命名对话"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={resolvedModel}
            onValueChange={(value) => {
              if (!activeChatId) return;
              setSelectedModel(activeChatId, value);
              trackEvent("chat_model_changed", { chatId: activeChatId, model: value });
            }}
            disabled={modelsQuery.isLoading || !modelsQuery.data?.length || isStreaming}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {modelsQuery.data?.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isStreaming ? (
            <Button variant="outline" onClick={handleStop} size="sm">
              <StopCircle className="mr-2 h-4 w-4" /> 停止
            </Button>
          ) : null}
        </div>
      </div>

      <ScrollArea className="flex-1 px-5 py-4">
        <div className="space-y-4">
          {chatQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载对话中...
            </div>
          ) : chatQuery.data?.messages.length ? (
            chatQuery.data.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              还没有消息。向助手提问以开始对话。
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-white/5 bg-background/90 px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Wand2 className="h-3.5 w-3.5" />
          登录为 {userName}。可用模型: {modelsQuery.data?.length ?? 0}
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-muted/20">
          <Textarea
            rows={3}
            placeholder="输入消息并按 Enter 发送"
            className="border-none bg-transparent"
            value={composerValue}
            onChange={(event) => setComposerValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          <div className="flex items-center justify-between border-t border-white/5 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Shift + Enter 换行
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={sendMessage}
                disabled={!composerValue.trim() || isStreaming}
              >
                {isStreaming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                发送
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: OpenWebuiMessage }) {
  const isAssistant = message.role === "assistant";
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm shadow-sm",
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
      <div className="prose prose-invert max-w-none text-sm">
        <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
      </div>
    </div>
  );
}




