"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { cn } from "@/lib/utils";
import { lessons } from "@/data/lessons";
import { useUser } from "@/context/UserContext";
import {
  IconDashboard, IconCourses, IconShield, IconAI, IconProfile,
} from "@/components/ui/Icon";

// Leçons indexées par id — O(1) à la place de find() O(n)
const lessonsArray = lessons;

function DailyMissionMini() {
  const { user } = useUser();

  // useMemo : recalcule uniquement quand completedLessons change
  const nextLesson = useMemo(() => {
    const completedSet = new Set(user.completedLessons);
    return lessonsArray.find((l) => !completedSet.has(l.id)) ?? null;
  }, [user.completedLessons]);

  return (
    <>
      <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Mission du jour</p>
      {nextLesson ? (
        <Link
          href={`/lessons/${nextLesson.id}`}
          className="block text-sm text-white/80 hover:text-cyber-blue transition-colors truncate leading-snug"
        >
          {nextLesson.title}
        </Link>
      ) : (
        <p className="text-sm text-cyber-green">Toutes les leçons terminées ✓</p>
      )}
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  // useMemo : navItems ne change que si isAdmin change (rarissime)
  const navItems = useMemo(() => [
    ...(user.isAdmin ? [{ href: "/dashboard", label: "Dashboard", Icon: IconDashboard }] : []),
    { href: "/courses",    label: "Cours",       Icon: IconCourses },
    { href: "/challenges", label: "Challenges",  Icon: IconShield  },
    { href: "/mentor",     label: "Mentor IA",   Icon: IconAI      },
    { href: "/profile",    label: "Profil",      Icon: IconProfile },
  ], [user.isAdmin]);

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-white/5 bg-dark-navy/40 px-4 py-6">
      <Logo className="px-2 mb-8" />
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                active
                  ? "bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/30"
                  : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.6} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 py-4 rounded-xl bg-cyber-black/60 border border-white/5">
        <DailyMissionMini />
      </div>
    </aside>
  );
}
