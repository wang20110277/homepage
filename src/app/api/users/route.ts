import { ok } from "@/lib/core/api-response";
import { withAuth } from "@/lib/core/bff-auth";
import { db } from "@/lib/db";

export const GET = withAuth(
  async (_req, { traceId }) => {
    const users = await db.query.user.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
      with: {
        tenant: {
          columns: {
            name: true,
          },
        },
        userRoles: {
          with: {
            role: {
              columns: {
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: (users, { asc }) => [asc(users.name)],
    });

    const normalized = users.map((userRecord) => ({
      id: userRecord.id,
      name: userRecord.name ?? "",
      email: userRecord.email ?? "",
      isActive: userRecord.isActive ?? true,
      tenantName: userRecord.tenant?.name ?? null,
      roles: userRecord.userRoles
        .map((assignment) => assignment.role?.name)
        .filter((roleName): roleName is string => Boolean(roleName)),
    }));

    return ok({ users: normalized }, traceId);
  },
  {
    requiredRoles: ["admin"],
  }
);
