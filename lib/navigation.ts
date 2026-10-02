import { isStaff } from "@/lib/roles";

/** Daily study goals accepted by the database (profiles.daily_minutes check constraint). */
export const DAILY_GOALS = [10, 20, 30, 45, 60, 90] as const;

const APP_SECTIONS = "dashboard|courses|lessons|quiz|challenges|mentor|profile|progression|competences|parametres|notifications|onboarding|admin";
const RETURN_PATH = new RegExp(`^/(${APP_SECTIONS})(/[a-zA-Z0-9_-]+)*$`);

/** Validates a post-login ?next= target so it can never redirect off-site or into the admin area for learners. */
export function safeReturnPath(next: string | null | undefined, role: string | null | undefined) {
  const staff = isStaff(role);
  const fallback = staff ? "/admin" : "/dashboard";
  if (!next || !RETURN_PATH.test(next)) return fallback;
  if (!staff && next.startsWith("/admin")) return "/dashboard";
  return next;
}
