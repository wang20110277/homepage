"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
} from "lucide-react";
import { TodoDialog } from "./todo-dialog";
import type { Todo } from "@/types";
import { mockTodos } from "@/lib/mock-data";

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>(mockTodos);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | undefined>();

  const handleToggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleDeleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setDialogOpen(true);
  };

  const handleAddTodo = () => {
    setEditingTodo(undefined);
    setDialogOpen(true);
  };

  const handleSaveTodo = (todoData: Partial<Todo>) => {
    if (todoData.id) {
      // Edit existing todo
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === todoData.id ? { ...todo, ...todoData } : todo
        )
      );
    } else {
      // Add new todo
      const newTodo: Todo = {
        id: `todo-${Date.now()}`,
        title: todoData.title!,
        description: todoData.description,
        completed: false,
        dueDate: todoData.dueDate,
        createdAt: new Date().toISOString(),
        userId: "test-user-001",
      };
      setTodos((prev) => [newTodo, ...prev]);
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  };

  const pendingCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              待办事项
            </CardTitle>
            <Button size="sm" onClick={handleAddTodo}>
              <Plus className="h-4 w-4 mr-1" />
              添加
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">
              待完成: {pendingCount}
            </Badge>
            <Badge variant="outline">
              已完成: {completedCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {todos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Circle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无待办事项</p>
                <p className="text-sm">点击上方&ldquo;添加&rdquo;按钮创建新的待办</p>
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => handleToggleTodo(todo.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-medium ${
                        todo.completed
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {todo.title}
                    </div>
                    {todo.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {todo.description}
                      </div>
                    )}
                    {todo.dueDate && (
                      <div className="flex items-center gap-1 mt-2">
                        <Calendar className="h-3 w-3" />
                        <span
                          className={`text-xs ${
                            isOverdue(todo.dueDate) && !todo.completed
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatDate(todo.dueDate)}
                          {isOverdue(todo.dueDate) &&
                            !todo.completed &&
                            " (已逾期)"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditTodo(todo)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTodo(todo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <TodoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        todo={editingTodo}
        onSave={handleSaveTodo}
      />
    </>
  );
}
