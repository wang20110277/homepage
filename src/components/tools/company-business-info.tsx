"use client";

import type { CompanyInfo } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CompanyBusinessInfoProps {
  company: CompanyInfo;
}

export function CompanyBusinessInfo({ company }: CompanyBusinessInfoProps) {
  const info = company.businessInfo;

  return (
    <Card>
      <CardHeader>
        <CardTitle>工商信息</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-4 md:grid-cols-2">
          <InfoItem label="企业类型" value={info.companyType} />
          <InfoItem label="营业期限" value={info.operatingPeriod} />
          <InfoItem label="登记机关" value={info.registrationAuthority} />
          <InfoItem label="核准日期" value={info.approvalDate} />
          <InfoItem label="组织机构代码" value={info.organizationCode} />
        </dl>
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "--"}</dd>
    </div>
  );
}
