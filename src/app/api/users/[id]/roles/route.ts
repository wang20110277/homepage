import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { badRequest, ok } from "@/lib/core/api-response";
import { withAuth } from "@/lib/core/bff-auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

async function handlePut(
  request: NextRequest,
  userId: string,
  traceId: string
) {
  if (!userId) {
    return badRequest("User ID is required", undefined, traceId);
  }

  const body = await request.json().catch(() => null);
  let requestedRoles: string[] | null = null;

  if (Array.isArray(body?.roles)) {
    const uniqueRoles: string[] = [];
    for (const role of body.roles as unknown[]) {
      if (typeof role === "string" && !uniqueRoles.includes(role)) {
        uniqueRoles.push(role);
      }
    }
    requestedRoles = uniqueRoles;
  }

  if (!requestedRoles) {
    return badRequest("roles must be an array of strings", undefined, traceId);
  }

  const roleRecords = requestedRoles.length
    ? await db.query.roles.findMany({
        where: inArray(schema.roles.name, requestedRoles as readonly string[]),
      })
    : [];

  if (roleRecords.length !== requestedRoles.length) {
    return badRequest("One or more roles are invalid", undefined, traceId);
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(schema.userRoles)
      .where(eq(schema.userRoles.userId, userId));

    if (roleRecords.length) {
      await tx.insert(schema.userRoles).values(
        roleRecords.map((roleRecord) => ({
          id: randomUUID(),
          userId,
          roleId: roleRecord.id,
        }))
      );
    }
  });

  return ok({ roles: requestedRoles }, traceId);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const handler = withAuth(
    async (req, { traceId }) => {
      return handlePut(req, params.id, traceId);
    },
    { requiredRoles: ["admin"] }
  );

  return handler(request);
}
