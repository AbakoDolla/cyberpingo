"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import {
  IconDashboard, IconCourses, IconShield, IconAI, IconProfile, IconActivity, IconBell, IconSettings, IconUsers,
} from "@/components/ui/Icon";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", Icon: IconDashboard },
  { href: "/courses", label: "Cours", Icon: IconCourses },
  { href: "/challenges", label: "Labs", Icon: IconShield },
  { href: "/progression", label: "Ma progression", Icon: IconActivity },
  { href: "/mentor", label: "Mentor IA", Icon: IconAI },
  { href: "/notifications", label: "Notifications", Icon: IconBell },
  { href: "/profile", label: "Profil", Icon: IconProfile },
  { href: "/parametres", label: "Paramètres", Icon: IconSettings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function LevelMini() {
  const { level, streak } = useUser();
  if (!level) return null;
  return (
    <div className="mt-auto rounded-xl border border-white/5 bg-cyber-black/60 px-3 py-4">
      <p className="text-xs text-slate-400">Niveau {level.level} · {level.title}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Progression vers le niveau suivant" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level.progress_percentage}>
        <div className="h-full rounded-full bg-cyber-gradient transition-[width] duration-700" style={{ width: `${level.progress_percentage}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-300">
        {level.next_level_xp !== null ? `${level.next_level_xp - level.xp} XP avant le niveau ${level.next_level}` : "Niveau maximum atteint"}
      </p>
      <p className="mt-1 text-xs text-slate-400">{streak > 0 ? `Série de ${streak} jour${streak > 1 ? "s" : ""}` : "Aucune série en cours"}</p>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { isStaff } = useUser();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-white/5 bg-dark-navy/40 px-4 py-6 overflow-y-auto">
      <Logo className="px-2 mb-8" />
      <nav className="flex flex-col gap-1" aria-label="Navigation de l’espace apprenant">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                active
                  ? "bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/30"
                  : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.6} />
              {label}
            </Link>
          );
        })}
        {isStaff && (
          <Link
            href="/admin"
            className="mt-3 flex items-center gap-3 rounded-xl border border-neon-purple/30 px-3 py-2.5 text-sm text-[#d9c8ff] hover:bg-neon-purple/10"
          >
            <IconUsers size={16} />
            Console admin
          </Link>
        )}
      </nav>
      <LevelMini />
    </aside>
  );
}