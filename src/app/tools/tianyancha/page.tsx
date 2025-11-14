"use client";

import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, Search, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { mockCompanyData } from "@/lib/mock-data";
import type { CompanyInfo, DueDiligenceReport } from "@/types";
import { CompanyInfoCard } from "@/components/tools/company-info-card";
import { CompanyBusinessInfo } from "@/components/tools/company-business-info";
import { CompanyShareholders } from "@/components/tools/company-shareholders";
import { CompanyChanges } from "@/components/tools/company-changes";
import { CompanyBusinessScope } from "@/components/tools/company-business-scope";

const queryOptions = [
  { id: "basicInfo", label: "企业基本信息" },
  { id: "financialInfo", label: "财务信息" },
  { id: "shareholding", label: "股权结构" },
  { id: "litigation", label: "诉讼信息" },
  { id: "personnel", label: "人员相关" },
] as const;

type QueryOptionId = (typeof queryOptions)[number]["id"];
type QuerySelection = Record<QueryOptionId, boolean>;
type ReportVariant = "tech" | "channel";

const reportVariantLabels: Record<ReportVariant, string> = {
  tech: "信息科技管理尽调报告",
  channel: "渠道准入尽调报告",
};

const reportSectionLabels: Record<keyof DueDiligenceReport["sections"], string> = {
  basicInfo: "企业基本信息",
  financialInfo: "财务信息",
  shareholding: "股权结构",
  litigation: "诉讼信息",
  personnel: "人员相关",
};

const companyStatusLabels: Record<CompanyInfo["status"], string> = {
  active: "存续",
  cancelled: "已注销",
  revoked: "已吊销",
};

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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [report, setReport] = useState<DueDiligenceReport | null>(null);
  const [currentReportType, setCurrentReportType] = useState<string | null>(null);

  const suggestions = useMemo(() => Object.keys(mockCompanyData), []);

  const lookupCompany = (term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return null;

    const entries = Object.entries(mockCompanyData);
    const match = entries.find(([alias, info]) => {
      const aliasMatch = alias.toLowerCase().includes(normalized) || normalized.includes(alias.toLowerCase());
      const nameMatch = info.name.toLowerCase().includes(normalized);
      const codeMatch = info.creditCode.toLowerCase().includes(normalized);
      return aliasMatch || nameMatch || codeMatch;
    });
    return match ? match[1] : null;
  };

  const runSearch = (term: string) => {
    setIsLoading(true);
    setError(null);
    setCompany(null);
    setReport(null);
    setReportDialogOpen(false);
    setCurrentReportType(null);

    setTimeout(() => {
      const result = lookupCompany(term);
      setIsLoading(false);
      if (!result) {
        setError("未找到匹配的企业，请尝试其他关键词");
        toast.warning("没有匹配的企业");
        return;
      }
      setCompany(result);
      toast.success("查询成功，已匹配企业信息");
    }, 1200);
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

  const handleSuggestionClick = (value: string) => {
    setSearchQuery(value);
    runSearch(value.trim());
  };

  const handleSuggestionKeyDown = (event: KeyboardEvent<HTMLSpanElement>, value: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSuggestionClick(value);
    }
  };

  const handleOptionChange = (id: QueryOptionId, isChecked: boolean) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [id]: isChecked,
    }));
  };

  const buildReport = (currentCompany: CompanyInfo, selections: QuerySelection): DueDiligenceReport => {
    const riskLevel = currentCompany.status === "active" ? "low" : "medium";
    const statusLabel = companyStatusLabels[currentCompany.status];

    return {
      id: `report-${currentCompany.id}`,
      companyId: currentCompany.id,
      companyName: currentCompany.name,
      generatedAt: new Date().toISOString(),
      summary: `${currentCompany.name} 当前状态为${statusLabel}，共 ${currentCompany.changeRecords.length} 条历史变更，可结合所选模块快速完成尽调。`,
      riskLevel,
      sections: {
        basicInfo: selections.basicInfo,
        financialInfo: selections.financialInfo,
        shareholding: selections.shareholding,
        litigation: selections.litigation,
        personnel: selections.personnel,
      },
    };
  };

  const handleGenerateReport = (variant: ReportVariant) => {
    if (!company) {
      toast.error("请先完成企业查询");
      return;
    }

    const targetCompany = company;
    const label = reportVariantLabels[variant];
    const selectionsSnapshot = { ...selectedOptions };

    setIsGeneratingReport(true);
    setCurrentReportType(label);
    const toastId = toast.loading(`正在生成${label}...`);

    setTimeout(() => {
      const nextReport = buildReport(targetCompany, selectionsSnapshot);
      setReport(nextReport);
      setIsGeneratingReport(false);
      setReportDialogOpen(true);
      toast.dismiss(toastId);
      toast.success(`${label}生成成功`);
    }, 3000);
  };

  const handleDownload = () => {
    toast.info("提示：当前示例仅支持预览，暂不提供 PDF 下载能力");
  };

  const handleReportDialogChange = (open: boolean) => {
    setReportDialogOpen(open);
    if (!open) {
      setCurrentReportType(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col space-y-10 px-6 py-10 md:px-8">
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

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>常用示例：</span>
              {suggestions.map((item) => (
                <Badge
                  key={item}
                  variant="outline"
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => handleSuggestionClick(item)}
                  onKeyDown={(event) => handleSuggestionKeyDown(event, item)}
                >
                  {item}
                </Badge>
              ))}
            </div>
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
              onClick={() => handleGenerateReport("tech")}
              disabled={!company || isGeneratingReport}
              className="justify-center"
            >
              {isGeneratingReport && currentReportType === reportVariantLabels.tech ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在生成...
                </>
              ) : (
                "生成信息科技管理尽调报告"
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleGenerateReport("channel")}
              disabled={!company || isGeneratingReport}
              className="justify-center"
            >
              {isGeneratingReport && currentReportType === reportVariantLabels.channel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在生成...
                </>
              ) : (
                "生成渠道准入尽调报告"
              )}
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
              <CompanyBusinessInfo company={company} />
            </TabsContent>
            <TabsContent value="shareholders">
              <CompanyShareholders shareholders={company.shareholders} />
            </TabsContent>
            <TabsContent value="changes">
              <CompanyChanges changes={company.changeRecords} />
            </TabsContent>
            <TabsContent value="scope">
              <CompanyBusinessScope company={company} />
            </TabsContent>
          </Tabs>
        </section>
      )}

      <Dialog open={reportDialogOpen} onOpenChange={handleReportDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>尽调报告生成完成</DialogTitle>
            <DialogDescription>所选模块已生成结构化内容，可继续完善后导出 PDF。</DialogDescription>
          </DialogHeader>
          {report ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">报告类型：{currentReportType ?? "信息尽调报告"}</p>
                <p className="text-sm text-muted-foreground">企业名称：{report.companyName}</p>
                <p className="text-sm text-muted-foreground">生成时间：{new Date(report.generatedAt).toLocaleString()}</p>
              </div>
              <p className="leading-relaxed text-sm">{report.summary}</p>
              <Separator />
              <div className="space-y-2 text-sm">
                <p className="font-medium">包含模块</p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {Object.entries(report.sections)
                    .filter(([, enabled]) => enabled)
                    .map(([section]) => (
                      <li key={section}>
                        {reportSectionLabels[section as keyof typeof reportSectionLabels] ?? section}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">正在整理报告内容...</p>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => handleReportDialogChange(false)}>
              关闭
            </Button>
            <Button onClick={handleDownload}>
              <FileText className="mr-2 h-4 w-4" /> 导出 PDF
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
