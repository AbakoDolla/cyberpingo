import { Badge } from "@/types";

/**
 * Les icônes des badges sont des clés de type string.
 * Le composant BadgesGrid utilise IconBadge pour les rendre en SVG.
 */
export const badges: Badge[] = [
  {
    id: "b1",
    name: "Première leçon",
    description: "Termine ta toute première leçon CyberPingo.",
    icon: "award",
    earned: false,
  },
  {
    id: "b2",
    name: "7 jours consécutifs",
    description: "Apprends 7 jours de suite sans interruption.",
    icon: "flame",
    earned: false,
  },
  {
    id: "b3",
    name: "Premier challenge",
    description: "Résous ton premier challenge cybersécurité.",
    icon: "shield",
    earned: false,
  },
  {
    id: "b4",
    name: "10 quiz réussis",
    description: "Valide 10 quiz différents avec au moins 70 % de bonnes réponses.",
    icon: "brain",
    earned: false,
  },
  {
    id: "b5",
    name: "Expert réseau",
    description: "Termine tout le module Réseaux avec succès.",
    icon: "network",
    earned: false,
  },
];
