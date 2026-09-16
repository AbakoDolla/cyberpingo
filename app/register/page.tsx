"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/onboarding/AuthLayout";
import SocialAuthButtons from "@/components/onboarding/SocialAuthButtons";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useUserActions } from "@/context/UserContext";

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuth();
  const { loginMock } = useUserActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Entre une adresse email valide.";
    }
    if (password.length < 8) {
      newErrors.password = "8 caractères minimum.";
    }
    if (confirmPassword !== password) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const result = await register({ email, password });
    if (result) {
      loginMock(result);
      router.push("/onboarding");
    }
  }

  return (
    <AuthLayout
      title="Crée ton compte Cyberpingo"
      subtitle="Commence gratuitement, sans engagement."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href="/login" className="text-cyber-blue hover:underline">
            Se connecter
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
          error={errors.email}
          autoComplete="email"
        />
        <Input
          label="Mot de passe"
          type="password"
          name="password"
          placeholder="8 caractères minimum"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />
        <Input
          label="Confirmer le mot de passe"
          type="password"
          name="confirmPassword"
          placeholder="Retape ton mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          Créer mon compte
        </Button>
      </form>
    </AuthLayout>
  );
}
