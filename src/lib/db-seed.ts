import "dotenv/config";
import { ensureCoreAuthData } from "./rbac-init";

export async function seedDatabase() {
  console.log("Starting database initialization...");
  await ensureCoreAuthData({ verbose: true });
  console.log("Database initialization complete!");
}

const runDirectly = process.argv[1]?.includes("db-seed");

if (runDirectly) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Database initialization failed:", error);
      process.exit(1);
    });
}
