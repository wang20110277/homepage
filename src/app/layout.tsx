import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";
import { QueryProvider } from "@/components/query-provider";

export const metadata: Metadata = {
  title: "工作台系统 - 集成多种实用工具的一站式工作平台",
  description:
    "工作台系统为您提供 PPT 生成、OCR 文字识别、企业信息查询等强大功能,打造高效便捷的工作体验。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <div className="relative min-h-screen overflow-hidden bg-neutral-950">
              <div className="pointer-events-none absolute inset-0">
                <StarsBackground className="opacity-60" />
                <ShootingStars />
              </div>
              <div className="relative z-10 flex min-h-screen flex-col">
                <SiteHeader />
                <div className="flex-1">{children}</div>
                <SiteFooter />
              </div>
            </div>
            <Toaster richColors />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
