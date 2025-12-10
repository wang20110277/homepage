import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getToolAccessSummary, type ToolId } from "@/lib/rbac";
import { OpenWebuiHomeShell } from "@/components/open-webui/home-shell";

const tools: Array<{
  id: ToolId;
  name: string;
  description: string;
  href: string;
}> = [
  {
    id: "ppt",
    name: "PPT 生成器",
    description: "快速构建企业级演示文稿",
    href: "/tools/ppt-generator",
  },
  {
    id: "ocr",
    name: "OCR 识别",
    description: "从扫描文档中提取文字",
    href: "/tools/ocr",
  },
  {
    id: "tianyancha",
    name: "天眼查",
    description: "企业信息查询和背景调查",
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

  // 优化：只查询一次数据库，获取所有工具的访问权限
  const accessSummary = await getToolAccessSummary(session.user.id);
  const accessMap = new Map(
    accessSummary.map((item) => [item.tool, item.access])
  );

  const toolStatuses = tools.map((tool) => ({
    ...tool,
    access: accessMap.get(tool.id) ?? { allowed: false, reason: "Unknown tool" },
  }));

  return (
    <main className="w-full h-full">
      <OpenWebuiHomeShell
        userName={session.user.name ?? "成员"}
        tools={toolStatuses}
      />
    </main>
  );
}
