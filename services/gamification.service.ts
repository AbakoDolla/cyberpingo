import { getSupabaseBrowserClient, type TypedSupabaseClient } from "@/lib/supabase/client";
import { AppError, toAppError, unwrap } from "@/lib/errors";
import type { BadgeCriteria, BadgeWithState, Certificate, CertificateVerification, Dashboard, LearnerStats, XpTransaction } from "@/types/api";

/** Everything the learner dashboard shows, computed in one SQL call in the learner's timezone. */
export async function getMyDashboard(): Promise<Dashboard> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("get_my_dashboard"), "Impossible de charger ton tableau de bord.") as unknown as Dashboard;
}

export async function getMyStats(): Promise<LearnerStats> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("get_my_stats"), "Impossible de charger tes statistiques.") as unknown as LearnerStats;
}

export async function listLevels(client?: TypedSupabaseClient) {
  const supabase = client ?? getSupabaseBrowserClient();
  return unwrap(await supabase.from("levels").select("level, required_xp, title").order("level"), "Impossible de charger les niveaux.") ?? [];
}

export async function listBadgesWithState(userId: string | null, client?: TypedSupabaseClient): Promise<BadgeWithState[]> {
  const supabase = client ?? getSupabaseBrowserClient();
  const [badges, earned] = await Promise.all([
    supabase.from("badges").select("id, slug, name, description, icon, xp_reward, criteria_type, criteria_value").eq("is_active", true).order("position"),
    userId ? supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", userId) : Promise.resolve({ data: [], error: null }),
  ]);
  const earnedAt = new Map((unwrap(earned, "Impossible de charger tes badges.") ?? []).map((row) => [row.badge_id, row.earned_at]));
  return (unwrap(badges, "Impossible de charger les badges.") ?? []).map((badge) => ({
    ...badge,
    criteria_type: badge.criteria_type as BadgeCriteria,
    earned: earnedAt.has(badge.id),
    earned_at: earnedAt.get(badge.id) ?? null,
  }));
}

export async function listMyXpHistory(userId: string, limit = 30): Promise<XpTransaction[]> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(
    await supabase.from("xp_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit),
    "Impossible de charger ton historique d’XP.",
  ) ?? [];
}

export async function listMyCertificates(userId: string): Promise<Certificate[]> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(
    await supabase.from("certificates").select("*").eq("user_id", userId).order("issued_at", { ascending: false }),
    "Impossible de charger tes certificats.",
  ) ?? [];
}

/** Public check used by /certificat/[code]; works without an account. */
export async function verifyCertificate(code: string, client?: TypedSupabaseClient): Promise<CertificateVerification> {
  const value = code.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-Z0-9]{16}$/.test(value)) return { found: false, valid: false };
  const supabase = client ?? getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("verify_certificate", { p_code: value }), "La vérification a échoué. Réessaie.") as unknown as CertificateVerification;
}

/**
 * Returns a short-lived download link for the certificate PDF, asking the generate-certificate
 * Edge Function to render it first when it does not exist yet.
 */
export async function getCertificatePdfUrl(certificate: Pick<Certificate, "id" | "pdf_path" | "revoked_at">) {
  if (certificate.revoked_at) throw new AppError("forbidden", "Ce certificat a été révoqué.");
  const supabase = getSupabaseBrowserClient();
  let path = certificate.pdf_path;
  if (!path) {
    const { data, error } = await supabase.functions.invoke<{ pdf_path: string }>("generate-certificate", { body: { certificate_id: certificate.id } });
    if (error || !data?.pdf_path) throw toAppError(error, "Le PDF du certificat n’a pas pu être généré. Réessaie dans un instant.");
    path = data.pdf_path;
  }
  const { data, error } = await supabase.storage.from("certificates").createSignedUrl(path, 120, { download: true });
  if (error || !data) throw toAppError(error, "Le téléchargement du certificat a échoué.");
  return data.signedUrl;
}
