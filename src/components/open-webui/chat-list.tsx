"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChat,
  fetchChatById,
  fetchChats,
  openWebuiKeys,
  removeChat,
  updateChat,
} from "@/lib/api/open-webui";
import type { OpenWebuiChatSummary } from "@/types/open-webui";
import { useChatStore } from "@/hooks/useChatStore";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useOpenWebuiModels } from "@/contexts/openWebuiModelsContext";

export function ChatListPanel() {
  const queryClient = useQueryClient();
  const { activeChatId, setActiveChatId } = useChatStore();
  const [search, setSearch] = useState("");
  const [renameTarget, setRenameTarget] =
    useState<OpenWebuiChatSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const modelsQuery = useOpenWebuiModels();

  const formatActionableError = (error: unknown, fallback: string) =>
    error instanceof Error
      ? `${error.message}. Please try again.`
      : fallback;

  const chatQuery = useQuery({
    queryKey: openWebuiKeys.chats,
    queryFn: fetchChats,
  });

  const createMutation = useMutation({
    mutationFn: (modelId: string) =>
      createChat({
        model: modelId,
        title: "New conversation",
      }),
    onSuccess: (chat) => {
      queryClient.setQueryData<OpenWebuiChatSummary[]>(
        openWebuiKeys.chats,
        (existing = []) => [chat, ...existing]
      );
      setActiveChatId(chat.id);
      trackEvent("chat_created", { chatId: chat.id, model: chat.model });
      toast.success("Chat created");
    },
    onError: (error) => {
      toast.error(
        formatActionableError(
          error,
          "Failed to create chat. Please try again."
        )
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: removeChat,
    onSuccess: (_data, chatId) => {
      queryClient.setQueryData<OpenWebuiChatSummary[]>(
        openWebuiKeys.chats,
        (existing = []) => existing.filter((chat) => chat.id !== chatId)
      );
      if (activeChatId === chatId) {
        const fallback = queryClient
          .getQueryData<OpenWebuiChatSummary[]>(openWebuiKeys.chats)
          ?.find((chat) => chat.id !== chatId);
        setActiveChatId(fallback?.id);
      }
      trackEvent("chat_deleted", { chatId });
      toast.success("Chat deleted");
    },
    onError: (error) => {
      toast.error(
        formatActionableError(
          error,
          "Failed to delete chat. Please try again."
        )
      );
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
      updateChat(chatId, { title }),
    onSuccess: (chat) => {
      queryClient.setQueryData<OpenWebuiChatSummary[]>(
        openWebuiKeys.chats,
        (existing = []) =>
          existing.map((item) => (item.id === chat.id ? chat : item))
      );
      trackEvent("chat_renamed", { chatId: chat.id });
      toast.success("Chat renamed");
    },
    onError: (error) => {
      toast.error(
        formatActionableError(
          error,
          "Failed to rename chat. Please try again."
        )
      );
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const detail = await fetchChatById(chatId);
      const model = detail.model || modelsQuery.data?.[0]?.id;
      if (!model) {
        throw new Error(
          "Models are unavailable. Refresh the page and try again."
        );
      }
      const messages = detail.messages
        .filter((message) =>
          ["system", "user", "assistant"].includes(message.role)
        )
        .map((message) => ({
          role: (message.role === "assistant"
            ? "assistant"
            : message.role === "user"
              ? "user"
              : "system") as "system" | "user" | "assistant",
          content: message.content,
        }));

      return createChat({
        model,
        title: `${detail.title} (Copy)`,
        system: detail.systemPrompt,
        messages,
      });
    },
    onSuccess: (chat) => {
      queryClient.setQueryData<OpenWebuiChatSummary[]>(
        openWebuiKeys.chats,
        (existing = []) => [chat, ...existing]
      );
      setActiveChatId(chat.id);
      trackEvent("chat_duplicated", { chatId: chat.id });
      toast.success("Chat duplicated");
    },
    onError: (error) => {
      toast.error(
        formatActionableError(
          error,
          "Failed to duplicate chat. Please try again."
        )
      );
    },
  });

  useEffect(() => {
    if (!activeChatId && chatQuery.data?.length) {
      setActiveChatId(chatQuery.data[0].id);
    }
  }, [activeChatId, chatQuery.data, setActiveChatId]);

  const filteredChats = useMemo(() => {
    if (!chatQuery.data) return [];
    if (!search.trim()) return chatQuery.data;

    return chatQuery.data.filter((chat) =>
      chat.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [chatQuery.data, search]);

  const busyMessage = (() => {
    if (createMutation.isPending) return "创建对话中...";
    if (duplicateMutation.isPending) return "复制对话中...";
    if (deleteMutation.isPending) return "删除对话中...";
    return `共 ${filteredChats.length} 个对话`;
  })();

  const handleCreate = () => {
    const model = modelsQuery.data?.[0]?.id;
    if (!model) {
      toast.error(
        "Models are unavailable right now. Refresh the page and try again."
      );
      return;
    }
    createMutation.mutate(model);
  };

  const handleRenameSubmit = () => {
    if (!renameTarget) return;
    renameMutation.mutate({ chatId: renameTarget.id, title: renameValue });
    setRenameTarget(null);
  };

  return (
    <div className="flex h-full max-h-full flex-col rounded-2xl border border-white/10 bg-background/80 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 flex-shrink-0">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            对话
          </p>
          <p className="text-lg font-semibold">聊天历史</p>
        </div>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleCreate}
          disabled={
            createMutation.isPending ||
            modelsQuery.isLoading ||
            !modelsQuery.data?.length
          }
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="border-b border-white/5 px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索对话"
            className="border-none bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {chatQuery.isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载对话中...
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            还没有对话。点击上方按钮创建新对话。
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filteredChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              return (
                <li key={chat.id}>
                  <div
                    onClick={() => {
                      setActiveChatId(chat.id);
                      trackEvent("chat_opened", { chatId: chat.id });
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition",
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-white/5"
                    )}
                  >
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <p className="line-clamp-1 text-sm font-semibold">
                          {chat.title}
                        </p>
                      </div>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {chat.lastMessagePreview || "暂无消息"}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {chat.updatedAt
                          ? formatDistanceToNow(new Date(chat.updatedAt), {
                              addSuffix: true,
                            })
                          : ""}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            setRenameTarget(chat);
                            setRenameValue(chat.title);
                          }}
                        >
                          重命名
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async (event) => {
                            event.stopPropagation();
                            await duplicateMutation.mutateAsync(chat.id);
                          }}
                        >
                          复制
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteMutation.mutate(chat.id);
                          }}
                        >
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>

      <div className="border-t border-white/5 px-4 py-3 text-xs text-muted-foreground flex-shrink-0">
        {busyMessage}
      </div>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名对话</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="chat-name">对话名称</Label>
            <Input
              id="chat-name"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              取消
            </Button>
            <Button onClick={handleRenameSubmit} disabled={renameMutation.isPending}>
              {renameMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

