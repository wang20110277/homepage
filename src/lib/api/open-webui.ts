import type { ApiResponse } from "@/lib/core/types";
import type {
  OpenWebuiChatSummary,
  OpenWebuiChatDetail,
  OpenWebuiModel,
  OpenWebuiStreamEvent,
} from "@/types/open-webui";

const API_BASE = "/api/open-webui";

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Request failed");
  }
  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.success || !payload.data) {
    throw new Error(payload.error?.message || "Request failed");
  }
  return payload.data;
}

export async function fetchChats(): Promise<OpenWebuiChatSummary[]> {
  const data = await handleJsonResponse<{ chats: OpenWebuiChatSummary[] }>(
    await fetch(`${API_BASE}/chats`, { cache: "no-store" })
  );
  return data.chats;
}

export async function fetchChatById(
  chatId: string
): Promise<OpenWebuiChatDetail> {
  const data = await handleJsonResponse<{ chat: OpenWebuiChatDetail }>(
    await fetch(`${API_BASE}/chats/${chatId}`, { cache: "no-store" })
  );
  return data.chat;
}

interface CreateChatRequest {
  model: string;
  title?: string;
  system?: string;
  initialMessage?: string;
  messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

export async function createChat(
  payload: CreateChatRequest
): Promise<OpenWebuiChatSummary> {
  const data = await handleJsonResponse<{ chat: OpenWebuiChatSummary }>(
    await fetch(`${API_BASE}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
  return data.chat;
}

export async function updateChat(
  chatId: string,
  payload: Partial<Pick<OpenWebuiChatSummary, "title">>
): Promise<OpenWebuiChatSummary> {
  const data = await handleJsonResponse<{ chat: OpenWebuiChatSummary }>(
    await fetch(`${API_BASE}/chats/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
  return data.chat;
}

export async function removeChat(chatId: string) {
  await handleJsonResponse<{ chatId: string }>(
    await fetch(`${API_BASE}/chats/${chatId}`, { method: "DELETE" })
  );
}

export async function fetchModels(): Promise<OpenWebuiModel[]> {
  const data = await handleJsonResponse<{ models: OpenWebuiModel[] }>(
    await fetch(`${API_BASE}/models`, { cache: "no-store" })
  );
  return data.models;
}

interface StreamParams {
  chatId: string;
  message: string;
  model: string;
  messageId?: string;
  signal?: AbortSignal;
  onEvent: (event: OpenWebuiStreamEvent) => void;
}

export async function streamChatMessage({
  chatId,
  message,
  model,
  messageId,
  signal,
  onEvent,
}: StreamParams) {
  const response = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, model, messageId }),
    signal,
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to stream message");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const line = raw
        .split(/\n/)
        .find((segment) => segment.startsWith("data:"));
      if (!line) continue;

      const payload = line.replace(/^data:\s*/, "");
      if (!payload) continue;

      try {
        const event = JSON.parse(payload) as OpenWebuiStreamEvent;
        onEvent(event);
      } catch (error) {
        console.warn("Failed to parse stream chunk", error);
      }
    }
  }
}

export const openWebuiKeys = {
  chats: ["openwebui", "chats"] as const,
  chatDetail: (chatId: string) => ["openwebui", "chat", chatId] as const,
  models: ["openwebui", "models"] as const,
};
