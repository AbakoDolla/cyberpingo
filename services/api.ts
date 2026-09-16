/**
 * Client API central. Toutes les requêtes vers le futur backend NestJS
 * doivent passer par ce fichier afin de centraliser la configuration
 * (base URL, headers, gestion des erreurs, authentification).
 *
 * Tant que le backend n'existe pas, les fonctions des autres fichiers
 * de `services/` retournent des données mockées mais respectent déjà
 * la même signature qu'un futur appel réel.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export interface ApiRequestOptions extends RequestInit {
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth, headers, ...rest } = options;

  const finalHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(headers ?? {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: auth ? "include" : "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Erreur API (${response.status}) sur ${path}`);
  }

  return response.json() as Promise<T>;
}

/** Simule la latence réseau pour les données mockées. */
export function mockDelay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}
