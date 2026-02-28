#!/usr/bin/env tsx
/**
 * Database Connection Test Script
 *
 * Usage:
 *   pnpm test:db
 *
 * This script tests the database connection and diagnoses common issues.
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
  console.error("❌ POSTGRES_URL is not set in environment variables");
  process.exit(1);
}

// Mask password in URL for logging
const maskedUrl = POSTGRES_URL.replace(/:[^:@]+@/, ':***@');
console.log(`\n📋 Connection String: ${maskedUrl}`);

// Parse URL to check format
try {
  const url = new URL(POSTGRES_URL);
  console.log(`\n📊 Connection Details:`);
  console.log(`   Host: ${url.hostname}`);
  console.log(`   Port: ${url.port || '5432 (default)'}`);
  console.log(`   Database: ${url.pathname.slice(1)}`);
  console.log(`   User: ${url.username}`);
  console.log(`   SSL: ${url.searchParams.get('sslmode') || 'not specified'}`);

  // Check if it's a Neon database
  if (url.hostname.includes('neon.tech')) {
    console.log(`\n⚠️  Neon Database Detected:`);
    console.log(`   - Region: Check your Neon dashboard`);
    console.log(`   - Cold starts may cause initial delays`);
    console.log(`   - Consider using connection pooling`);
  }
} catch (error) {
  console.error("❌ Invalid POSTGRES_URL format:", error);
  process.exit(1);
}

async function testConnection() {
  console.log(`\n🔄 Testing database connection...`);
  const startTime = Date.now();

  try {
    // Dynamic import for postgres
    const { default: postgres } = await import('postgres');

    const sql = postgres(POSTGRES_URL, {
      max: 1,
      connect_timeout: 30,
      idle_timeout: 5,
    });

    // Simple query to test connection
    const result = await sql`SELECT 1 as test, NOW() as server_time`;
    const duration = Date.now() - startTime;

    console.log(`\n✅ Connection successful!`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Server time: ${result[0].server_time}`);

    // Test session table
    try {
      const tables = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      console.log(`\n📊 Tables found: ${tables.length}`);
      if (tables.length === 0) {
        console.log(`   ⚠️  No tables found. Run migrations: pnpm db:migrate`);
      }
    } catch (tableError) {
      console.log(`\n⚠️  Could not list tables: ${tableError}`);
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ Connection failed after ${duration}ms`);
    console.error(`\nError details:`);

    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Name: ${error.name}`);

      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        console.log(`\n💡 Timeout troubleshooting:`);
        console.log(`   1. Check if Neon database is active (not paused)`);
        console.log(`   2. Verify network connectivity to ${new URL(POSTGRES_URL).hostname}`);
        console.log(`   3. Consider using a database closer to your region`);
        console.log(`   4. Try: ping ${new URL(POSTGRES_URL).hostname}`);
      }

      if (error.message.includes('ENOTFOUND')) {
        console.log(`\n💡 DNS resolution failed:`);
        console.log(`   1. Check hostname spelling`);
        console.log(`   2. Verify DNS resolution works`);
      }

      if (error.message.includes('authentication') || error.message.includes('password')) {
        console.log(`\n💡 Authentication failed:`);
        console.log(`   1. Check username and password`);
        console.log(`   2. Verify database credentials in Neon dashboard`);
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

testConnection();
