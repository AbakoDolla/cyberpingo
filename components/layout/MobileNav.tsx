"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import {
  IconDashboard,
  IconCourses,
  IconShield,
  IconAI,
  IconProfile,
} from "@/components/ui/Icon";

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useUser();

  const navItems = [
    ...(user.isAdmin
      ? [{ href: "/dashboard", label: "Admin", Icon: IconDashboard }]
      : []),
    { href: "/courses", label: "Cours", Icon: IconCourses },
    { href: "/challenges", label: "Défis", Icon: IconShield },
    { href: "/mentor", label: "Mentor", Icon: IconAI },
    { href: "/profile", label: "Profil", Icon: IconProfile },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-navy/95 backdrop-blur-sm border-t border-white/10 flex justify-around py-2"
      aria-label="Navigation principale"
    >
      {navItems.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] transition-colors",
              active ? "text-cyber-blue" : "text-white/40"
            )}
          >
            <Icon size={20} strokeWidth={active ? 2 : 1.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
