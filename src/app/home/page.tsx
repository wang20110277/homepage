"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Presentation, ScanText, Building2, CheckCircle2 } from "lucide-react";
import { AnalogClock } from "@/components/dashboard/analog-clock";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { AnnouncementBoard } from "@/components/dashboard/announcement-board";
import { TodoList } from "@/components/dashboard/todo-list";
import { CometCard } from "@/components/ui/comet-card";

export default function HomePage() {
  return (
    <main className="min-h-screen p-6 pt-20">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            欢迎回来，张斌
          </h1>
          <p className="text-muted-foreground">
            今天是个高效工作的好日子
          </p>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Clock and Calendar */}
          <div className="lg:col-span-3 space-y-6">
            <CometCard rotateDepth={8} translateDepth={8}>
              <AnalogClock />
            </CometCard>
            <CometCard rotateDepth={8} translateDepth={8}>
              <CalendarView />
            </CometCard>
          </div>

          {/* Middle Column - Announcements and Todos */}
          <div className="lg:col-span-6 space-y-6">
            <CometCard rotateDepth={6} translateDepth={6}>
              <AnnouncementBoard />
            </CometCard>
            <CometCard rotateDepth={6} translateDepth={6}>
              <TodoList />
            </CometCard>
          </div>

          {/* Right Column - Quick Tools */}
          <div className="lg:col-span-3 space-y-6">
            {/* PPT Generator */}
            <Link href="/tools/ppt-generator" className="block">
              <CometCard rotateDepth={10} translateDepth={10}>
                <Card className="p-6 h-full cursor-pointer select-none">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                    <Presentation className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">PPT 生成器</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    快速创建专业演示文稿，支持多种模板和自定义设置
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>多种页数和语言选择</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>支持上传参考资料</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>丰富的模板库</span>
                    </li>
                  </ul>
                </Card>
              </CometCard>
            </Link>

            {/* OCR Tool */}
            <Link href="/tools/ocr" className="block">
              <CometCard rotateDepth={10} translateDepth={10}>
                <Card className="p-6 h-full cursor-pointer select-none">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                    <ScanText className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">OCR 文字识别</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    高精度图片文字识别，支持多种文档类型和输出格式
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>多种识别模式可选</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>文档结构化输出</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>支持多种模型大小</span>
                    </li>
                  </ul>
                </Card>
              </CometCard>
            </Link>

            {/* Tianyancha */}
            <Link href="/tools/tianyancha" className="block">
              <CometCard rotateDepth={10} translateDepth={10}>
                <Card className="p-6 h-full cursor-pointer select-none">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">企业信息查询</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    快速查询企业工商信息，生成专业尽调报告
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>完整的工商信息</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>股东和变更记录</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>一键生成尽调报告</span>
                    </li>
                  </ul>
                </Card>
              </CometCard>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
