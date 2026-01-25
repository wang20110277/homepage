"use client";

import { useState, useMemo } from "react";
import type { ToolId } from "@/lib/rbac";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CometCard } from "@/components/ui/comet-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Grid3x3, X, Presentation, ScanText, Building2, ClipboardCheck, GitCompare } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// 工具图标和颜色配置 - 与 home-shell 保持一致
const toolConfig: Record<
  ToolId,
  {
    icon: LucideIcon;
    color: string;
    bgColor: string;
    gradientFrom: string;
    gradientTo: string;
    borderGlow: string;
  }
> = {
  ppt: {
    icon: Presentation,
    color: "text-tool-blue",
    bgColor: "bg-tool-blue/10",
    gradientFrom: "from-tool-blue/20",
    gradientTo: "to-tool-blue/5",
    borderGlow: "group-hover:shadow-tool-blue/50",
  },
  ocr: {
    icon: ScanText,
    color: "text-tool-green",
    bgColor: "bg-tool-green/10",
    gradientFrom: "from-tool-green/20",
    gradientTo: "to-tool-green/5",
    borderGlow: "group-hover:shadow-tool-green/50",
  },
  tianyancha: {
    icon: Building2,
    color: "text-tool-purple",
    bgColor: "bg-tool-purple/10",
    gradientFrom: "from-tool-purple/20",
    gradientTo: "to-tool-purple/5",
    borderGlow: "group-hover:shadow-tool-purple/50",
  },
  qualityCheck: {
    icon: ClipboardCheck,
    color: "text-tool-orange",
    bgColor: "bg-tool-orange/10",
    gradientFrom: "from-tool-orange/20",
    gradientTo: "to-tool-orange/5",
    borderGlow: "group-hover:shadow-tool-orange/50",
  },
  fileCompare: {
    icon: GitCompare,
    color: "text-tool-pink",
    bgColor: "bg-tool-pink/10",
    gradientFrom: "from-tool-pink/20",
    gradientTo: "to-tool-pink/5",
    borderGlow: "group-hover:shadow-tool-pink/50",
  },
};

// 应用分类
export const toolCategories = {
  contentCreation: {
    id: "contentCreation" as const,
    name: "内容创作",
    description: "快速生成各类文档和内容",
  },
  dataQuery: {
    id: "dataQuery" as const,
    name: "数据查询",
    description: "企业信息和数据检索",
  },
  review: {
    id: "review" as const,
    name: "审核流程",
    description: "质检和审核相关工具",
  },
  all: {
    id: "all" as const,
    name: "全部应用",
    description: "所有可用工具",
  },
} as const;

export type ToolCategoryId = (typeof toolCategories)[keyof typeof toolCategories]["id"];

// 工具分类映射
const toolCategoryMap: Record<ToolId, ToolCategoryId> = {
  ppt: "contentCreation",
  ocr: "contentCreation",
  tianyancha: "dataQuery",
  qualityCheck: "review",
  fileCompare: "contentCreation",
};

export interface ToolStatus {
  id: ToolId;
  name: string;
  description: string;
  href: string;
  access: {
    allowed: boolean;
    reason?: string | null;
  };
}

interface AppsDrawerProps {
  tools: ToolStatus[];
  children?: React.ReactNode;
  trigger?: React.ReactNode;
}

export function AppsDrawer({ tools, children, trigger }: AppsDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ToolCategoryId>("all");

  // 过滤工具
  const filteredTools = useMemo(() => {
    let result = tools;

    // 按分类过滤
    if (selectedCategory !== "all") {
      result = result.filter((tool) => toolCategoryMap[tool.id] === selectedCategory);
    }

    // 按搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (tool) =>
          tool.name.toLowerCase().includes(query) ||
          tool.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [tools, searchQuery, selectedCategory]);

  // 只显示有权限的工具数量
  const accessibleToolsCount = tools.filter((t) => t.access.allowed).length;

  const handleToolClick = (tool: ToolStatus) => {
    if (tool.access.allowed) {
      router.push(tool.href);
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || children || (
          <button
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
          >
            <Grid3x3 className="h-5 w-5" />
            <div className="text-left flex-1">
              <div className="text-sm font-medium">全部应用</div>
              <div className="text-xs text-muted-foreground">
                {accessibleToolsCount} 个可用
              </div>
            </div>
          </button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col"
      >
        {/* 头部 */}
        <SheetHeader className="p-6 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl">应用中心</SheetTitle>
              <SheetDescription className="text-sm mt-1">
                共 {accessibleToolsCount} 个可用应用
              </SheetDescription>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索应用..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </SheetHeader>

        <Separator />

        {/* 分类标签 */}
        <div className="px-6 py-3 flex gap-2 flex-wrap">
          {Object.values(toolCategories).map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        <Separator />

        {/* 应用网格 */}
        <ScrollArea className="flex-1 px-6 py-4">
          {filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">未找到匹配的应用</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredTools.map((tool) => {
                const disabled = !tool.access.allowed;
                const config = toolConfig[tool.id];

                if (!config || !config.icon) {
                  return null;
                }

                const Icon = config.icon;

                return (
                  <CometCard key={tool.id} disableEffects>
                    <div className="relative group">
                      {/* Gradient glow background */}
                      {!disabled && (
                        <div
                          className={cn(
                            "absolute -inset-0.5 bg-gradient-to-r rounded-xl opacity-0 group-hover:opacity-100 blur-sm transition-all duration-500 ease-out",
                            config.gradientFrom,
                            config.gradientTo
                          )}
                          aria-hidden="true"
                        />
                      )}

                      {/* Main card */}
                      <div
                        onClick={() => handleToolClick(tool)}
                        className={cn(
                          "relative overflow-hidden rounded-xl transition-all duration-300 ease-out",
                          "border bg-background/80",
                          "border-white/10 dark:border-white/10",
                          disabled
                            ? "cursor-not-allowed opacity-60"
                            : cn(
                                "cursor-pointer",
                                "group-hover:scale-[1.02]",
                                "group-hover:shadow-lg",
                                "group-hover:border-white/20",
                                config.borderGlow
                              )
                        )}
                      >
                        <div className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div className="relative flex-shrink-0">
                              <div
                                className={cn(
                                  "w-12 h-12 rounded-xl flex items-center justify-center",
                                  config.bgColor,
                                  !disabled && cn(
                                    "transition-all duration-300 ease-out",
                                    "group-hover:scale-110",
                                    "group-hover:rotate-3"
                                  )
                                )}
                              >
                                <Icon
                                  className={cn(
                                    "h-6 w-6",
                                    config.color,
                                    !disabled && "transition-transform duration-300 group-hover:scale-110"
                                  )}
                                />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3
                                  className={cn(
                                    "font-semibold text-base truncate transition-colors",
                                    !disabled && "group-hover:text-primary"
                                  )}
                                >
                                  {tool.name}
                                </h3>
                                {disabled && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    无权限
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                {tool.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CometCard>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// 快速搜索对话框（用于 Cmd+K）
export function AppSearchDialog({ tools }: { tools: ToolStatus[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // 过滤可访问的工具
  const accessibleTools = useMemo(() => {
    return tools.filter((t) => t.access.allowed);
  }, [tools]);

  // 搜索结果
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return accessibleTools;

    const query = searchQuery.toLowerCase();
    return accessibleTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.id.toLowerCase().includes(query)
    );
  }, [accessibleTools, searchQuery]);

  const handleSelect = (tool: ToolStatus) => {
    router.push(tool.href);
    setSearchQuery("");
  };

  return (
    <div className="relative">
      <Command className="rounded-lg border shadow-md">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <CommandInput
            placeholder="输入应用名称或描述..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-0 focus:ring-0"
          />
        </div>
        <CommandList>
          <CommandEmpty>
            {searchQuery ? "未找到匹配的应用" : "开始输入搜索应用..."}
          </CommandEmpty>
          <CommandGroup heading="可用应用">
            {searchResults.map((tool) => {
              const config = toolConfig[tool.id];
              const Icon = config?.icon;
              return (
                <CommandItem
                  key={tool.id}
                  onSelect={() => handleSelect(tool)}
                  className="cursor-pointer"
                >
                  {Icon && (
                    <Icon className={cn("mr-2 h-4 w-4", config?.color)} />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{tool.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {tool.description}
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
