export type Role = "user" | "admin" | "superadmin";

export const ROLES: Role[] = ["user", "admin", "superadmin"];

export const ROLE_LABELS: Record<Role, string> = {
  user: "Apprenant",
  admin: "Administrateur",
  superadmin: "Super-administrateur",
};

export function asRole(value: string | null | undefined): Role {
  return value === "admin" || value === "superadmin" ? value : "user";
}

/**
 * UI hint only: the database re-checks the role (RLS + private.require_admin()) on every request,
 * so hiding a button here is a convenience, never a security boundary.
 */
export const isStaff = (role: string | null | undefined) => role === "admin" || role === "superadmin";
export const isSuperadmin = (role: string | null | undefined) => role === "superadmin";
