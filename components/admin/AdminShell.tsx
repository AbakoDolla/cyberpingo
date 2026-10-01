"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import {
  IconActivity, IconAward, IconBell, IconCertificate, IconCourses, IconDashboard, IconList, IconMail, IconProfile, IconShield, IconTerminal,
} from "@/components/ui/Icon";

const NAV = [
  { href: "/admin", label: "Vue d’ensemble", Icon: IconDashboard },
  { href: "/admin/utilisateurs", label: "Utilisateurs", Icon: IconProfile },
  { href: "/admin/cours", label: "Cours", Icon: IconCourses },
  { href: "/admin/import", label: "Import IA", Icon: IconActivity },
  { href: "/admin/labs", label: "Labs", Icon: IconTerminal },
  { href: "/admin/badges", label: "Badges", Icon: IconAward },
  { href: "/admin/defis", label: "Défis", Icon: IconShield },
  { href: "/admin/certificats", label: "Certificats", Icon: IconCertificate },
  { href: "/admin/notifications", label: "Notifications", Icon: IconBell },
  { href: "/admin/messages", label: "Messages", Icon: IconMail },
  { href: "/admin/journal", label: "Journal", Icon: IconList },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hydrated, configured, isAuthenticated, isStaff, profile, syncError } = useUser();

  if (!configured) {
    return <main className="min-h-screen grid place-items-center px-6"><GuardCard title="Service non configuré" detail="Ajoute la configuration Supabase pour ouvrir la console." /></main>;
  }
  if (!hydrated) {
    return <main className="min-h-screen grid place-items-center px-6" aria-busy="true"><div className="h-24 w-80 rounded-xl2 bg-white/[0.04] animate-pulse" /></main>;
  }
  if (!isAuthenticated || !isStaff) {
    return <main className="min-h-screen grid place-items-center px-6"><GuardCard title="Accès réservé" detail="Cette console est réservée à l’équipe CyberPingo." /></main>;
  }

  return (
    <div className="admin-shell min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(0,168,255,0.12),transparent_36rem)]">
      <aside className="admin-sidebar border-r border-white/10 bg-cyber-black/80 backdrop-blur-xl">
        <Link href="/admin" className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyber-blue/15 text-cyber-blue font-display font-bold">CP</span>
          <span><span className="block font-display font-semibold">Console admin</span><span className="block text-[11px] text-white/45">Mode Operate</span></span>
        </Link>
        <nav className="p-3 space-y-1" aria-label="Navigation admin">
          {NAV.map(({ href, label, Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors", active ? "bg-cyber-blue/15 text-cyber-blue" : "text-white/58 hover:bg-white/[0.04] hover:text-white")}><Icon size={16} />{label}</Link>;
          })}
        </nav>
        <div className="mt-auto p-4 border-t border-white/10 text-xs text-white/45">
          <p className="font-medium text-white/75 truncate">{profile?.display_name ?? "Staff"}</p>
          <p className="mt-1">{profile?.role === "superadmin" ? "Super-administrateur" : "Administrateur"}</p>
          <Link href="/dashboard" className="mt-3 inline-flex text-cyber-blue hover:underline">Retour espace apprenant</Link>
        </div>
      </aside>
      <main className="admin-main min-w-0 px-4 py-6 md:px-8 lg:px-10">
        {syncError && <p role="alert" className="mb-4 rounded-xl border border-cyber-red/30 bg-cyber-red/10 px-4 py-3 text-sm text-red-100">{syncError}</p>}
        {children}
      </main>
    </div>
  );
}

function GuardCard({ title, detail }: { title: string; detail: string }) {
  return <section className="max-w-md rounded-xl2 border border-white/10 bg-dark-navy p-8 text-center shadow-soft"><h1 className="font-display text-2xl font-semibold">{title}</h1><p className="mt-3 text-white/60">{detail}</p><Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-cyber-blue px-4 py-2 font-display text-sm font-semibold text-white">Retour au tableau de bord</Link></section>;
}