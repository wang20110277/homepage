"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();

  // Hide footer on login and home pages
  if (pathname === "/" || pathname === "/home" || pathname.startsWith("/tools/tianyancha")) {
    return null;
  }

  return (
    <footer className="border-t py-4 text-center text-sm text-muted-foreground">
      <div className="container mx-auto px-4">
        <p>工作台系统</p>
      </div>
    </footer>
  );
}
