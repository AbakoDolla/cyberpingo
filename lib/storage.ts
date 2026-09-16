/**
 * Petite couche de persistance locale (localStorage) qui simule un
 * backend le temps que l'API NestJS existe. À remplacer terme par de
 * vrais appels à `services/`.
 */

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible (navigation privée, quota) : on ignore silencieusement.
  }
}

export const SESSION_COOKIE = "cyberpingo_session";

export function setSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}`;
}

export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}

export const ROLE_COOKIE = "cyberpingo_role";

/** Pose le cookie de rôle admin (valide 30 jours, même durée que le cookie de session). */
export function setAdminCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ROLE_COOKIE}=admin; path=/; max-age=${60 * 60 * 24 * 30}`;
}

/** Supprime le cookie de rôle admin. */
export function clearAdminCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
}
