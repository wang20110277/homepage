"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import type { Todo } from "@/types";
import { mockTodos } from "@/lib/mock-data";

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [todos] = useState<Todo[]>(mockTodos);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getTodosForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return todos.filter((todo) => todo.dueDate === dateStr);
  };

  const hasTodosOnDate = (date: Date) => {
    return getTodosForDate(date).length > 0;
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const today = new Date();
  const isCurrentMonth =
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();

  const monthName = currentDate.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
  });

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            日历
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={previousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthName}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground p-2"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="p-2" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const date = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              day
            );
            const isToday =
              isCurrentMonth && day === today.getDate();
            const hasTodos = hasTodosOnDate(date);
            const todosForDay = getTodosForDate(date);
            const incompleteTodosCount = todosForDay.filter(
              (t) => !t.completed
            ).length;

            return (
              <div
                key={day}
                className={`
                  relative p-2 text-center text-sm rounded-md cursor-pointer
                  transition-colors hover:bg-accent
                  ${isToday ? "bg-primary text-primary-foreground font-bold" : ""}
                  ${hasTodos && !isToday ? "font-medium" : ""}
                `}
              >
                <div>{day}</div>
                {hasTodos && incompleteTodosCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-xs"
                  >
                    {incompleteTodosCount}
                  </Badge>
                )}
                {hasTodos && incompleteTodosCount === 0 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-green-500" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Badge variant="destructive" className="h-4 min-w-4 px-1 text-xs">
              1
            </Badge>
            <span>待办事项数量</span>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>所有事项已完成</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
