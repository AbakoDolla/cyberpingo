import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { unwrap } from "@/lib/errors";
import type { Academy, MascotEvent, MascotExpression, MascotLine } from "@/types/api";

/** Skills, domains, rank ladder and the learner's metrics, computed server-side from real progress. */
export async function getMyAcademy(): Promise<Academy> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("get_my_academy"), "Impossible de charger tes compétences.") as unknown as Academy;
}

/** Active mascot lines. Audio is only present when a real human recording was uploaded and credited. */
export async function listMascotLines(): Promise<MascotLine[]> {
  const supabase = getSupabaseBrowserClient();
  const rows = unwrap(
    await supabase.from("mascot_lines").select("id, event, expression, text_fr, audio_url, voice_credit, priority").eq("is_active", true).order("position"),
    "Impossible de charger les répliques de Pingo.",
  ) ?? [];
  return rows.map((row) => ({ ...row, event: row.event as MascotEvent, expression: row.expression as MascotExpression }));
}