"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CometCard } from "@/components/ui/comet-card";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export function TodoWidget() {
  const todos = [
    {
      id: 1,
      text: "查看今日报表",
      completed: false,
      dueDate: new Date(2025, 10, 25) // 2025-11-25
    },
    {
      id: 2,
      text: "准备项目演示",
      completed: false,
      dueDate: new Date(2025, 10, 18) // 2025-11-18
    },
    {
      id: 3,
      text: "团队会议",
      completed: true,
      dueDate: new Date(2025, 10, 12), // 2025-11-12
      completedAt: new Date(2025, 10, 12, 14, 30) // 2025-11-12 14:30
    },
  ];

  return (
    <CometCard disableEffects>
      <Card className="border-white/10 bg-background/80 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">待办事项</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todos.map((todo) => (
              <div key={todo.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  {todo.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm flex-1 ${
                      todo.completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {todo.text}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-6 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {todo.completed && todo.completedAt ? (
                    <span>
                      完成于 {format(todo.completedAt, "MM月dd日 HH:mm", { locale: zhCN })}
                    </span>
                  ) : (
                    <span>
                      截止 {format(todo.dueDate, "MM月dd日", { locale: zhCN })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </CometCard>
  );
}
