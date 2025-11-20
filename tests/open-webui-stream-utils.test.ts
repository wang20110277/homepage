import { describe, expect, it } from "vitest";
import { extractToken, toSseChunk } from "@/lib/open-webui/stream-utils";

describe("OpenWebUI stream helpers", () => {
  it("generates valid SSE chunks", () => {
    const chunk = toSseChunk({ type: "token", token: "hello" });
    expect(chunk.trim()).toBe('data: {"type":"token","token":"hello"}');
  });

  it("extracts plain string content", () => {
    expect(extractToken("hello")).toBe("hello");
  });

  it("extracts nested array tokens", () => {
    const token = extractToken([
      { text: "foo" },
      { text: "bar" },
    ]);
    expect(token).toBe("foobar");
  });

  it("returns empty string for unsupported payloads", () => {
    expect(extractToken({})).toBe("");
  });
});


