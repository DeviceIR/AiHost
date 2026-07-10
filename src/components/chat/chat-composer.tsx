"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Paperclip, Send, Square, X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatModel } from "@/types/chat";

export function ChatComposer({
  prompt,
  onPromptChange,
  files,
  onFilesChange,
  models,
  modelId,
  onModelChange,
  onSubmit,
  onStop,
  isStreaming,
  disabled,
  placeholder,
  modelsLabel,
  uploadLabel,
  sendLabel,
  stopLabel,
  error,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  models?: ChatModel[];
  modelId: string;
  onModelChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled: boolean;
  placeholder: string;
  modelsLabel: string;
  uploadLabel: string;
  sendLabel: string;
  stopLabel: string;
  error: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = () => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 180)}px`;
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-border/60 bg-card/70 px-4 py-4 backdrop-blur-xl md:px-8">
      <form
        className="mx-auto w-full max-w-3xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (isStreaming) return;
          onSubmit();
        }}
      >
        <AnimatePresence>
          {files.length ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 flex flex-wrap gap-2"
            >
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-bg/80 px-2.5 py-1.5 text-xs"
                >
                  <Paperclip size={12} className="text-muted" />
                  <span className="max-w-[10rem] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="rounded-md p-0.5 text-muted transition hover:bg-border/50 hover:text-text"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-bg/80 shadow-sm transition focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary),transparent_82%)]">
          <textarea
            ref={textareaRef}
            value={prompt}
            rows={1}
            placeholder={placeholder}
            disabled={isStreaming}
            onChange={(event) => {
              onPromptChange(event.target.value);
              resizeTextarea();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!isStreaming && !disabled) onSubmit();
              }
            }}
            className="max-h-[180px] min-h-[52px] w-full resize-none bg-transparent px-4 py-3.5 text-[15px] outline-none placeholder:text-muted/80 disabled:opacity-60"
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-border/50 px-3 py-2.5">
            <label className="sr-only" htmlFor="chat-model">
              {modelsLabel}
            </label>
            <select
              id="chat-model"
              value={modelId}
              onChange={(event) => onModelChange(event.target.value)}
              disabled={isStreaming}
              className="h-9 max-w-[12rem] rounded-xl border border-border/70 bg-card px-2.5 text-xs outline-none transition hover:border-primary/40 disabled:opacity-60 sm:max-w-[16rem] sm:text-sm"
            >
              {models?.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label} · {model.providerConfig.name} · {model.isFree ? "Free" : "Pro"}
                </option>
              ))}
            </select>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                const next = event.target.files ? Array.from(event.target.files) : [];
                onFilesChange([...files, ...next].slice(0, 4));
                event.target.value = "";
              }}
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              disabled={isStreaming || files.length >= 4}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={15} />
              <span className="hidden sm:inline">{uploadLabel}</span>
            </Button>

            <div className="ms-auto flex items-center gap-2">
              {isStreaming ? (
                <Button type="button" variant="danger" size="sm" onClick={onStop}>
                  <Square size={13} fill="currentColor" />
                  {stopLabel}
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={disabled || (!prompt.trim() && !files.length)}
                  className={cn(!prompt.trim() && !files.length && "opacity-50")}
                >
                  <Send size={15} />
                  {sendLabel}
                </Button>
              )}
            </div>
          </div>
        </div>

        {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
      </form>
    </div>
  );
}
