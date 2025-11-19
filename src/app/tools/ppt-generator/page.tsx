import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkToolAccess } from "@/lib/rbac";
import PPTGeneratorClient from "./client-page";

export default async function PPTGeneratorPage() {
  const headerList = await headers();
  const session = await auth.api.getSession({
    headers: Object.fromEntries(headerList.entries()),
  });

  if (!session) {
    redirect("/login");
  }

  const access = await checkToolAccess(session.user.id, "ppt");

  if (!access.allowed) {
    const reason = access.reason
      ? `?reason=${encodeURIComponent(access.reason)}`
      : "";
    redirect(`/unauthorized${reason}`);
  }

  return <PPTGeneratorClient />;
}
