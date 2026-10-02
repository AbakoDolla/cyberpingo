/** Storage limits mirrored from the `mascot-voice` bucket (5 MB, audio only). */
export const MAX_VOICE_BYTES = 5 * 1024 * 1024;
export const MAX_VOICE_SECONDS = 45;

/** Container types the bucket accepts, with the extension used for the stored file. */
export const VOICE_EXTENSIONS: Readonly<Record<string, string>> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

const ALIASES: Readonly<Record<string, string>> = {
  "audio/mp3": "audio/mpeg",
  "audio/x-mp3": "audio/mpeg",
  "audio/m4a": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/wave": "audio/wav",
  "audio/vnd.wave": "audio/wav",
};

/** Strips codec parameters and maps browser aliases to a type the bucket accepts; null when unsupported. */
export function normalizeVoiceType(type: string): string | null {
  const base = type.split(";")[0]?.trim().toLowerCase() ?? "";
  const mapped = ALIASES[base] ?? base;
  return VOICE_EXTENSIONS[mapped] ? mapped : null;
}

/** The first container the browser can record, preferring Opus in WebM and falling back for Safari. */
export function pickRecorderMime(isSupported: (mime: string) => boolean): string | null {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find((mime) => isSupported(mime)) ?? null;
}

export function formatVoiceTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export interface VoiceCoverage {
  total: number;
  voiced: number;
  /** Voiced lines whose credit says the voice is synthetic: placeholders until a human take replaces them. */
  synthetic: number;
  /** Voiced lines read by a credited human voice. */
  human: number;
  percent: number;
  /** Active lines still read as text only: the work left for the voice talent. */
  missing: number;
}

/** True when a credit declares a synthetic voice, so it is never presented as a human recording. */
export function isSyntheticVoice(credit: string | null | undefined): boolean {
  return /synth[eè]se|synthetic|\bTTS\b/i.test(credit ?? "");
}

/** How much of the active script is voiced, split between human takes and clearly labelled synthetic voices. */
export function voiceCoverage(lines: ReadonlyArray<{ audio_url: string | null; is_active: boolean; voice_credit?: string | null }>): VoiceCoverage {
  const active = lines.filter((line) => line.is_active);
  const voicedLines = active.filter((line) => line.audio_url);
  const synthetic = voicedLines.filter((line) => isSyntheticVoice(line.voice_credit)).length;
  return {
    total: active.length,
    voiced: voicedLines.length,
    synthetic,
    human: voicedLines.length - synthetic,
    percent: active.length ? Math.round((voicedLines.length / active.length) * 100) : 0,
    missing: active.length - voicedLines.length,
  };
}
