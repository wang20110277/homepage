import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { badRequest } from "@/lib/core/api-response";
import { getTraceId } from "@/lib/core/trace";
import { getUserFromRequest } from "@/lib/core/bff-auth";
import { toSseChunk, extractToken } from "@/lib/open-webui/stream-utils";
import { unauthorized } from "@/lib/core/api-response";
import { logError, logInfo } from "@/lib/core/logger";
import { getOpenWebuiAccessToken } from "@/lib/services/user-tokens";
import { openWebuiClient } from "@/lib/openWebuiClient";
import { mapOpenWebuiError } from "../../../error-handler";

const SendMessageSchema = z.object({
  message: z.string().min(1, "Message content is required"),
  model: z.string().min(1, "Model is required"),
  messageId: z.string().uuid().optional(),
  files: z.array(z.string()).optional(),
});

function getChatIdFromRequest(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 2];
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    return unauthorized("Authentication required", traceId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON payload", undefined, traceId);
  }

  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      "Invalid message payload",
      parsed.error.flatten().fieldErrors,
      traceId
    );
  }

  const data = parsed.data;
  const chatId = getChatIdFromRequest(request);
  const userMessageId = `user-${data.messageId ?? randomUUID()}`;
  const assistantMessageId = data.messageId ?? randomUUID();

  try {
    const accessToken = await getOpenWebuiAccessToken(user.id);

    // IMPORTANT: Get raw response to access history field (not in Zod schema)
    const rawChatResponse = await openWebuiClient.request<{
      id: string;
      title?: string;
      model?: string;
      chat?: {
        history?: {
          messages?: Record<string, unknown>;
          currentId?: string;
        };
      };
    }>(
      `/api/v1/chats/${chatId}`,
      "GET",
      undefined,
      { accessToken, traceId, userId: user.id, chatId }
    );

    // Extract history messages (preserves parent-child relationships)
    const existingHistoryMessages =
      rawChatResponse.chat?.history?.messages ?? {};
    const currentId = rawChatResponse.chat?.history?.currentId;

    // Build conversation context from history for AI
    const conversationMessages: Array<{ role: string; content: string }> = [];

    // Traverse history tree to build linear conversation
    if (currentId && existingHistoryMessages[currentId]) {
      const messageChain: Array<unknown> = [];
      let nodeId: string | null | undefined = currentId;

      while (nodeId && existingHistoryMessages[nodeId]) {
        const node = existingHistoryMessages[nodeId] as {
          parentId?: string | null;
          role?: string;
          content?: string;
        };
        messageChain.unshift(node);
        nodeId = node.parentId;
      }

      for (const msg of messageChain) {
        const typedMsg = msg as { role?: string; content?: string };
        if (
          typedMsg.role &&
          typedMsg.content &&
          ["system", "user", "assistant"].includes(typedMsg.role)
        ) {
          conversationMessages.push({
            role: typedMsg.role,
            content: typedMsg.content,
          });
        }
      }
    }

    // Add new user message to conversation
    conversationMessages.push({
      role: "user",
      content: data.message,
    });

    // Stream from OpenWebUI
    const upstream = await openWebuiClient.stream("/api/chat/completions", {
      accessToken,
      traceId,
      timeout: openWebuiClient.getCompletionTimeout(),
      userId: user.id,
      chatId,
      body: {
        model: data.model,
        stream: true,
        chat_id: chatId,
        id: assistantMessageId,
        messages: conversationMessages,
        files: data.files,
      },
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let aggregatedContent = "";
    let finalAssistantId = assistantMessageId;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const reader = upstream.body?.getReader();
          if (!reader) {
            controller.enqueue(
              encoder.encode(
                toSseChunk({
                  type: "error",
                  error: "Upstream stream missing",
                })
              )
            );
            controller.close();
            return;
          }

          let buffer = "";
          let upstreamDone = false;

          // Forward tokens to frontend while collecting response
          while (!upstreamDone) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            let boundary: number;
            while ((boundary = buffer.indexOf("\n\n")) !== -1) {
              const rawEvent = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);

              const dataLine = rawEvent
                .split(/\n/)
                .find((line) => line.startsWith("data:"));

              if (!dataLine) continue;

              const payload = dataLine.replace(/^data:\s*/, "").trim();
              if (!payload) continue;

              if (payload === "[DONE]") {
                upstreamDone = true;
                break;
              }

              try {
                const json = JSON.parse(payload) as {
                  id?: string;
                  choices?: Array<{
                    delta?: { content?: unknown };
                    message?: { content?: string };
                  }>;
                };

                if (json.id) {
                  finalAssistantId = json.id;
                }

                const delta = json.choices?.[0]?.delta;
                let token = extractToken(delta?.content);

                if (!token && json.choices?.[0]?.message?.content) {
                  token = json.choices[0].message.content;
                }

                if (token) {
                  aggregatedContent += token;
                  controller.enqueue(
                    encoder.encode(toSseChunk({ type: "token", token }))
                  );
                }
              } catch (streamError) {
                logError(traceId, "Failed to parse OpenWebUI stream chunk", {
                  error:
                    streamError instanceof Error
                      ? streamError.message
                      : String(streamError),
                });
              }
            }
          }

          // After streaming completes, save complete conversation with history
          if (aggregatedContent.trim().length > 0) {
            const timestamp = Math.floor(Date.now() / 1000);

            // Build complete history with new messages
            const historyMessages: Record<
              string,
              {
                id: string;
                parentId: string | null;
                childrenIds: string[];
                role: string;
                content: string;
                timestamp: number;
                models?: string[];
                model?: string;
                modelName?: string;
                usage?: unknown;
                done?: boolean;
              }
            > = {};

            // Clone existing history
            for (const msgId in existingHistoryMessages) {
              const msg = existingHistoryMessages[msgId] as {
                id?: string;
                parentId?: string | null;
                childrenIds?: string[];
                role?: string;
                content?: string;
                timestamp?: number;
                models?: string[];
                model?: string;
                modelName?: string;
                usage?: unknown;
                done?: boolean;
              };

              historyMessages[msgId] = {
                id: msg.id ?? msgId,
                parentId: msg.parentId ?? null,
                childrenIds: [...(msg.childrenIds || [])],
                role: msg.role ?? "user",
                content: msg.content ?? "",
                timestamp: msg.timestamp ?? timestamp,
                models: msg.models ?? [data.model],
                model: msg.model,
                modelName: msg.modelName,
                usage: msg.usage,
                done: msg.done,
              };
            }

            // Add new user message
            historyMessages[userMessageId] = {
              id: userMessageId,
              parentId: currentId ?? null,
              childrenIds: [finalAssistantId],
              role: "user",
              content: data.message,
              timestamp,
              models: [data.model],
            };

            // Add new assistant message
            historyMessages[finalAssistantId] = {
              id: finalAssistantId,
              parentId: userMessageId,
              childrenIds: [],
              role: "assistant",
              content: aggregatedContent,
              timestamp,
              models: [data.model],
              model: data.model,
              done: true,
            };

            // Update children of previous current message
            if (currentId && historyMessages[currentId]) {
              if (!historyMessages[currentId].childrenIds.includes(userMessageId)) {
                historyMessages[currentId].childrenIds.push(userMessageId);
              }
            }

            // Auto-generate title from first user message if still default
            const currentTitle = rawChatResponse.title || "New chat";
            const isDefaultTitle = ["New conversation", "New chat", "Untitled chat", "未命名对话"].includes(currentTitle);

            // Check if this is the first user message (no previous non-system messages)
            const hasNoUserMessages = !Object.values(historyMessages).some(
              (msg) => msg.id !== userMessageId && msg.role === "user"
            );

            let finalTitle = currentTitle;
            if (isDefaultTitle && hasNoUserMessages) {
              // Generate title from first user message (max 50 chars)
              // Remove newlines and extra spaces, handle empty messages
              const userMessageContent = data.message
                .trim()
                .replace(/\s+/g, " "); // Replace all whitespace (including newlines) with single space

              if (userMessageContent.length > 0) {
                // Use slice instead of substring for better Unicode handling
                finalTitle = userMessageContent.length > 50
                  ? `${userMessageContent.slice(0, 50)}...`
                  : userMessageContent;
              }
              // If message is empty after cleanup, keep the default title
            }

            // Save complete chat with history
            await openWebuiClient.request(
              `/api/v1/chats/${chatId}`,
              "POST",
              {
                chat: {
                  id: chatId,
                  title: finalTitle,
                  models: [data.model],
                  history: {
                    messages: historyMessages,
                    currentId: finalAssistantId,
                  },
                },
              },
              { accessToken, traceId, userId: user.id, chatId }
            );

            logInfo(traceId, "Saved OpenWebUI chat history", {
              chatId,
              userId: user.id,
              messageCount: Object.keys(historyMessages).length,
              currentId: finalAssistantId,
            });
          }

          // Fetch updated chat using service function (handles OpenWebUI data structure correctly)
          const { getChatDetail } = await import("@/lib/services/open-webui");
          const updatedChat = await getChatDetail(user.id, traceId, chatId);

          controller.enqueue(
            encoder.encode(
              toSseChunk({
                type: "chat",
                chat: {
                  id: updatedChat.id,
                  title: updatedChat.title,
                  model: updatedChat.model || data.model,
                  messages: updatedChat.messages,
                  lastMessagePreview: aggregatedContent.slice(0, 100),
                },
              })
            )
          );
        } catch (error) {
          logError(traceId, "Streaming error from OpenWebUI", {
            error: error instanceof Error ? error.message : String(error),
          });
          controller.enqueue(
            encoder.encode(
              toSseChunk({
                type: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "OpenWebUI stream interrupted",
              })
            )
          );
        }

        controller.enqueue(encoder.encode(toSseChunk({ type: "done" })));
        controller.close();
      },
    });

    logInfo(traceId, "Streaming OpenWebUI response", {
      chatId,
      userId: user.id,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Trace-Id": traceId,
      },
    });
  } catch (error) {
    logError(traceId, "Failed to start OpenWebUI chat stream", {
      chatId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapOpenWebuiError(error, traceId);
  }
}
