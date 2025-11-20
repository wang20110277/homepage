import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, badRequest } from "@/lib/core/api-response";
import { withAuth, type BffRouteHandler } from "@/lib/core/bff-auth";
import { listChats, createChat } from "@/lib/services/open-webui";
import { mapOpenWebuiError } from "../error-handler";
import { logInfo, logError } from "@/lib/core/logger";

const DraftMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1, "Message content is required"),
});

const CreateChatSchema = z.object({
  model: z.string().min(1, "Model is required"),
  title: z.string().trim().max(200).optional(),
  system: z.string().optional(),
  initialMessage: z.string().optional(),
  messages: z.array(DraftMessageSchema).optional(),
});

const getHandler: BffRouteHandler = async (_request, { user, traceId }) => {
  try {
    const chats = await listChats(user!.id, traceId);
    return ok({ chats }, traceId);
  } catch (error) {
    logError(traceId, "Failed to list OpenWebUI chats", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapOpenWebuiError(error, traceId);
  }
};

const postHandler: BffRouteHandler = async (request: NextRequest, context) => {
  const { user, traceId } = context;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON payload", undefined, traceId);
  }

  const result = CreateChatSchema.safeParse(body);
  if (!result.success) {
    const detail = result.error.flatten().fieldErrors;
    return badRequest("Invalid chat payload", detail, traceId);
  }

  const payload = result.data;
  const normalizedMessages = payload.messages?.length
    ? payload.messages
    : payload.initialMessage
      ? [
          {
            role: "user" as const,
            content: payload.initialMessage,
          },
        ]
      : undefined;

  try {
    const chat = await createChat(user!.id, traceId, {
      model: payload.model,
      title: payload.title,
      system: payload.system,
      messages: normalizedMessages,
    });

    logInfo(traceId, "Created OpenWebUI chat", {
      chatId: chat.id,
      userId: user?.id,
    });

    return ok({ chat }, traceId);
  } catch (error) {
    logError(traceId, "Failed to create OpenWebUI chat", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapOpenWebuiError(error, traceId);
  }
};

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
