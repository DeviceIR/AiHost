import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { ChatShell } from "@/components/chat/chat-shell";
import { authOptions } from "@/lib/auth";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string; chatId: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { locale, chatId } = await params;

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return <ChatShell locale={locale} chatId={chatId} role={session.user.role} />;
}
