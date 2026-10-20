import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { unwrap } from "@/lib/errors";
import {
  CYBERPINGO_VOICE_CREDIT,
  DEFAULT_MASCOT_LINES,
  resolveCyberPingoAudioUrl,
  resolveCyberPingoVoiceCredit,
} from "@/lib/mascot/elevenlabs";
import type { Academy, MascotEvent, MascotExpression, MascotLine } from "@/types/api";

/** Skills, domains, rank ladder and the learner's metrics, computed server-side from real progress. */
export async function getMyAcademy(): Promise<Academy> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("get_my_academy"), "Impossible de charger tes compétences.") as unknown as Academy;
}

/** Active mascot lines. Guarantees CyberPingo neural voice audio URLs for all built-in lines. */
export async function listMascotLines(): Promise<MascotLine[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const rows = unwrap(
      await supabase.from("mascot_lines").select("id, event, expression, text_fr, audio_url, voice_credit, priority").eq("is_active", true).order("position"),
      "Impossible de charger les répliques de Pingo.",
    ) ?? [];
    if (rows.length === 0) {
      return [...DEFAULT_MASCOT_LINES];
    }
    return rows.map((row) => {
      const resolvedAudio = resolveCyberPingoAudioUrl(row.id, row.audio_url, row.text_fr);
      return {
        ...row,
        event: row.event as MascotEvent,
        expression: row.expression as MascotExpression,
        audio_url: resolvedAudio,
        voice_credit: resolveCyberPingoVoiceCredit(resolvedAudio, row.voice_credit) ?? CYBERPINGO_VOICE_CREDIT,
      };
    });
  } catch {
    return [...DEFAULT_MASCOT_LINES];
  }
}