"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { readMessageStream } from "@/lib/chat/stream-client";
import type { ChatMessage, ChatModel, ChatSummary, MessageView } from "@/types/chat";

type UseChatControllerArgs = {
  locale: string;
  chatId: string;
};

export function useChatController({ locale, chatId }: UseChatControllerArgs) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [uiMessages, setUiMessages] = useState<MessageView[] | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const chatsQuery = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const response = await fetch("/api/chats");
      if (!response.ok) throw new Error("Cannot load chats");
      return (await response.json()) as ChatSummary[];
    },
  });

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const response = await fetch("/api/models");
      if (!response.ok) throw new Error("Cannot load models");
      return (await response.json()) as ChatModel[];
    },
  });

  const chatQuery = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const response = await fetch(`/api/chats/${chatId}`);
      if (!response.ok) throw new Error("Cannot load chat");
      return (await response.json()) as { id: string; title: string; messages: ChatMessage[] };
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
      return (await response.json()) as ChatSummary;
    },
    onSuccess: (chat) => {
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
      router.push(`/${locale}/chat/${chat.id}`);
    },
  });

  const effectiveModelId = selectedModelId || modelsQuery.data?.[0]?.id || "";
  const renderedMessages = useMemo(
    () => uiMessages ?? ((chatQuery.data?.messages as MessageView[] | undefined) || []),
    [uiMessages, chatQuery.data?.messages],
  );

  useEffect(() => {
    setUiMessages(null);
    setError(null);
    setPrompt("");
    setFiles([]);
  }, [chatId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(async () => {
    if (isStreaming || !effectiveModelId) return;

    const promptText = prompt.trim();
    if (!promptText && !files.length) return;

    const baseMessages = (chatQuery.data?.messages as MessageView[] | undefined) || [];
    const optimisticUserMessage: MessageView = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: promptText || files.map((file) => `[file] ${file.name}`).join("\n"),
      createdAt: new Date().toISOString(),
      attachments: files.map((file, index) => ({
        id: `temp-file-${index}-${Date.now()}`,
        fileName: file.name,
        mimeType: file.type,
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

    setError(null);
    setUiMessages([...baseMessages, optimisticUserMessage, optimisticAssistantMessage]);
    setPrompt("");
    const selectedFiles = [...files];
    setFiles([]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const formData = new FormData();
      formData.append("prompt", promptText);
      formData.append("modelId", effectiveModelId);
      selectedFiles.forEach((file) => formData.append("files", file));

      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Cannot send message");
      }

      let streamedContent = "";

      for await (const event of readMessageStream(response)) {
        if (event.type === "user") {
          setUiMessages((previous) => {
            if (!previous?.length) return previous;
            const next = [...previous];
            next[next.length - 2] = { ...event.message, status: undefined };
            return next;
          });
          continue;
        }

        if (event.type === "token") {
          streamedContent += event.text;
          setUiMessages((previous) => {
            if (!previous?.length) return previous;
            const next = [...previous];
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: streamedContent,
              status: "streaming",
            };
            return next;
          });
          continue;
        }

        if (event.type === "done") {
          setUiMessages((previous) => {
            if (!previous?.length) return previous;
            const next = [...previous];
            next[next.length - 1] = { ...event.message, status: undefined };
            return next;
          });
          void queryClient.invalidateQueries({ queryKey: ["chats"] });
          void queryClient.refetchQueries({ queryKey: ["chat", chatId], type: "active" });
          setUiMessages(null);
          continue;
        }

        if (event.type === "error") {
          throw new Error(event.error);
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setUiMessages((previous) => {
          if (!previous?.length) return previous;
          const next = [...previous];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              content: last.content || "Response stopped.",
              status: undefined,
            };
          }
          return next;
        });
        void queryClient.refetchQueries({ queryKey: ["chat", chatId], type: "active" });
        setTimeout(() => setUiMessages(null), 300);
      } else {
        const message = err instanceof Error ? err.message : "Cannot send message";
        setError(message);
        setUiMessages((previous) => {
          if (!previous?.length) return previous;
          const next = [...previous];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: message,
            status: "error",
          };
          return next;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [chatId, chatQuery.data?.messages, effectiveModelId, files, isStreaming, prompt, queryClient]);

  return {
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
  };
}
