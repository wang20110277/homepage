import { ok, unauthorized } from "@/lib/core/api-response";
import { withAuth } from "@/lib/core/bff-auth";
import { getToolAccessSummary } from "@/lib/rbac";

export const GET = withAuth(async (_req, { user, tenant, traceId }) => {
  if (!user) {
    return unauthorized("Authentication required", traceId);
  }

  const toolAccess = await getToolAccessSummary(user.id);
  return ok(
    {
      user,
      tenant,
      toolAccess,
    },
    traceId
  );
});
