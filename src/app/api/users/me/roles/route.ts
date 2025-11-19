import { ok, unauthorized } from "@/lib/core/api-response";
import { withAuth } from "@/lib/core/bff-auth";
import { getUserRoles } from "@/lib/rbac";

export const GET = withAuth(async (_req, { user, traceId }) => {
  if (!user) {
    return unauthorized("Authentication required", traceId);
  }

  const roles = await getUserRoles(user.id);
  return ok({ roles }, traceId);
});
