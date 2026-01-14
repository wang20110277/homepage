"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Presentation, ScanText, Building2, ArrowRight, ClipboardCheck } from "lucide-react";

const tools = [
  {
    id: "ppt-generator",
    title: "PPT 生成器",
    description: "快速创建专业的演示文稿，支持多种模板和自定义设置",
    icon: Presentation,
    href: "/tools/ppt-generator",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    gradientFrom: "from-blue-500/20",
    gradientTo: "to-blue-600/5",
    borderGlow: "group-hover:shadow-blue-500/50",
  },
  {
    id: "ocr",
    title: "OCR 识别工具",
    description: "智能文字识别，支持多种文档格式和结构化输出",
    icon: ScanText,
    href: "/tools/ocr",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    gradientFrom: "from-green-500/20",
    gradientTo: "to-green-600/5",
    borderGlow: "group-hover:shadow-green-500/50",
  },
  {
    id: "tianyancha",
    title: "天眼查企业查询",
    description: "快速查询企业工商信息，一键生成尽调报告",
    icon: Building2,
    href: "/tools/tianyancha",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    gradientFrom: "from-purple-500/20",
    gradientTo: "to-purple-600/5",
    borderGlow: "group-hover:shadow-purple-500/50",
  },
  {
    id: "quality-check",
    title: "质检结果查询",
    description: "查询质检审核结果，支持多字段条件检索",
    icon: ClipboardCheck,
    href: "/tools/quality-check",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    gradientFrom: "from-orange-500/20",
    gradientTo: "to-orange-600/5",
    borderGlow: "group-hover:shadow-orange-500/50",
  },
];

export function ToolCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Link key={tool.id} href={tool.href} className="group">
            <div className="relative h-full">
              {/* Gradient glow background - only visible on hover */}
              <div
                className={`absolute -inset-0.5 bg-gradient-to-r ${tool.gradientFrom} ${tool.gradientTo} rounded-lg opacity-0 group-hover:opacity-100 blur-sm transition-all duration-500 ease-out`}
                aria-hidden="true"
              />

              {/* Main card */}
              <Card className={`
                relative h-full overflow-hidden
                transition-all duration-500 ease-out
                cursor-pointer
                border border-border/50
                group-hover:border-border
                group-hover:scale-[1.02]
                group-hover:shadow-xl
                ${tool.borderGlow}
                dark:group-hover:shadow-2xl
                before:absolute before:inset-0
                before:bg-gradient-to-br before:from-background/80 before:to-background/40
                before:opacity-0 before:group-hover:opacity-100
                before:transition-opacity before:duration-500
                backdrop-blur-sm
              `}>
                {/* Shimmer effect overlay */}
                <div
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-primary/5 to-transparent"
                  aria-hidden="true"
                />

                <CardHeader className="relative z-10 space-y-4">
                  {/* Icon container with enhanced effects */}
                  <div className="relative">
                    <div
                      className={`
                        w-14 h-14 rounded-xl ${tool.bgColor}
                        flex items-center justify-center
                        transition-all duration-500 ease-out
                        group-hover:scale-110
                        group-hover:rotate-3
                        group-hover:shadow-lg
                        ${tool.borderGlow}
                        relative overflow-hidden
                      `}
                    >
                      {/* Icon glow effect */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${tool.gradientFrom} ${tool.gradientTo} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                        aria-hidden="true"
                      />
                      <Icon className={`h-7 w-7 ${tool.color} relative z-10 transition-transform duration-500 group-hover:scale-110`} />
                    </div>
                  </div>

                  {/* Title with arrow */}
                  <CardTitle className="flex items-center justify-between text-lg font-semibold">
                    <span className="transition-colors duration-300 group-hover:text-primary">
                      {tool.title}
                    </span>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:text-foreground group-hover:translate-x-1.5 group-hover:scale-110" />
                  </CardTitle>

                  {/* Description */}
                  <CardDescription className="text-sm leading-relaxed transition-colors duration-300 group-hover:text-muted-foreground/90">
                    {tool.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="relative z-10 pt-2">
                  <Button
                    variant="outline"
                    className={`
                      w-full
                      transition-all duration-300
                      group-hover:bg-primary/5
                      group-hover:border-primary/30
                      group-hover:text-foreground
                      group-hover:shadow-md
                    `}
                  >
                    <span className="font-medium">立即使用</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
