#!/usr/bin/env python3
"""
Script to generate unique API keys for Open WebUI users who don't have one
Usage: python scripts/generate-api-keys.py
"""

import sqlite3
import secrets
import os
from pathlib import Path

# Configuration
SCRIPT_DIR = Path(__file__).parent
DB_PATH = SCRIPT_DIR.parent / "webui.db"


def generate_api_key():
    """Generate a unique API key in the format: sk-{32-char-hex}"""
    random_hex = secrets.token_hex(16)  # 16 bytes = 32 hex characters
    return f"sk-{random_hex}"


def main():
    print("🔑 Open WebUI API Key Generator\n")
    print(f"Database: {DB_PATH}\n")

    # Check if database exists
    if not DB_PATH.exists():
        print(f"❌ Error: Database not found at {DB_PATH}")
        return 1

    # Connect to database
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
    except sqlite3.Error as e:
        print(f"❌ Error connecting to database: {e}")
        return 1

    try:
        # Get all users without API keys
        cursor.execute(
            "SELECT id, email, name FROM user WHERE api_key IS NULL OR api_key = ''"
        )
        users_without_keys = cursor.fetchall()

        if not users_without_keys:
            print("✅ All users already have API keys!")
            return 0

        print(f"Found {len(users_without_keys)} users without API keys:\n")

        # Get all existing API keys to ensure uniqueness
        cursor.execute(
            "SELECT api_key FROM user WHERE api_key IS NOT NULL AND api_key != ''"
        )
        existing_keys = set(row[0] for row in cursor.fetchall())

        print(f"Existing API keys: {len(existing_keys)}\n")
        print("⏳ Generating and updating API keys...\n")

        # Generate and update API keys
        results = []
        for user_id, email, name in users_without_keys:
            # Generate unique API key
            while True:
                api_key = generate_api_key()
                if api_key not in existing_keys:
                    break

            # Add to set to prevent duplicates in this batch
            existing_keys.add(api_key)

            # Update user
            cursor.execute(
                "UPDATE user SET api_key = ? WHERE id = ?",
                (api_key, user_id)
            )

            results.append({
                'id': user_id,
                'email': email,
                'name': name,
                'api_key': api_key
            })

        # Commit transaction
        conn.commit()

        # Display results
        print("✅ Successfully generated API keys:\n")
        for idx, result in enumerate(results, 1):
            print(f"{idx}. {result['name']} ({result['email']})")
            print(f"   ID: {result['id']}")
            print(f"   API Key: {result['api_key']}\n")

        # Verify update
        cursor.execute(
            "SELECT COUNT(*) FROM user WHERE api_key IS NULL OR api_key = ''"
        )
        remaining_without_keys = cursor.fetchone()[0]

        cursor.execute(
            "SELECT COUNT(DISTINCT api_key) FROM user WHERE api_key IS NOT NULL AND api_key != ''"
        )
        total_unique_keys = cursor.fetchone()[0]

        print(f"\n📊 Summary:")
        print(f"   - API keys generated: {len(results)}")
        print(f"   - Users still without keys: {remaining_without_keys}")
        print(f"   - Total unique API keys now: {total_unique_keys}")

        return 0

    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        conn.rollback()
        return 1

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        conn.rollback()
        return 1

    finally:
        conn.close()


if __name__ == "__main__":
    exit(main())
