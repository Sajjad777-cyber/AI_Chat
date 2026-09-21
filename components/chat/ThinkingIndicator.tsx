export function ThinkingIndicator() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      role="status"
      aria-live="polite"
      aria-label="Assistant is thinking"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
        AI
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
        <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
        <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
        <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
      </div>
    </div>
  );
}
