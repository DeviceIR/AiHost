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

async function askOpenAICompatible({ provider, prompt, history, attachments = [] }: AskAiParams) {
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

  const response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.modelId,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Provider error: ${message}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() || "No response";
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

async function askOpenAIResponses({ provider, prompt, history, attachments = [] }: AskAiParams) {
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

  const response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.modelId,
      input,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Provider error: ${message}`);
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  if (data.output_text?.trim()) {
    return data.output_text.trim();
  }

  const extracted = data.output
    ?.flatMap((item) => item.content || [])
    .filter((item) => item.type?.includes("text") && item.text)
    .map((item) => item.text as string)
    .join("\n")
    .trim();

  return extracted || "No response";
}

async function askGemini({ provider, prompt, attachments = [], history }: AskAiParams) {
  const normalizedModelId = provider.modelId.replace(/^models\//, "").trim();
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
      parts.push({ text: `Attached file ${attachment.fileName}: ${Buffer.from(attachment.contentBase64, "base64").toString("utf8").slice(0, 4000)}` });
    }
  }

  contents.push({ role: "user", parts });

  const response = await fetch(
    `${provider.baseUrl.replace(/\/$/, "")}/models/${normalizedModelId}:generateContent?key=${provider.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini error: ${message}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "No response";
}

export async function askAi(params: AskAiParams) {
  const effectiveApiKey =
    params.provider.apiKey.trim() ||
    (params.provider.type === ProviderType.OPENAI ? process.env.OPENAI_API_KEY?.trim() || "" : "");

  if (!effectiveApiKey) {
    throw new Error("This model has no API key configured by manager.");
  }

  const withKey = {
    ...params,
    provider: {
      ...params.provider,
      apiKey: effectiveApiKey,
    },
  };

  if (withKey.provider.type === ProviderType.GEMINI) {
    return askGemini(withKey);
  }

  if (withKey.provider.type === ProviderType.OPENAI) {
    return askOpenAIResponses(withKey);
  }

  return askOpenAICompatible(withKey);
}
