import { z } from "zod";
import { openWebuiClient } from "@/lib/openWebuiClient";
import { getOpenWebuiAccessToken } from "@/lib/services/user-tokens";
import { logInfo } from "@/lib/core/logger";
import type {
  OpenWebuiChatSummary,
  OpenWebuiChatDetail,
  OpenWebuiMessage,
  OpenWebuiModel,
} from "@/types/open-webui";

export interface CreateChatInput {
  model: string;
  title?: string;
  system?: string;
  messages?: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}

export interface UpdateChatInput {
  title?: string;
  system?: string;
  tags?: string[];
}

const TimestampSchema = z
  .union([z.string(), z.number(), z.date()])
  .optional()
  .nullable();

const MessageSchema = z.object({
  id: z.string().optional(),
  role: z.string().min(1),
  content: z.any(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  timestamp: TimestampSchema, // OpenWebUI uses 'timestamp' field
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const ChatSummarySchema = z.object({
  id: z.string(),
  title: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  summary: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  chat: z.object({
    models: z.array(z.string()).optional().nullable(),
    messages: z.array(z.any()).optional().nullable(),
  }).optional().nullable(),
});

const ChatDetailSchema = ChatSummarySchema.extend({
  system: z.string().optional().nullable(),
  messages: z.array(MessageSchema).optional().default([]),
  chat: z.object({
    messages: z.array(z.any()).optional().nullable(),
    history: z.object({
      messages: z.record(z.string(), z.any()).optional().nullable(),
      currentId: z.string().optional().nullable(),
    }).optional().nullable(),
    models: z.array(z.string()).optional().nullable(),
  }).optional().nullable(),
});

const ModelSchema = z.object({
  id: z.string(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  owned_by: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  capabilities: z
    .union([
      z.array(z.string()),
      z.record(z.string(), z.boolean()),
      z.record(z.string(), z.string()),
    ])
    .optional()
    .nullable(),
});

export class OpenWebuiServiceError extends Error {
  constructor(message: string, public detail?: unknown) {
    super(message);
    this.name = "OpenWebuiServiceError";
  }
}

function coerceTimestamp(value?: string | number | Date | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function normalizeContent(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeContent(item))
      .filter(Boolean)
      .join("");
  }

  if (value && typeof value === "object") {
    if ("text" in value && typeof (value as { text?: unknown }).text === "string") {
      return (value as { text: string }).text;
    }

    if ("content" in value) {
      return normalizeContent((value as { content?: unknown }).content);
    }
  }

  return "";
}

function normalizeMessage(raw: z.infer<typeof MessageSchema>): OpenWebuiMessage {
  // OpenWebUI uses 'timestamp' (UNIX timestamp in seconds), fallback to 'created_at'
  const createdAtValue = raw.timestamp
    ? typeof raw.timestamp === 'number'
      ? raw.timestamp * 1000 // Convert seconds to milliseconds
      : raw.timestamp
    : raw.created_at;

  return {
    id: raw.id,
    role: (raw.role as OpenWebuiMessage["role"]) ?? "assistant",
    content: normalizeContent(raw.content),
    createdAt: coerceTimestamp(createdAtValue),
    updatedAt: coerceTimestamp(raw.updated_at),
    metadata: raw.metadata ?? undefined,
  };
}

function normalizeSummary(
  raw: z.infer<typeof ChatSummarySchema>
): OpenWebuiChatSummary {
  // Extract model from chat.models if available, otherwise use raw.model
  const model = raw.chat?.models?.[0] ?? raw.model ?? undefined;

  // Try to extract last message from chat.messages if available
  let lastMessagePreview = raw.summary?.trim();
  if (!lastMessagePreview && raw.chat?.messages && raw.chat.messages.length > 0) {
    const lastMsg = raw.chat.messages[raw.chat.messages.length - 1];
    if (lastMsg && typeof lastMsg.content === 'string') {
      lastMessagePreview = lastMsg.content.substring(0, 100);
    }
  }
  if (!lastMessagePreview && typeof raw.metadata?.last_message === "string") {
    lastMessagePreview = raw.metadata.last_message;
  }

  return {
    id: raw.id,
    title: raw.title?.trim() || "Untitled chat",
    model,
    createdAt: coerceTimestamp(raw.created_at),
    updatedAt: coerceTimestamp(raw.updated_at),
    lastMessagePreview,
  };
}

function normalizeDetail(
  raw: z.infer<typeof ChatDetailSchema>
): OpenWebuiChatDetail {
  // OpenWebUI uses chat.history.messages (tree structure) or chat.messages (flat array)
  let messages: OpenWebuiMessage[] = [];

  // Try to extract from history tree first (preferred)
  if (raw.chat?.history?.messages && raw.chat?.history?.currentId) {
    const historyMessages = raw.chat.history.messages;
    const currentId = raw.chat.history.currentId;

    // Traverse from currentId to root to build conversation chain
    const messageChain: unknown[] = [];
    let nodeId: string | null | undefined = currentId;

    while (nodeId && historyMessages[nodeId]) {
      const node: unknown = historyMessages[nodeId];
      messageChain.unshift(node); // Add to beginning
      nodeId = (node as { parentId?: string | null }).parentId;
    }

    // Convert to OpenWebuiMessage format
    messages = messageChain
      .filter((msg) => {
        const typedMsg = msg as { role?: string; content?: unknown };
        return typedMsg.role && typedMsg.content !== undefined;
      })
      .map((msg) => {
        const parsed = MessageSchema.parse(msg);
        return normalizeMessage(parsed);
      });
  }

  // Fallback to chat.messages (flat array)
  if (messages.length === 0 && raw.chat?.messages && raw.chat.messages.length > 0) {
    messages = raw.chat.messages
      .filter((msg) => {
        const typedMsg = msg as { role?: string; content?: unknown };
        return typedMsg.role && typedMsg.content !== undefined;
      })
      .map((msg) => {
        const parsed = MessageSchema.parse(msg);
        return normalizeMessage(parsed);
      });
  }

  // Final fallback to raw.messages
  if (messages.length === 0 && raw.messages && raw.messages.length > 0) {
    messages = raw.messages.map(normalizeMessage);
  }

  return {
    ...normalizeSummary(raw),
    messages,
    tags: raw.tags ?? undefined,
    systemPrompt: raw.system ?? undefined,
  };
}

function normalizeModel(raw: z.infer<typeof ModelSchema>): OpenWebuiModel {
  const capabilities: string[] = Array.isArray(raw.capabilities)
    ? raw.capabilities.filter((value): value is string => typeof value === "string")
    : raw.capabilities && typeof raw.capabilities === "object"
      ? Object.entries(raw.capabilities)
          .filter(([, value]) => {
            if (typeof value === "boolean") {
              return value;
            }
            if (typeof value === "string") {
              return value.toLowerCase() !== "false";
            }
            return false;
          })
          .map(([key]) => key)
      : [];

  return {
    id: raw.id,
    label:
      raw.label?.trim() ||
      raw.name?.trim() ||
      raw.description?.trim() ||
      raw.id,
    provider: raw.provider ?? raw.owned_by ?? undefined,
    description: raw.description,
    capabilities,
    supportsImages: capabilities.includes("vision"),
  };
}

export async function listChats(
  userId: string,
  traceId: string
): Promise<OpenWebuiChatSummary[]> {
  const accessToken = await getOpenWebuiAccessToken(userId);
  const response = await openWebuiClient.request<unknown[]>(
    "/api/v1/chats/all",
    "GET",
    undefined,
    { accessToken, traceId, userId }
  );

  const parsed = z.array(ChatSummarySchema).parse(response);
  return parsed
    .map(normalizeSummary)
    .sort((a, b) => {
      const aTime = a.updatedAt || a.createdAt || "";
      const bTime = b.updatedAt || b.createdAt || "";
      return bTime.localeCompare(aTime);
    });
}

export async function createChat(
  userId: string,
  traceId: string,
  payload: CreateChatInput
): Promise<OpenWebuiChatSummary> {
  const accessToken = await getOpenWebuiAccessToken(userId);

  // Build chat object with all optional fields
  const chatData: Record<string, unknown> = {
    title: payload.title || "New conversation",
    models: [payload.model],
  };

  // Add system prompt if provided
  if (payload.system) {
    chatData.system = payload.system;
  }

  // Add messages to history if provided (for duplicating chats)
  if (payload.messages && payload.messages.length > 0) {
    // Convert messages array to OpenWebUI history format
    const historyMessages: Record<string, unknown> = {};
    const timestamp = Math.floor(Date.now() / 1000);
    let previousId: string | null = null;

    payload.messages.forEach((msg, index) => {
      const msgId = `msg-${Date.now()}-${index}`;
      historyMessages[msgId] = {
        id: msgId,
        parentId: previousId,
        childrenIds: [],
        role: msg.role,
        content: msg.content,
        timestamp,
        models: [payload.model],
      };

      // Update parent's childrenIds
      if (previousId && historyMessages[previousId]) {
        (historyMessages[previousId] as { childrenIds: string[] }).childrenIds.push(msgId);
      }

      previousId = msgId;
    });

    chatData.history = {
      messages: historyMessages,
      currentId: previousId,
    };

    // Also include flat messages array for compatibility
    chatData.messages = payload.messages.map((msg, index) => ({
      id: `msg-${Date.now()}-${index}`,
      role: msg.role,
      content: msg.content,
      timestamp,
    }));
  }

  const response = await openWebuiClient.request(
    "/api/v1/chats/new",
    "POST",
    { chat: chatData },
    { accessToken, traceId, userId }
  );

  logInfo(traceId, "Created OpenWebUI chat", {
    userId,
    chatId: (response as { id?: string }).id,
    hasMessages: Boolean(payload.messages?.length),
    messageCount: payload.messages?.length || 0,
  });

  const parsed = ChatSummarySchema.parse(response);
  return normalizeSummary(parsed);
}

export async function getChatDetail(
  userId: string,
  traceId: string,
  chatId: string
): Promise<OpenWebuiChatDetail> {
  const accessToken = await getOpenWebuiAccessToken(userId);
  const response = await openWebuiClient.request(
    `/api/v1/chats/${chatId}`,
    "GET",
    undefined,
    { accessToken, traceId, userId, chatId }
  );

  const parsed = ChatDetailSchema.parse(response);
  return normalizeDetail(parsed);
}

export async function updateChat(
  userId: string,
  traceId: string,
  chatId: string,
  updates: UpdateChatInput
): Promise<OpenWebuiChatSummary> {
  const accessToken = await getOpenWebuiAccessToken(userId);

  // First get current chat data
  const currentChat = await getChatDetail(userId, traceId, chatId);

  // Build updated chat object
  const payload: Record<string, unknown> = {
    chat: {
      id: chatId,
      title: updates.title ?? currentChat.title,
      models: currentChat.model ? [currentChat.model] : [],
    },
  };

  if (typeof updates.system === "string") {
    payload.chat = { ...payload.chat as object, system: updates.system };
  }

  if (updates.tags) {
    payload.chat = { ...payload.chat as object, tags: updates.tags };
  }

  const response = await openWebuiClient.request(
    `/api/v1/chats/${chatId}`,
    "POST",
    payload,
    { accessToken, traceId, userId, chatId }
  );

  const parsed = ChatSummarySchema.parse(response);
  return normalizeSummary(parsed);
}

export async function deleteChat(
  userId: string,
  traceId: string,
  chatId: string
): Promise<void> {
  const accessToken = await getOpenWebuiAccessToken(userId);

  // Try the standard DELETE endpoint first
  try {
    await openWebuiClient.request(
      `/api/v1/chats/${chatId}`,
      "DELETE",
      undefined,
      { accessToken, traceId, userId, chatId }
    );
  } catch (error) {
    // Fallback to /delete suffix if standard endpoint fails
    logInfo(traceId, "Retrying delete with /delete suffix", {
      chatId,
      error: error instanceof Error ? error.message : String(error),
    });

    await openWebuiClient.request(
      `/api/v1/chats/${chatId}/delete`,
      "DELETE",
      undefined,
      { accessToken, traceId, userId, chatId }
    );
  }
}

const modelCache = new Map<
  string,
  { expiresAt: number; models: OpenWebuiModel[] }
>();

const MODEL_CACHE_TTL =
  parseInt(process.env.OPEN_WEBUI_MODEL_CACHE_SECONDS || "30", 10) * 1000;

export async function listModels(
  userId: string,
  traceId: string
): Promise<OpenWebuiModel[]> {
  const now = Date.now();
  const cached = modelCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.models;
  }

  const accessToken = await getOpenWebuiAccessToken(userId);
  const response = await openWebuiClient.request<{ data?: unknown[] } | unknown[]>(
    "/api/models",
    "GET",
    undefined,
    { accessToken, traceId, userId }
  );

  // Handle both {data: [...]} and direct array responses
  const modelsArray = Array.isArray(response)
    ? response
    : (response as { data?: unknown[] }).data ?? [];

  const parsed = z.array(ModelSchema).parse(modelsArray);
  const models = parsed.map(normalizeModel);

  modelCache.set(userId, {
    models,
    expiresAt: now + MODEL_CACHE_TTL,
  });

  return models;
}

