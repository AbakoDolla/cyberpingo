export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export type OAuthProvider = "github" | "google";
export const oauthProviders: OAuthProvider[] = (process.env.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS ?? "")
  .split(",")
  .map((provider) => provider.trim().toLowerCase())
  .filter((provider): provider is OAuthProvider => provider === "github" || provider === "google");

export const missingConfigMessage = "Le service de comptes n’est pas configuré : ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.";
