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
  if (!url.hostname || !url.port) {
    console.warn(
      `⚠️  PostgreSQL URL missing host or port. Host: ${url.hostname}, Port: ${url.port}`
    );
  }
} catch (error) {
  console.error("❌ Invalid POSTGRES_URL format:", error);
  throw new Error(
    `Invalid POSTGRES_URL format. Expected: postgresql://user:pass@host:port/database, got: ${connectionString.replace(/:[^:@]+@/, ':***@')}`
  );
}

// Configure postgres client with connection pool settings
// to handle long-running requests and prevent connection timeouts
//
// Pool sizing for ~200 concurrent users:
// - Each API request typically needs 1-2 short DB queries (<100ms)
// - Connections are released immediately after queries complete
// - During streaming responses, DB connection is released after initial auth check
// - Formula: max = (expected_concurrent_requests * avg_query_duration) / typical_request_duration
//
// For 200 users with ~20 concurrent peak requests: 30-50 connections recommended
const client = postgres(connectionString, {
  max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || "50", 10), // Default: 50 connections
  idle_timeout: 60, // Close idle connections after 60 seconds
  connect_timeout: 30, // Increased to 30 seconds for slow networks
  max_lifetime: 60 * 30, // Max connection lifetime: 30 minutes
  prepare: false, // Disable prepared statements for better compatibility

  // Additional reliability settings
  connection: {
    application_name: "homepage_app", // Identify connections in pg_stat_activity
  },

  // Retry logic for transient errors
  onnotice: () => {}, // Suppress notices
  transform: {
    undefined: null, // Convert undefined to null
  },
});

export const db = drizzle(client, { schema });
