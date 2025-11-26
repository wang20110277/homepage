"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CometCard } from "@/components/ui/comet-card";
import { Bell } from "lucide-react";

export function AnnouncementsWidget() {
  const announcements = [
    {
      id: 1,
      title: "系统维护通知",
      date: "2025-11-18",
    },
    {
      id: 2,
      title: "新功能上线",
      date: "2025-11-15",
    },
  ];

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
            {announcements.map((announcement) => (
              <div key={announcement.id}>
                <p className="text-sm font-medium text-foreground">
                  {announcement.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {announcement.date}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </CometCard>
  );
}
