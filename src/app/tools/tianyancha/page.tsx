"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, Search, Sparkles, Building2, FileText } from "lucide-react";
import { toast } from "sonner";
import { mockCompanyData } from "@/lib/mock-data";
import type { CompanyInfo, DueDiligenceReport } from "@/types";
import { CompanyInfoCard } from "@/components/tools/company-info-card";
import { CompanyBusinessInfo } from "@/components/tools/company-business-info";
import { CompanyShareholders } from "@/components/tools/company-shareholders";
import { CompanyChanges } from "@/components/tools/company-changes";
import { CompanyBusinessScope } from "@/components/tools/company-business-scope";

const reportSectionLabels: Record<keyof DueDiligenceReport["sections"], string> = {
  basicInfo: "基本信息",
  businessInfo: "工商信息",
  shareholders: "股东信息",
  changeHistory: "变更记录",
  riskAnalysis: "风险分析",
};

export default function TianyanchaToolPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [report, setReport] = useState<DueDiligenceReport | null>(null);

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

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!searchQuery.trim()) {
      setError("请输入企业名称");
      toast.error("请输入企业名称后再查询");
      return;
    }

    setIsLoading(true);
    setError(null);
    setCompany(null);

    setTimeout(() => {
      const result = lookupCompany(searchQuery);
      setIsLoading(false);
      if (!result) {
        setError("未找到匹配的企业信息，可尝试输入全称或统一信用代码");
        toast.warning("暂无匹配的企业");
        return;
      }
      setCompany(result);
      toast.success("查询成功，已加载企业档案");
    }, 1200);
  };

  const buildReport = (currentCompany: CompanyInfo): DueDiligenceReport => {
    const riskLevel = currentCompany.status === "active" ? "low" : "medium";
    return {
      id: `report-${currentCompany.id}`,
      companyId: currentCompany.id,
      companyName: currentCompany.name,
      generatedAt: new Date().toISOString(),
      summary: `${currentCompany.name} 尽调摘要：股权结构稳定，最近 ${currentCompany.changeRecords.length} 条变更已收录，推荐重点关注经营范围合规性与股东出资履约情况。`,
      riskLevel,
      sections: {
        basicInfo: true,
        businessInfo: true,
        shareholders: true,
        changeHistory: true,
        riskAnalysis: true,
      },
    };
  };

  const handleGenerateReport = () => {
    if (!company) {
      toast.error("请先查询并选择企业");
      return;
    }
    setIsGeneratingReport(true);
    const toastId = toast.loading("正在生成尽调报告...");

    setTimeout(() => {
      const nextReport = buildReport(company);
      setReport(nextReport);
      setIsGeneratingReport(false);
      setReportDialogOpen(true);
      toast.dismiss(toastId);
      toast.success("报告生成完成");
    }, 3000);
  };

  const handleDownload = () => {
    toast.info("模拟下载：报告已准备好 PDF 文件");
  };

  return (
    <div className="container py-10 space-y-8">
      <header className="space-y-3">
        <Badge variant="secondary" className="w-fit gap-2">
          <Building2 className="h-4 w-4" /> 企业信息查询
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">智能企业尽调工作台</h1>
        <p className="max-w-3xl text-muted-foreground">
          结合工商数据、股权结构与变更记录，快速完成企业尽调。输入企业名称即可查询，并支持一键生成尽调报告。
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {["工商档案", "股权结构", "变更记录", "经营范围"].map((feature) => (
            <span key={feature} className="inline-flex items-center gap-1 rounded-full border px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {feature}
            </span>
          ))}
        </div>
      </header>

      <Card>
        <CardContent className="space-y-6 p-6">
          <form className="flex flex-col gap-4 md:flex-row" onSubmit={handleSearch}>
            <div className="flex-1">
              <Label htmlFor="company">企业名称</Label>
              <Input
                id="company"
                placeholder="请输入企业名称"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                查询
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>示例：</span>
            {suggestions.map((item) => (
              <Badge key={item} variant="outline" className="cursor-pointer" onClick={() => setSearchQuery(item)}>
                {item}
              </Badge>
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>查询失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            正在拉取工商数据...
          </CardContent>
        </Card>
      )}

      {!isLoading && !company && !error && (
        <EmptyState />
      )}

      {company && (
        <section className="space-y-6">
          <CompanyInfoCard
            company={company}
            onGenerateReport={handleGenerateReport}
            isGeneratingReport={isGeneratingReport}
          />

          <Tabs defaultValue="business" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="business">工商信息</TabsTrigger>
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

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>尽调报告预览</DialogTitle>
            <DialogDescription>以下为自动生成的报告摘要，可下载 PDF 版本。</DialogDescription>
          </DialogHeader>
          {report ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">企业：{report.companyName}</p>
                <p className="text-sm text-muted-foreground">生成时间：{new Date(report.generatedAt).toLocaleString()}</p>
              </div>
              <p className="leading-relaxed text-sm">{report.summary}</p>
              <Separator />
              <div className="space-y-2 text-sm">
                <p className="font-medium">覆盖板块</p>
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
            <p className="text-sm text-muted-foreground">报告生成中...</p>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReportDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={handleDownload}>
              <FileText className="mr-2 h-4 w-4" /> 下载 PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 py-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-primary" />
        <p className="text-lg font-medium">输入企业名称即可查看实时工商信息</p>
        <p className="text-sm text-muted-foreground">
          支持多行业、多地区主体，包含工商、股东、变更与经营范围等维度。
        </p>
      </CardContent>
    </Card>
  );
}
