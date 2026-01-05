"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CometCard } from "@/components/ui/comet-card";
import { Bell } from "lucide-react";
import { mockAnnouncements } from "@/lib/mock-data";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AnnouncementsWidget() {
  // 只显示最新的公告
  const latestAnnouncement = mockAnnouncements[0];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <CometCard disableEffects>
      <Card className="border-white/10 bg-background/80 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            公告
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                {latestAnnouncement.title}
              </p>
              <div className="text-xs text-muted-foreground mb-2 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0 text-xs leading-relaxed">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground text-sm block mb-1">
                        {children}
                      </strong>
                    ),
                    hr: () => <hr className="my-3 border-border opacity-30" />,
                    ul: ({ children }) => (
                      <ul className="space-y-1 ml-0 text-xs">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="text-xs leading-relaxed flex items-start gap-2">
                        <span className="text-foreground mt-1 select-none">•</span>
                        <span className="flex-1">{children}</span>
                      </li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-0 pl-0 my-2 opacity-50">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {latestAnnouncement.content}
                </ReactMarkdown>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(latestAnnouncement.publishedAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </CometCard>
  );
}
