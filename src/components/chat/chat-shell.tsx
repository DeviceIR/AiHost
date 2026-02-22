"use client";

import { format } from "date-fns";
import { Plus, Send, Settings, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { UserRole } from "@prisma/client";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type Chat = {
  id: string;
  title: string;
  updatedAt: string;
};

type Model = {
  id: string;
  label: string;
  isFree: boolean;
  providerConfig: { name: string };
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments: Array<{ id: string; fileName: string }>;
};

type MessageView = Message & { status?: "thinking" | "typing" };

type SendMessageVars = {
  promptText: string;
  modelId: string;
  selectedFiles: File[];
  baseMessages: MessageView[];
  optimisticUserMessage: MessageView;
};

type SendMessageResponse = {
  userMessage?: Message;
  assistantMessage?: Message;
};

export function ChatShell({ locale, chatId, role }: { locale: string; chatId: string; role: UserRole }) {
  const t = useTranslations("chat");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [uiMessages, setUiMessages] = useState<MessageView[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTypingTimer = () => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  const chatsQuery = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const response = await fetch("/api/chats");
      if (!response.ok) throw new Error("Cannot load chats");
      return (await response.json()) as Chat[];
    },
  });

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const response = await fetch("/api/models");
      if (!response.ok) throw new Error("Cannot load models");
      return (await response.json()) as Model[];
    },
  });

  const chatQuery = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const response = await fetch(`/api/chats/${chatId}`);
      if (!response.ok) throw new Error("Cannot load chat");
      return (await response.json()) as { id: string; messages: Message[] };
    },
    enabled: Boolean(chatId),
  });

  const createChat = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New chat" }),
      });
      if (!response.ok) throw new Error("Cannot create chat");
      return (await response.json()) as Chat;
    },
    onSuccess: (chat) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      router.push(`/${locale}/chat/${chat.id}`);
    },
  });

  const effectiveModelId = selectedModelId || modelsQuery.data?.[0]?.id || "";
  const renderedMessages = useMemo(
    () => uiMessages ?? ((chatQuery.data?.messages as MessageView[] | undefined) || []),
    [uiMessages, chatQuery.data?.messages],
  );

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [renderedMessages]);

  useEffect(() => () => stopTypingTimer(), []);

  const sendMessage = useMutation({
    mutationFn: async ({ promptText, modelId, selectedFiles }: SendMessageVars) => {
      const formData = new FormData();
      formData.append("prompt", promptText);
      formData.append("modelId", modelId);
      selectedFiles.forEach((file) => formData.append("files", file));

      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Cannot send message");
      }

      return (await response.json()) as SendMessageResponse;
    },
    onSuccess: (data, vars) => {
      stopTypingTimer();

      const persistedUser = data.userMessage || vars.optimisticUserMessage;
      const assistantSource = data.assistantMessage?.content?.trim() || "No response";
      const assistantMessage: MessageView = {
        id: data.assistantMessage?.id || `temp-assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: data.assistantMessage?.createdAt || new Date().toISOString(),
        attachments: data.assistantMessage?.attachments || [],
        status: "typing",
      };

      setUiMessages([...vars.baseMessages, persistedUser, assistantMessage]);

      const tokens = Array.from(assistantSource);
      if (!tokens.length) {
        setUiMessages((previous) => {
          if (!previous?.length) return previous;
          const next = [...previous];
          next[next.length - 1] = { ...next[next.length - 1], content: "No response", status: undefined };
          return next;
        });
        void queryClient.refetchQueries({ queryKey: ["chat", chatId], type: "active" });
        void queryClient.refetchQueries({ queryKey: ["chats"], type: "active" });
        setUiMessages(null);
        return;
      }

      let index = 0;
      typingTimerRef.current = setInterval(() => {
        const chunk = Math.max(1, Math.ceil(tokens.length / 80));
        index = Math.min(tokens.length, index + chunk);
        const partialText = tokens.slice(0, index).join("");

        setUiMessages((previous) => {
          if (!previous?.length) return previous;
          const next = [...previous];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: partialText,
            status: index >= tokens.length ? undefined : "typing",
          };
          return next;
        });

        if (index >= tokens.length) {
          stopTypingTimer();
          void queryClient.refetchQueries({ queryKey: ["chat", chatId], type: "active" });
          void queryClient.refetchQueries({ queryKey: ["chats"], type: "active" });
          setUiMessages(null);
        }
      }, 22);
    },
    onError: (error, vars) => {
      stopTypingTimer();
      const fallbackAssistant: MessageView = {
        id: `temp-assistant-error-${Date.now()}`,
        role: "assistant",
        content: error.message || "Cannot send message",
        createdAt: new Date().toISOString(),
        attachments: [],
      };
      setUiMessages([...vars.baseMessages, vars.optimisticUserMessage, fallbackAssistant]);
    },
  });

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 border-r border-border/70 bg-card/90 p-4 backdrop-blur md:block">
        <button
          type="button"
          onClick={() => createChat.mutate()}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-primaryText shadow-sm transition hover:brightness-110"
        >
          <Plus size={16} /> {t("newChat")}
        </button>
        <h3 className="mb-2 text-sm font-semibold">{t("history")}</h3>
        <div className="space-y-2">
          {chatsQuery.data?.map((chat) => (
            <Link
              key={chat.id}
              href={`/${locale}/chat/${chat.id}`}
              className={`block rounded-xl border px-3 py-2 text-sm transition ${chat.id === chatId ? "border-primary/70 bg-bg shadow-sm" : "border-border bg-card hover:border-primary/40"}`}
            >
              <p className="truncate">{chat.title}</p>
              <p className="text-xs text-muted">{format(new Date(chat.updatedAt), "MMM d, HH:mm")}</p>
            </Link>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => createChat.mutate()}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm md:hidden"
            >
              {t("newChat")}
            </button>
            <ThemeToggle />
            <LocaleToggle />
            {role === "MANAGER" ? (
              <Link href={`/${locale}/admin`} className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-sm transition hover:border-primary/50">
                <Settings size={14} /> Admin
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-sm transition hover:border-primary/50"
          >
            <User size={14} /> Logout
          </button>
        </div>

        <section className="mb-4 h-[60vh] overflow-y-auto rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur">
          <div className="space-y-3">
            {renderedMessages.map((message) => (
              <div
                key={message.id}
                className={`max-w-3xl rounded-xl border px-3 py-2 ${message.role === "assistant" ? "border-border/70 bg-bg/90 text-text" : "ml-auto border-primary/30 bg-primary text-primaryText"}`}
              >
                {message.status === "thinking" ? (
                  <div className="thinking-loader">
                    <span />
                    <span />
                    <span />
                    <strong>Thinking</strong>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm">
                    {message.content}
                    {message.status === "typing" ? <span className="typing-caret">|</span> : null}
                  </p>
                )}
                {message.attachments.length ? (
                  <div className="mt-2 space-y-1 text-xs">
                    {message.attachments.map((attachment) => (
                      <a key={attachment.id} href={`/api/uploads/${attachment.id}`} target="_blank" rel="noreferrer" className="block underline">
                        {attachment.fileName}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            <div ref={endOfMessagesRef} />
          </div>
        </section>

        <form
          className="space-y-2 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur"
          onSubmit={(event) => {
            event.preventDefault();
            if (sendMessage.isPending) return;
            if (!effectiveModelId) return;

            const promptText = prompt.trim();
            const selectedFiles = files ? Array.from(files) : [];
            if (!promptText && !selectedFiles.length) return;

            const baseMessages = (chatQuery.data?.messages as MessageView[] | undefined) || [];
            const optimisticUserMessage: MessageView = {
              id: `temp-user-${Date.now()}`,
              role: "user",
              content: promptText || selectedFiles.map((file) => `[file] ${file.name}`).join("\n"),
              createdAt: new Date().toISOString(),
              attachments: selectedFiles.map((file, index) => ({
                id: `temp-file-${index}-${Date.now()}`,
                fileName: file.name,
              })),
            };
            const optimisticAssistantMessage: MessageView = {
              id: `temp-assistant-${Date.now()}`,
              role: "assistant",
              content: "",
              createdAt: new Date().toISOString(),
              attachments: [],
              status: "thinking",
            };

            setUiMessages([...baseMessages, optimisticUserMessage, optimisticAssistantMessage]);
            setPrompt("");
            setFiles(null);
            if (fileInputRef.current) fileInputRef.current.value = "";

            sendMessage.mutate({
              promptText,
              modelId: effectiveModelId,
              selectedFiles,
              baseMessages,
              optimisticUserMessage,
            });
          }}
        >
          <div className="grid gap-2 md:grid-cols-4">
            <select
              value={effectiveModelId}
              onChange={(event) => setSelectedModelId(event.target.value)}
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            >
              {modelsQuery.data?.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label} ({model.providerConfig.name}) {model.isFree ? "Free" : "Pro"}
                </option>
              ))}
            </select>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(event) => setFiles(event.target.files)}
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            />
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={t("placeholder")}
              className="md:col-span-2 rounded-xl border border-border bg-bg px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={sendMessage.isPending || !effectiveModelId}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primaryText disabled:opacity-60"
          >
            <Send size={16} /> {t("send")}
          </button>
          {sendMessage.error ? <p className="text-sm text-red-600">{sendMessage.error.message}</p> : null}
        </form>
      </main>
    </div>
  );
}
