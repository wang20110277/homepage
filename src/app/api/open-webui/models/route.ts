import { withAuth, type BffRouteHandler } from "@/lib/core/bff-auth";
import { ok } from "@/lib/core/api-response";
import { listModels } from "@/lib/services/open-webui";
import { mapOpenWebuiError } from "../error-handler";
import { logError } from "@/lib/core/logger";

const handler: BffRouteHandler = async (_request, { user, traceId }) => {
  try {
    const models = await listModels(user!.id, traceId);
    return ok({ models }, traceId);
  } catch (error) {
    logError(traceId, "Failed to load OpenWebUI models", {
      error: error instanceof Error ? error.message : String(error),
    });
    return mapOpenWebuiError(error, traceId);
  }
};

export const GET = withAuth(handler);
