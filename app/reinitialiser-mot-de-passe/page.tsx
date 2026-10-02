"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/onboarding/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useUser } from "@/context/UserContext";
import { errorMessage } from "@/lib/errors";
import { isSupabaseConfigured, missingConfigMessage } from "@/lib/supabase/config";
import { passwordProblem, updatePassword } from "@/services/auth.service";

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const { hydrated, isAuthenticated } = useUser();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : missingConfigMessage);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    const problem = passwordProblem(password);
    if (problem) nextErrors.password = problem;
    if (confirmPassword !== password) nextErrors.confirmPassword = "Les mots de passe ne correspondent pas.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    setError(null);
    try { await updatePassword(password); setDone(true); }
    catch (cause) { setError(errorMessage(cause, "Le mot de passe n’a pas pu être modifié.")); }
    finally { setLoading(false); }
  }

  if (!isSupabaseConfigured) {
    return <AuthLayout scene="reset" title="Service non configuré" subtitle="La réinitialisation est indisponible."><p role="alert" className="auth-alert">{missingConfigMessage}</p></AuthLayout>;
  }
  if (!hydrated) {
    return <AuthLayout scene="reset" title="Vérification du lien…" subtitle="Nous validons la session de réinitialisation."><div className="auth-spinner" role="status" aria-label="Vérification en cours" /></AuthLayout>;
  }
  if (!isAuthenticated) {
    return (
      <AuthLayout scene="reset" title="Lien expiré" subtitle="La session de réinitialisation n’est plus active.">
        <div className="auth-stack">
          <p className="auth-notice">Demande un nouveau lien puis ouvre-le dans ce navigateur.</p>
          <Link href="/mot-de-passe-oublie" className="ui-btn ui-btn--primary ui-btn--lg auth-submit">Recevoir un nouveau lien</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      scene="reset"
      title={done ? "C’est tout bon !" : "Choisis un nouveau mot de passe"}
      subtitle={done ? "Ton nouveau mot de passe est actif." : "Au moins 8 caractères, avec une lettre et un chiffre. Évite un mot de passe déjà utilisé ailleurs."}
    >
      {done ? (
        <div role="status" className="auth-result">
          <span className="auth-result__icon"><CheckIcon /></span>
          <p>Utilise-le dès ta prochaine connexion, sur tous tes appareils.</p>
          <Button type="button" variant="primary" size="lg" className="auth-submit" onClick={() => router.replace("/dashboard")}>Reprendre mon apprentissage</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <Input label="Nouveau mot de passe" type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete="new-password" required />
          <Input label="Confirmer le mot de passe" type="password" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={errors.confirmPassword} autoComplete="new-password" required />
          {error && <p role="alert" className="auth-alert">{error}</p>}
          <Button type="submit" variant="primary" size="lg" className="auth-submit" loading={loading}>Enregistrer le mot de passe</Button>
        </form>
      )}
    </AuthLayout>
  );
}