
import { GLOBAL_BEHAVIOR, MODE_PROMPTS } from "../constants";
import { AppMode, Translation } from "../types";

// Puter.js is loaded via CDN in index.html — no npm install needed
declare global {
  interface Window {
    puter?: {
      ai: {
        chat(
          messages: Array<{ role: string; content: string }> | string,
          options?: { model?: string; stream?: boolean }
        ): Promise<any>;
      };
    };
  }
}

// Wait up to 6 seconds for Puter.js to finish loading from CDN
const waitForPuter = (): Promise<NonNullable<typeof window.puter>> =>
  new Promise((resolve, reject) => {
    if (window.puter) { resolve(window.puter); return; }
    let attempts = 0;
    const id = setInterval(() => {
      if (window.puter) {
        clearInterval(id);
        resolve(window.puter!);
      } else if (++attempts > 30) {
        clearInterval(id);
        reject(new Error(
          "Puter.js did not load. Please check your internet connection and refresh the page."
        ));
      }
    }, 200);
  });

export const sendMessageStream = async (
  mode: AppMode,
  translation: Translation,
  kidsMode: boolean,
  history: { role: 'user' | 'assistant'; content: string }[],
  onChunk: (text: string) => void
): Promise<string> => {
  const systemContent =
    GLOBAL_BEHAVIOR(translation) +
    "\n\n" +
    (MODE_PROMPTS[mode] ?? MODE_PROMPTS[AppMode.CHAT]) +
    (kidsMode
      ? "\n\nSPECIAL INSTRUCTION: The user is a young child. Use ONLY very simple words and very short sentences. A warm, loving, gentle tone. Avoid all adult, complex, or frightening content."
      : "");

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemContent },
    ...history.map(h => ({ role: h.role, content: h.content })),
  ];

  const puter = await waitForPuter();

  try {
    const response = await puter.ai.chat(messages, {
      model: "gpt-4o-mini",
      stream: true,
    });

    let fullText = "";

    // Handle async-iterable streaming response
    if (response != null && typeof (response as any)[Symbol.asyncIterator] === "function") {
      for await (const chunk of response as AsyncIterable<any>) {
        // Puter.js may return {text: "..."} or OpenAI delta format
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
      // Non-streaming fallback
      const text =
        (response as any)?.message?.content?.[0]?.text ??
        (response as any)?.text ??
        String(response ?? "");
      fullText = text;
      onChunk(fullText);
    }

    return fullText;
  } catch (error: any) {
    console.error("Puter AI Error:", error);
    throw new Error(
      typeof error?.message === "string"
        ? error.message
        : "AI is unavailable. Please try again or read Scripture directly."
    );
  }
};
