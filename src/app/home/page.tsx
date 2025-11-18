import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkToolAccess, type ToolId } from "@/lib/rbac";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back, {session.user.name ?? "team member"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Select a tool to get started. Access is based on your tenant
          features and role assignments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {toolStatuses.map((tool) => {
          const disabled = !tool.access.allowed;
          return (
            <Card
              key={tool.id}
              className={disabled ? "opacity-60" : ""}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{tool.name}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </div>
                  {disabled ? (
                    <Badge variant="destructive">
                      {tool.access.reason || "Not available"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Enabled</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {disabled ? (
                  <p className="text-sm text-muted-foreground">
                    {tool.access.reason || "Contact admin for access."}
                  </p>
                ) : (
                  <Link
                    className="text-sm font-medium text-primary underline"
                    href={tool.href}
                  >
                    Open {tool.name}
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
