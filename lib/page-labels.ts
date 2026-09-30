import { courses } from "@/data/courses";
import { challenges } from "@/data/challenges";

const STATIC_LABELS: Record<string, string> = {
  "/": "Accueil",
  "/login": "Connexion",
  "/register": "Inscription",
  "/onboarding": "Onboarding",
  "/dashboard": "Console admin",
  "/courses": "Catalogue des cours",
  "/challenges": "Liste des challenges",
  "/mentor": "Mentor IA",
  "/profile": "Profil",
  "/progression": "Progression",
  "/parametres": "Paramètres",
};

const courseTitles = new Map(courses.flatMap((course) => [[course.id, course.title], [course.slug, course.title]] as const));
const lessonTitles = new Map(courses.flatMap((course) => course.lessons.map((lesson) => [lesson.id, lesson.title] as const)));
const challengeTitles = new Map(challenges.flatMap((challenge) => [[challenge.id, challenge.title], [challenge.slug, challenge.title]] as const));

export function courseTitle(id: string) {
  return courseTitles.get(id) ?? id;
}

export function pageLabel(path: string | null | undefined): string {
  if (!path) return "Page inconnue";
  if (STATIC_LABELS[path]) return STATIC_LABELS[path];
  const [, section, id] = path.split("/");
  if (!id) return path;
  if (section === "courses") return `Cours · ${courseTitles.get(id) ?? id}`;
  if (section === "lessons") return `Leçon · ${lessonTitles.get(id) ?? id}`;
  if (section === "challenges") return `Challenge · ${challengeTitles.get(id) ?? id}`;
  if (section === "quiz") return "Quiz";
  return path;
}
