"use client";

import type { Shareholder } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CompanyShareholdersProps {
  shareholders: Shareholder[];
}

export function CompanyShareholders({ shareholders }: CompanyShareholdersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>股东结构</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>股东名称</TableHead>
              <TableHead>持股比例</TableHead>
              <TableHead>认缴出资额</TableHead>
              <TableHead>实缴出资额</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shareholders.map((shareholder) => (
              <TableRow key={shareholder.id}>
                <TableCell className="font-medium">{shareholder.name}</TableCell>
                <TableCell>{shareholder.shareholdingRatio}</TableCell>
                <TableCell>{shareholder.subscribedCapital}</TableCell>
                <TableCell>{shareholder.paidInCapital}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
