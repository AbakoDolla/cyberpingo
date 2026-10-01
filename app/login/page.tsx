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

const notices: Record<string, { tone: "info" | "error"; text: string }> = {
  expire: { tone: "error", text: "Ce lien n’est plus valide ou a déjà été utilisé. Si tu viens de confirmer ton adresse, connecte-toi simplement ; sinon, demande un nouveau lien." },
  confirme: { tone: "info", text: "Adresse confirmée ! Connecte-toi pour commencer." },
  "mot-de-passe": { tone: "info", text: "Mot de passe modifié. Connecte-toi avec ton nouveau mot de passe." },
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

  return <AuthLayout title="Content de te revoir" subtitle="Connecte-toi pour reprendre ta progression, sur n’importe quel appareil." footer={<>Pas encore de compte ? <Link href="/register" className="text-cyber-blue hover:underline">S’inscrire gratuitement</Link></>}>
    {notice && <p role={notice.tone === "error" ? "alert" : "status"} className={`mb-5 rounded-xl border px-4 py-3 text-sm ${notice.tone === "error" ? "border-cyber-red/30 bg-cyber-red/10 text-red-100" : "border-cyber-green/30 bg-cyber-green/10 text-emerald-100"}`}>{notice.text}</p>}
    <SocialAuthButtons next={next} />
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Input label="Adresse e-mail" type="email" name="email" placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <div><Input label="Mot de passe" type="password" name="password" placeholder="Ton mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /><Link href="/mot-de-passe-oublie" className="mt-2 inline-block text-sm text-cyber-blue hover:underline">Mot de passe oublié ?</Link></div>
      {error && <p role="alert" className="text-sm text-cyber-red">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={!isSupabaseConfigured}>Se connecter</Button>
    </form>
  </AuthLayout>;
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}