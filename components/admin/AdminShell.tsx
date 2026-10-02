"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/roles";
import { canAccessAdminPath, sectionsFor } from "@/lib/admin-access";
import Avatar from "@/components/ui/Avatar";
import {
  IconActivity, IconAward, IconBell, IconBrain, IconCertificate, IconCourses, IconDashboard, IconList, IconMail, IconProfile, IconSend, IconShield,
  IconStar, IconTerminal,
} from "@/components/ui/Icon";

const ICONS: Record<string, typeof IconDashboard> = {
  "/admin": IconDashboard,
  "/admin/utilisateurs": IconProfile,
  "/admin/cours": IconCourses,
  "/admin/import": IconActivity,
  "/admin/labs": IconTerminal,
  "/admin/rendus": IconSend,
  "/admin/competences": IconBrain,
  "/admin/mascotte": IconStar,
  "/admin/badges": IconAward,
  "/admin/defis": IconShield,
  "/admin/certificats": IconCertificate,
  "/admin/notifications": IconBell,
  "/admin/messages": IconMail,
  "/admin/journal": IconList,
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hydrated, configured, isAuthenticated, isStaff, profile, syncError } = useUser();

  if (!configured) {
    return <GuardFrame><GuardCard title="Service non configuré" detail="Ajoute la configuration Supabase pour ouvrir la console." /></GuardFrame>;
  }
  if (!hydrated) {
    return <GuardFrame busy><div className="adm-guard-card"><div className="adm-skeleton mx-auto h-20 w-full max-w-80" /><span className="sr-only">Chargement de la console admin…</span></div></GuardFrame>;
  }
  if (!isAuthenticated || !isStaff) {
    return <GuardFrame><GuardCard title="Accès réservé" detail="Cette console est réservée à l’équipe CyberPingo." /></GuardFrame>;
  }
  if (!canAccessAdminPath(profile?.role, pathname)) {
    return <GuardFrame><GuardCard title="Réservé aux super-administrateurs" detail="Ta fonction d’administrateur ne donne pas accès à cette section." to="/admin" cta="Retour à la console" /></GuardFrame>;
  }

  const staffName = profile?.display_name ?? "Staff CyberPingo";
  const staffRole = profile?.role ? ROLE_LABELS[profile.role] : "Équipe";
  const sections = sectionsFor(profile?.role);

  return (
    <div className="adm-shell">
      <a className="adm-skip-link" href="#contenu-admin">Aller au contenu admin</a>
      <aside className="adm-sidebar" aria-label="Console admin">
        <Link href="/admin" className="adm-brand">
          <span className="adm-brand__mark">CP</span>
          <span>
            <span className="adm-brand__title">Console admin</span>
            <span className="adm-brand__meta">Opérations CyberPingo</span>
          </span>
        </Link>
        <nav className="adm-nav" aria-label="Navigation admin">
          {sections.map(({ href, label }) => {
            const Icon = ICONS[href] ?? IconDashboard;
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("adm-nav-link", active && "is-active")}>
                <span className="adm-nav-link__icon"><Icon size={16} /></span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="adm-staff-card">
          <div className="adm-staff">
            <Avatar name={staffName} src={profile?.avatar_url} size="sm" ringTone="none" />
            <p className="min-w-0">
              <span className="adm-staff__name">{staffName}</span>
              <span className="adm-staff__role">{staffRole}</span>
            </p>
          </div>
          <Link href="/dashboard" className="adm-learner-link">Retour espace apprenant</Link>
        </div>
      </aside>
      <main id="contenu-admin" className="adm-main" tabIndex={-1}>
        {syncError && <p role="alert" className="adm-notice adm-notice--error adm-sync-alert">{syncError}</p>}
        {children}
      </main>
    </div>
  );
}

function GuardFrame({ children, busy = false }: { children: React.ReactNode; busy?: boolean }) {
  return (
    <div className="adm-guard-frame">
      <a className="adm-skip-link" href="#contenu-admin">Aller au contenu admin</a>
      <main id="contenu-admin" aria-busy={busy || undefined}>
        {children}
      </main>
    </div>
  );
}

function GuardCard({ title, detail, to = "/dashboard", cta = "Retour au tableau de bord" }: { title: string; detail: string; to?: string; cta?: string }) {
  return (
    <section className="adm-guard-card">
      <h1>{title}</h1>
      <p>{detail}</p>
      <Link href={to} className="adm-learner-link mt-6">{cta}</Link>
    </section>
  );
}