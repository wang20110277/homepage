import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkToolAccess, type ToolId } from "@/lib/rbac";
import { OpenWebuiHomeShell } from "@/components/open-webui/home-shell";

const tools: Array<{
  id: ToolId;
  name: string;
  description: string;
  href: string;
}> = [
  {
    id: "ppt",
    name: "PPT Generator",
    description: "Quickly build enterprise-ready decks.",
    href: "/tools/ppt-generator",
  },
  {
    id: "ocr",
    name: "OCR Recognition",
    description: "Extract text from scanned documents.",
    href: "/tools/ocr",
  },
  {
    id: "tianyancha",
    name: "Tianyancha Lookup",
    description: "Company intelligence and background checks.",
    href: "/tools/tianyancha",
  },
];

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const toolStatuses = await Promise.all(
    tools.map(async (tool) => ({
      ...tool,
      access: await checkToolAccess(session.user.id, tool.id),
    }))
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-6">
      <OpenWebuiHomeShell
        userName={session.user.name ?? "team member"}
        tools={toolStatuses}
      />
    </main>
  );
}
