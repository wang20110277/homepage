"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CometCard } from "@/components/ui/comet-card";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 任务截止日期示例
  const taskDueDates = [5, 12, 18, 25]; // 本月的某些日期有未完成任务

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === currentDate.getMonth() &&
    today.getFullYear() === currentDate.getFullYear();

  const monthNames = [
    "一月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "十一月", "十二月"
  ];
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <CometCard disableEffects>
      <Card className="border-white/10 bg-background/80 rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              日历
            </CardTitle>
            <div className="flex items-center gap-1">
              <button
                onClick={previousMonth}
                className="p-1 hover:bg-white/10 rounded"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium min-w-[80px] text-center">
                {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
              </span>
              <button
                onClick={nextMonth}
                className="p-1 hover:bg-white/10 rounded"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {weekDays.map((day) => (
              <div key={day} className="text-muted-foreground font-medium p-1">
                {day}
              </div>
            ))}
            {days.map((day, index) => {
              const isToday = isCurrentMonth && day === today.getDate();
              const hasTasks = day && taskDueDates.includes(day);

              return (
                <div
                  key={index}
                  className={cn(
                    "p-1 rounded aspect-square flex items-center justify-center",
                    day && "hover:bg-white/5 cursor-pointer",
                    isToday && "bg-primary/20 text-primary font-bold",
                    hasTasks && !isToday && "bg-destructive/20 text-destructive font-semibold",
                    !day && "opacity-0"
                  )}
                >
                  {day || ""}
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/20" />
              <span>今天</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-destructive/20" />
              <span>未完成任务截止日</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </CometCard>
  );
}
