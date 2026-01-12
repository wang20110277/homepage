import "dotenv/config";
import { inspectionDb } from "../src/lib/inspection-db";
import { collectionAuditResults } from "../src/lib/schema";

async function seedQualityCheckData() {
  console.log("Starting to seed quality check data...");

  const testData = [
    {
      collId: "COLL001",
      dateFolder: "2025-01-01",
      score: 95,
      deductions: "未及时回访客户",
      txtFilename: "audit_report_001.txt",
    },
    {
      collId: "COLL002",
      dateFolder: "2025-01-02",
      score: 88,
      deductions: "通话记录不完整，客户信息更新不及时",
      txtFilename: "audit_report_002.txt",
    },
    {
      collId: "COLL003",
      dateFolder: "2025-01-03",
      score: 100,
      deductions: null,
      txtFilename: "audit_report_003.txt",
    },
    {
      collId: "COLL001",
      dateFolder: "2025-01-05",
      score: 92,
      deductions: "服务态度需改进",
      txtFilename: "audit_report_004.txt",
    },
    {
      collId: "COLL004",
      dateFolder: "2025-01-06",
      score: 78,
      deductions: "未按流程操作，客户投诉处理不当，记录缺失",
      txtFilename: "audit_report_005.txt",
    },
    {
      collId: "COLL005",
      dateFolder: "2025-01-08",
      score: 85,
      deductions: "沟通技巧不足",
      txtFilename: "audit_report_006.txt",
    },
    {
      collId: "COLL002",
      dateFolder: "2025-01-10",
      score: 90,
      deductions: "文档整理不规范",
      txtFilename: "audit_report_007.txt",
    },
    {
      collId: "COLL006",
      dateFolder: "2025-01-12",
      score: 82,
      deductions: "响应时间过长，客户满意度低",
      txtFilename: "audit_report_008.txt",
    },
    {
      collId: "COLL003",
      dateFolder: "2025-01-15",
      score: 98,
      deductions: "轻微记录错误",
      txtFilename: "audit_report_009.txt",
    },
    {
      collId: "COLL007",
      dateFolder: "2025-01-18",
      score: 75,
      deductions: "多次违反操作规程，培训考核未通过",
      txtFilename: "audit_report_010.txt",
    },
    {
      collId: "COLL001",
      dateFolder: "2025-01-20",
      score: 94,
      deductions: "细节处理欠佳",
      txtFilename: "audit_report_011.txt",
    },
    {
      collId: "COLL008",
      dateFolder: "2025-01-22",
      score: 100,
      deductions: null,
      txtFilename: "audit_report_012.txt",
    },
    {
      collId: "COLL004",
      dateFolder: "2025-01-25",
      score: 80,
      deductions: "执行效率需提升",
      txtFilename: "audit_report_013.txt",
    },
    {
      collId: "COLL009",
      dateFolder: "2025-01-28",
      score: 87,
      deductions: "数据录入错误",
      txtFilename: "audit_report_014.txt",
    },
    {
      collId: "COLL005",
      dateFolder: "2025-01-30",
      score: 91,
      deductions: "流程熟练度不够",
      txtFilename: "audit_report_015.txt",
    },
  ];

  try {
    const inserted = await inspectionDb
      .insert(collectionAuditResults)
      .values(testData)
      .returning();

    console.log(`✅ Successfully inserted ${inserted.length} quality check records`);
    console.log("\nSample records:");
    inserted.slice(0, 3).forEach((record) => {
      console.log(
        `  - ID: ${record.id}, CollID: ${record.collId}, Score: ${record.score}, Date: ${record.dateFolder}`
      );
    });

    return inserted;
  } catch (error) {
    console.error("❌ Error inserting quality check data:", error);
    throw error;
  }
}

seedQualityCheckData()
  .then(() => {
    console.log("\n✨ Seed completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Seed failed:", error);
    process.exit(1);
  });
