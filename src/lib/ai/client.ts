import { Buffer } from "node:buffer";

import { ProviderType } from "@prisma/client";

export type UploadedInput = {
  fileName: string;
  mimeType: string;
  contentBase64: string;
};

type AskAiParams = {
  provider: {
    type: ProviderType;
    baseUrl: string;
    apiKey: string;
    modelId: string;
  };
  prompt: string;
  history: { role: "user" | "assistant"; content: string }[];
  attachments?: UploadedInput[];
  signal?: AbortSignal;
};

function mapOpenAIContent(prompt: string, attachments: UploadedInput[] = []) {
  const blocks: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];

  for (const attachment of attachments) {
    if (attachment.mimeType.startsWith("image/")) {
      blocks.push({
        type: "image_url",
        image_url: {
          url: `data:${attachment.mimeType};base64,${attachment.contentBase64}`,
        },
      });
    } else if (attachment.mimeType.startsWith("text/")) {
      blocks.push({
        type: "text",
        text: `Attached file ${attachment.fileName}: ${Buffer.from(attachment.contentBase64, "base64").toString("utf8").slice(0, 4000)}`,
      });
    } else {
      blocks.push({
        type: "text",
        text: `Attached file ${attachment.fileName} (${attachment.mimeType}) cannot be parsed directly.`,
      });
    }
  }

  return blocks;
}

function buildOpenAICompatibleMessages({ prompt, history, attachments = [] }: AskAiParams) {
  const messages: Array<Record<string, unknown>> = history.map((item) => ({
    role: item.role,
    content: item.content,
  }));

  const hasImageAttachment = attachments.some((item) => item.mimeType.startsWith("image/"));

  if (hasImageAttachment) {
    messages.push({
      role: "user",
      content: mapOpenAIContent(prompt, attachments),
    });
  } else {
    const textAttachments = attachments
      .map((item) => {
        if (item.mimeType.startsWith("text/")) {
          return `Attached file ${item.fileName}: ${Buffer.from(item.contentBase64, "base64").toString("utf8").slice(0, 4000)}`;
        }
        return `Attached file ${item.fileName} (${item.mimeType})`;
      })
      .join("\n");

    const mergedContent = [prompt, textAttachments].filter(Boolean).join("\n\n").trim();
    messages.push({
      role: "user",
      content: mergedContent,
    });
  }

  return messages;
}

function mapOpenAIResponsesContent(prompt: string, attachments: UploadedInput[] = []) {
  const blocks: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }];

  for (const attachment of attachments) {
    if (attachment.mimeType.startsWith("image/")) {
      blocks.push({
        type: "input_image",
        image_url: `data:${attachment.mimeType};base64,${attachment.contentBase64}`,
      });
    } else if (attachment.mimeType.startsWith("text/")) {
      blocks.push({
        type: "input_text",
        text: `Attached file ${attachment.fileName}: ${Buffer.from(attachment.contentBase64, "base64").toString("utf8").slice(0, 4000)}`,
      });
    } else {
      blocks.push({
        type: "input_text",
        text: `Attached file ${attachment.fileName} (${attachment.mimeType}) cannot be parsed directly.`,
      });
    }
  }

  return blocks;
}

function buildOpenAIResponsesInput({ prompt, history, attachments = [] }: AskAiParams) {
  const input: Array<Record<string, unknown>> = history.map((item) => ({
    role: item.role,
    content: item.content,
  }));

  const hasImageAttachment = attachments.some((item) => item.mimeType.startsWith("image/"));

  if (hasImageAttachment) {
    input.push({
      role: "user",
      content: mapOpenAIResponsesContent(prompt, attachments),
    });
  } else {
    const textAttachments = attachments
      .map((item) => {
        if (item.mimeType.startsWith("text/")) {
          return `Attached file ${item.fileName}: ${Buffer.from(item.contentBase64, "base64").toString("utf8").slice(0, 4000)}`;
        }
        return `Attached file ${item.fileName} (${item.mimeType})`;
      })
      .join("\n");

    const mergedContent = [prompt, textAttachments].filter(Boolean).join("\n\n").trim();
    input.push({
      role: "user",
      content: mergedContent,
    });
  }

  return input;
}

function buildGeminiContents({ prompt, history, attachments = [] }: AskAiParams) {
  const contents: Array<Record<string, unknown>> = [];

  for (const item of history) {
    contents.push({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    });
  }

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  for (const attachment of attachments) {
    if (attachment.mimeType.startsWith("image/")) {
      parts.push({
        inline_data: {
          mime_type: attachment.mimeType,
          data: attachment.contentBase64,
        },
      });
    } else if (attachment.mimeType.startsWith("text/")) {
      parts.push({
        text: `Attached file ${attachment.fileName}: ${Buffer.from(attachment.contentBase64, "base64").toString("utf8").slice(0, 4000)}`,
      });
    }
  }

  contents.push({ role: "user", parts });
  return contents;
}

async function* parseSseStream(response: Response): AsyncGenerator<string> {
  if (!response.body) {
    throw new Error("Provider returned an empty stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;

      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string }; text?: string }>;
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          type?: string;
          delta?: string;
          text?: string;
        };

        const openAiChunk = parsed.choices?.[0]?.delta?.content;
        if (openAiChunk) {
          yield openAiChunk;
          continue;
        }

        const geminiChunk = parsed.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
        if (geminiChunk) {
          yield geminiChunk;
          continue;
        }

        if (parsed.type === "response.output_text.delta" && typeof parsed.delta === "string") {
          yield parsed.delta;
          continue;
        }

        if (typeof parsed.text === "string" && parsed.text) {
          yield parsed.text;
        }
      } catch {
        // Ignore malformed SSE chunks
      }
    }
  }
}

async function* streamOpenAICompatible(params: AskAiParams): AsyncGenerator<string> {
  const messages = buildOpenAICompatibleMessages(params);
  const response = await fetch(`${params.provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.provider.apiKey}`,
    },
    body: JSON.stringify({
      model: params.provider.modelId,
      messages,
      temperature: 0.7,
      stream: true,
    }),
    signal: params.signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Provider error: ${message}`);
  }

  yield* parseSseStream(response);
}

async function* streamOpenAIResponses(params: AskAiParams): AsyncGenerator<string> {
  const input = buildOpenAIResponsesInput(params);
  const response = await fetch(`${params.provider.baseUrl.replace(/\/$/, "")}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.provider.apiKey}`,
    },
    body: JSON.stringify({
      model: params.provider.modelId,
      input,
      stream: true,
    }),
    signal: params.signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Provider error: ${message}`);
  }

  yield* parseSseStream(response);
}

async function* streamGemini(params: AskAiParams): AsyncGenerator<string> {
  const normalizedModelId = params.provider.modelId.replace(/^models\//, "").trim();
  const contents = buildGeminiContents(params);

  const response = await fetch(
    `${params.provider.baseUrl.replace(/\/$/, "")}/models/${normalizedModelId}:streamGenerateContent?alt=sse&key=${params.provider.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
      signal: params.signal,
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini error: ${message}`);
  }

  yield* parseSseStream(response);
}

function withResolvedKey(params: AskAiParams): AskAiParams {
  const effectiveApiKey =
    params.provider.apiKey.trim() ||
    (params.provider.type === ProviderType.OPENAI ? process.env.OPENAI_API_KEY?.trim() || "" : "");

  if (!effectiveApiKey) {
    throw new Error("This model has no API key configured by manager.");
  }

  return {
    ...params,
    provider: {
      ...params.provider,
      apiKey: effectiveApiKey,
    },
  };
}

export async function* streamAi(params: AskAiParams): AsyncGenerator<string> {
  const withKey = withResolvedKey(params);

  if (withKey.provider.type === ProviderType.GEMINI) {
    yield* streamGemini(withKey);
    return;
  }

  if (withKey.provider.type === ProviderType.OPENAI) {
    yield* streamOpenAIResponses(withKey);
    return;
  }

  yield* streamOpenAICompatible(withKey);
}

export async function askAi(params: AskAiParams) {
  let answer = "";
  for await (const chunk of streamAi(params)) {
    answer += chunk;
  }
  return answer.trim() || "No response";
}
