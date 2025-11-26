export function toSseChunk(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function extractToken(delta: unknown): string {
  if (!delta) {
    return "";
  }

  if (typeof delta === "string") {
    return delta;
  }

  if (Array.isArray(delta)) {
    return delta
      .map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }
        if (entry && typeof entry === "object" && "text" in entry) {
          const value = (entry as { text?: string }).text;
          return typeof value === "string" ? value : "";
        }
        return "";
      })
      .join("");
  }

  if (delta && typeof delta === "object" && "content" in delta) {
    return extractToken((delta as { content?: unknown }).content);
  }

  return "";
}
