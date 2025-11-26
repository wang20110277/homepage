import { cn } from "@/lib/utils";

/**
 * Skeleton 骨架屏组件
 *
 * 用于在内容加载时显示占位符，提供更好的用户体验。
 * 使用 shimmer 动画效果，自动适应暗色模式。
 *
 * @example
 * ```tsx
 * <Skeleton className="h-12 w-12 rounded-full" />
 * <Skeleton className="h-4 w-[250px]" />
 * ```
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-shimmer rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
