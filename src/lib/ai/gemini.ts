// Gemini wrapper. The brief mandates a fallback chain across:
//   gemini-2.5-flash -> 2.0-flash -> 1.5-flash -> flash-latest
// If all four fail (or no key is present), every caller MUST receive
// `offline: true` so the UI can render the visible "AI offline" indicator.
// We never silently substitute a fake answer for a real one.

import { GoogleGenAI } from "@google/genai";
import type { AIResult } from "@/lib/types";

const FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-flash-latest"
] as const;

export type GeminiCall = {
  systemInstruction?: string;
  prompt: string;
  // JSON schema string for structured outputs. Caller parses on success.
  responseMimeType?: "text/plain" | "application/json";
};

let cachedClient: GoogleGenAI | null = null;
function client(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey: key });
  }
  return cachedClient;
}

export async function callGemini(
  call: GeminiCall
): Promise<AIResult<string>> {
  const c = client();
  if (!c) {
    return {
      data: "",
      modelUsed: "",
      offline: true,
      reason: "GEMINI_API_KEY not set"
    };
  }
  let lastErr: string | undefined;
  for (const model of FALLBACK_CHAIN) {
    try {
      const response = await c.models.generateContent({
        model,
        contents: call.prompt,
        config: {
          systemInstruction: call.systemInstruction,
          responseMimeType: call.responseMimeType ?? "text/plain"
        }
      });
      const text = response.text ?? "";
      if (text.trim().length === 0) {
        lastErr = `model ${model} returned empty`;
        continue;
      }
      return { data: text, modelUsed: model, offline: false };
    } catch (e: unknown) {
      lastErr = e instanceof Error ? `${model}: ${e.message}` : `${model}: unknown`;
      // try next model
    }
  }
  return {
    data: "",
    modelUsed: "",
    offline: true,
    reason: lastErr ?? "all fallback models failed"
  };
}
