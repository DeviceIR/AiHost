import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ChatIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const session = await getServerSession(authOptions);
  const { locale } = await params;

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const latestChat = await prisma.chat.findFirst({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  if (latestChat) {
    redirect(`/${locale}/chat/${latestChat.id}`);
  }

  const newChat = await prisma.chat.create({
    data: { userId: session.user.id, title: "New chat" },
  });

  redirect(`/${locale}/chat/${newChat.id}`);
}
