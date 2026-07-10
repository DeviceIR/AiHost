import type { StreamEvent } from "@/types/chat";

export async function* readMessageStream(
  response: Response,
): AsyncGenerator<StreamEvent> {
  if (!response.body) {
    throw new Error("Empty response stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part
        .split("\n")
        .map((item) => item.trim())
        .find((item) => item.startsWith("data:"));

      if (!line) continue;

      const payload = line.slice(5).trim();
      if (!payload) continue;

      yield JSON.parse(payload) as StreamEvent;
    }
  }
}
