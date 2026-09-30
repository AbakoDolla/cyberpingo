"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/onboarding/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { passwordProblem, updatePassword } from "@/lib/auth-client";
import { useUser } from "@/context/UserContext";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user } = useUser();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    try {
      await updatePassword(password);
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le mot de passe n’a pas pu être modifié.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={done ? "C’est tout bon !" : "Choisis un nouveau mot de passe"}
      subtitle={done ? "Ton nouveau mot de passe est actif." : "Au moins 8 caractères, avec une lettre et un chiffre. Évite un mot de passe déjà utilisé ailleurs."}
    >
      {done ? (
        <div role="status" className="space-y-4 text-sm text-slate-300">
          <p>Utilise-le dès ta prochaine connexion, sur tous tes appareils.</p>
          <Button type="button" variant="primary" className="w-full" onClick={() => router.replace(user.isAdmin ? "/dashboard" : "/courses")}>
            Reprendre mon apprentissage
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Nouveau mot de passe"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
            required
          />
          <Input
            label="Confirmer le mot de passe"
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
            required
          />
          {error && <p role="alert" className="text-sm text-cyber-red">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            Enregistrer le mot de passe
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
