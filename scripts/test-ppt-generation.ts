#!/usr/bin/env tsx
/**
 * Presenton API Direct Test Script
 *
 * Usage:
 *   pnpm test:ppt
 *   pnpm test:ppt "自定义主题" 10
 *
 * This script directly calls the Presenton service API to test PPT generation.
 * It bypasses the BFF layer and calls Presenton directly.
 */

// Load environment variables from .env file
// Note: tsx automatically loads .env in Next.js projects
const PRESENTON_BASE_URL =
  process.env.PRESENTON_BASE_URL || "http://localhost:5000";
const PRESENTON_API_KEY = process.env.PRESENTON_API_KEY || "";

interface PresentonResponse {
  url: string;
}

/**
 * Test Presenton API directly
 */
async function testPresentonApi(content: string, nSlides: number = 8) {
  console.log("\n🚀 Presenton API Direct Test");
  console.log("=".repeat(60));
  console.log(`🌐 Presenton URL: ${PRESENTON_BASE_URL}`);
  console.log(`🔑 API Key: ${PRESENTON_API_KEY ? "✅ Configured" : "❌ Not set"}`);
  console.log(`📝 Content: ${content.substring(0, 100)}...`);
  console.log(`📄 Slides: ${nSlides}`);
  console.log(`🌍 Language: Chinese (Simplified - 中文, 汉语)`);
  console.log(`📋 Template: general`);
  console.log(`📦 Export: pptx`);
  console.log("=".repeat(60));

  const requestBody = {
    content,
    n_slides: nSlides,
    language: "Chinese (Simplified - 中文, 汉语)",
    template: "general",
    export_as: "pptx",
  };

  console.log("\n📤 Request Body:");
  console.log(JSON.stringify(requestBody, null, 2));

  const apiUrl = `${PRESENTON_BASE_URL}/v1/ppt/generate`;
  console.log(`\n🎯 Target URL: ${apiUrl}`);

  try {
    console.log("\n⏳ Sending request to Presenton...");
    const startTime = Date.now();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (PRESENTON_API_KEY) {
      headers["Authorization"] = `Bearer ${PRESENTON_API_KEY}`;
    }

    console.log("\n📋 Request Headers:");
    console.log(JSON.stringify(headers, null, 2));

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ Response received in ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    const contentType = response.headers.get("content-type");
    console.log(`📄 Content-Type: ${contentType}`);

    let data: any;
    const responseText = await response.text();

    try {
      data = JSON.parse(responseText);
      console.log("\n📥 Response Body (JSON):");
      console.log(JSON.stringify(data, null, 2));
    } catch {
      console.log("\n📥 Response Body (Raw Text):");
      console.log(responseText);
      data = { raw: responseText };
    }

    if (response.ok && data.url) {
      console.log("\n" + "=".repeat(60));
      console.log("✨ PPT Generation Successful!");
      console.log("=".repeat(60));
      console.log(`⬇️  Download URL: ${data.url}`);

      // Check if URL is absolute or relative
      if (!data.url.startsWith("http")) {
        const fullUrl = `${PRESENTON_BASE_URL}${data.url.startsWith("/") ? "" : "/"}${data.url}`;
        console.log(`🔗 Full URL: ${fullUrl}`);
      }

      console.log("=".repeat(60));
    } else {
      console.log("\n" + "=".repeat(60));
      console.log("❌ PPT Generation Failed!");
      console.log("=".repeat(60));
      console.log(`🚫 HTTP Status: ${response.status} ${response.statusText}`);
      if (data.error) {
        console.log(`💬 Error: ${JSON.stringify(data.error, null, 2)}`);
      } else if (data.message) {
        console.log(`💬 Message: ${data.message}`);
      } else if (data.detail) {
        console.log(`💬 Detail: ${JSON.stringify(data.detail, null, 2)}`);
      }
      console.log("=".repeat(60));
      process.exit(1);
    }
  } catch (error) {
    console.log("\n" + "=".repeat(60));
    console.log("💥 Request Failed!");
    console.log("=".repeat(60));
    if (error instanceof Error) {
      console.log(`❌ Error: ${error.message}`);
      if (error.message.includes("ECONNREFUSED")) {
        console.log("\n💡 Troubleshooting:");
        console.log("   1. Check if Presenton service is running");
        console.log(`   2. Verify PRESENTON_BASE_URL: ${PRESENTON_BASE_URL}`);
        console.log("   3. Check firewall/network settings");
      } else if (error.message.includes("ENOTFOUND")) {
        console.log("\n💡 Troubleshooting:");
        console.log("   1. Check DNS resolution");
        console.log(`   2. Verify hostname in PRESENTON_BASE_URL: ${PRESENTON_BASE_URL}`);
      }
    } else {
      console.log(`❌ Unknown Error: ${String(error)}`);
    }
    console.log("=".repeat(60));
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  // Check environment variables
  if (!PRESENTON_BASE_URL) {
    console.error("❌ Error: PRESENTON_BASE_URL is not configured");
    console.log("\n💡 Please set PRESENTON_BASE_URL in your .env file:");
    console.log("   PRESENTON_BASE_URL=http://your-presenton-service:5000");
    process.exit(1);
  }

  // Get arguments from command line
  const args = process.argv.slice(2);

  // Default test content
  const defaultContent = `创建一个关于人工智能技术的演示文稿，包括以下内容：
1. AI技术简介
2. 机器学习基础
3. 深度学习应用
4. 自然语言处理
5. 计算机视觉
6. AI的未来展望`;

  const content = args[0] || defaultContent;
  const nSlides = args[1] ? parseInt(args[1], 10) : 8;

  // Validate n_slides
  if (isNaN(nSlides) || nSlides < 1 || nSlides > 50) {
    console.error("❌ Error: n_slides must be a number between 1 and 50");
    console.log("\nUsage:");
    console.log('  pnpm test:ppt "Your content" 10');
    process.exit(1);
  }

  await testPresentonApi(content, nSlides);
}

// Run the script
main().catch((error) => {
  console.error("💥 Fatal Error:", error);
  process.exit(1);
});
