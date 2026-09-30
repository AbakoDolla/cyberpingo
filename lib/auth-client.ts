"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OAuthProvider } from "@/lib/supabase/config";
import { friendlyError } from "@/lib/learner-mapping";
import { safeReturnPath } from "@/lib/learning-progress";

export const PASSWORD_MIN_LENGTH = 8;

function callbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Records the login and picks the first page to show after authentication. */
export async function destinationAfterLogin(userId: string, next: string | null) {
  const supabase = getSupabaseBrowserClient();
  await supabase.rpc("record_login");
  const { data: profile } = await supabase.from("profiles").select("role, onboarding_completed").eq("id", userId).maybeSingle();
  const isAdmin = profile?.role === "admin";
  if (profile && !isAdmin && !profile.onboarding_completed) return "/onboarding";
  return safeReturnPath(next, isAdmin);
}

export async function signInWithEmail(email: string, password: string, next: string | null) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) throw new Error(friendlyError(error, "Connexion impossible. Vérifie tes informations puis réessaie."));
  return destinationAfterLogin(data.user.id, next);
}

export type SignUpOutcome = { status: "signed-in"; destination: string } | { status: "confirm-email" };

export async function signUpWithEmail(displayName: string, email: string, password: string): Promise<SignUpOutcome> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: displayName.trim() }, emailRedirectTo: callbackUrl("/onboarding") },
  });
  if (error) throw new Error(friendlyError(error, "Le compte n’a pas pu être créé. Réessaie dans un instant."));
  // With email confirmation enabled, Supabase hides existing accounts behind an empty identities list.
  if (data.user && data.user.identities?.length === 0) {
    throw new Error("Un compte existe déjà avec cette adresse. Connecte-toi ou réinitialise ton mot de passe.");
  }
  if (!data.session || !data.user) return { status: "confirm-email" };
  return { status: "signed-in", destination: await destinationAfterLogin(data.user.id, "/onboarding") };
}

export async function sendPasswordReset(email: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callbackUrl("/reinitialiser-mot-de-passe") });
  if (error) throw new Error(friendlyError(error, "L’e-mail n’a pas pu être envoyé. Réessaie dans un instant."));
}

export async function updatePassword(password: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(friendlyError(error, "Le mot de passe n’a pas pu être modifié."));
}

export async function signInWithProvider(provider: OAuthProvider, next: string | null) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl(next ?? "/courses") } });
  if (error) throw new Error(friendlyError(error, "La connexion avec ce fournisseur a échoué."));
}

export function passwordProblem(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) return `${PASSWORD_MIN_LENGTH} caractères minimum.`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Utilise au moins une lettre et un chiffre.";
  return null;
}
