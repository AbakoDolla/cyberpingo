import { canAccessAdminPath } from "@/lib/admin-access";
import { isStaff } from "@/lib/roles";

/** Daily study goals accepted by the database (profiles.daily_minutes check constraint). */
export const DAILY_GOALS = [10, 20, 30, 45, 60, 90] as const;

const APP_SECTIONS = "dashboard|courses|lessons|quiz|challenges|mentor|profile|progression|competences|parametres|notifications|onboarding|admin";
const RETURN_PATH = new RegExp(`^/(${APP_SECTIONS})(/[a-zA-Z0-9_-]+)*$`);

/** Validates a post-login ?next= target so it can never redirect off-site or into a console section the role cannot open. */
export function safeReturnPath(next: string | null | undefined, role: string | null | undefined) {
  const fallback = isStaff(role) ? "/admin" : "/dashboard";
  if (!next || !RETURN_PATH.test(next)) return fallback;
  if (next.startsWith("/admin") && !canAccessAdminPath(role, next)) return fallback;
  return next;
}
