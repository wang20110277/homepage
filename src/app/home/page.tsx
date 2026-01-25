import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OpenWebuiHomeShell } from "@/components/open-webui/home-shell";

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="w-full h-[calc(100vh-72px)]">
      <OpenWebuiHomeShell userName={session.user.name ?? "成员"} />
    </main>
  );
}
