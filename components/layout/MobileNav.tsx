"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { IconAI, IconActivity, IconCourses, IconDashboard, IconGlobe, IconProfile, IconShield } from "@/components/ui/Icon";

const LEARNER_ITEMS = [
  { href: "/dashboard", label: "Accueil", Icon: IconDashboard },
  { href: "/courses", label: "Cours", Icon: IconCourses },
  { href: "/challenges", label: "Labs", Icon: IconShield },
  { href: "/mentor", label: "Mentor", Icon: IconAI },
  { href: "/profile", label: "Profil", Icon: IconProfile },
];

const GUEST_ITEMS = [
  { href: "/", label: "Accueil", Icon: IconGlobe },
  { href: "/courses", label: "Cours", Icon: IconCourses },
  { href: "/challenges", label: "Labs", Icon: IconShield },
  { href: "/parcours", label: "Parcours", Icon: IconActivity },
  { href: "/login", label: "Connexion", Icon: IconProfile },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { hydrated, isAuthenticated } = useUser();
  const items = hydrated && !isAuthenticated ? GUEST_ITEMS : LEARNER_ITEMS;

  return (
    <nav className="learner-mobile-nav md:hidden" aria-label="Navigation principale">
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
