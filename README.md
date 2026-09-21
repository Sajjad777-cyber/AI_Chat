# AI Assistant — Streaming Chat (Next.js + Gemini)

A production-quality streaming chat interface, built with Next.js App Router,
TypeScript, Tailwind CSS, and the Vercel AI SDK, talking to Google Gemini
through a server-side API route only.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19** / **TypeScript**
- **Tailwind CSS 4**
- **AI SDK** (`ai` v7) + `@ai-sdk/google` + `@ai-sdk/react`
- **react-markdown** + `remark-gfm` for streaming-safe Markdown rendering

## Project layout

```
app/
├── api/chat/route.ts     ← the ONLY place that calls Gemini (server-side)
├── layout.tsx
├── page.tsx              ← renders <Chat />
└── globals.css
components/chat/
├── Chat.tsx              ← orchestrates useChat, scroll lock, persistence
├── ChatMessage.tsx        ← message bubble + streaming-safe markdown
├── ChatInput.tsx          ← composer (send/stop, multiline, shortcuts)
├── ThinkingIndicator.tsx
└── JumpToLatest.tsx
lib/
└── ai.ts                 ← model, system prompt, generation settings
```

---

## 1. First-time setup

### Requirements
- Node.js 18.18+ (Node 20+ recommended)
- A Google Generative AI (Gemini) API key — get one at
  https://aistudio.google.com/app/apikey

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Create your local environment file
cp .env.example .env.local

# 3. Open .env.local and paste your real key:
#    GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000 — you should see the empty-state screen ("How can
I help?"). Send a message; you should see the response stream in token by
token.

**Never** commit `.env.local` or put the key behind `NEXT_PUBLIC_` — it must
stay server-side only. `.env.local` is already in `.gitignore`.

---

## 2. Verifying it's working correctly

- **Streaming**: ask something with a longer answer — text should appear
  progressively, not all at once.
- **Stop**: send a long prompt, click the stop (■) button mid-stream — the
  partial response should remain, and you should be able to send another
  message immediately.
- **Multi-turn**: ask a follow-up question — the assistant should have
  context from earlier in the conversation.
- **Scroll**: during a long streamed response, scroll up — auto-scroll
  should release and a "Jump to latest" button should appear.
- **Mobile**: resize the browser to ~390px wide (or use dev tools device
  mode) — layout should stay usable with no horizontal scrolling.
- **Security**: open browser dev tools → Network tab → inspect the
  `/api/chat` request/response. The API key should never appear anywhere in
  client-side code or network traffic.

If `GOOGLE_GENERATIVE_AI_API_KEY` is missing, the server returns a clear
JSON error instead of crashing; if the key is invalid or the account has no
quota, Google's error is caught and turned into a generic, safe error
message shown in the chat UI (the real error detail is logged server-side
only, never sent to the browser).

---

## 3. Building for production

```bash
npm run lint       # ESLint
npx tsc --noEmit   # Type-check
npm run build      # Production build
npm start          # Run the production build locally on :3000
```

---

## 4. Deploying

### Vercel (recommended — zero config for Next.js)

1. Push this project to a GitHub repository.
2. Go to https://vercel.com/new and import the repo.
3. In the project's **Settings → Environment Variables**, add:
   - `GOOGLE_GENERATIVE_AI_API_KEY` = your real key
4. Deploy. Vercel builds and hosts it; streaming works out of the box
   (the route handler already sets `export const maxDuration = 60`).

### Any other Node host (Render, Railway, Fly.io, your own server, etc.)

1. Set the `GOOGLE_GENERATIVE_AI_API_KEY` environment variable in that
   platform's dashboard/config — never in a committed file.
2. Run `npm run build` then `npm start`.
3. Make sure the platform allows long-lived streaming HTTP responses (most
   modern Node hosts do; some older/basic proxies buffer responses, which
   would break visible streaming — check your host's docs if streaming
   looks "all at once" only in production).

---

## 5. Configuration you'll likely want to change

All of this lives in `lib/ai.ts`, with comments:

- `CHAT_MODEL` — which Gemini model to use (defaults to `gemini-3.6-flash`;
  try `gemini-2.5-pro` for stronger reasoning at higher latency/cost)
- `SYSTEM_PROMPT` — the assistant's persona/instructions
- `MODEL_SETTINGS` — `maxOutputTokens`, `temperature`
- `MAX_CONTEXT_MESSAGES` — how much history is sent per request

## 6. Optional: conversation persistence

The chat already saves/restores the current conversation in the browser's
`localStorage` (see `Chat.tsx`) as a stretch feature — no server or database
needed. Clear it by clearing your browser's site data, or by removing the
`ai-chat-messages` key in dev tools → Application → Local Storage.

## 7. Known limitations / things to check

- The Markdown renderer (`react-markdown`) is safe with incomplete syntax
  during streaming, but if you add custom remark/rehype plugins later,
  re-test partial-Markdown states.
- `next.config.ts` is left at defaults — add `images`, `redirects`, etc.
  there if your deployment needs them.
- Free-tier Gemini API keys have rate limits per model; if you hit a 429,
  either wait, switch to a paid tier, or reduce `MAX_CONTEXT_MESSAGES` /
  request frequency.
