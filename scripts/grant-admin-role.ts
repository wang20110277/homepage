import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

async function grantAdminRole(email: string) {
  const userRecord = await db.query.user.findFirst({
    where: eq(schema.user.email, email),
  });

  if (!userRecord) {
    throw new Error(`User with email ${email} not found`);
  }

  const adminRole = await db.query.roles.findFirst({
    where: eq(schema.roles.name, "admin"),
  });

  if (!adminRole) {
    throw new Error("Admin role not found. Run db seed first.");
  }

  const existingAssignment = await db.query.userRoles.findFirst({
    where: and(
      eq(schema.userRoles.userId, userRecord.id),
      eq(schema.userRoles.roleId, adminRole.id)
    ),
  });

  if (existingAssignment) {
    console.log(`User ${email} already has the admin role.`);
    return;
  }

  await db.insert(schema.userRoles).values({
    id: randomUUID(),
    userId: userRecord.id,
    roleId: adminRole.id,
  });

  console.log(`Admin role granted to ${email}`);
}

const emailArg = process.argv[2];

if (!emailArg) {
  console.error("Usage: tsx scripts/grant-admin-role.ts <email>");
  process.exit(1);
}

grantAdminRole(emailArg)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to grant admin role:", error);
    process.exit(1);
  });
