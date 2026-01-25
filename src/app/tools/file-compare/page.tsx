import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkToolAccess } from "@/lib/rbac";
import FileCompareClient from "./client-page";

export default async function FileComparePage() {
  const headerList = await headers();
  const session = await auth.api.getSession({
    headers: Object.fromEntries(headerList.entries()),
  });

  if (!session) {
    redirect("/login");
  }

  const access = await checkToolAccess(session.user.id, "fileCompare");

  if (!access.allowed) {
    const reason = access.reason
      ? `?reason=${encodeURIComponent(access.reason)}`
      : "";
    redirect(`/unauthorized${reason}`);
  }

  return <FileCompareClient />;
}
