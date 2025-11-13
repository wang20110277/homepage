"use client";

import { useSession } from "@/lib/auth-client";
import { UserProfile } from "@/components/auth/user-profile";
import { Lock } from "lucide-react";
import { DigitalClock } from "@/components/dashboard/digital-clock";
import { TodoList } from "@/components/dashboard/todo-list";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { AnnouncementBoard } from "@/components/dashboard/announcement-board";
import { ToolCards } from "@/components/dashboard/tool-cards";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8">
            <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">受保护的页面</h1>
            <p className="text-muted-foreground mb-6">
              您需要登录才能访问工作台
            </p>
          </div>
          <UserProfile />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">欢迎回来, {session.user.name}!</h1>
        <p className="text-muted-foreground">
          这是您的个人工作台，管理待办事项、查看公告并使用各种工具。
        </p>
      </div>

      <Separator />

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Clock */}
        <div className="md:col-span-2 lg:col-span-1">
          <DigitalClock />
        </div>

        {/* Todo List */}
        <div className="md:col-span-2 lg:col-span-2">
          <TodoList />
        </div>

        {/* Calendar */}
        <div className="md:col-span-1 lg:col-span-1">
          <CalendarView />
        </div>

        {/* Announcement Board */}
        <div className="md:col-span-1 lg:col-span-2">
          <AnnouncementBoard />
        </div>
      </div>

      <Separator />

      {/* Tools Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">工具中心</h2>
          <p className="text-muted-foreground">
            选择一个工具开始使用
          </p>
        </div>
        <ToolCards />
      </div>
    </div>
  );
}
