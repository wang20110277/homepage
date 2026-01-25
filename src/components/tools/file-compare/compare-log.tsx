"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { ProcessLog } from "@/lib/api/file-compare";

interface CompareLogProps {
  /** Array of process log entries */
  logs: ProcessLog[];
  /** Optional className for styling */
  className?: string;
}

/**
 * ProcessLog display component
 *
 * Shows timestamped log entries with appropriate icons and colors
 * based on the log type (info, success, error, warning).
 */
export function CompareLog({ logs, className }: CompareLogProps) {
  if (logs.length === 0) {
    return null;
  }

  const getLogIcon = (type: ProcessLog["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getLogColor = (type: ProcessLog["type"]) => {
    switch (type) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getLogBgColor = (type: ProcessLog["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-50 dark:bg-green-950/30";
      case "error":
        return "bg-red-50 dark:bg-red-950/30";
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-950/30";
      default:
        return "bg-muted/30";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-semibold text-foreground">
        处理日志 ({logs.length})
      </h3>
      <ScrollArea className="h-64 w-full rounded-md border">
        <div className="p-4 space-y-1">
          {logs.map((log, index) => (
            <div
              key={`${log.timestamp}-${index}`}
              className={cn(
                "flex items-start gap-2 rounded px-3 py-2 text-sm",
                getLogBgColor(log.type)
              )}
            >
              <span className={cn("mt-0.5 flex-shrink-0", getLogColor(log.type))}>
                {getLogIcon(log.type)}
              </span>
              {log.timestamp && (
                <span className="flex-shrink-0 font-mono text-xs text-muted-foreground">
                  [{log.timestamp}]
                </span>
              )}
              <span className={cn("flex-1", getLogColor(log.type))}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
