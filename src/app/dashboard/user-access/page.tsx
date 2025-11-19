import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { UserAccessTable } from "@/components/dashboard/user-access-table";

export default async function UserAccessPage() {
  const headerList = await headers();
  const session = await auth.api.getSession({
    headers: Object.fromEntries(headerList.entries()),
  });

  if (!session) {
    redirect("/login");
  }

  const isAdmin = await hasRole(session.user.id, "admin");
  if (!isAdmin) {
    redirect(
      `/unauthorized?reason=${encodeURIComponent(
        "Administrator role required"
      )}`
    );
  }

  const [users, roles] = await Promise.all([
    db.query.user.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
      with: {
        tenant: {
          columns: { name: true },
        },
        userRoles: {
          with: {
            role: {
              columns: { name: true },
            },
          },
        },
      },
      orderBy: (users, { asc }) => [asc(users.name)],
    }),
    db.query.roles.findMany({
      where: eq(schema.roles.tenantId, "default"),
      columns: {
        id: true,
        name: true,
        displayName: true,
        description: true,
      },
      orderBy: (roles, { asc }) => [asc(roles.displayName)],
    }),
  ]);

  const normalizedUsers = users.map((userRecord) => ({
    id: userRecord.id,
    name: userRecord.name ?? "",
    email: userRecord.email ?? "",
    tenantName: userRecord.tenant?.name ?? null,
    isActive: userRecord.isActive ?? true,
    roles: userRecord.userRoles
      .map((assignment) => assignment.role?.name)
      .filter((roleName): roleName is string => Boolean(roleName)),
  }));

  const roleOptions = roles.map((role) => ({
    name: role.name,
    displayName: role.displayName,
    description: role.description || "",
  }));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Administration
        </p>
        <h1 className="text-3xl font-semibold">User access management</h1>
        <p className="text-sm text-muted-foreground">
          Grant or revoke tool access by assigning roles to individual users.
          Changes take effect immediately after saving.
        </p>
      </div>
      <UserAccessTable initialUsers={normalizedUsers} roleOptions={roleOptions} />
    </main>
  );
}
