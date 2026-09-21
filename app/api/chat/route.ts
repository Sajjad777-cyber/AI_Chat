/**
 * app/api/chat/route.ts
 * ---------------------------------------------------------------------------
 * The ONLY place in this project that talks to Gemini.
 *
 * Flow:
 *   Browser --POST--> this route --streamText()--> Gemini API
 *                                 <--tokens as they arrive--
 *   Browser <--UI message stream-- this route
 *
 * The Google Generative AI API key lives only in process.env on the server.
 * It is never sent to, or readable by, the browser.
 * ---------------------------------------------------------------------------
 */

import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  CHAT_MODEL,
  MAX_CONTEXT_MESSAGES,
  MODEL_SETTINGS,
  SYSTEM_PROMPT,
} from "@/lib/ai";

// Stream responses can legitimately take a while for long answers.
// Allow up to 60s of execution on platforms that enforce a route timeout
// (e.g. Vercel serverless functions).
export const maxDuration = 60;

interface ChatRequestBody {
  messages?: UIMessage[];
}

export async function POST(req: Request) {
  // 1. Fail fast with a clear error if the server isn't configured yet,
  //    instead of letting the Google SDK throw an opaque error later.
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "The server is missing its GOOGLE_GENERATIVE_AI_API_KEY environment variable. " +
          "Add it to .env.local (see .env.example) and restart the dev server.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // 2. Parse and validate the incoming request body.
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Request must include a non-empty `messages` array." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // 3. Trim history so very long conversations don't blow past context
  //    limits or rack up unnecessary token usage.
  const trimmedMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

  try {
    // 4. Ask Gemini to generate a response, streaming as it goes.
    const modelMessages = await convertToModelMessages(trimmedMessages);

    const result = streamText({
      model: CHAT_MODEL,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      ...MODEL_SETTINGS,
      // If the client disconnects (e.g. the user clicks Stop), abort the
      // upstream request to Gemini immediately instead of burning tokens
      // for a response nobody will see.
      abortSignal: req.signal,
    });

    // 5. Convert the model stream into the UI message stream format that
    //    useChat() on the client understands, and return it as the
    //    response body. Tokens are flushed to the browser as they arrive.
    return result.toUIMessageStreamResponse({
      onError: (error) => {
        // Never leak internal error details (stack traces, provider
        // errors, etc.) to the client — just a safe, generic message.
        console.error("[chat route] streaming error:", error);
        return "Something went wrong while generating the response. Please try again.";
      },
    });
  } catch (error) {
    console.error("[chat route] unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Something went wrong while generating the response. Please try again.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
