import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Presentation,
  ScanText,
  Building2,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
            工作台系统
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            集成多种实用工具的一站式工作平台
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            为您提供 PPT 生成、OCR 文字识别、企业信息查询等强大功能
          </p>

          <div className="pt-6">
            <Button asChild size="lg" className="gap-2">
              <Link href="/dashboard">
                进入工作台
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">核心功能</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* PPT Generator */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                <Presentation className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">PPT 生成器</h3>
              <p className="text-muted-foreground mb-4">
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

            {/* OCR Tool */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                <ScanText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">OCR 文字识别</h3>
              <p className="text-muted-foreground mb-4">
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

            {/* Tianyancha */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">企业信息查询</h3>
              <p className="text-muted-foreground mb-4">
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
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">开始使用</h2>
          <p className="text-lg text-muted-foreground">
            登录后即可访问所有工具和个人工作台
          </p>
          <div className="pt-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/dashboard">
                立即开始
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
