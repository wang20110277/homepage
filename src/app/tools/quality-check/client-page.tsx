"use client";

import * as React from "react";
import { useState, useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Search, FileSearch, ChevronsLeft, ChevronsRight } from "lucide-react";
import { toast } from "sonner";
import type { QualityAuditResult } from "@/types";

type QueryField = "coll_id" | "date_folder" | "score" | "deductions";

interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const fieldLabels: Record<QueryField, string> = {
  coll_id: "催收员ID",
  date_folder: "日期文件夹",
  score: "分数",
  deductions: "扣分项",
};

export default function QualityCheckClient() {
  const [selectedField, setSelectedField] = useState<QueryField>("coll_id");
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<QualityAuditResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [jumpToPage, setJumpToPage] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSearch = async (
    event?: FormEvent<HTMLFormElement>,
    page = 1,
    newPageSize?: number
  ) => {
    event?.preventDefault();

    if (!searchValue.trim()) {
      toast.error("请输入查询值");
      return;
    }

    // 取消上一个正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    // 不立即清空结果，避免闪烁

    try {
      const currentPageSize = newPageSize || pagination.pageSize;
      const params = new URLSearchParams({
        field: selectedField,
        value: searchValue.trim(),
        page: page.toString(),
        pageSize: currentPageSize.toString(),
      });

      const response = await fetch(`/api/quality-check?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      // 检查响应类型，确保是 JSON
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        // 如果不是 JSON，可能是会话过期导致重定向到登录页
        if (response.status === 401) {
          throw new Error("会话已过期，请重新登录");
        }
        throw new Error("服务器响应异常，请刷新页面重试");
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "查询失败");
      }

      // 更新状态
      if (data.data.total === 0) {
        setError("未找到匹配的记录");
        setResults([]);
        toast.info("未找到匹配的记录");
        setPagination({
          total: 0,
          page: 1,
          pageSize: currentPageSize,
          totalPages: 0,
        });
      } else {
        setResults(data.data.records);
        setPagination({
          total: data.data.total,
          page: data.data.page,
          pageSize: data.data.pageSize,
          totalPages: data.data.totalPages,
        });
        // 只在首次查询时显示成功消息
        if (page === 1 && !newPageSize) {
          toast.success(`查询成功，共找到 ${data.data.total} 条记录`);
        }
      }
    } catch (err) {
      // 忽略取消请求的错误
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : "查询失败，请稍后重试";
      setError(message);
      setResults([]);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (isLoading) return; // 防止重复请求
    handleSearch(undefined, newPage);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    if (isLoading) return; // 防止重复请求
    const size = parseInt(newPageSize, 10);
    setPagination((prev) => ({ ...prev, pageSize: size }));
    // 当改变每页数量时，重新从第一页开始查询
    handleSearch(undefined, 1, size);
  };

  const handleJumpToPage = () => {
    if (isLoading) return; // 防止重复请求
    const targetPage = parseInt(jumpToPage, 10);
    if (
      !isNaN(targetPage) &&
      targetPage >= 1 &&
      targetPage <= pagination.totalPages
    ) {
      handlePageChange(targetPage);
      setJumpToPage("");
    } else {
      toast.error(`请输入 1 到 ${pagination.totalPages} 之间的页码`);
    }
  };

  // 计算当前显示的记录范围
  const getRecordRange = () => {
    if (pagination.total === 0) return { start: 0, end: 0 };
    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(pagination.page * pagination.pageSize, pagination.total);
    return { start, end };
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col space-y-10 px-6 pb-10 pt-20 md:px-8">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight">质检结果查询</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          选择查询字段，输入查询值，即可查询质检结果数据库中的记录
        </p>
      </header>

      <section className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <form className="space-y-5" onSubmit={handleSearch}>
              <div className="grid gap-5 md:grid-cols-[200px_1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="field" className="text-base font-medium">
                    查询字段
                  </Label>
                  <Select
                    value={selectedField}
                    onValueChange={(value) => setSelectedField(value as QueryField)}
                  >
                    <SelectTrigger id="field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(fieldLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="searchValue" className="text-base font-medium">
                    查询值
                  </Label>
                  <Input
                    id="searchValue"
                    placeholder={`请输入${fieldLabels[selectedField]}`}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="flex items-end">
                  <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    查询
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {results.length > 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">查询结果</h2>
                    {isLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>加载中...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      显示第 {getRecordRange().start}-{getRecordRange().end} 条，共{" "}
                      {pagination.total} 条记录
                    </span>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="pageSize" className="text-sm whitespace-nowrap">
                        每页显示
                      </Label>
                      <Select
                        value={pagination.pageSize.toString()}
                        onValueChange={handlePageSizeChange}
                      >
                        <SelectTrigger id="pageSize" className="h-8 w-[80px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm">条</span>
                    </div>
                  </div>
                </div>
                <TooltipProvider>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">ID</TableHead>
                          <TableHead>催收员ID</TableHead>
                          <TableHead>日期文件夹</TableHead>
                          <TableHead className="w-[100px]">分数</TableHead>
                          <TableHead>扣分项</TableHead>
                          <TableHead>文件名</TableHead>
                          <TableHead className="w-[180px]">处理时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((result) => (
                          <TableRow key={result.id}>
                            <TableCell className="font-medium">{result.id}</TableCell>
                            <TableCell>{result.collId || "-"}</TableCell>
                            <TableCell>{result.dateFolder || "-"}</TableCell>
                            <TableCell>{result.score !== null ? result.score : "-"}</TableCell>
                            <TableCell className="max-w-[300px]">
                              {result.deductions && result.deductions.length > 30 ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help truncate block">
                                      {result.deductions}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-md">
                                    <p className="whitespace-pre-wrap break-words">
                                      {result.deductions}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                result.deductions || "-"
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {result.txtFilename && result.txtFilename.length > 25 ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help truncate block">
                                      {result.txtFilename}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{result.txtFilename}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                result.txtFilename || "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {result.processedAt
                                ? new Date(result.processedAt).toLocaleString("zh-CN", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TooltipProvider>

                {pagination.totalPages > 1 && (
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                    <Pagination>
                      <PaginationContent>
                        {/* 首页按钮 */}
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(1)}
                            disabled={pagination.page === 1}
                            className="h-9 gap-1 px-2"
                          >
                            <ChevronsLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">首页</span>
                          </Button>
                        </PaginationItem>

                        {/* 上一页按钮 */}
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (pagination.page > 1) {
                                handlePageChange(pagination.page - 1);
                              }
                            }}
                            className={
                              pagination.page === 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>

                        {/* 页码导航 */}
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                          .filter((pageNum) => {
                            // 显示逻辑：第一页、最后一页、当前页及其前后各一页
                            return (
                              pageNum === 1 ||
                              pageNum === pagination.totalPages ||
                              Math.abs(pageNum - pagination.page) <= 1
                            );
                          })
                          .map((pageNum, index, array) => {
                            // 如果相邻页码不连续，显示省略号
                            const showEllipsisBefore =
                              index > 0 && pageNum - array[index - 1]! > 1;

                            return (
                              <React.Fragment key={pageNum}>
                                {showEllipsisBefore && (
                                  <PaginationItem>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handlePageChange(pageNum);
                                    }}
                                    isActive={pagination.page === pageNum}
                                    className="cursor-pointer"
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              </React.Fragment>
                            );
                          })}

                        {/* 下一页按钮 */}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (pagination.page < pagination.totalPages) {
                                handlePageChange(pagination.page + 1);
                              }
                            }}
                            className={
                              pagination.page === pagination.totalPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>

                        {/* 尾页按钮 */}
                        <PaginationItem>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.totalPages)}
                            disabled={pagination.page === pagination.totalPages}
                            className="h-9 gap-1 px-2"
                          >
                            <span className="hidden sm:inline">尾页</span>
                            <ChevronsRight className="h-4 w-4" />
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>

                    {/* 跳转到指定页 */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor="jumpToPage" className="text-sm whitespace-nowrap">
                        跳转到
                      </Label>
                      <Input
                        id="jumpToPage"
                        type="number"
                        min="1"
                        max={pagination.totalPages}
                        value={jumpToPage}
                        onChange={(e) => setJumpToPage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleJumpToPage();
                          }
                        }}
                        placeholder="页码"
                        className="h-9 w-20 text-center"
                      />
                      <span className="text-sm text-muted-foreground">页</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleJumpToPage}
                        className="h-9"
                      >
                        跳转
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <Alert variant="destructive" className="w-full max-w-md">
                <AlertTitle>查询结果</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card className="min-h-[300px]">
            <CardContent className="flex h-full items-center justify-center gap-3 p-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              正在查询，请稍候...
            </CardContent>
          </Card>
        ) : (
          <Card className="min-h-[300px]">
            <CardContent className="flex h-full items-center justify-center p-6">
              <div className="space-y-3 text-center text-sm text-muted-foreground">
                <FileSearch className="mx-auto h-8 w-8 text-primary" />
                <p className="text-base font-medium text-foreground">等待查询</p>
                <p>选择查询字段并输入查询值，即可查看匹配的质检结果记录</p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
