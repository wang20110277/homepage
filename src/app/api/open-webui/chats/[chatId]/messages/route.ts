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
import { getChatDetail } from "@/lib/services/open-webui";

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
    return badRequest("Invalid message payload", parsed.error.flatten().fieldErrors, traceId);
  }

  const data = parsed.data;
  const chatId = getChatIdFromRequest(request);
  const messageId = data.messageId ?? randomUUID();

  try {
    const accessToken = await getOpenWebuiAccessToken(user.id);

    // Fetch existing chat to get conversation history
    const existingChat = await getChatDetail(user.id, traceId, chatId);

    // Build messages array with history + new message
    const messages = [
      ...existingChat.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: data.message,
      },
    ];

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
        id: messageId,
        messages,
        files: data.files,
      },
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let assistantMessageId = messageId;
    let aggregated = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const reader = upstream.body?.getReader();
          if (!reader) {
            controller.enqueue(encoder.encode(toSseChunk({
              type: "error",
              error: "Upstream stream missing",
            })));
            controller.close();
            return;
          }

          let buffer = "";
          let upstreamDone = false;

          while (!upstreamDone) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            let boundary: number;
            while ((boundary = buffer.indexOf("\n\n")) !== -1) {
              const rawEvent = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);

              const dataLine = rawEvent
                .split(/\n/)
                .find((line) => line.startsWith("data:"));

              if (!dataLine) {
                continue;
              }

              const payload = dataLine.replace(/^data:\s*/, "").trim();
              if (!payload) {
                continue;
              }

              if (payload === "[DONE]") {
                upstreamDone = true;
                break;
              }

              try {
                const json = JSON.parse(payload) as {
                  id?: string;
                  choices?: Array<{
                    delta?: {
                      content?: unknown;
                    };
                    message?: { content?: string };
                  }>;
                };

                if (json.id) {
                  assistantMessageId = json.id;
                }

                const delta = json.choices?.[0]?.delta;
                let token = extractToken(delta?.content);

                if (!token && json.choices?.[0]?.message?.content) {
                  token = json.choices[0].message.content;
                }

                if (token) {
                  aggregated += token;
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
        } catch (error) {
          logError(traceId, "Streaming error from OpenWebUI", {
            error: error instanceof Error ? error.message : String(error),
          });
          controller.enqueue(
            encoder.encode(
              toSseChunk({
                type: "error",
                error: "OpenWebUI stream interrupted",
              })
            )
          );
        }

        try {
          if (aggregated.trim().length > 0) {
            await openWebuiClient.request(
              "/api/chat/completed",
              "POST",
              {
                id: assistantMessageId,
                chat_id: chatId,
                model: data.model,
                message: {
                  role: "assistant",
                  content: aggregated,
                },
              },
              { accessToken, traceId, userId: user.id, chatId }
            );
          }

          const chat = await getChatDetail(user.id, traceId, chatId);
          controller.enqueue(encoder.encode(toSseChunk({ type: "chat", chat })));
        } catch (finalizeError) {
          logError(traceId, "Failed to finalize OpenWebUI chat", {
            error:
              finalizeError instanceof Error
                ? finalizeError.message
                : String(finalizeError),
          });
          controller.enqueue(
            encoder.encode(
              toSseChunk({
                type: "error",
                error: "Failed to finalize chat",
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



