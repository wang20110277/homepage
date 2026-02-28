"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UserProfile } from "@/components/auth/user-profile";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { LayoutDashboard, Presentation, FolderOpen, Menu } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { ROUTES, isPPTRoute } from "@/config/routes";
import { GlobalAppsButton } from "@/components/open-webui/global-apps-button";

const navigation = [
  {
    name: "PPT生成",
    href: ROUTES.PPT_GENERATOR,
    icon: Presentation,
  },
  {
    name: "我的演示文稿",
    href: ROUTES.MY_PRESENTATIONS,
    icon: FolderOpen,
  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMounted, setIsMounted] = useState(false);
  const isHomePage = pathname === ROUTES.HOME;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if current page is PPT-related
  const isPPTPage = isPPTRoute(pathname);

  // Only show PPT navigation items on PPT pages
  const shouldShowPPTNav = !isHomePage && isPPTPage;

  // Don't show header on landing page or if pathname is not yet available
  if (!pathname || pathname === ROUTES.LANDING) {
    return null;
  }

  // 服务端渲染时显示占位符，避免 hydration 不匹配
  const userName = isMounted ? (session?.user?.name || "用户") : "用户";

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-gradient-to-r from-background via-primary/[0.02] to-background backdrop-blur-xl">
      {/* Logo Section - 绝对定位到最左边 */}
      <Link
        href={ROUTES.HOME}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-10 group flex items-center gap-3 transition-all duration-300"
      >
        {/* Icon */}
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 transition-all duration-300 group-hover:scale-105 group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/10">
          <LayoutDashboard className="h-5 w-5 text-primary transition-all duration-300 group-hover:scale-110" />
        </div>

        {/* Text */}
        <div className="flex flex-col">
          <span className="text-xl font-bold text-primary group-hover:text-primary/80 transition-colors duration-300">
            大模型服务平台
          </span>
          <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-primary to-accent transition-all duration-300" />
        </div>
      </Link>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left Section - Welcome/Navigation */}
        <div className="flex items-center gap-8 flex-1">
          {/* Welcome message - Only show on home page */}
          {isHomePage && (
            <div className="hidden lg:flex items-center gap-6 ml-48">
              {/* Separator */}
              <div className="h-10 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

              <div className="flex items-baseline gap-2.5">
                <span className="text-sm text-muted-foreground">
                  欢迎回来，
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {userName}
                </span>
                <span className="text-xs text-muted-foreground/60">·</span>
                <span className="text-sm text-muted-foreground/90">
                  您的工作台
                </span>
                <span className="text-base">✨</span>
              </div>
            </div>
          )}

          {/* Desktop Navigation - Only show on PPT pages */}
          {shouldShowPPTNav && (
            <nav className="hidden md:flex items-center gap-1 ml-48">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Center Section - 全部应用按钮 */}
        <div className="flex items-center justify-center">
          <GlobalAppsButton />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <ModeToggle />
          <UserProfile />

          {/* Mobile Menu - Only show on PPT pages */}
          {shouldShowPPTNav && (
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">打开菜单</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>导航菜单</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      pathname?.startsWith(item.href + "/");

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
}
