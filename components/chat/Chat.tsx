"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { JumpToLatest } from "./JumpToLatest";

const STORAGE_KEY = "ai-chat-messages";

// How close to the bottom (in px) counts as "at the bottom" for the
// purposes of auto-scroll. A small tolerance avoids flicker from
// sub-pixel rounding during layout.
const BOTTOM_THRESHOLD_PX = 80;

const SUGGESTIONS = [
  { label: "Explain something", prompt: "Can you explain how large language models work, in simple terms?" },
  { label: "Analyze my project", prompt: "I'd like help analyzing a project I'm working on. Where should I start?" },
  { label: "Help me plan", prompt: "Help me put together a plan to learn a new skill this month." },
];

export function Chat() {
  const [input, setInput] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Tracks whether the user has intentionally scrolled up, to distinguish
  // that from programmatic scrolling we trigger ourselves.
  const autoScrollLockRef = useRef(true);

  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isGenerating = status === "submitted" || status === "streaming";
  const isThinking = status === "submitted";

  // ---- Optional persistence (stretch goal): restore on mount ----------
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch {
      // Corrupted or unavailable storage — start with an empty conversation
      // rather than crashing the app.
    } finally {
      setHasHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Optional persistence: save after every change -------------------
  useEffect(() => {
    if (!hasHydrated) return; // don't overwrite storage before restore runs
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Storage full/unavailable — persistence is a nice-to-have, never
      // let it interrupt the live conversation.
    }
  }, [messages, hasHydrated]);

  // ---- Scroll handling ---------------------------------------------------
  const checkIsAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD_PX;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    autoScrollLockRef.current = true;
    setIsAtBottom(true);
  }, []);

  const handleScroll = useCallback(() => {
    const atBottom = checkIsAtBottom();
    autoScrollLockRef.current = atBottom;
    setIsAtBottom(atBottom);
  }, [checkIsAtBottom]);

  // Auto-scroll to bottom as new content streams in — but only while the
  // lock is engaged (i.e. the user hasn't manually scrolled up).
  useEffect(() => {
    if (autoScrollLockRef.current) {
      scrollToBottom("auto");
    }
  }, [messages, scrollToBottom]);

  // ---- Sending -----------------------------------------------------------
  function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isGenerating) return;
    if (error) clearError();
    setInput("");
    autoScrollLockRef.current = true;
    setIsAtBottom(true);
    sendMessage({ text: content });
  }

  const showEmptyState = messages.length === 0;

  return (
    <div className="flex h-dvh flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <header
        className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        <div>
          <h1 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
            AI Assistant
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Powered by Gemini</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Online
        </div>
      </header>

      {/* Scrollable message area */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto overflow-x-hidden"
        >
          <div className="mx-auto max-w-3xl py-4">
            {showEmptyState ? (
              <EmptyState onSuggestion={(prompt) => handleSend(prompt)} />
            ) : (
              messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                const streamingThisMessage =
                  isLastMessage && message.role === "assistant" && status === "streaming";
                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isStreaming={streamingThisMessage}
                  />
                );
              })
            )}

            {isThinking && <ThinkingIndicator />}

            {error && (
              <div className="mx-4 my-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <p>Something went wrong while generating the response. Please try again.</p>
              </div>
            )}
          </div>
        </div>

        <JumpToLatest visible={!isAtBottom && messages.length > 0} onClick={() => scrollToBottom("smooth")} />
      </div>

      {/* Composer */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => handleSend()}
        onStop={stop}
        isGenerating={isGenerating}
      />
    </div>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">How can I help?</h2>
      <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Ask a question, explore an idea, or get help with your project.
      </p>
      <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onSuggestion(s.prompt)}
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-left text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
