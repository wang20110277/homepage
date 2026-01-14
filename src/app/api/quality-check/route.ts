import { NextRequest } from "next/server";
import { withAuth, type BffContext } from "@/lib/core/bff-auth";
import { ok, badRequest } from "@/lib/core/api-response";
import { inspectionDb } from "@/lib/inspection-db";
import { collectionAuditResults } from "@/lib/schema";
import { eq, like, sql } from "drizzle-orm";
import { z } from "zod";

const QuerySchema = z.object({
  field: z.enum(["coll_id", "date_folder", "score", "deductions"]),
  value: z.string().min(1, "查询值不能为空"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

async function handler(
  req: NextRequest,
  { traceId }: BffContext
) {
  const searchParams = req.nextUrl.searchParams;
  const field = searchParams.get("field");
  const value = searchParams.get("value");
  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");

  const validation = QuerySchema.safeParse({ field, value, page, pageSize });

  if (!validation.success) {
    return badRequest(
      validation.error.issues[0]?.message || "无效的查询参数",
      traceId
    );
  }

  const { field: queryField, value: queryValue, page: currentPage, pageSize: limit } = validation.data;
  const offset = (currentPage - 1) * limit;

  try {
    // Build WHERE condition based on field
    let whereCondition;

    switch (queryField) {
      case "coll_id":
        whereCondition = like(collectionAuditResults.collId, `%${queryValue}%`);
        break;
      case "date_folder":
        whereCondition = like(collectionAuditResults.dateFolder, `%${queryValue}%`);
        break;
      case "score":
        const scoreValue = parseInt(queryValue, 10);
        if (isNaN(scoreValue)) {
          return badRequest("分数必须是数字", traceId);
        }
        whereCondition = eq(collectionAuditResults.score, scoreValue);
        break;
      case "deductions":
        whereCondition = like(collectionAuditResults.deductions, `%${queryValue}%`);
        break;
    }

    // 优化：使用单次查询同时获取总数和分页数据（使用窗口函数）
    const recordsWithCount = await inspectionDb
      .select({
        id: collectionAuditResults.id,
        collId: collectionAuditResults.collId,
        dateFolder: collectionAuditResults.dateFolder,
        score: collectionAuditResults.score,
        deductions: collectionAuditResults.deductions,
        txtFilename: collectionAuditResults.txtFilename,
        processedAt: collectionAuditResults.processedAt,
        // 使用窗口函数获取总数
        totalCount: sql<number>`COUNT(*) OVER()`.as("total_count"),
      })
      .from(collectionAuditResults)
      .where(whereCondition)
      .limit(limit)
      .offset(offset)
      .orderBy(collectionAuditResults.id);

    // 从第一条记录中提取总数
    const total = recordsWithCount.length > 0 ? Number(recordsWithCount[0].totalCount) : 0;

    // 移除 totalCount 字段，返回纯净的记录
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const records = recordsWithCount.map(({ totalCount: _totalCount, ...record }) => record);

    const totalPages = Math.ceil(total / limit);

    return ok(
      {
        total,
        page: currentPage,
        pageSize: limit,
        totalPages,
        records,
      },
      traceId
    );
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : "查询失败",
      traceId
    );
  }
}

export const GET = withAuth(handler);
