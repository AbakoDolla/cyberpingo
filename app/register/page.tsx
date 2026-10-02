"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/onboarding/AuthLayout";
import SocialAuthButtons from "@/components/onboarding/SocialAuthButtons";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { errorMessage } from "@/lib/errors";
import { isSupabaseConfigured, missingConfigMessage } from "@/lib/supabase/config";
import { passwordProblem, signUpWithEmail } from "@/services/auth.service";

interface FormErrors { name?: string; email?: string; password?: string; confirmPassword?: string; terms?: string }

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/onboarding";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : missingConfigMessage);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function validate() {
    const nextErrors: FormErrors = {};
    if (name.trim().length < 2 || name.trim().length > 50) nextErrors.name = "Entre un nom de 2 à 50 caractères.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = "Entre une adresse e-mail valide.";
    const problem = passwordProblem(password);
    if (problem) nextErrors.password = problem;
    if (confirmPassword !== password) nextErrors.confirmPassword = "Les mots de passe ne correspondent pas.";
    if (!accepted) nextErrors.terms = "Accepte les conditions pour créer ton compte.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!isSupabaseConfigured) { setError(missingConfigMessage); return; }
    setLoading(true);
    setError(null);
    try {
      const outcome = await signUpWithEmail(name, email, password);
      if (outcome.status === "confirm-email") { setSentTo(email.trim()); setLoading(false); return; }
      router.replace(outcome.destination);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause, "Le compte n’a pas pu être créé."));
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <AuthLayout
        scene="register"
        title="Vérifie ta boîte mail"
        subtitle="Plus qu’une étape avant ton premier parcours."
        footer={<>Adresse confirmée ? <Link href="/login" className="auth-link">Se connecter</Link></>}
      >
        <div role="status" className="auth-result">
          <span className="auth-result__icon"><MailIcon /></span>
          <p>Nous avons envoyé un lien de confirmation à <strong>{sentTo}</strong>. Ouvre-le sur cet appareil pour activer ton compte.</p>
          <p>Rien reçu après quelques minutes ? Regarde dans les courriers indésirables, puis vérifie l’adresse saisie.</p>
          <Button type="button" variant="secondary" className="auth-submit" onClick={() => setSentTo(null)}>Modifier mon adresse</Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      scene="register"
      title="Crée ton compte CyberPingo"
      subtitle="Gratuit, sans engagement. Ta progression te suit partout."
      footer={<>Déjà un compte ? <Link href="/login" className="auth-link">Se connecter</Link></>}
    >
      <SocialAuthButtons next={next} />
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <Input label="Nom affiché" name="name" placeholder="Awa" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="nickname" maxLength={50} required />
        <Input label="Adresse e-mail" type="email" name="email" placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" required />
        <Input label="Mot de passe" type="password" name="password" placeholder="8 caractères, une lettre et un chiffre" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete="new-password" required />
        <Input label="Confirmer le mot de passe" type="password" name="confirmPassword" placeholder="Retape ton mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={errors.confirmPassword} autoComplete="new-password" required />
        <div>
          <label className="auth-check">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} aria-invalid={Boolean(errors.terms)} aria-describedby={errors.terms ? "terms-error" : undefined} />
            <span>J’accepte les <Link href="/conditions" className="auth-link">conditions d’utilisation</Link> et la <Link href="/confidentialite" className="auth-link">politique de confidentialité</Link>.</span>
          </label>
          {errors.terms && <p id="terms-error" role="alert" className="auth-alert" style={{ marginTop: 10 }}>{errors.terms}</p>}
        </div>
        {error && <p role="alert" className="auth-alert">{error}</p>}
        <Button type="submit" variant="primary" size="lg" className="auth-submit" loading={loading} disabled={!isSupabaseConfigured}>Créer mon compte</Button>
        <p className="auth-keep">Tu resteras connecté sur cet appareil.</p>
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage() { return <Suspense><RegisterForm /></Suspense>; }