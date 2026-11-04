import { NextRequest, NextResponse } from "next/server";
import type { MascotExpression } from "@/types/api";
import {
  CYBERPINGO_MODEL_ID,
  CYBERPINGO_VOICE_ID,
  EXPRESSION_AUDIO_TAGS,
  autoTagForElevenLabs,
} from "@/lib/mascot/elevenlabs";

const MAX_TTS_LENGTH = 900;

const VALID_EXPRESSIONS = new Set<MascotExpression>([
  "happy",
  "proud",
  "surprised",
  "thinking",
  "encouraging",
  "celebration",
  "mission",
  "explanation",
  "disappointed",
  "focused",
  "expert",
]);

function stripMarkdownForSpeech(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[«»"]/gu, " ")
    .replace(/C\s*[·•]\s*I\s*[·•]\s*D/giu, "C, I, D")
    .replace(/\/(\d{1,2})\b/gu, " slash $1")
    .replace(/\.pkt\b/giu, " point P K T")
    .replace(/[→➔➜]/gu, ", vers ")
    .replace(/\s*[·•]\s*/gu, ", ")
    .replace(/\s*;\s*/gu, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTextIntoTtsChunks(text: string, maxLen = 185): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (normalized.length <= maxLen) return [normalized];

  const clauses = normalized
    .split(/(?<=[.!?…;:—–])\s+|(?<=,)\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const pushWords = (segment: string) => {
    const words = segment.split(" ").filter(Boolean);
    for (const word of words) {
      if (!current) {
        current = word.length > maxLen ? word.slice(0, maxLen) : word;
      } else if (current.length + 1 + word.length <= maxLen) {
        current += ` ${word}`;
      } else {
        chunks.push(current);
        current = word.length > maxLen ? word.slice(0, maxLen) : word;
      }
    }
  };

  for (const clause of clauses) {
    if (!current) {
      if (clause.length <= maxLen) {
        current = clause;
      } else {
        pushWords(clause);
      }
    } else if (current.length + 1 + clause.length <= maxLen) {
      current += ` ${clause}`;
    } else {
      chunks.push(current);
      current = "";
      if (clause.length <= maxLen) {
        current = clause;
      } else {
        pushWords(clause);
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : [normalized.slice(0, maxLen)];
}

async function synthesizeNeuralMp3Fallback(text: string, lang: "fr" | "en"): Promise<Buffer | null> {
  const chunks = splitTextIntoTtsChunks(text, 185);
  if (!chunks.length) return null;

  const tl = lang === "en" ? "en" : "fr";

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encodeURIComponent(chunk)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
        },
      });
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      if (!arr.byteLength) return null;
      return Buffer.from(arr);
    })
  );

  const buffers: Uint8Array[] = [];
  for (const b of results) {
    if (b) buffers.push(b);
  }
  return buffers.length === chunks.length && buffers.length > 0 ? Buffer.concat(buffers) : null;
}

let elevenLabsCooldownUntil = 0;

async function callElevenLabsTts(params: {
  apiKey: string;
  voiceId: string;
  modelId: string;
  text: string;
  lang: "fr" | "en";
  preset: { stability: number; similarity_boost: number; style: number };
}): Promise<{ ok: boolean; status: number; buffer: ArrayBuffer | null }> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(params.voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": params.apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: params.text,
        model_id: params.modelId,
        language_code: params.lang,
        voice_settings: {
          stability: params.preset.stability,
          similarity_boost: params.preset.similarity_boost,
          style: params.preset.style,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    return { ok: false, status: response.status, buffer: null };
  }
  const audioBuffer = await response.arrayBuffer();
  return {
    ok: audioBuffer.byteLength > 256,
    status: response.status,
    buffer: audioBuffer.byteLength > 256 ? audioBuffer : null,
  };
}

async function handleTtsRequest(params: {
  rawText: string;
  expressionInput?: unknown;
  lineIdInput?: unknown;
  langInput?: unknown;
}): Promise<NextResponse> {
  const cleaned = stripMarkdownForSpeech(params.rawText);
  if (!cleaned) {
    return NextResponse.json({ error: "Texte manquant." }, { status: 400 });
  }

  const clippedText =
    cleaned.length > MAX_TTS_LENGTH ? `${cleaned.slice(0, MAX_TTS_LENGTH)}...` : cleaned;
  const expression: MascotExpression =
    typeof params.expressionInput === "string" &&
    VALID_EXPRESSIONS.has(params.expressionInput as MascotExpression)
      ? (params.expressionInput as MascotExpression)
      : "encouraging";
  const lineId = typeof params.lineIdInput === "string" ? params.lineIdInput : undefined;
  const lang: "fr" | "en" = params.langInput === "en" ? "en" : "fr";

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (apiKey && Date.now() >= elevenLabsCooldownUntil) {
    const taggedText = autoTagForElevenLabs(clippedText, expression, lineId);
    const preset = EXPRESSION_AUDIO_TAGS[expression] ?? EXPRESSION_AUDIO_TAGS.encouraging;
    const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || CYBERPINGO_VOICE_ID;
    const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || CYBERPINGO_MODEL_ID;

    try {
      let result = await callElevenLabsTts({
        apiKey,
        voiceId,
        modelId,
        text: taggedText,
        lang,
        preset,
      });

      // If eleven_v3 fails or hits credit threshold, try eleven_flash_v2_5 (50% lower credit cost)
      if (!result.ok && modelId !== "eleven_flash_v2_5") {
        result = await callElevenLabsTts({
          apiKey,
          voiceId,
          modelId: "eleven_flash_v2_5",
          text: clippedText,
          lang,
          preset,
        });
      }

      if (result.ok && result.buffer) {
        return new NextResponse(result.buffer, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, s-maxage=31536000, max-age=86400, immutable",
            "X-TTS-Provider": "elevenlabs-cyberpingo",
          },
        });
      }

      if (result.status === 401 || result.status === 402 || result.status === 429) {
        elevenLabsCooldownUntil = Date.now() + 10 * 60 * 1000;
      }
    } catch {
      // Fall through to server-side neural MP3 synthesis
    }
  }

  try {
    const fallbackBuffer = await synthesizeNeuralMp3Fallback(clippedText, lang);
    if (fallbackBuffer && fallbackBuffer.byteLength > 128) {
      return new NextResponse(new Uint8Array(fallbackBuffer), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, s-maxage=31536000, max-age=86400, immutable",
          "X-TTS-Provider": "neural-stream",
        },
      });
    }
  } catch {
    // Ignore and return 502 below
  }

  return NextResponse.json(
    { error: "Impossible de générer le flux vocal." },
    { status: 502 }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawText = searchParams.get("text") ?? "";
  const expression = searchParams.get("expression") ?? undefined;
  const lineId = searchParams.get("lineId") ?? undefined;
  const lang = searchParams.get("lang") ?? undefined;

  return handleTtsRequest({
    rawText,
    expressionInput: expression,
    lineIdInput: lineId,
    langInput: lang,
  });
}

export async function POST(request: NextRequest) {
  let body: { text?: unknown; expression?: unknown; lineId?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  return handleTtsRequest({
    rawText: typeof body.text === "string" ? body.text : "",
    expressionInput: body.expression,
    lineIdInput: body.lineId,
    langInput: body.lang,
  });
}
