"use client";

import { Card } from "@/components/ui/card";
import {
  Presentation,
  ScanText,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { CometCard } from "@/components/ui/comet-card";

export default function LegacyHome() {
  return (
    <main className="relative min-h-screen bg-neutral-950 overflow-hidden flex items-center justify-center">
      {/* Background Beams */}
      <BackgroundBeams />

      {/* Features Section */}
      <section className="relative z-10 container mx-auto px-4 w-full">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-white">核心功能</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* PPT Generator */}
            <CometCard>
              <Card className="p-6 bg-neutral-900/90 border-neutral-800 backdrop-blur-sm h-full">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                <Presentation className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">PPT 生成器</h3>
              <p className="text-neutral-400 mb-4">
                快速创建专业演示文稿，支持多种模板和自定义设置
              </p>
              <ul className="space-y-2 text-sm text-neutral-400">
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

            {/* OCR Tool */}
            <CometCard>
              <Card className="p-6 bg-neutral-900/90 border-neutral-800 backdrop-blur-sm h-full">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                <ScanText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">OCR 文字识别</h3>
              <p className="text-neutral-400 mb-4">
                高精度图片文字识别，支持多种文档类型和输出格式
              </p>
              <ul className="space-y-2 text-sm text-neutral-400">
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

            {/* Tianyancha */}
            <CometCard>
              <Card className="p-6 bg-neutral-900/90 border-neutral-800 backdrop-blur-sm h-full">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">企业信息查询</h3>
              <p className="text-neutral-400 mb-4">
                快速查询企业工商信息，生成专业尽调报告
              </p>
              <ul className="space-y-2 text-sm text-neutral-400">
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
          </div>
        </div>
      </section>
    </main>
  );
}
