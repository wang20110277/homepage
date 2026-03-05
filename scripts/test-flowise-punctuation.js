/**
 * Flowise 标点符号纠错 API 测试脚本
 *
 * 使用方法:
 * node scripts/test-flowise-punctuation.js
 */

const API_URL = "http://10.162.5.211:3000/api/v1/prediction/1cde6a08-b7b6-488b-aa07-4129e1beac80";

async function testFlowiseApi() {
  console.log("=".repeat(60));
  console.log("Flowise 标点符号纠错 API 测试");
  console.log("=".repeat(60));
  console.log("API URL:", API_URL);
  console.log("");

  // 测试文本
  const testText = `这是一个测试文本，包含一些标点符号问题比如这里少了句号
另外这句话后面多了空格 。
"引号使用不正确"
还有英文标点,比如这个逗号,应该用中文逗号，`;

  console.log("测试文本:");
  console.log("-".repeat(40));
  console.log(testText);
  console.log("-".repeat(40));
  console.log("");

  try {
    console.log("正在调用 Flowise API...");
    const startTime = Date.now();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: testText,
      }),
    });

    const endTime = Date.now();
    console.log("响应状态:", response.status, response.statusText);
    console.log("响应时间:", endTime - startTime, "ms");
    console.log("");

    // 获取原始响应文本
    const rawText = await response.text();
    console.log("原始响应 (Raw):");
    console.log("-".repeat(40));
    console.log(rawText);
    console.log("-".repeat(40));
    console.log("");

    // 尝试解析为 JSON
    try {
      const jsonData = JSON.parse(rawText);
      console.log("解析后的 JSON:");
      console.log("-".repeat(40));
      console.log(JSON.stringify(jsonData, null, 2));
      console.log("-".repeat(40));
      console.log("");

      // 分析返回结构
      console.log("返回结构分析:");
      console.log("-".repeat(40));
      console.log("- 类型:", typeof jsonData);
      console.log("- 是数组:", Array.isArray(jsonData));

      if (typeof jsonData === 'object' && jsonData !== null) {
        console.log("- 顶层键:", Object.keys(jsonData).join(', '));

        // 检查常见字段
        const commonFields = ['text', 'result', 'answer', 'output', 'data', 'content', 'message'];
        for (const field of commonFields) {
          if (jsonData[field] !== undefined) {
            console.log(`- 发现字段 "${field}":`);
            console.log("  类型:", typeof jsonData[field]);
            const preview = String(jsonData[field]).substring(0, 100);
            console.log("  值预览:", preview + (String(jsonData[field]).length > 100 ? "..." : ""));
          }
        }
      }
      console.log("-".repeat(40));

    } catch (parseError) {
      console.log("响应不是有效的 JSON 格式");
      console.log("解析错误:", parseError.message);
    }

  } catch (error) {
    console.error("请求失败:", error.message);
  }
}

testFlowiseApi();
