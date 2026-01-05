"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

interface CodeBlockProps {
  children?: string;
  className?: string;
  inline?: boolean;
}

export function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();

  // 从 className 中提取语言信息，格式为 "language-xxx"
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  const codeString = String(children || "").replace(/\n$/, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 判断是否为行内代码：
  // 1. inline 明确为 true
  // 2. 或者没有语言标识（className 中没有 language-）
  const isInline = inline === true || (!language && !inline);

  // 获取语法高亮样式，并移除背景色避免冲突
  const getSyntaxStyle = () => {
    const baseStyle = theme === "dark" ? vscDarkPlus : vs;
    return {
      ...baseStyle,
      'pre[class*="language-"]': {
        ...baseStyle['pre[class*="language-"]'],
        background: 'transparent',
        backgroundColor: 'transparent',
      }
    };
  };

  // 如果是行内代码，使用简单的 code 标签
  if (isInline) {
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground border border-border">
        {children}
      </code>
    );
  }

  // 如果没有语言标识，使用简单的代码块
  if (!language) {
    return (
      <div className="relative my-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-muted">
          <span className="text-xs text-muted-foreground">Code</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <pre className="overflow-x-auto p-4">
          <code className="text-sm text-foreground font-mono">{codeString}</code>
        </pre>
      </div>
    );
  }

  // 带语法高亮的代码块
  return (
    <div className="relative my-4 rounded-lg bg-muted/50 border border-border overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-muted">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {language}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              <span className="text-xs">已复制</span>
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              <span className="text-xs">复制</span>
            </>
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={getSyntaxStyle()}
        customStyle={{
          margin: 0,
          padding: "1rem",
          fontSize: "0.875rem",
          background: "hsl(var(--muted))",
          backgroundColor: "hsl(var(--muted))",
        }}
        codeTagProps={{
          style: {
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            background: "transparent",
          },
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
}
