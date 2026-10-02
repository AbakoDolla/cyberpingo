export interface MascotPrefs {
  /** Master switch: the mascot stays silent when off. */
  auto: boolean;
  /** Plays the human recording when a line has one. */
  voice: boolean;
  volume: number;
  /** Shows the text of lines that are being spoken. Lines without audio are always shown as text. */
  subtitles: boolean;
}

export const DEFAULT_PREFS: MascotPrefs = { auto: true, voice: true, volume: 0.8, subtitles: true };
export const PREFS_KEY = "cyberpingo.mascot";

export function parsePrefs(raw: string | null): MascotPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const value = JSON.parse(raw) as Partial<MascotPrefs>;
    const volume = typeof value.volume === "number" && Number.isFinite(value.volume) ? Math.min(1, Math.max(0, value.volume)) : DEFAULT_PREFS.volume;
    return {
      auto: typeof value.auto === "boolean" ? value.auto : DEFAULT_PREFS.auto,
      voice: typeof value.voice === "boolean" ? value.voice : DEFAULT_PREFS.voice,
      volume,
      subtitles: typeof value.subtitles === "boolean" ? value.subtitles : DEFAULT_PREFS.subtitles,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}