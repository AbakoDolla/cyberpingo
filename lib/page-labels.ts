const STATIC_LABELS: Record<string, string> = {
  "/": "Accueil",
  "/login": "Connexion",
  "/register": "Inscription",
  "/onboarding": "Onboarding",
  "/dashboard": "Tableau de bord",
  "/courses": "Catalogue des cours",
  "/challenges": "Labs",
  "/mentor": "Mentor IA",
  "/profile": "Profil",
  "/progression": "Progression",
  "/parametres": "Paramètres",
  "/notifications": "Notifications",
  "/admin": "Console admin",
};

const SECTION_LABELS: Record<string, string> = {
  courses: "Cours",
  lessons: "Leçon",
  quiz: "Quiz",
  challenges: "Lab",
  admin: "Console admin",
  certificat: "Certificat",
};

/**
 * Human label for a path reported by the heartbeat. `titles` (id or slug → title) lets the admin
 * live view show real content titles it has already loaded from the database.
 */
export function pageLabel(path: string | null | undefined, titles?: ReadonlyMap<string, string>): string {
  if (!path) return "Page inconnue";
  if (STATIC_LABELS[path]) return STATIC_LABELS[path];
  const [, section = "", id] = path.split("/");
  const label = SECTION_LABELS[section];
  if (!label || !id) return path;
  return `${label} · ${titles?.get(id) ?? id}`;
}
