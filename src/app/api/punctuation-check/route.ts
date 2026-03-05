/**
 * 标点符号纠错 API
 *
 * 接收 Word 文档，提取文本内容，调用 Flowise API 进行标点纠错
 */

import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

const FLOWISE_API_URL = process.env.FLOWISE_PUNCTUATION_API_URL;

if (!FLOWISE_API_URL) {
  console.warn(
    "FLOWISE_PUNCTUATION_API_URL is not configured. Punctuation check feature will not work."
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!FLOWISE_API_URL) {
      return NextResponse.json(
        { error: "标点纠错服务未配置，请联系管理员" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "请上传文件" },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validTypes = [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "请上传 Word 文档 (.doc 或 .docx)" },
        { status: 400 }
      );
    }

    // 提取 Word 文档内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await mammoth.extractRawText({ buffer });
    const originalText = result.value;

    if (!originalText.trim()) {
      return NextResponse.json(
        { error: "文档内容为空" },
        { status: 400 }
      );
    }

    // 调用 Flowise API
    const flowiseResponse = await fetch(FLOWISE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: originalText,
      }),
    });

    if (!flowiseResponse.ok) {
      console.error("Flowise API error:", flowiseResponse.status, flowiseResponse.statusText);
      return NextResponse.json(
        { error: "标点纠错服务调用失败" },
        { status: 500 }
      );
    }

    const flowiseData = await flowiseResponse.json();
    const correctedText = flowiseData.text || "";

    return NextResponse.json({
      success: true,
      originalText,
      correctedText,
    });

  } catch (error) {
    console.error("Punctuation check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理失败" },
      { status: 500 }
    );
  }
}
