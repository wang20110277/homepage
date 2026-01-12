"use client";

import * as React from "react";
import { useState, type FormEvent } from "react";
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
import { Loader2, Search, FileSearch } from "lucide-react";
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

  const handleSearch = async (event?: FormEvent<HTMLFormElement>, page = 1) => {
    event?.preventDefault();

    if (!searchValue.trim()) {
      toast.error("请输入查询值");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const params = new URLSearchParams({
        field: selectedField,
        value: searchValue.trim(),
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      const response = await fetch(`/api/quality-check?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "查询失败");
      }

      if (data.data.total === 0) {
        setError("未找到匹配的记录");
        toast.info("未找到匹配的记录");
        setPagination({
          total: 0,
          page: 1,
          pageSize: pagination.pageSize,
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
        toast.success(`查询成功，共找到 ${data.data.total} 条记录`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "查询失败，请稍后重试";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    handleSearch(undefined, newPage);
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

        {isLoading ? (
          <Card className="min-h-[300px]">
            <CardContent className="flex h-full items-center justify-center gap-3 p-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              正在查询，请稍候...
            </CardContent>
          </Card>
        ) : results.length > 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">查询结果</h2>
                  <span className="text-sm text-muted-foreground">
                    共 {pagination.total} 条记录，第 {pagination.page}/{pagination.totalPages} 页
                  </span>
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
                  <Pagination>
                    <PaginationContent>
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
                    </PaginationContent>
                  </Pagination>
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
