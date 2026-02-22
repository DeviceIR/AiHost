"use client";

import { format } from "date-fns";
import { Plus, Send, Settings, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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

export function ChatShell({ locale, chatId, role }: { locale: string; chatId: string; role: UserRole }) {
  const t = useTranslations("chat");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [selectedModelId, setSelectedModelId] = useState("");

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

  useEffect(() => {
    if (!selectedModelId && modelsQuery.data?.[0]?.id) {
      setSelectedModelId(modelsQuery.data[0].id);
    }
  }, [modelsQuery.data, selectedModelId]);

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

  const sendMessage = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("modelId", selectedModelId);
      if (files) {
        Array.from(files).forEach((file) => formData.append("files", file));
      }

      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Cannot send message");
      }

      return response.json();
    },
    onSuccess: () => {
      setPrompt("");
      setFiles(null);
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 border-r border-border bg-card p-4 md:block">
        <button
          type="button"
          onClick={() => createChat.mutate()}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-primaryText"
        >
          <Plus size={16} /> {t("newChat")}
        </button>
        <h3 className="mb-2 text-sm font-semibold">{t("history")}</h3>
        <div className="space-y-2">
          {chatsQuery.data?.map((chat) => (
            <Link
              key={chat.id}
              href={`/${locale}/chat/${chat.id}`}
              className={`block rounded-xl border px-3 py-2 text-sm ${chat.id === chatId ? "border-primary bg-bg" : "border-border bg-card"}`}
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
              <Link href={`/${locale}/admin`} className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                <Settings size={14} /> Admin
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
          >
            <User size={14} /> Logout
          </button>
        </div>

        <section className="mb-4 h-[60vh] overflow-y-auto rounded-2xl border border-border bg-card p-4">
          <div className="space-y-3">
            {chatQuery.data?.messages?.map((message) => (
              <div
                key={message.id}
                className={`max-w-3xl rounded-xl border px-3 py-2 ${message.role === "assistant" ? "border-border bg-bg" : "ml-auto border-primary bg-primary text-primaryText"}`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
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
          </div>
        </section>

        <form
          className="space-y-2 rounded-2xl border border-border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage.mutate();
          }}
        >
          <div className="grid gap-2 md:grid-cols-4">
            <select
              value={selectedModelId}
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
            disabled={sendMessage.isPending}
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
