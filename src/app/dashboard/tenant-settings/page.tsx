import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { TenantSettingsForm } from "@/components/dashboard/tenant-settings-form";

export default async function TenantSettingsPage() {
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

  const userRecord = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    with: {
      tenant: true,
    },
  });

  if (!userRecord?.tenant) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">Tenant settings</h1>
        <p className="text-sm text-muted-foreground">
          We could not resolve your tenant record. Please contact support.
        </p>
      </main>
    );
  }

  const tenantName = userRecord.tenant.name || "Current Tenant";
  const tenantFeatures =
    (userRecord.tenant.features as Record<string, boolean>) || {};

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Administration
        </p>
        <h1 className="text-3xl font-semibold">Tenant feature controls</h1>
        <p className="text-sm text-muted-foreground">
          Choose which AI tools are available to members of {tenantName}. These
          changes take effect immediately across the dashboard and tool routes.
        </p>
      </div>
      <TenantSettingsForm
        tenantName={tenantName}
        initialFeatures={tenantFeatures}
      />
    </main>
  );
}
