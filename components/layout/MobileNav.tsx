"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { useTranslation } from "@/lib/i18n";
import { IconActivity, IconCourses, IconDashboard, IconGlobe, IconProfile, IconShield, IconTrophy } from "@/components/ui/Icon";

export default function MobileNav() {
  const pathname = usePathname();
  const { hydrated, isAuthenticated } = useUser();
  const { lang, t } = useTranslation();
  const isEn = lang === "en";

  const learnerItems = [
    { href: "/dashboard", label: isEn ? "Home" : "Accueil", Icon: IconDashboard },
    { href: "/courses", label: t("nav.courses"), Icon: IconCourses },
    { href: "/challenges", label: t("nav.labs"), Icon: IconShield },
    { href: "/classement", label: t("nav.leaderboard"), Icon: IconTrophy },
    { href: "/profile", label: t("nav.profile"), Icon: IconProfile },
  ];

  const guestItems = [
    { href: "/", label: isEn ? "Home" : "Accueil", Icon: IconGlobe },
    { href: "/courses", label: t("nav.courses"), Icon: IconCourses },
    { href: "/challenges", label: t("nav.labs"), Icon: IconShield },
    { href: "/parcours", label: isEn ? "Tracks" : "Parcours", Icon: IconActivity },
    { href: "/login", label: isEn ? "Sign In" : "Connexion", Icon: IconProfile },
  ];

  const items = hydrated && !isAuthenticated ? guestItems : learnerItems;

  return (
    <nav className="learner-mobile-nav md:hidden" aria-label={isEn ? "Main navigation" : "Navigation principale"}>
      {items.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("mobile-nav-link", active && "is-active")}>
            <span className="mobile-nav-link__icon"><Icon size={20} strokeWidth={active ? 2.1 : 1.6} /></span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

