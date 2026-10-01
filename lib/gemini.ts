const DEFAULT_MODEL = "gemini-2.5-flash";

export const isGeminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

export class GeminiError extends Error {
  constructor(public status: number) {
    super(`Gemini request failed with status ${status}`);
  }
}

/** Calls Gemini generateContent with the key in a header so it never appears in URLs or logs. */
export async function generateContent(body: Record<string, unknown>, timeoutMs = 45_000): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError(503);
  const model = (process.env.GEMINI_MODEL || DEFAULT_MODEL).replace(/[^a-zA-Z0-9.\-]/g, "");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("Gemini API error", response.status);
    throw new GeminiError(response.status);
  }
  const data = await response.json();
  const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((part) => !part.thought && typeof part.text === "string").map((part) => part.text).join("").trim();
}
