"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { MessageSquare, Plus, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatSummary } from "@/types/chat";

export function ChatSidebar({
  locale,
  chatId,
  chats,
  isLoading,
  newChatLabel,
  historyLabel,
  onCreateChat,
  isCreating,
  mobileOpen,
  onCloseMobile,
}: {
  locale: string;
  chatId: string;
  chats?: ChatSummary[];
  isLoading: boolean;
  newChatLabel: string;
  historyLabel: string;
  onCreateChat: () => void;
  isCreating: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const content = (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <MessageSquare size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">AiHost</p>
            <p className="text-[11px] text-muted">{historyLabel}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onCloseMobile} aria-label="Close sidebar">
          <X size={16} />
        </Button>
      </div>

      <Button
        variant="primary"
        className="mb-4 w-full"
        onClick={onCreateChat}
        disabled={isCreating}
      >
        <Plus size={16} />
        {newChatLabel}
      </Button>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-xl bg-border/40" />
            ))}
          </div>
        ) : (
          chats?.map((chat) => (
            <Link
              key={chat.id}
              href={`/${locale}/chat/${chat.id}`}
              onClick={onCloseMobile}
              className={cn(
                "block rounded-xl border px-3 py-2.5 text-sm transition duration-200",
                chat.id === chatId
                  ? "border-primary/50 bg-primary/10 shadow-sm"
                  : "border-transparent hover:border-border/80 hover:bg-bg/70",
              )}
            >
              <p className="truncate font-medium">{chat.title}</p>
              <p className="mt-0.5 text-[11px] text-muted">{format(new Date(chat.updatedAt), "MMM d, HH:mm")}</p>
            </Link>
          ))
        )}
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden h-full w-72 shrink-0 flex-col border-e border-border/60 bg-card/80 p-4 backdrop-blur-xl md:flex">
        {content}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-label="Close overlay"
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="absolute inset-y-0 start-0 flex w-[min(18rem,86vw)] flex-col border-e border-border/60 bg-card p-4 shadow-2xl"
          >
            {content}
          </motion.aside>
        </div>
      ) : null}
    </>
  );
}
