"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Presentation, ScanText, Building2, ArrowRight } from "lucide-react";

const tools = [
  {
    id: "ppt-generator",
    title: "PPT 生成器",
    description: "快速创建专业的演示文稿，支持多种模板和自定义设置",
    icon: Presentation,
    href: "/tools/ppt-generator",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "ocr",
    title: "OCR 识别工具",
    description: "智能文字识别，支持多种文档格式和结构化输出",
    icon: ScanText,
    href: "/tools/ocr",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "tianyancha",
    title: "天眼查企业查询",
    description: "快速查询企业工商信息，一键生成尽调报告",
    icon: Building2,
    href: "/tools/tianyancha",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

export function ToolCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Link key={tool.id} href={tool.href}>
            <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${tool.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-6 w-6 ${tool.color}`} />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {tool.title}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <span>立即使用</span>
                </Button>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
