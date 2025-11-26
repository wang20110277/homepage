export type OpenWebuiRole =
  | "system"
  | "user"
  | "assistant"
  | "tool"
  | "observation";

export interface OpenWebuiMessage {
  id?: string;
  role: OpenWebuiRole;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface OpenWebuiChatSummary {
  id: string;
  title: string;
  model?: string;
  createdAt?: string;
  updatedAt?: string;
  lastMessagePreview?: string;
}

export interface OpenWebuiChatDetail extends OpenWebuiChatSummary {
  messages: OpenWebuiMessage[];
  tags?: string[];
  systemPrompt?: string;
}

export interface OpenWebuiModel {
  id: string;
  label: string;
  provider?: string;
  description?: string | null;
  capabilities?: string[];
  supportsImages?: boolean;
}

export type OpenWebuiStreamEvent =
  | { type: "token"; token: string }
  | { type: "error"; error: string }
  | { type: "chat"; chat: OpenWebuiChatDetail }
  | { type: "done" };
