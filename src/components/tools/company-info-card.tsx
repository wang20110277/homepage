"use client";

import { Building2, CreditCard, MapPin, Shield, UserCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CompanyInfo } from "@/types";

const statusMeta: Record<CompanyInfo["status"], { label: string; variant: "default" | "secondary" | "destructive"; }> = {
  active: { label: "在业", variant: "default" },
  cancelled: { label: "已注销", variant: "secondary" },
  revoked: { label: "已吊销", variant: "destructive" },
};

interface CompanyInfoCardProps {
  company: CompanyInfo;
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
}

export function CompanyInfoCard({ company, onGenerateReport, isGeneratingReport }: CompanyInfoCardProps) {
  const status = statusMeta[company.status];

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">{company.name}</CardTitle>
            <CardDescription>统一社会信用代码：{company.creditCode}</CardDescription>
          </div>
          <Badge variant={status?.variant ?? "secondary"}>{status?.label ?? "--"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow icon={UserCircle2} label="法定代表人" value={company.legalRepresentative} />
          <InfoRow icon={Shield} label="注册资本" value={company.registeredCapital} />
          <InfoRow icon={Building2} label="成立日期" value={company.establishDate} />
          <InfoRow icon={CreditCard} label="公司编号" value={company.id.toUpperCase()} />
        </div>
        <InfoRow icon={MapPin} label="注册地址" value={company.registeredAddress} />

        {onGenerateReport && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div>
              <p className="font-medium">生成尽调报告</p>
              <p className="text-sm text-muted-foreground">提炼工商、股权、变更、风险摘要并导出 PDF</p>
            </div>
            <Button onClick={onGenerateReport} disabled={isGeneratingReport} size="lg">
              {isGeneratingReport ? "生成中..." : "一键生成尽调报告"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-muted p-2">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <p className="font-medium">{value || "--"}</p>
      </div>
    </div>
  );
}
