import { isStaff, isSuperadmin } from "@/lib/roles";

export interface AdminSection {
  href: string;
  label: string;
  /** Reserved to super-administrators: administrators neither see the entry nor can open the page. */
  superadminOnly?: boolean;
}

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { href: "/admin", label: "Vue d’ensemble" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/cours", label: "Cours" },
  { href: "/admin/import", label: "Import IA" },
  { href: "/admin/labs", label: "Labs" },
  { href: "/admin/rendus", label: "Rendus" },
  { href: "/admin/competences", label: "Compétences" },
  { href: "/admin/mascotte", label: "Mascotte et voix" },
  { href: "/admin/badges", label: "Badges" },
  { href: "/admin/defis", label: "Défis" },
  { href: "/admin/cyberbits", label: "CyberBits" },
  { href: "/admin/certificats", label: "Certificats" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/journal", label: "Journal d’audit", superadminOnly: true },
];

const matchesSection = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** The most specific section a path belongs to ("/admin" only matches itself, never as a prefix). */
export function sectionFor(pathname: string): AdminSection | null {
  let found: AdminSection | null = null;
  for (const section of ADMIN_SECTIONS) {
    const hit = section.href === "/admin" ? pathname === "/admin" : matchesSection(pathname, section.href);
    if (hit && (!found || section.href.length > found.href.length)) found = section;
  }
  return found;
}

/** Sections shown in the console navigation for a role; learners and visitors get none. */
export function sectionsFor(role: string | null | undefined): AdminSection[] {
  if (!isStaff(role)) return [];
  return ADMIN_SECTIONS.filter((section) => !section.superadminOnly || isSuperadmin(role));
}

/**
 * Whether a role may open a path of the console. Sections without a rule are open to every staff
 * member; learners and visitors are always refused. The database re-checks the same rule through
 * Row Level Security, so this is the first line of defence and a UI convenience.
 */
export function canAccessAdminPath(role: string | null | undefined, pathname: string): boolean {
  if (!isStaff(role)) return false;
  const section = sectionFor(pathname);
  return !section?.superadminOnly || isSuperadmin(role);
}
