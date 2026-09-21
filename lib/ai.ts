/**
 * lib/ai.ts
 * ---------------------------------------------------------------------------
 * Central configuration for all AI / Gemini behavior.
 *
 * Keeping every model-related setting in one file means:
 *  - There's a single place to change the model, system prompt, or limits.
 *  - Components and API routes never need to know provider-specific details.
 *  - It's obvious at a glance what the assistant is configured to do.
 *
 * IMPORTANT: This file only runs on the server (it's imported by the route
 * handler in app/api/chat/route.ts). Never import this file from a
 * "use client" component — the Google Generative AI SDK reads
 * GOOGLE_GENERATIVE_AI_API_KEY from process.env, which must never be
 * bundled into client-side JavaScript.
 * ---------------------------------------------------------------------------
 */

import { google } from "@ai-sdk/google";

/**
 * The Gemini model used for chat completions.
 *
 * "gemini-3.6-flash" is a strong general-purpose default: fast and
 * inexpensive, well suited to a responsive chat UI. Swap this string for
 * "gemini-2.5-pro" if you need stronger reasoning at the cost of latency,
 * or any other model id available to your Google AI Studio / Gemini API key.
 */
export const CHAT_MODEL = google("gemini-3.6-flash");

/**
 * The system prompt sent with every conversation. This defines the
 * assistant's persona and ground rules. Edit this to change how the
 * assistant behaves without touching any UI or route code.
 */
export const SYSTEM_PROMPT = `You are a helpful, friendly AI assistant embedded in a web chat product.

- Be clear and concise. Prefer plain language over jargon.
- Use Markdown (headings, lists, code blocks) when it improves readability,
  but don't over-format simple answers.
- If you are not sure about something, say so rather than guessing.
- Keep responses focused and avoid unnecessary preamble.`;

/**
 * Generation parameters passed to streamText().
 *
 * - maxOutputTokens: a safety ceiling on response length, so a single
 *   response can't run away and consume the whole rate limit / budget.
 * - temperature: moderate randomness — creative enough to feel natural,
 *   consistent enough to stay reliable for factual/help-style answers.
 */
export const MODEL_SETTINGS = {
  maxOutputTokens: 4096,
  temperature: 0.7,
} as const;

/**
 * Maximum number of messages (from the end of the conversation) sent to the
 * model as context. This bounds token usage on very long conversations.
 * Raise this if you need the assistant to remember further back.
 */
export const MAX_CONTEXT_MESSAGES = 40;
