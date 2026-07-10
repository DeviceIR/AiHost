"use client";

import type { UserRole } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { MessageList } from "@/components/chat/message-list";
import { useChatController } from "@/components/chat/hooks/use-chat-controller";

export function ChatShell({ locale, chatId, role }: { locale: string; chatId: string; role: UserRole }) {
  const t = useTranslations("chat");
  const tCommon = useTranslations("common");
  const tAdmin = useTranslations("admin");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const {
    chatsQuery,
    modelsQuery,
    chatQuery,
    createChat,
    prompt,
    setPrompt,
    files,
    setFiles,
    effectiveModelId,
    setSelectedModelId,
    renderedMessages,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
  } = useChatController({ locale, chatId });

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-transparent">
      <ChatSidebar
        locale={locale}
        chatId={chatId}
        chats={chatsQuery.data}
        isLoading={chatsQuery.isLoading}
        newChatLabel={t("newChat")}
        historyLabel={t("history")}
        onCreateChat={() => createChat.mutate()}
        isCreating={createChat.isPending}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          locale={locale}
          role={role}
          title={chatQuery.data?.title || t("newChat")}
          adminLabel={tAdmin("title")}
          logoutLabel={tCommon("logout")}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
        />

        <MessageList
          messages={renderedMessages}
          thinkingLabel={t("thinking")}
          emptyTitle={t("emptyTitle")}
          emptyDescription={t("emptyDescription")}
        />

        <ChatComposer
          prompt={prompt}
          onPromptChange={setPrompt}
          files={files}
          onFilesChange={setFiles}
          models={modelsQuery.data}
          modelId={effectiveModelId}
          onModelChange={setSelectedModelId}
          onSubmit={() => void sendMessage()}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          disabled={!effectiveModelId || modelsQuery.isLoading}
          placeholder={t("placeholder")}
          modelsLabel={t("models")}
          uploadLabel={t("upload")}
          sendLabel={t("send")}
          stopLabel={t("stop")}
          error={error}
        />
      </main>
    </div>
  );
}
