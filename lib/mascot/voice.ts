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
  percent: number;
  /** Active lines still read as text only: the work left for the voice talent. */
  missing: number;
}

/** How much of the active script has a recorded, credited human voice. */
export function voiceCoverage(lines: ReadonlyArray<{ audio_url: string | null; is_active: boolean }>): VoiceCoverage {
  const active = lines.filter((line) => line.is_active);
  const voiced = active.filter((line) => line.audio_url).length;
  return {
    total: active.length,
    voiced,
    percent: active.length ? Math.round((voiced / active.length) * 100) : 0,
    missing: active.length - voiced,
  };
}
