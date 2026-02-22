import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

export async function GET(_: Request, context: { params: Promise<{ chatId: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await context.params;

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: session.user.id },
    include: {
      messages: {
        include: { attachments: true, model: { select: { label: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(chat);
}
