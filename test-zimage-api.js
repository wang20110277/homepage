/**
 * Z-Image API 测试脚本
 *
 * 使用方法（在内网环境下运行）：
 * node test-zimage-api.js
 *
 * 或使用 pnpm:
 * pnpm node test-zimage-api.js
 */

const API_URL = "http://10.162.5.211:9998/v1/images/generations";
const MODEL = "Z-Image-Turbo";

async function testZImageAPI() {
  console.log("====================================");
  console.log("Z-Image API 连接测试");
  console.log("====================================\n");

  console.log("测试配置:");
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Model: ${MODEL}`);
  console.log("\n------------------------------------\n");

  const testCases = [
    {
      name: "基本测试 - 简单提示词",
      payload: {
        model: MODEL,
        prompt: "一只可爱的猫咪在草地上玩耍",
        n: 1,
        size: "1024x1024"
      }
    },
    {
      name: "测试 - 英文提示词",
      payload: {
        model: MODEL,
        prompt: "A beautiful sunset over the ocean with orange and purple clouds",
        n: 1,
        size: "1024x1024"
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`测试用例: ${testCase.name}`);
    console.log(`请求体: ${JSON.stringify(testCase.payload, null, 2)}\n`);

    try {
      const startTime = Date.now();

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testCase.payload),
      });

      const elapsed = Date.now() - startTime;

      console.log(`响应状态: ${response.status} ${response.statusText}`);
      console.log(`响应时间: ${elapsed}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`错误响应: ${errorText}`);
        console.log("\n❌ 测试失败\n");
        continue;
      }

      const data = await response.json();

      console.log("\n响应数据结构:");
      console.log(JSON.stringify(data, null, 2));

      // 检查响应格式
      if (data.data && Array.isArray(data.data)) {
        console.log(`\n✅ 成功生成 ${data.data.length} 张图片`);

        data.data.forEach((item, index) => {
          if (item.url) {
            console.log(`  图片 ${index + 1} URL: ${item.url.substring(0, 50)}...`);
          } else if (item.b64_json) {
            console.log(`  图片 ${index + 1}: Base64 数据 (长度: ${item.b64_json.length})`);
          }
        });

        console.log("\n✅ 测试通过\n");
      } else {
        console.log("\n⚠️ 响应格式不符合 OpenAI 标准");
        console.log("\n❓ 测试结果不确定\n");
      }

    } catch (error) {
      console.log(`\n❌ 请求失败: ${error.message}`);

      if (error.cause) {
        console.log(`原因: ${error.cause}`);
      }

      console.log("\n❌ 测试失败\n");
    }

    console.log("====================================\n");
  }

  // 测试其他可能的端点
  console.log("\n测试其他可能的端点...\n");

  const baseUrls = [
    "http://10.162.5.211:9998/v1/models",
    "http://10.162.5.211:9998/models",
  ];

  for (const url of baseUrls) {
    console.log(`GET ${url}`);
    try {
      const response = await fetch(url, { method: "GET" });
      console.log(`  状态: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`  响应: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      console.log(`  失败: ${error.message}`);
    }
    console.log("");
  }
}

// 运行测试
testZImageAPI().catch(console.error);
