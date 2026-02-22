import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { createChatSchema } from "@/lib/validators/schemas";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chats = await prisma.chat.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(chats);
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createChatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid chat payload" }, { status: 400 });
  }

  const chat = await prisma.chat.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title || "New chat",
    },
  });

  return NextResponse.json(chat);
}
