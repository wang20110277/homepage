import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL as string;

if (!connectionString) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

// Validate connection string format
try {
  const url = new URL(connectionString);
  if (!url.hostname) {
    throw new Error("Missing hostname");
  }
  // Note: Neon and other cloud providers often omit port (use default 5432)
  // postgres-js handles this correctly, so we don't require explicit port
} catch (error) {
  console.error("❌ Invalid POSTGRES_URL format:", error);
  throw new Error(
    `Invalid POSTGRES_URL format. Expected: postgresql://user:pass@host/database, got: ${connectionString.replace(/:[^:@]+@/, ':***@')}`
  );
}

// Configure postgres client with connection pool settings
const client = postgres(connectionString, {
  max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || "50", 10),
  idle_timeout: 60,
  connect_timeout: 30,
  max_lifetime: 60 * 30,
  prepare: false,
  connection: {
    application_name: "homepage_app",
  },
  onnotice: () => {},
  transform: {
    undefined: null,
  },
});

export const db = drizzle(client, { schema });
