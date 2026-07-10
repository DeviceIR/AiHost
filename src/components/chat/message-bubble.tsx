"use client";

import { motion } from "framer-motion";
import { Check, Copy, FileText, Paperclip } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MessageView } from "@/types/chat";

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div className="thinking-loader">
      <span />
      <span />
      <span />
      <strong>{label}</strong>
    </div>
  );
}

export function MessageBubble({
  message,
  thinkingLabel,
}: {
  message: MessageView;
  thinkingLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isError = message.status === "error";

  const copyContent = async () => {
    if (!message.content) return;
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn("group flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative max-w-[min(42rem,92%)] rounded-2xl px-4 py-3 shadow-sm",
          isUser
            ? "bg-primary text-primaryText"
            : isError
              ? "border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200"
              : "border border-border/60 bg-card/95 text-text backdrop-blur",
        )}
      >
        {!isUser && message.model?.label ? (
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{message.model.label}</p>
        ) : null}

        {message.status === "thinking" ? (
          <ThinkingIndicator label={thinkingLabel} />
        ) : isUser ? (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose-chat text-[15px] leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || " "}</ReactMarkdown>
            {message.status === "streaming" ? <span className="typing-caret">|</span> : null}
          </div>
        )}

        {message.attachments.length ? (
          <div className={cn("mt-2.5 flex flex-wrap gap-2", isUser ? "text-primaryText/90" : "text-muted")}>
            {message.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={`/api/uploads/${attachment.id}`}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition",
                  isUser ? "bg-black/10 hover:bg-black/15" : "bg-bg/80 hover:bg-bg",
                )}
              >
                {attachment.mimeType?.startsWith("image/") ? <Paperclip size={12} /> : <FileText size={12} />}
                <span className="max-w-[10rem] truncate">{attachment.fileName}</span>
              </a>
            ))}
          </div>
        ) : null}

        {!isUser && message.content && message.status !== "thinking" ? (
          <div className="mt-2 flex justify-end opacity-0 transition group-hover:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted"
              onClick={() => void copyContent()}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
