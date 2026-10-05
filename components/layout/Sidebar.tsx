"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import {
  IconActivity, IconAI, IconArrowRight, IconBell, IconCourses, IconDashboard, IconFlame, IconGlobe, IconLesson,
  IconMap, IconProfile, IconSettings, IconShield, IconTarget, IconTrophy, IconUsers,
} from "@/components/ui/Icon";
import CoinIcon from "@/components/cyberbits/CoinIcon";

type NavItem = { href: string; label: string; Icon: typeof IconDashboard };

const LEARN_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", Icon: IconDashboard },
  { href: "/courses", label: "Cours", Icon: IconCourses },
  { href: "/challenges", label: "Labs", Icon: IconShield },
  { href: "/boutique", label: "Boutique", Icon: CoinIcon as unknown as typeof IconDashboard },
  { href: "/classement", label: "Classement", Icon: IconTrophy },
  { href: "/progression", label: "Ma progression", Icon: IconActivity },
  { href: "/competences", label: "Compétences", Icon: IconTarget },
  { href: "/mentor", label: "Mentor IA", Icon: IconAI },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { href: "/notifications", label: "Notifications", Icon: IconBell },
  { href: "/profile", label: "Profil", Icon: IconProfile },
  { href: "/parametres", label: "Paramètres", Icon: IconSettings },
];

const GUEST_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", Icon: IconGlobe },
  { href: "/courses", label: "Cours", Icon: IconCourses },
  { href: "/challenges", label: "Labs", Icon: IconShield },
  { href: "/boutique", label: "Boutique", Icon: CoinIcon as unknown as typeof IconDashboard },
  { href: "/classement", label: "Classement", Icon: IconTrophy },
  { href: "/parcours", label: "Parcours métiers", Icon: IconMap },
  { href: "/ressources", label: "Ressources", Icon: IconLesson },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavGroup({ title, items, pathname, badge }: { title: string; items: NavItem[]; pathname: string; badge?: (href: string) => number }) {
  return (
    <div className="sidebar-group">
      <p className="sidebar-group__title">{title}</p>
      {items.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        const count = badge?.(href) ?? 0;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("sidebar-link", active && "is-active")}>
            <span className="sidebar-link__icon"><Icon size={17} strokeWidth={active ? 2.1 : 1.7} /></span>
            <span className="sidebar-link__label">{label}</span>
            {count > 0 && <span className="sidebar-link__count" aria-label={`${count} non lues`}>{count > 99 ? "99+" : count}</span>}
          </Link>
        );
      })}
    </div>
  );
}

function LevelMini() {
  const { level, streak } = useUser();
  if (!level) return null;
  const remaining = level.next_level_xp !== null ? Math.max(0, level.next_level_xp - level.xp) : null;
  return (
    <Link href="/progression" className="sidebar-level" aria-label={`Niveau ${level.level}, ${level.title}. Voir ma progression`}>
      <span className="sidebar-level__head">
        <span className="sidebar-level__badge">{level.level}</span>
        <span><strong>{level.title}</strong><small>{remaining !== null ? `${remaining} XP avant le niveau ${level.next_level}` : "Niveau maximum atteint"}</small></span>
      </span>
      <span className="sidebar-level__bar" role="progressbar" aria-label="Progression vers le niveau suivant" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level.progress_percentage}>
        <span style={{ transform: `scaleX(${level.progress_percentage / 100})` }} />
      </span>
      <span className={cn("sidebar-level__streak", streak > 0 && "is-hot")}><IconFlame size={14} /> {streak > 0 ? `Série de ${streak} jour${streak > 1 ? "s" : ""}` : "Lance ta série aujourd’hui"}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { hydrated, isAuthenticated, isStaff, unreadNotifications } = useUser();
  const guest = hydrated && !isAuthenticated;

  return (
    <aside className="learner-sidebar">
      <Logo className="px-2 mb-7" />
      {guest ? (
        <>
          <nav aria-label="Navigation découverte"><NavGroup title="Découvrir" items={GUEST_ITEMS} pathname={pathname} /></nav>
          <div className="sidebar-cta">
            <strong>Garde ta progression.</strong>
            <p>Crée ton compte gratuit pour gagner des XP, débloquer des badges et suivre ta série.</p>
            <Link href="/register" className="study-button study-button--sm">Créer un compte <IconArrowRight size={14} /></Link>
          </div>
        </>
      ) : (
        <>
          <nav aria-label="Navigation de l’espace apprenant">
            <NavGroup title="Apprendre" items={LEARN_ITEMS} pathname={pathname} />
            <NavGroup title="Compte" items={ACCOUNT_ITEMS} pathname={pathname} badge={(href) => (href === "/notifications" ? unreadNotifications : 0)} />
            {isStaff && (
              <Link href="/admin" className="sidebar-admin-link">
                <IconUsers size={16} /> Console admin <IconArrowRight size={14} />
              </Link>
            )}
          </nav>
          <LevelMini />
        </>
      )}
    </aside>
  );
}
