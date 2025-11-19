import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { getToolAccessSummary } from "@/lib/rbac";

async function showToolAccess(email: string) {
  const userRecord = await db.query.user.findFirst({
    where: eq(schema.user.email, email),
  });

  if (!userRecord) {
    throw new Error(`User with email ${email} not found`);
  }

  const summary = await getToolAccessSummary(userRecord.id);
  console.log(JSON.stringify(summary, null, 2));
}

const emailArg = process.argv[2];

if (!emailArg) {
  console.error("Usage: tsx scripts/show-tool-access.ts <email>");
  process.exit(1);
}

showToolAccess(emailArg)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to get tool access:", error);
    process.exit(1);
  });
