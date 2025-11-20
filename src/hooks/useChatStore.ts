"use client";

import { create } from "zustand";

interface ChatStore {
  activeChatId?: string;
  setActiveChatId: (chatId?: string) => void;
  composerValue: string;
  setComposerValue: (value: string) => void;
  isStreaming: boolean;
  setStreaming: (value: boolean) => void;
  pendingMessageId?: string;
  setPendingMessageId: (id?: string) => void;
  selectedModels: Record<string, string>;
  setSelectedModel: (chatId: string, modelId: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeChatId: undefined,
  composerValue: "",
  isStreaming: false,
  selectedModels: {},
  setActiveChatId: (chatId) =>
    set({
      activeChatId: chatId,
      composerValue: "",
      pendingMessageId: undefined,
    }),
  setComposerValue: (value) => set({ composerValue: value }),
  setStreaming: (value) => set({ isStreaming: value }),
  pendingMessageId: undefined,
  setPendingMessageId: (id) => set({ pendingMessageId: id }),
  setSelectedModel: (chatId, modelId) =>
    set((state) => ({
      selectedModels: {
        ...state.selectedModels,
        [chatId]: modelId,
      },
    })),
}));
