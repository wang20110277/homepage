#!/usr/bin/env node

/**
 * Script to generate unique API keys for Open WebUI users who don't have one
 * Usage: node scripts/generate-api-keys.js
 */

const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");

// Configuration
const DB_PATH = path.join(__dirname, "..", "webui.db");

/**
 * Generate a unique API key in the format: sk-{32-char-hex}
 */
function generateApiKey() {
  const randomHex = crypto.randomBytes(16).toString("hex");
  return `sk-${randomHex}`;
}

/**
 * Main function
 */
function main() {
  console.log("🔑 Open WebUI API Key Generator\n");
  console.log(`Database: ${DB_PATH}\n`);

  // Open database connection
  const db = new Database(DB_PATH);

  try {
    // Get all users without API keys
    const usersWithoutKeys = db
      .prepare("SELECT id, email, name FROM user WHERE api_key IS NULL OR api_key = ''")
      .all();

    if (usersWithoutKeys.length === 0) {
      console.log("✅ All users already have API keys!");
      return;
    }

    console.log(`Found ${usersWithoutKeys.length} users without API keys:\n`);

    // Get all existing API keys to ensure uniqueness
    const existingKeys = new Set(
      db
        .prepare("SELECT api_key FROM user WHERE api_key IS NOT NULL AND api_key != ''")
        .all()
        .map((row) => row.api_key)
    );

    console.log(`Existing API keys: ${existingKeys.size}\n`);

    // Prepare update statement
    const updateStmt = db.prepare("UPDATE user SET api_key = ? WHERE id = ?");

    // Begin transaction
    const updateMany = db.transaction((users) => {
      const results = [];

      for (const user of users) {
        // Generate unique API key
        let apiKey;
        do {
          apiKey = generateApiKey();
        } while (existingKeys.has(apiKey));

        // Add to set to prevent duplicates in this batch
        existingKeys.add(apiKey);

        // Update user
        updateStmt.run(apiKey, user.id);

        results.push({
          id: user.id,
          email: user.email,
          name: user.name,
          apiKey,
        });
      }

      return results;
    });

    // Execute transaction
    console.log("⏳ Generating and updating API keys...\n");
    const results = updateMany(usersWithoutKeys);

    // Display results
    console.log("✅ Successfully generated API keys:\n");
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name} (${result.email})`);
      console.log(`   ID: ${result.id}`);
      console.log(`   API Key: ${result.apiKey}\n`);
    });

    // Verify update
    const remainingWithoutKeys = db
      .prepare("SELECT COUNT(*) as count FROM user WHERE api_key IS NULL OR api_key = ''")
      .get();

    console.log(`\n📊 Summary:`);
    console.log(`   - API keys generated: ${results.length}`);
    console.log(`   - Users still without keys: ${remainingWithoutKeys.count}`);
    console.log(`   - Total unique API keys now: ${existingKeys.size}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the script
main();
