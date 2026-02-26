"use client";

import { useState, useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import type { CompanyInfo } from "@/types";
import { CompanyInfoCard } from "@/components/tools/company-info-card";

const queryOptions = [
  { id: "basicInfo", label: "企业基本信息" },
  { id: "financialInfo", label: "财务信息" },
  { id: "shareholding", label: "股权结构" },
  { id: "litigation", label: "诉讼信息" },
  { id: "personnel", label: "人员相关" },
] as const;

type QueryOptionId = (typeof queryOptions)[number]["id"];
type QuerySelection = Record<QueryOptionId, boolean>;

const CHANNEL_REPORT_LABEL = "渠道准入尽调报告";

// 报告缓存类型
interface ReportCache {
  blob: Blob;
  filename: string;
  generatedAt: Date;
  companyName: string;
}

// 空数据占位组件
function NoDataPlaceholder({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="flex h-32 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-base font-medium">无</p>
          <p className="text-xs mt-1">{title}暂无数据</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TianyanchaToolPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<QuerySelection>(() =>
    queryOptions.reduce((acc, option) => {
      acc[option.id] = true;
      return acc;
    }, {} as QuerySelection),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  // 报告缓存 - 使用 useRef 存储在内存中，页面刷新/关闭后自动清除
  const reportCacheRef = useRef<ReportCache | null>(null);

  // 从缓存下载报告
  const downloadFromCache = (cache: ReportCache) => {
    const url = window.URL.createObjectURL(cache.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cache.filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // 调用搜索 API 验证企业是否存在
  const searchCompanyApi = async (companyName: string) => {
    const response = await fetch("/api/tianyancha/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_name: companyName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMsg = errorData.error?.message || `请求失败 (${response.status})`;

      if (response.status === 404 || errorData.error?.code === "COMPANY_NOT_FOUND") {
        errorMsg = `未找到企业「${companyName}」的相关信息，请检查企业名称是否正确`;
      }

      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data.data;
  };

  // 调用生成报告 API
  const generateReportApi = async (companyName: string): Promise<ReportCache> => {
    const response = await fetch("/api/tianyancha/generate-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_name: companyName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMsg = errorData.error?.detail || errorData.error?.message || `请求失败 (${response.status})`;

      if (errorMsg.includes('未找到') || errorMsg.includes('不存在') || errorMsg.includes('API返回错误')) {
        errorMsg = `未找到企业「${companyName}」的相关信息，请检查企业名称是否正确`;
      }

      throw new Error(errorMsg);
    }

    const blob = await response.blob();
    const cache: ReportCache = {
      blob,
      filename: `${companyName}_企业报告.docx`,
      generatedAt: new Date(),
      companyName,
    };

    return cache;
  };

  const runSearch = async (term: string) => {
    setIsLoading(true);
    setError(null);
    setCompany(null);
    setReportDialogOpen(false);
    reportCacheRef.current = null;

    const companyName = term.trim();

    if (!companyName) {
      setIsLoading(false);
      setError("请输入企业名称");
      toast.warning("请输入企业名称");
      return;
    }

    const toastId = toast.loading("正在查询企业...");

    try {
      // 1. 先调用搜索 API 验证企业是否存在
      const companyData = await searchCompanyApi(companyName);

      // 2. 企业存在，创建公司信息对象
      const companyInfo: CompanyInfo = {
        id: `company-${Date.now()}`,
        name: companyName,
        legalRepresentative: companyData.legalRepresentative || "-",
        registeredCapital: companyData.registeredCapital || "-",
        establishDate: companyData.establishDate || "-",
        status: companyData.status === "存续" ? "active" : "cancelled",
        creditCode: companyData.creditCode || "-",
        registeredAddress: "-",
        businessInfo: {
          companyType: "-",
          operatingPeriod: "-",
          registrationAuthority: "-",
          approvalDate: "-",
          organizationCode: "-",
        },
        shareholders: [],
        changeRecords: [],
        businessScope: "-",
      };

      setCompany(companyInfo);
      toast.dismiss(toastId);
      toast.success(`已找到企业：${companyName}`);

      // 3. 后台生成报告并缓存
      toast.loading("正在生成报告...", { id: "generating-report" });
      try {
        const cache = await generateReportApi(companyName);
        reportCacheRef.current = cache;
        toast.dismiss("generating-report");
        toast.success("报告已生成，可随时下载");
      } catch (reportError) {
        toast.dismiss("generating-report");
        // 报告生成失败，但企业确实存在
        const reportErrorMsg = reportError instanceof Error ? reportError.message : "报告生成失败";
        toast.warning(`报告生成失败: ${reportErrorMsg}`);
      }

      setIsLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "查询企业失败";
      setError(errorMsg);
      toast.dismiss(toastId);
      toast.error(errorMsg);
      setIsLoading(false);
    }
  };

  const handleSearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!searchQuery.trim()) {
      setError("请输入要查询的企业名称");
      setCompany(null);
      toast.error("请输入要查询的企业名称");
      return;
    }
    runSearch(searchQuery.trim());
  };

  const handleOptionChange = (id: QueryOptionId, isChecked: boolean) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [id]: isChecked,
    }));
  };

  // 点击"下载渠道准入尽调报告"按钮 - 只打开对话框，不下载
  const handleOpenReportDialog = () => {
    if (!company) {
      toast.error("请先完成企业查询");
      return;
    }

    if (!reportCacheRef.current) {
      toast.error("报告尚未生成，请重新查询企业");
      return;
    }

    setReportDialogOpen(true);
  };

  // 对话框里点击"下载 Word"按钮 - 真正下载
  const handleDownload = () => {
    if (!reportCacheRef.current) {
      toast.error("报告缓存已失效，请重新查询企业");
      return;
    }

    downloadFromCache(reportCacheRef.current);
    toast.success("Word 报告已下载");
  };

  const handleReportDialogChange = (open: boolean) => {
    setReportDialogOpen(open);
  };

  // 生成信息科技管理尽调报告
  const handleGenerateTechReport = () => {
    toast.info("信息科技管理尽调报告功能开发中，敬请期待");
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col space-y-10 px-6 pb-10 pt-20 md:px-8">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight">天眼查企业查询工作台</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          左侧填写企业名称并勾选所需模块，右侧实时展示查询结果，便于一键生成尽调报告。
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[5fr_6fr]">
        <Card className="min-h-[520px]">
          <CardContent className="flex h-full flex-col gap-6 p-6">
            <form className="space-y-5" onSubmit={handleSearch}>
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-base font-medium">
                  企业名称
                </Label>
                <div className="grid gap-3 md:grid-cols-[minmax(0,_1fr)_auto]">
                  <Input
                    id="companyName"
                    placeholder="请输入需要查询的企业全称或统一社会信用代码"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full"
                  />
                  <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    查询
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">查询信息类别</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {queryOptions.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:border-primary/60"
                    >
                      <Checkbox
                        checked={selectedOptions[option.id]}
                        onCheckedChange={(checked) => handleOptionChange(option.id, checked === true)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {isLoading ? (
            <Card className="min-h-[460px] border-dashed">
              <CardContent className="flex h-full items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                正在查询，请稍候...
              </CardContent>
            </Card>
          ) : company ? (
            <CompanyInfoCard company={company} className="min-h-[460px]" />
          ) : (
            <Card className="min-h-[460px]">
              <CardContent className="flex h-full items-center justify-center p-6">
                {error ? (
                  <Alert variant="destructive" className="w-full max-w-md">
                    <AlertTitle>查询失败</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : (
                  <ResultPlaceholder />
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              onClick={handleGenerateTechReport}
              disabled={!company}
              className="justify-center"
            >
              生成信息科技管理尽调报告
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleOpenReportDialog}
              disabled={!company || !reportCacheRef.current}
              className="justify-center"
            >
              <Download className="mr-2 h-4 w-4" />
              下载渠道准入尽调报告
            </Button>
          </div>
        </div>
      </section>

      {company && (
        <section className="space-y-6">
          <Tabs defaultValue="business" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="business">经营信息</TabsTrigger>
              <TabsTrigger value="shareholders">股东信息</TabsTrigger>
              <TabsTrigger value="changes">变更记录</TabsTrigger>
              <TabsTrigger value="scope">经营范围</TabsTrigger>
            </TabsList>
            <TabsContent value="business">
              <NoDataPlaceholder title="经营信息" />
            </TabsContent>
            <TabsContent value="shareholders">
              <NoDataPlaceholder title="股东信息" />
            </TabsContent>
            <TabsContent value="changes">
              <NoDataPlaceholder title="变更记录" />
            </TabsContent>
            <TabsContent value="scope">
              <NoDataPlaceholder title="经营范围" />
            </TabsContent>
          </Tabs>
        </section>
      )}

      <Dialog open={reportDialogOpen} onOpenChange={handleReportDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{CHANNEL_REPORT_LABEL}</DialogTitle>
            <DialogDescription>
              报告已生成，点击下方按钮下载 Word 文件。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm font-medium">企业名称</p>
              <p className="text-sm text-muted-foreground">{reportCacheRef.current?.companyName ?? company?.name}</p>
              <p className="text-sm font-medium mt-3">生成时间</p>
              <p className="text-sm text-muted-foreground">
                {reportCacheRef.current?.generatedAt.toLocaleString() ?? "-"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              提示：报告缓存在浏览器内存中，页面关闭后自动清除。
            </p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => handleReportDialogChange(false)}>
              关闭
            </Button>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> 下载 Word
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ResultPlaceholder() {
  return (
    <div className="space-y-3 text-center text-sm text-muted-foreground">
      <Sparkles className="mx-auto h-8 w-8 text-primary" />
      <p className="text-base font-medium text-foreground">等待查询</p>
      <p>输入企业名称并点击查询，即可在此处查看实时返回的企业信息。</p>
    </div>
  );
}
