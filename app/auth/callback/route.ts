import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeReturnPath } from "@/lib/learning-progress";

const RESET_PATH = "/reinitialiser-mot-de-passe";
const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/** Completes e-mail confirmation, password recovery and OAuth sign-in links. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const rawType = params.get("type");
  const type = OTP_TYPES.find((candidate) => candidate === rawType) ?? null;
  const next = params.get("next");
  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const fail = () => redirect("/login?lien=expire");

  if (!isSupabaseConfigured || params.get("error")) return fail();

  const supabase = await createSupabaseServerClient();
  let userId: string | undefined;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail();
    userId = data.user?.id;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail();
    userId = data.user?.id;
  }
  if (!userId) return fail();

  if (type === "recovery" || next === RESET_PATH) return redirect(RESET_PATH);

  await supabase.rpc("record_login");
  const { data: profile } = await supabase.from("profiles").select("role, onboarding_completed").eq("id", userId).maybeSingle();
  const isAdmin = profile?.role === "admin";
  if (profile && !isAdmin && !profile.onboarding_completed) return redirect("/onboarding");
  return redirect(safeReturnPath(next, isAdmin));
}
