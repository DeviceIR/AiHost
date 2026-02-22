import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import { askAi } from "@/lib/ai/client";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { persistUpload } from "@/lib/uploads";
import { truncate } from "@/lib/utils";

export async function POST(request: Request, context: { params: Promise<{ chatId: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await context.params;

  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: session.user.id } });
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const prompt = String(formData.get("prompt") || "").trim();
  const modelId = String(formData.get("modelId") || "").trim();

  if (!prompt && !formData.getAll("files").length) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const model = await prisma.aIModel.findFirst({
    where: { id: modelId, isActive: true },
    include: { providerConfig: true },
  });

  if (!model || !model.providerConfig.isActive) {
    return NextResponse.json({ error: "Model unavailable" }, { status: 400 });
  }

  if (session.user.role === UserRole.MEMBER && !model.isFree) {
    return NextResponse.json({ error: "This model is only for VIP/Manager users" }, { status: 403 });
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
    include: { attachments: true },
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

  let answer = "";
  try {
    answer = await askAi({
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
    });
  } catch (error) {
    answer = error instanceof Error ? error.message : "AI request failed";
  }

  const assistantMessage = await prisma.message.create({
    data: {
      chatId,
      role: "assistant",
      content: answer,
      modelId: model.id,
    },
  });

  if (chat.title === "New chat") {
    await prisma.chat.update({ where: { id: chatId }, data: { title: truncate(prompt || "New chat") } });
  }

  return NextResponse.json({
    userMessage,
    assistantMessage,
  });
}
