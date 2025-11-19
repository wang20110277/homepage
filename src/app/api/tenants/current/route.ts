import { notFound, ok } from "@/lib/core/api-response";
import { withAuth } from "@/lib/core/bff-auth";

export const GET = withAuth(async (_req, { tenant, traceId }) => {
  if (!tenant) {
    return notFound("Tenant not found", traceId);
  }

  return ok({ tenant }, traceId);
});
