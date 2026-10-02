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
import { signInWithEmail } from "@/services/auth.service";

const notices: Record<string, { tone: "info" | "success" | "error"; text: string }> = {
  expire: { tone: "error", text: "Ce lien n’est plus valide ou a déjà été utilisé. Si tu viens de confirmer ton adresse, connecte-toi simplement ; sinon, demande un nouveau lien." },
  confirme: { tone: "success", text: "Adresse confirmée ! Connecte-toi pour commencer." },
  "mot-de-passe": { tone: "success", text: "Mot de passe modifié. Connecte-toi avec ton nouveau mot de passe." },
  deconnexion: { tone: "info", text: "Tu es déconnecté. À bientôt !" },
  supprime: { tone: "info", text: "Ton compte et ta progression ont été supprimés." },
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const notice = notices[searchParams.get("lien") ?? searchParams.get("etat") ?? ""];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(isSupabaseConfigured ? null : missingConfigMessage);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Renseigne ton adresse e-mail et ton mot de passe."); return; }
    if (!isSupabaseConfigured) { setError(missingConfigMessage); return; }
    setLoading(true);
    setError(null);
    try {
      const destination = await signInWithEmail(email, password, next);
      router.replace(destination);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause, "Connexion impossible. Réessaie."));
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      scene="login"
      title="Content de te revoir"
      subtitle="Connecte-toi pour reprendre ta progression, sur n’importe quel appareil."
      footer={<>Pas encore de compte ? <Link href="/register" className="auth-link">S’inscrire gratuitement</Link></>}
    >
      <div className="auth-stack">
        {notice && <p role={notice.tone === "error" ? "alert" : "status"} className={notice.tone === "error" ? "auth-notice" : `auth-notice auth-notice--${notice.tone}`}>{notice.text}</p>}
        <div>
          <SocialAuthButtons next={next} />
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <Input label="Adresse e-mail" type="email" name="email" placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            <div>
              <Input label="Mot de passe" type="password" name="password" placeholder="Ton mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              <div className="auth-forgot"><Link href="/mot-de-passe-oublie" className="auth-link">Mot de passe oublié ?</Link></div>
            </div>
            {error && <p role="alert" className="auth-alert">{error}</p>}
            <Button type="submit" variant="primary" size="lg" className="auth-submit" loading={loading} disabled={!isSupabaseConfigured}>Se connecter</Button>
            <p className="auth-keep">Tu resteras connecté sur cet appareil.</p>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}