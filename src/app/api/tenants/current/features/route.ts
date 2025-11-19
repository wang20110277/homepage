import { badRequest, notFound, ok } from "@/lib/core/api-response";
import { withAuth } from "@/lib/core/bff-auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";

type UpdateFeaturesResult =
  | { error: string }
  | { features: Record<string, unknown> };

function isErrorResult(
  result: UpdateFeaturesResult
): result is { error: string } {
  return "error" in result;
}

export const GET = withAuth(async (_req, { tenant, traceId }) => {
  if (!tenant || !tenant.id) {
    return notFound("Tenant not found", traceId);
  }

  return ok(
    {
      features: tenant.features ?? {},
    },
    traceId
  );
});

async function updateFeatures(
  request: Request,
  tenantId: string
): Promise<UpdateFeaturesResult> {
  const body = await request.json().catch(() => null);
  const features = body?.features;

  if (!features || typeof features !== "object") {
    return { error: "Invalid features payload" };
  }

  await db
    .update(schema.tenants)
    .set({ features })
    .where(eq(schema.tenants.id, tenantId));

  return { features };
}

export const PUT = withAuth(
  async (req, { tenant, traceId }) => {
    const tenantId = tenant?.id ?? "";
    if (!tenantId) {
      return notFound("Tenant not found", traceId);
    }

    const result = await updateFeatures(req, tenantId);

    if (isErrorResult(result)) {
      return badRequest(result.error, undefined, traceId);
    }

    return ok(result, traceId);
  },
  {
    requiredRoles: ["admin"],
  }
);
