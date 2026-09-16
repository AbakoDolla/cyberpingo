"use client";

import { useState } from "react";
import { LoginPayload, RegisterPayload, loginUser, registerUser } from "@/services/auth";
import { User } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(payload: LoginPayload): Promise<User | null> {
    setLoading(true);
    setError(null);
    try {
      const result = await loginUser(payload);
      setUser(result);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossible de te connecter pour le moment.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function register(payload: RegisterPayload): Promise<User | null> {
    setLoading(true);
    setError(null);
    try {
      const result = await registerUser(payload);
      setUser(result);
      return result;
    } catch (err) {
      setError("Impossible de créer ton compte pour le moment.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { user, loading, error, login, register };
}
