"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppError, toAppError, unwrap } from "@/lib/errors";
import { DAILY_GOALS } from "@/lib/navigation";
import { asRole } from "@/lib/roles";
import type { Tables, TablesUpdate } from "@/types/database.types";
import type { LearningGoal, MyProfile, OnboardingAnswers, SkillLevel, UserSettings } from "@/types/api";

const AVATAR_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Public URL of a file stored in the `avatars` bucket (the bucket is public-read). */
export function avatarUrl(path: string | null | undefined) {
  if (!path) return null;
  return getSupabaseBrowserClient().storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export function toMyProfile(row: Tables<"profiles">): MyProfile {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    display_name: row.display_name,
    avatar_path: row.avatar_path,
    avatar_url: avatarUrl(row.avatar_path),
    bio: row.bio,
    role: asRole(row.role),
    goal: row.goal as LearningGoal,
    skill_level: row.skill_level as SkillLevel,
    daily_minutes: row.daily_minutes,
    known_areas: row.known_areas,
    onboarding_completed: row.onboarding_completed,
    xp: row.xp,
    level: row.level,
    current_streak: row.current_streak,
    longest_streak: row.longest_streak,
    last_activity_date: row.last_activity_date,
    last_activity_at: row.last_activity_at,
    created_at: row.created_at,
  };
}

export async function getMyProfile(userId: string): Promise<MyProfile | null> {
  const supabase = getSupabaseBrowserClient();
  const row = unwrap(await supabase.from("profiles").select("*").eq("id", userId).maybeSingle(), "Impossible de charger ton profil.");
  return row ? toMyProfile(row) : null;
}

export type ProfileChanges = Pick<TablesUpdate<"profiles">, "display_name" | "username" | "bio" | "goal" | "skill_level" | "daily_minutes" | "known_areas">;

/** Only the columns granted to learners can be written; XP, level, role and streaks are server-owned. */
export async function updateMyProfile(userId: string, changes: ProfileChanges) {
  if (changes.display_name !== undefined) {
    const name = changes.display_name.trim();
    if (name.length < 2 || name.length > 50) throw new AppError("invalid", "Ton nom doit contenir entre 2 et 50 caractères.");
    changes = { ...changes, display_name: name };
  }
  if (changes.username !== undefined) {
    const username = changes.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(username)) throw new AppError("invalid", "Ton pseudo : 3 à 32 caractères parmi a-z, 0-9 et _.");
    changes = { ...changes, username };
  }
  if (changes.bio !== undefined && changes.bio.length > 280) throw new AppError("invalid", "Ta bio est limitée à 280 caractères.");
  if (changes.daily_minutes !== undefined && !DAILY_GOALS.includes(changes.daily_minutes as (typeof DAILY_GOALS)[number])) {
    throw new AppError("invalid", "Choisis un objectif quotidien proposé.");
  }
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("profiles").update(changes).eq("id", userId);
  if (error) {
    if ((error as { code?: string }).code === "23505") throw new AppError("conflict", "Ce pseudo est déjà pris.");
    throw toAppError(error, "Le profil n’a pas pu être enregistré. Réessaie.");
  }
}

/** Uploads into avatars/<user id>/…, then points the profile at it and removes the previous file. */
export async function uploadAvatar(userId: string, file: File, previousPath: string | null) {
  const extension = AVATAR_TYPES[file.type];
  if (!extension) throw new AppError("invalid", "Formats acceptés : PNG, JPEG ou WebP.");
  if (file.size > AVATAR_MAX_BYTES) throw new AppError("invalid", "L’image ne doit pas dépasser 2 Mo.");
  const supabase = getSupabaseBrowserClient();
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
  if (uploadError) throw toAppError(uploadError, "L’image n’a pas pu être envoyée.");
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
  if (error) {
    await supabase.storage.from("avatars").remove([path]);
    throw toAppError(error, "L’avatar n’a pas pu être enregistré.");
  }
  if (previousPath && previousPath !== path) await supabase.storage.from("avatars").remove([previousPath]);
  return path;
}

export async function removeAvatar(userId: string, path: string | null) {
  const supabase = getSupabaseBrowserClient();
  unwrap(await supabase.from("profiles").update({ avatar_path: null }).eq("id", userId), "L’avatar n’a pas pu être retiré.");
  if (path) await supabase.storage.from("avatars").remove([path]);
}

export async function getMySettings(userId: string): Promise<UserSettings | null> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(), "Impossible de charger tes préférences.");
}

export type SettingsChanges = Pick<TablesUpdate<"user_settings">, "timezone" | "email_notifications" | "streak_reminders" | "new_content_alerts" | "sound_effects">;

export async function updateMySettings(userId: string, changes: SettingsChanges) {
  const supabase = getSupabaseBrowserClient();
  unwrap(await supabase.from("user_settings").update(changes).eq("user_id", userId), "Tes préférences n’ont pas pu être enregistrées.");
}

export async function completeOnboarding(answers: OnboardingAnswers, fallback: Pick<MyProfile, "skill_level" | "goal" | "daily_minutes">) {
  const supabase = getSupabaseBrowserClient();
  unwrap(await supabase.rpc("complete_onboarding", {
    p_skill_level: answers.skillLevel ?? fallback.skill_level,
    p_goal: answers.goal ?? fallback.goal,
    p_daily_minutes: answers.dailyMinutes ?? fallback.daily_minutes,
    p_known_areas: answers.knownAreas,
  }), "Ton parcours n’a pas pu être enregistré. Réessaie.");
}

export async function resetMyProgress() {
  unwrap(await getSupabaseBrowserClient().rpc("reset_my_progress"), "La réinitialisation a échoué. Tes progrès sont intacts.");
}

export async function deleteMyAccount() {
  const supabase = getSupabaseBrowserClient();
  unwrap(await supabase.rpc("delete_my_account"), "La suppression du compte a échoué. Réessaie.");
  // The account no longer exists on the server, so only the local session remains to clear.
  await supabase.auth.signOut({ scope: "local" });
}
