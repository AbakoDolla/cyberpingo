"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/onboarding/AuthLayout";
import SocialAuthButtons from "@/components/onboarding/SocialAuthButtons";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useUserActions } from "@/context/UserContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading, error } = useAuth();
  const { loginMock } = useUserActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setFormError("Renseigne ton email et ton mot de passe.");
      return;
    }
    setFormError(null);
    const result = await login({ email, password });
    if (result) {
      loginMock(result);
      // Admin → dashboard, utilisateur simple → /courses
      const isAdminUser = result.isAdmin === true;
      const fallback = isAdminUser ? "/dashboard" : "/courses";
      const next = searchParams.get("next") ?? fallback;
      // Empêche un non-admin d'être redirigé vers /dashboard via ?next=
      const safeDest = !isAdminUser && next.startsWith("/dashboard") ? "/courses" : next;
      router.push(safeDest);
    }
  }

  return (
    <AuthLayout
      title="Content de te revoir"
      subtitle="Connecte-toi pour continuer ta progression."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-cyber-blue hover:underline">
            S&apos;inscrire
          </Link>
        </>
      }
    >
      <SocialAuthButtons />

      <div className="flex items-center gap-4 my-6">
        <div className="h-px bg-white/10 flex-1" />
        <span className="text-xs text-white/40">ou avec ton email</span>
        <div className="h-px bg-white/10 flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Adresse email"
          type="email"
          name="email"
          placeholder="toi@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Input
          label="Mot de passe"
          type="password"
          name="password"
          placeholder="Ton mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {(formError || error) && (
          <p className="text-sm text-cyber-red">{formError ?? error}</p>
        )}
        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          Se connecter
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
