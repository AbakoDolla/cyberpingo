export type AppErrorKind =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid"
  | "conflict"
  | "rate_limited"
  | "network"
  | "not_configured"
  | "server";

const DEFAULT_MESSAGES: Record<AppErrorKind, string> = {
  unauthenticated: "Ta session a expiré. Reconnecte-toi pour continuer.",
  forbidden: "Tu n’as pas accès à cette ressource.",
  not_found: "Contenu introuvable.",
  invalid: "Certaines informations sont invalides. Vérifie ta saisie.",
  conflict: "Cet élément existe déjà.",
  rate_limited: "Trop de tentatives. Patiente quelques minutes avant de réessayer.",
  network: "Connexion au serveur impossible. Vérifie ta connexion internet puis réessaie.",
  not_configured: "Le service n’est pas configuré : ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  server: "Une erreur est survenue. Réessaie dans un instant.",
};

/** An error whose message is safe to show to learners (never a raw PostgreSQL message). */
export class AppError extends Error {
  readonly kind: AppErrorKind;
  constructor(kind: AppErrorKind, message = DEFAULT_MESSAGES[kind]) {
    super(message);
    this.name = "AppError";
    this.kind = kind;
  }
}

// Supabase Auth messages worth translating as-is.
const AUTH_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Adresse e-mail ou mot de passe incorrect.",
  "Email not confirmed": "Confirme ton adresse e-mail avec le lien reçu avant de te connecter.",
  "User already registered": "Un compte existe déjà avec cette adresse. Connecte-toi ou réinitialise ton mot de passe.",
  "Password should be at least 6 characters.": "Le mot de passe doit contenir au moins 8 caractères.",
  "New password should be different from the old password.": "Choisis un mot de passe différent de l’ancien.",
  "User is banned": "Ce compte est suspendu. Contacte l’équipe CyberPingo.",
  "Auth session missing!": DEFAULT_MESSAGES.unauthenticated,
};

function kindFromCode(code: string, status?: number): AppErrorKind | null {
  if (code === "P0002" || code === "PGRST116") return "not_found";
  if (code === "42501" || status === 403) return "forbidden";
  if (code === "PT429" || status === 429) return "rate_limited";
  if (code === "23505") return "conflict";
  if (code.startsWith("22") || code.startsWith("23") || code === "P0001") return "invalid";
  if (code === "PGRST301" || code === "PGRST302" || status === 401) return "unauthenticated";
  return null;
}

/**
 * Normalises Supabase Auth / PostgREST / Storage / network errors into an AppError with a French
 * message. Messages raised by CyberPingo SQL functions carry hint = 'cyberpingo' and are shown as-is.
 */
export function toAppError(error: unknown, fallback?: string): AppError {
  if (error instanceof AppError) return error;
  const details = error && typeof error === "object" ? error as { message?: unknown; hint?: unknown; code?: unknown; status?: unknown; name?: unknown } : {};
  const message = typeof details.message === "string" ? details.message : typeof error === "string" ? error : "";
  const code = typeof details.code === "string" ? details.code : "";
  const status = typeof details.status === "number" ? details.status : undefined;
  const kind = kindFromCode(code, status);

  if (details.hint === "cyberpingo" && message) return new AppError(kind ?? "invalid", message);
  if (AUTH_MESSAGES[message]) return new AppError(message === "Auth session missing!" ? "unauthenticated" : "invalid", AUTH_MESSAGES[message]);
  if (/rate limit|too many/i.test(message)) return new AppError("rate_limited");
  if (/JWT expired|invalid JWT|refresh token/i.test(message)) return new AppError("unauthenticated");
  if (details.name === "TypeError" && /fetch|network|load failed/i.test(message)) return new AppError("network");
  if (/failed to fetch|networkerror|network request failed/i.test(message)) return new AppError("network");
  if (/permission denied|row-level security/i.test(message)) return new AppError("forbidden", fallback ?? DEFAULT_MESSAGES.forbidden);
  if (kind) return new AppError(kind, fallback ?? DEFAULT_MESSAGES[kind]);
  return new AppError("server", fallback ?? DEFAULT_MESSAGES.server);
}

export function errorMessage(error: unknown, fallback?: string) {
  return toAppError(error, fallback).message;
}

type SuccessData<R> = R extends { error: null; data: infer D } ? D : never;
type UnwrappedData<R extends { data: unknown }> = [SuccessData<R>] extends [never] ? R["data"] : SuccessData<R>;

/** Throws a clean AppError when a Supabase call failed, otherwise returns its (success-branch) data. */
export function unwrap<R extends { data: unknown; error: unknown }>(result: R, fallback?: string): UnwrappedData<R> {
  if (result.error) throw toAppError(result.error, fallback);
  return result.data as UnwrappedData<R>;
}
