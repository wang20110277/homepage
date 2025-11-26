"use client";

import type { CompanyInfo } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CompanyBusinessScopeProps {
  company: CompanyInfo;
}

const keywordList = ["科技", "数据", "金融", "教育", "制造", "AI", "出海"];

export function CompanyBusinessScope({ company }: CompanyBusinessScopeProps) {
  const highlighted = highlightKeywords(company.businessScope);

  return (
    <Card>
      <CardHeader>
        <CardTitle>经营范围</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="leading-relaxed text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: highlighted }} />
        <div className="flex flex-wrap gap-2">
          {keywordList.map((keyword) => (
            <Badge key={keyword} variant="outline">
              {keyword}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function highlightKeywords(text: string) {
  return keywordList.reduce((acc, keyword) => {
    const pattern = new RegExp(keyword, "gi");
    return acc.replace(pattern, (match) => `<mark class="bg-primary/20 px-1 rounded">${match}</mark>`);
  }, text);
}
