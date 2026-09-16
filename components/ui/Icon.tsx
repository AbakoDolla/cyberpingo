import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export type { IconProps };

type IconComponent = (props: IconProps) => JSX.Element;

function icon(paths: string, viewBox = "0 0 24 24"): IconComponent {
  return function SvgIcon({ className, size = 18, strokeWidth = 1.6 }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={cn("shrink-0", className)}
        dangerouslySetInnerHTML={{ __html: paths }}
      />
    );
  };
}

// ── Navigation ──────────────────────────────────────────────────────────────

/** Dashboard / Accueil — grille de carrés façon terminal */
export const IconDashboard = icon(
  `<rect x="3" y="3" width="7" height="7" rx="1"/>
   <rect x="14" y="3" width="7" height="7" rx="1"/>
   <rect x="3" y="14" width="7" height="7" rx="1"/>
   <rect x="14" y="14" width="7" height="7" rx="1"/>`
);

/** Cours — livre ouvert avec signal */
export const IconCourses = icon(
  `<path d="M2 6c0-1.1.9-2 2-2h7v16H4a2 2 0 0 1-2-2V6z"/>
   <path d="M22 6c0-1.1-.9-2-2-2h-7v16h7a2 2 0 0 0 2-2V6z"/>
   <line x1="12" y1="4" x2="12" y2="20"/>`
);

/** Challenges — bouclier avec chevron */
export const IconShield = icon(
  `<path d="M12 2l8 3.5v5c0 4.5-3.5 8.5-8 10-4.5-1.5-8-5.5-8-10v-5L12 2z"/>
   <polyline points="8.5 12 11 14.5 15.5 10"/>`
);

/** Mentor IA — puce / circuit */
export const IconAI = icon(
  `<rect x="7" y="7" width="10" height="10" rx="2"/>
   <line x1="12" y1="2" x2="12" y2="7"/>
   <line x1="12" y1="17" x2="12" y2="22"/>
   <line x1="2" y1="12" x2="7" y2="12"/>
   <line x1="17" y1="12" x2="22" y2="12"/>
   <line x1="4.2" y1="4.2" x2="7" y2="7"/>
   <line x1="17" y1="7" x2="19.8" y2="4.2"/>
   <line x1="17" y1="17" x2="19.8" y2="19.8"/>
   <line x1="4.2" y1="19.8" x2="7" y2="17"/>`
);

/** Profil — hexagone + silhouette */
export const IconProfile = icon(
  `<path d="M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/>
   <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>`
);

// ── Dashboard widgets ────────────────────────────────────────────────────────

/** Leçon — terminal / console */
export const IconLesson = icon(
  `<rect x="2" y="3" width="20" height="15" rx="2"/>
   <polyline points="8 10 12 13 16 10"/>
   <line x1="2" y1="20" x2="22" y2="20"/>`
);

/** Challenge réussi — cible */
export const IconTarget = icon(
  `<circle cx="12" cy="12" r="9"/>
   <circle cx="12" cy="12" r="5"/>
   <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>`
);

/** Cours complété — diplôme / ruban */
export const IconAward = icon(
  `<circle cx="12" cy="9" r="6"/>
   <polyline points="9.5 14.5 12 22 14.5 14.5"/>
   <polyline points="9.9 13.2 7 22 12 20 17 22 14.1 13.2"/>`
);

/** XP / Énergie — éclair hexagonal */
export const IconBolt = icon(
  `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />`
);

/** Streak / flamme */
export const IconFlame = icon(
  `<path d="M12 2c0 5-5 7-5 11a5 5 0 0 0 10 0c0-4.5-5-6-5-11z"/>
   <path d="M12 12c0 2-1.5 3-1.5 4.5a1.5 1.5 0 0 0 3 0C13.5 15 12 14 12 12z"/>`
);

/** Activité / Progression */
export const IconActivity = icon(
  `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`
);

/** Roadmap / Chemin */
export const IconMap = icon(
  `<path d="M3 7l6-3 6 3 6-3v14l-6 3-6-3-6 3V7z"/>
   <line x1="9" y1="4" x2="9" y2="18"/>
   <line x1="15" y1="6" x2="15" y2="20"/>`
);

/** Badge / Trophée */
export const IconTrophy = icon(
  `<path d="M6 3h12l2 5c0 3.3-2.7 6-6 6h-4C6.7 14 4 11.3 4 8L6 3z"/>
   <path d="M12 14v4"/>
   <path d="M8 22h8"/>
   <path d="M4 8H2"/>
   <path d="M22 8h-2"/>`
);

/** Cadenas — cours verrouillé */
export const IconLock = icon(
  `<rect x="5" y="11" width="14" height="10" rx="2"/>
   <path d="M8 11V7a4 4 0 0 1 8 0v4"/>`
);

/** Check — terminé */
export const IconCheck = icon(
  `<polyline points="20 6 9 17 4 12"/>`
);

/** Cercle vide — non commencé */
export const IconCircle = icon(
  `<circle cx="12" cy="12" r="9"/>`
);

/** Flèche droite */
export const IconArrowRight = icon(
  `<line x1="5" y1="12" x2="19" y2="12"/>
   <polyline points="12 5 19 12 12 19"/>`
);

/** Oeil — aperçu */
export const IconEye = icon(
  `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
   <circle cx="12" cy="12" r="3"/>`
);

/** Terminal — cours Linux/commandes */
export const IconTerminal = icon(
  `<polyline points="4 17 10 11 4 5"/>
   <line x1="12" y1="19" x2="20" y2="19"/>`
);

/** Réseau — nœuds connectés */
export const IconNetwork = icon(
  `<circle cx="12" cy="5" r="2" fill="currentColor" stroke="none"/>
   <circle cx="5" cy="19" r="2" fill="currentColor" stroke="none"/>
   <circle cx="19" cy="19" r="2" fill="currentColor" stroke="none"/>
   <line x1="12" y1="7" x2="5" y2="17"/>
   <line x1="12" y1="7" x2="19" y2="17"/>
   <line x1="7" y1="19" x2="17" y2="19"/>`
);

/** Sécurité Web — globe avec verrou */
export const IconGlobe = icon(
  `<circle cx="12" cy="12" r="9"/>
   <line x1="2" y1="12" x2="22" y2="12"/>
   <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/>`
);

/** Penguin Linux — remplacé par kernel/engrenage */
export const IconLinux = icon(
  `<circle cx="12" cy="12" r="3"/>
   <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>`
);

/** Pentest — viseur */
export const IconCrosshair = icon(
  `<circle cx="12" cy="12" r="9"/>
   <circle cx="12" cy="12" r="3"/>
   <line x1="12" y1="2" x2="12" y2="6"/>
   <line x1="12" y1="18" x2="12" y2="22"/>
   <line x1="2" y1="12" x2="6" y2="12"/>
   <line x1="18" y1="12" x2="22" y2="12"/>`
);

/** Mention / Badge académique */
export const IconStar = icon(
  `<polygon points="12 2 15.1 8.6 22 9.6 17 14.4 18.2 21.3 12 18 5.8 21.3 7 14.4 2 9.6 8.9 8.6 12 2"/>`
);

/** Cerveau / Quiz */
export const IconBrain = icon(
  `<path d="M9 3a3 3 0 0 0-3 3c0 1 .4 1.9 1 2.5A3 3 0 0 0 6 11a3 3 0 0 0 2 2.8V21h8v-7.2A3 3 0 0 0 18 11a3 3 0 0 0-1-2.5A3 3 0 1 0 9 3z"/>
   <line x1="9" y1="10" x2="9" y2="10.5"/>
   <line x1="15" y1="10" x2="15" y2="10.5"/>`
);

/** Disconnect / Déconnexion */
export const IconLogout = icon(
  `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
   <polyline points="16 17 21 12 16 7"/>
   <line x1="21" y1="12" x2="9" y2="12"/>`
);

/** Envoyer message */
export const IconSend = icon(
  `<line x1="22" y1="2" x2="11" y2="13"/>
   <polygon points="22 2 15 22 11 13 2 9 22 2"/>`
);

/** Effacer / Corbeille */
export const IconTrash = icon(
  `<polyline points="3 6 5 6 21 6"/>
   <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
   <path d="M10 11v6M14 11v6"/>
   <path d="M9 6V4h6v2"/>`
);

/** Indice / Ampoule */
export const IconHint = icon(
  `<line x1="9" y1="18" x2="15" y2="18"/>
   <line x1="10" y1="22" x2="14" y2="22"/>
   <path d="M12 2a7 7 0 0 1 5 11.9V16H7v-2.1A7 7 0 0 1 12 2z"/>`
);

/** Chronomètre */
export const IconClock = icon(
  `<circle cx="12" cy="12" r="9"/>
   <polyline points="12 7 12 12 15 15"/>`
);

/** Plus / Ajouter */
export const IconPlus = icon(
  `<line x1="12" y1="5" x2="12" y2="19"/>
   <line x1="5" y1="12" x2="19" y2="12"/>`
);

/** Chevron bas */
export const IconChevronDown = icon(
  `<polyline points="6 9 12 15 18 9"/>`
);

/** Menu burger */
export const IconMenu = icon(
  `<line x1="3" y1="6" x2="21" y2="6"/>
   <line x1="3" y1="12" x2="21" y2="12"/>
   <line x1="3" y1="18" x2="21" y2="18"/>`
);

/** Croix / Fermer */
export const IconX = icon(
  `<line x1="18" y1="6" x2="6" y2="18"/>
   <line x1="6" y1="6" x2="18" y2="18"/>`
);
