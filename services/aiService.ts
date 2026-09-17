
import { GLOBAL_BEHAVIOR, MODE_PROMPTS, MODE_LABELS } from "../constants";
import { AppMode, Translation } from "../types";

declare global {
  interface Window {
    puter?: {
      ai: {
        chat(
          messages: Array<{ role: string; content: string }> | string,
          options?: { model?: string; stream?: boolean }
        ): Promise<any>;
      };
      auth: {
        isSignedIn(): boolean;
        signIn(): Promise<void>;
        signOut(): Promise<void>;
        getUser(): Promise<{ username: string; email?: string }>;
      };
    };
    __puterLoadFailed?: boolean;
  }
}

// Wait up to 8 seconds for Puter.js to finish loading from CDN.
// index.html sets window.__puterLoadFailed on script onerror for fast-fail.
export const waitForPuter = (): Promise<NonNullable<typeof window.puter>> =>
  new Promise((resolve, reject) => {
    if (window.puter) { resolve(window.puter); return; }
    if (window.__puterLoadFailed) {
      reject(new Error(
        "The AI service could not load. Please check your internet connection and refresh."
      ));
      return;
    }
    let attempts = 0;
    const id = setInterval(() => {
      if (window.puter) {
        clearInterval(id);
        resolve(window.puter!);
      } else if (window.__puterLoadFailed) {
        clearInterval(id);
        reject(new Error(
          "The AI service could not load. Please check your internet connection and refresh."
        ));
      } else if (++attempts > 40) {
        clearInterval(id);
        reject(new Error(
          "AI service took too long to load. Please refresh the page and try again."
        ));
      }
    }, 200);
  });

export type PuterStatus = 'checking' | 'ready' | 'needs-signin' | 'load-failed';

// Check whether the user is authenticated with Puter (non-throwing)
export const getPuterAuthState = async (): Promise<PuterStatus> => {
  try {
    const puter = await waitForPuter();
    const signedIn = puter.auth?.isSignedIn?.() ?? false;
    console.log("[HolyBibleGPT] Puter auth state:", signedIn ? "signed-in" : "needs-signin");
    return signedIn ? 'ready' : 'needs-signin';
  } catch (e: any) {
    console.warn("[HolyBibleGPT] Puter load failed:", e?.message);
    return 'load-failed';
  }
};

// Explicitly trigger the Puter sign-in popup
export const signIntoPuter = async (): Promise<void> => {
  const puter = await waitForPuter();
  await puter.auth.signIn();
};

// Returns true if the error message suggests the user needs to sign in
export const isAuthError = (message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    lower.includes('sign in') ||
    lower.includes('unauthorized') ||
    lower.includes('unauthenticated') ||
    lower.includes('auth') ||
    lower.includes('pop-up') ||
    lower.includes('popup') ||
    lower.includes('blocked')
  );
};

// Wrap a promise with an absolute deadline
const withTimeout = <T>(promise: Promise<T>, ms: number, msg: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(msg)), ms);
    promise.then(
      v => { clearTimeout(id); resolve(v); },
      e => { clearTimeout(id); reject(e); }
    );
  });

// Turn raw Puter errors into clear, actionable user messages
const classifyError = (error: any): string => {
  const raw = (error?.message ?? String(error ?? '')).toLowerCase();

  if (
    raw.includes('sign in') || raw.includes('signin') || raw.includes('log in') ||
    raw.includes('login') || raw.includes('not logged') || raw.includes('unauthenticated') ||
    raw.includes('unauthorized') || raw.includes('authentication')
  ) {
    return 'Please sign in to Puter to use the free AI — tap "Sign In to Puter" above and allow the pop-up.';
  }

  if (raw.includes('popup') || raw.includes('pop-up') || raw.includes('window was blocked')) {
    return 'The sign-in pop-up was blocked. Allow pop-ups for this site, then tap "Sign In to Puter" again.';
  }

  if (raw.includes('rate') || raw.includes('limit') || raw.includes('quota') ||
      raw.includes('too many') || raw.includes('429')) {
    return 'AI is temporarily rate-limited. Please wait a moment and try again.';
  }

  if (raw.includes('network') || raw.includes('failed to fetch') ||
      raw.includes('connection') || raw.includes('offline')) {
    return 'Connection issue. Please check your internet connection and try again.';
  }

  if (raw.includes('timeout') || raw.includes('timed out')) {
    return 'The AI took too long to respond. Please try again.';
  }

  if (raw.includes('model') || raw.includes('404') || raw.includes('not found')) {
    return 'AI model is temporarily unavailable. Please try again in a moment.';
  }

  // Surface the raw message if it's short and legible
  if (error?.message && error.message.length > 0 && error.message.length < 200) {
    return `AI error: ${error.message}. Please try again.`;
  }

  return 'AI is temporarily unavailable. Please try again in a moment.';
};

export const sendMessageStream = async (
  mode: AppMode,
  translation: Translation,
  kidsMode: boolean,
  history: { role: 'user' | 'assistant'; content: string }[],
  onChunk: (text: string) => void
): Promise<string> => {
  const modeLabel = MODE_LABELS[mode]?.label ?? 'General';
  const systemContent = [
    GLOBAL_BEHAVIOR(translation),
    "---",
    `ACTIVE STUDY MODE: ${modeLabel}`,
    "Follow the instruction below for this response's format and focus. Maintain all Scripture accuracy and quotation rules above. When this mode calls for a different structure, use the mode format instead of the default 4-step structure:",
    MODE_PROMPTS[mode] ?? MODE_PROMPTS[AppMode.CHAT],
    kidsMode
      ? "SPECIAL INSTRUCTION: The user is a young child. Use ONLY very simple words and very short sentences. A warm, loving, gentle tone. Avoid all adult, complex, or frightening content."
      : "",
  ].filter(Boolean).join("\n\n");

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemContent },
    ...history.map(h => ({ role: h.role, content: h.content })),
  ];

  const puter = await waitForPuter();

  // ── Attempt 1: streaming ─────────────────────────────────────────────────
  try {
    const response = await withTimeout(
      puter.ai.chat(messages, { model: "gpt-4o-mini", stream: true }),
      30_000,
      'The AI took too long to respond. Please try again.'
    );

    let fullText = "";

    if (response != null && typeof (response as any)[Symbol.asyncIterator] === "function") {
      for await (const chunk of response as AsyncIterable<any>) {
        const text =
          chunk?.text ??
          chunk?.choices?.[0]?.delta?.content ??
          "";
        if (text) {
          fullText += text;
          onChunk(fullText);
        }
      }
    } else {
      const text =
        (response as any)?.message?.content?.[0]?.text ??
        (response as any)?.choices?.[0]?.message?.content ??
        (response as any)?.text ??
        String(response ?? "");
      fullText = text;
      if (fullText) onChunk(fullText);
    }

    if (fullText.trim()) return fullText;
    throw new Error("empty_stream");
  } catch (streamErr: any) {
    console.warn("[HolyBibleGPT] Streaming attempt failed:", {
      message: streamErr?.message,
      name: streamErr?.name,
      raw: streamErr,
    });
  }

  // ── Attempt 2: non-streaming fallback ────────────────────────────────────
  try {
    const response = await withTimeout(
      puter.ai.chat(messages, { model: "gpt-4o-mini", stream: false }),
      30_000,
      'The AI took too long to respond. Please try again.'
    );

    const text =
      (response as any)?.message?.content?.[0]?.text ??
      (response as any)?.choices?.[0]?.message?.content ??
      (response as any)?.text ??
      String(response ?? "");

    if (text.trim()) {
      onChunk(text);
      return text;
    }
    throw new Error("Empty response from AI");
  } catch (error: any) {
    console.error("[HolyBibleGPT] Both AI attempts failed:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      raw: error,
    });
    throw new Error(classifyError(error));
  }
};
