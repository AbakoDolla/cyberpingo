import { RoadmapNode } from "@/types";

/**
 * Les statuts sont des valeurs par défaut utilisées uniquement comme fallback.
 * Le composant RoadmapVisual calcule les vrais statuts depuis la progression
 * de l'utilisateur (UserContext + courses).
 */
export const roadmap: RoadmapNode[] = [
  { id: "r1", title: "Fondamentaux", description: "Bases de l'informatique et de la sécurité.", status: "verrouille", order: 1, courseSlug: "fondamentaux" },
  { id: "r2", title: "Réseaux", description: "Comprendre le fonctionnement d'Internet.", status: "verrouille", order: 2, courseSlug: "reseaux" },
  { id: "r3", title: "Linux", description: "Maîtriser le terminal et l'administration Linux.", status: "verrouille", order: 3, courseSlug: "linux" },
  { id: "r4", title: "Sécurité Web", description: "Vulnérabilités et bonnes pratiques web.", status: "verrouille", order: 4, courseSlug: "securite-web" },
  { id: "r5", title: "Pentest", description: "Introduction aux tests d'intrusion.", status: "verrouille", order: 5, courseSlug: "pentest-intro" },
  { id: "r6", title: "SOC", description: "Surveillance et réponse aux incidents.", status: "verrouille", order: 6 },
  { id: "r7", title: "Cybersécurité avancée", description: "Spécialisations et certifications.", status: "verrouille", order: 7 },
];
