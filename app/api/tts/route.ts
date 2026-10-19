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
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Synthèse vocale ElevenLabs non configurée sur le serveur." },
      { status: 503 }
    );
  }

  let body: { text?: unknown; expression?: unknown; lineId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const rawText = typeof body.text === "string" ? stripMarkdownForSpeech(body.text) : "";
  if (!rawText) {
    return NextResponse.json({ error: "Texte manquant." }, { status: 400 });
  }

  const clippedText = rawText.length > MAX_TTS_LENGTH ? `${rawText.slice(0, MAX_TTS_LENGTH)}...` : rawText;
  const expression: MascotExpression =
    typeof body.expression === "string" && VALID_EXPRESSIONS.has(body.expression as MascotExpression)
      ? (body.expression as MascotExpression)
      : "encouraging";
  const lineId = typeof body.lineId === "string" ? body.lineId : undefined;

  const taggedText = autoTagForElevenLabs(clippedText, expression, lineId);
  const preset = EXPRESSION_AUDIO_TAGS[expression] ?? EXPRESSION_AUDIO_TAGS.encouraging;
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || CYBERPINGO_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || CYBERPINGO_MODEL_ID;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: taggedText,
          model_id: modelId,
          language_code: "fr",
          voice_settings: {
            stability: preset.stability,
            similarity_boost: preset.similarity_boost,
            style: preset.style,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erreur lors de la génération vocale ElevenLabs." },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Impossible de joindre le service vocal ElevenLabs." },
      { status: 502 }
    );
  }
}
