"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageSquarePlus } from "lucide-react";

import { MessageBubble } from "@/components/chat/message-bubble";
import { useAutoScroll } from "@/components/chat/hooks/use-auto-scroll";
import type { MessageView } from "@/types/chat";

export function MessageList({
  messages,
  thinkingLabel,
  emptyTitle,
  emptyDescription,
}: {
  messages: MessageView[];
  thinkingLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const { containerRef, endRef, onScroll } = useAutoScroll(messages);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto px-4 py-6 md:px-8"
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="m-auto flex max-w-md flex-col items-center text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-card/90 shadow-sm">
              <MessageSquarePlus className="text-primary" size={24} />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">{emptyTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{emptyDescription}</p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} thinkingLabel={thinkingLabel} />
            ))}
          </AnimatePresence>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
