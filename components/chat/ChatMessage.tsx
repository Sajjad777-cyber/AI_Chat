import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UIMessage } from "ai";

interface ChatMessageProps {
  message: UIMessage;
  isStreaming: boolean;
}

/**
 * Extracts plain text from a UIMessage's parts. useChat() (AI SDK v5) models
 * message content as an array of typed parts (text, tool calls, files,
 * etc). For this app we only render `text` parts, concatenated in order.
 */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/**
 * Renders Markdown in a way that tolerates unclosed syntax mid-stream.
 * react-markdown parses whatever text it's given independently each time;
 * an unterminated "**bold" or a fenced code block missing its closing
 * ``` simply renders as literal characters or an in-progress code block —
 * it never throws or visually collapses the layout. That's exactly the
 * "streaming-safe" behavior this app needs, so no special-casing is
 * required beyond re-rendering as new text arrives.
 */
function MessageContent({ text }: { text: string }) {
  return (
    <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none break-words prose-pre:overflow-x-auto prose-pre:max-w-full prose-p:leading-relaxed prose-headings:mt-3 prose-headings:mb-1.5">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

function ChatMessageInner({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";
  const text = getMessageText(message);

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1.5">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-zinc-900 px-4 py-2.5 text-[15px] leading-relaxed text-white sm:max-w-[75%] dark:bg-zinc-100 dark:text-zinc-900">
          <p className="whitespace-pre-wrap break-words">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4 py-1.5">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
        aria-hidden="true"
      >
        AI
      </div>
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-2.5 text-[15px] text-zinc-900 sm:max-w-[75%] dark:bg-zinc-800 dark:text-zinc-100">
        <MessageContent text={text} />
        {isStreaming && (
          <span
            className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-zinc-500 dark:bg-zinc-400"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

// Memoize so earlier, already-finished messages don't re-render on every
// streamed token of the newest message — only the last (streaming) message
// actually changes on each render.
export const ChatMessage = memo(ChatMessageInner);
