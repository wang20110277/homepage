import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, badRequest } from "@/lib/core/api-response";
import { withAuth, type BffRouteHandler } from "@/lib/core/bff-auth";
import { getChatDetail, updateChat, deleteChat } from "@/lib/services/open-webui";
import { mapOpenWebuiError } from "../../error-handler";
import { logInfo, logError } from "@/lib/core/logger";

const UpdateChatSchema = z.object({
  title: z.string().trim().max(200).optional(),
  system: z.string().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});

function getChatIdFromRequest(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1];
}

const getHandler: BffRouteHandler = async (request, { user, traceId }) => {
  const chatId = getChatIdFromRequest(request);

  try {
    const chat = await getChatDetail(user!.id, traceId, chatId);
    return ok({ chat }, traceId);
  } catch (error) {
    logError(traceId, "Failed to load OpenWebUI chat", {
      chatId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapOpenWebuiError(error, traceId);
  }
};

const patchHandler: BffRouteHandler = async (request, { user, traceId }) => {
  const chatId = getChatIdFromRequest(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON payload", undefined, traceId);
  }

  const result = UpdateChatSchema.safeParse(body);
  if (!result.success) {
    return badRequest(
      "Invalid chat update payload",
      result.error.flatten().fieldErrors,
      traceId
    );
  }

  const updates = result.data;
  if (!updates.title && !updates.system && !(updates.tags && updates.tags.length)) {
    return badRequest("At least one field must be provided", undefined, traceId);
  }

  try {
    const chat = await updateChat(user!.id, traceId, chatId, updates);
    logInfo(traceId, "Updated OpenWebUI chat", {
      chatId,
      userId: user?.id,
    });
    return ok({ chat }, traceId);
  } catch (error) {
    logError(traceId, "Failed to update OpenWebUI chat", {
      chatId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapOpenWebuiError(error, traceId);
  }
};

const deleteHandler: BffRouteHandler = async (request, { user, traceId }) => {
  const chatId = getChatIdFromRequest(request);

  try {
    await deleteChat(user!.id, traceId, chatId);
    logInfo(traceId, "Deleted OpenWebUI chat", {
      chatId,
      userId: user?.id,
    });
    return ok({ chatId }, traceId);
  } catch (error) {
    logError(traceId, "Failed to delete OpenWebUI chat", {
      chatId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mapOpenWebuiError(error, traceId);
  }
};

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
