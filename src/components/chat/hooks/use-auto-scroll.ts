"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useAutoScroll(dependency: unknown) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  const onScroll = useCallback(() => {
    const node = containerRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    setStickToBottom(distance < 80);
  }, []);

  useEffect(() => {
    if (!stickToBottom) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [dependency, stickToBottom]);

  return { containerRef, endRef, onScroll, stickToBottom, setStickToBottom };
}
