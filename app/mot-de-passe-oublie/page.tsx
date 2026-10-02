"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/onboarding/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { isSupabaseConfigured, missingConfigMessage } from "@/lib/supabase/config";
import { sendPasswordReset } from "@/services/auth.service";

const neutralMessage = "Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d’être envoyé. Ouvre le lien sur cet appareil pour choisir un nouveau mot de passe.";

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : missingConfigMessage);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Entre une adresse e-mail valide."); return; }
    if (!isSupabaseConfigured) { setError(missingConfigMessage); return; }
    setLoading(true);
    setError(null);
    try { await sendPasswordReset(email); }
    catch { /* Même message volontairement neutre pour ne pas révéler l’existence d’un compte. */ }
    finally { setSent(true); setLoading(false); }
  }

  return (
    <AuthLayout
      scene="recover"
      title={sent ? "Regarde ta boîte mail" : "Mot de passe oublié ?"}
      subtitle={sent ? "Le lien de réinitialisation est valable une heure." : "Indique ton adresse : nous t’envoyons un lien pour en choisir un nouveau."}
      footer={<>Tu t’en souviens ? <Link href="/login" className="auth-link">Se connecter</Link></>}
    >
      {sent ? (
        <div role="status" className="auth-result">
          <span className="auth-result__icon"><MailIcon /></span>
          <p>{neutralMessage}</p>
          <p>Rien reçu ? Vérifie les courriers indésirables, puis réessaie dans quelques minutes.</p>
          <Button type="button" variant="secondary" className="auth-submit" onClick={() => setSent(false)}>Utiliser une autre adresse</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <Input label="Adresse e-mail" type="email" name="email" placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          {error && <p role="alert" className="auth-alert">{error}</p>}
          <Button type="submit" variant="primary" size="lg" className="auth-submit" loading={loading} disabled={!isSupabaseConfigured}>Recevoir le lien</Button>
        </form>
      )}
    </AuthLayout>
  );
}