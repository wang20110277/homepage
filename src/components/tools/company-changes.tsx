"use client";

import type { ChangeRecord } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CompanyChangesProps {
  changes: ChangeRecord[];
}

export function CompanyChanges({ changes }: CompanyChangesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>变更记录</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>变更日期</TableHead>
                <TableHead>变更事项</TableHead>
                <TableHead>变更前</TableHead>
                <TableHead>变更后</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change) => (
                <TableRow key={change.id}>
                  <TableCell className="whitespace-nowrap">{change.changeDate}</TableCell>
                  <TableCell>{change.changeItem}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{change.contentBefore}</TableCell>
                  <TableCell className="text-sm text-foreground">{change.contentAfter}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
