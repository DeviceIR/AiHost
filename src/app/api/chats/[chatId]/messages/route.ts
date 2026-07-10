import { UserRole } from "@prisma/client";

import { streamAi } from "@/lib/ai/client";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { persistUpload } from "@/lib/uploads";
import { truncate } from "@/lib/utils";
import type { ChatMessage, StreamEvent } from "@/types/chat";

function encodeEvent(event: StreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function toChatMessage(message: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  attachments?: Array<{ id: string; fileName: string; mimeType: string }>;
  model?: { label: string } | null;
}): ChatMessage {
  return {
    id: message.id,
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    attachments: (message.attachments || []).map((item) => ({
      id: item.id,
      fileName: item.fileName,
      mimeType: item.mimeType,
    })),
    model: message.model ?? null,
  };
}

export async function POST(request: Request, context: { params: Promise<{ chatId: string }> }) {
  const session = await requireSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await context.params;

  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: session.user.id } });
  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const prompt = String(formData.get("prompt") || "").trim();
  const modelId = String(formData.get("modelId") || "").trim();

  if (!prompt && !formData.getAll("files").length) {
    return Response.json({ error: "Empty message" }, { status: 400 });
  }

  const model = await prisma.aIModel.findFirst({
    where: { id: modelId, isActive: true },
    include: { providerConfig: true },
  });

  if (!model || !model.providerConfig.isActive) {
    return Response.json({ error: "Model unavailable" }, { status: 400 });
  }

  if (session.user.role === UserRole.MEMBER && !model.isFree) {
    return Response.json({ error: "This model is only for VIP/Manager users" }, { status: 403 });
  }

  const uploads = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File && item.size > 0)
    .slice(0, 4);

  const uploaded = await Promise.all(uploads.map((file) => persistUpload(file)));

  const userMessage = await prisma.message.create({
    data: {
      chatId,
      role: "user",
      content: prompt || uploaded.map((item) => `[file] ${item.fileName}`).join("\n"),
      modelId: model.id,
      attachments: {
        create: uploaded.map((item) => ({
          fileName: item.fileName,
          mimeType: item.mimeType,
          size: item.size,
          path: item.path,
        })),
      },
    },
    include: { attachments: true, model: { select: { label: true } } },
  });

  const history = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  const normalizedHistory = history
    .filter((item) => item.id !== userMessage.id)
    .map((item) => ({
      role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: item.content,
    }));

  const encoder = new TextEncoder();
  const abortController = new AbortController();

  request.signal.addEventListener("abort", () => {
    abortController.abort();
  });

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: StreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          closed = true;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      send({ type: "user", message: toChatMessage(userMessage) });

      let answer = "";

      try {
        for await (const chunk of streamAi({
          provider: {
            type: model.providerConfig.type,
            baseUrl: model.providerConfig.baseUrl,
            apiKey: model.providerConfig.apiKey,
            modelId: model.modelId,
          },
          prompt,
          history: normalizedHistory,
          attachments: uploaded.map((item) => ({
            fileName: item.fileName,
            mimeType: item.mimeType,
            contentBase64: item.contentBase64,
          })),
          signal: abortController.signal,
        })) {
          if (abortController.signal.aborted) break;
          answer += chunk;
          send({ type: "token", text: chunk });
        }

        const aborted = abortController.signal.aborted;
        const finalContent = answer.trim() || (aborted ? "Response stopped." : "No response");

        const assistantMessage = await prisma.message.create({
          data: {
            chatId,
            role: "assistant",
            content: finalContent,
            modelId: model.id,
          },
          include: { attachments: true, model: { select: { label: true } } },
        });

        let chatTitle: string | undefined;
        if (chat.title === "New chat") {
          chatTitle = truncate(prompt || "New chat");
          await prisma.chat.update({ where: { id: chatId }, data: { title: chatTitle } });
        }

        send({ type: "done", message: toChatMessage(assistantMessage), chatTitle });
      } catch (error) {
        if (abortController.signal.aborted) {
          try {
            const assistantMessage = await prisma.message.create({
              data: {
                chatId,
                role: "assistant",
                content: answer.trim() || "Response stopped.",
                modelId: model.id,
              },
              include: { attachments: true, model: { select: { label: true } } },
            });
            send({ type: "done", message: toChatMessage(assistantMessage) });
          } catch {
            send({ type: "error", error: "Request cancelled" });
          }
        } else {
          const message = error instanceof Error ? error.message : "AI request failed";
          send({ type: "error", error: message });
        }
      } finally {
        close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
