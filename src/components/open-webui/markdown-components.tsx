"use client";

import React from "react";
import { CodeBlock } from "@/components/ui/code-block";

/**
 * Markdown component configuration for ReactMarkdown
 * Provides custom styling and behavior for markdown elements
 */
export function getMarkdownComponents() {
  return {
    code: (props: React.ComponentPropsWithoutRef<"code">) => {
      const { inline, className, children } = props as {
        inline?: boolean;
        className?: string;
        children?: React.ReactNode;
      };
      return (
        <CodeBlock inline={inline} className={className}>
          {String(children)}
        </CodeBlock>
      );
    },
    p: ({ children, ...props }: React.ComponentPropsWithoutRef<"p">) => {
      // 检查子元素中是否包含代码块
      const hasCodeBlock = React.Children.toArray(children).some(
        (child) => {
          if (React.isValidElement(child)) {
            const childProps = child.props as { className?: string };
            return childProps?.className?.includes("language-");
          }
          return false;
        }
      );

      // 如果包含代码块，直接返回 fragment 避免嵌套错误
      if (hasCodeBlock) {
        return <>{children}</>;
      }

      return <p className="my-2 leading-relaxed text-foreground" {...props}>{children}</p>;
    },
    // 链接
    a: ({ ...props }: React.ComponentPropsWithoutRef<"a">) => (
      <a
        className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    ),
    // 标题
    h1: ({ ...props }: React.ComponentPropsWithoutRef<"h1">) => (
      <h1 className="text-2xl font-bold mt-6 mb-3 text-foreground" {...props} />
    ),
    h2: ({ ...props }: React.ComponentPropsWithoutRef<"h2">) => (
      <h2 className="text-xl font-bold mt-5 mb-3 text-foreground" {...props} />
    ),
    h3: ({ ...props }: React.ComponentPropsWithoutRef<"h3">) => (
      <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />
    ),
    h4: ({ ...props }: React.ComponentPropsWithoutRef<"h4">) => (
      <h4 className="text-base font-semibold mt-3 mb-2 text-foreground" {...props} />
    ),
    h5: ({ ...props }: React.ComponentPropsWithoutRef<"h5">) => (
      <h5 className="text-sm font-semibold mt-3 mb-2 text-foreground" {...props} />
    ),
    h6: ({ ...props}: React.ComponentPropsWithoutRef<"h6">) => (
      <h6 className="text-sm font-semibold mt-2 mb-2 text-foreground" {...props} />
    ),
    // 列表
    ul: ({ ...props }: React.ComponentPropsWithoutRef<"ul">) => (
      <ul className="list-disc list-inside space-y-1 my-3 ml-4" {...props} />
    ),
    ol: ({ ...props }: React.ComponentPropsWithoutRef<"ol">) => (
      <ol className="list-decimal list-inside space-y-1 my-3 ml-4" {...props} />
    ),
    li: ({ ...props }: React.ComponentPropsWithoutRef<"li">) => (
      <li className="text-foreground leading-relaxed" {...props} />
    ),
    // 引用块
    blockquote: ({ ...props }: React.ComponentPropsWithoutRef<"blockquote">) => (
      <blockquote className="border-l-4 border-primary pl-4 py-2 my-3 bg-accent italic text-foreground" {...props} />
    ),
    // 强调
    strong: ({ ...props }: React.ComponentPropsWithoutRef<"strong">) => (
      <strong className="font-bold text-foreground" {...props} />
    ),
    em: ({ ...props }: React.ComponentPropsWithoutRef<"em">) => (
      <em className="italic text-foreground" {...props} />
    ),
    // 删除线 (GitHub Flavored Markdown)
    del: ({ ...props }: React.ComponentPropsWithoutRef<"del">) => (
      <del className="line-through text-muted-foreground" {...props} />
    ),
    // 水平线
    hr: ({ ...props }: React.ComponentPropsWithoutRef<"hr">) => (
      <hr className="border-border my-4" {...props} />
    ),
    // 表格
    table: ({ ...props }: React.ComponentPropsWithoutRef<"table">) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-border" {...props} />
      </div>
    ),
    thead: ({ ...props }: React.ComponentPropsWithoutRef<"thead">) => (
      <thead className="bg-muted" {...props} />
    ),
    tbody: ({ ...props }: React.ComponentPropsWithoutRef<"tbody">) => (
      <tbody className="divide-y divide-border bg-background" {...props} />
    ),
    tr: ({ ...props }: React.ComponentPropsWithoutRef<"tr">) => (
      <tr className="hover:bg-muted/50 transition-colors" {...props} />
    ),
    th: ({ ...props }: React.ComponentPropsWithoutRef<"th">) => (
      <th className="px-4 py-2 text-left text-xs font-medium text-foreground uppercase tracking-wider" {...props} />
    ),
    td: ({ ...props }: React.ComponentPropsWithoutRef<"td">) => (
      <td className="px-4 py-2 text-sm text-foreground" {...props} />
    ),
  };
}
