"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/roles";
import { canAccessAdminPath, sectionsFor } from "@/lib/admin-access";
import Avatar from "@/components/ui/Avatar";
import {
  IconActivity, IconAward, IconBell, IconBolt, IconBrain, IconCertificate, IconCourses, IconDashboard, IconList, IconMail, IconMenu, IconProfile, IconSend, IconShield,
  IconStar, IconTerminal, IconX,
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
  "/admin/cyberbits": IconBolt,
  "/admin/certificats": IconCertificate,
  "/admin/notifications": IconBell,
  "/admin/messages": IconMail,
  "/admin/journal": IconList,
};

const NAV_GROUPS = [
  {
    title: "Pilotage & Sécurité",
    hrefs: ["/admin", "/admin/utilisateurs", "/admin/journal"],
  },
  {
    title: "Pédagogie & Labs",
    hrefs: ["/admin/cours", "/admin/labs", "/admin/rendus", "/admin/competences"],
  },
  {
    title: "Gamification & Économie",
    hrefs: ["/admin/cyberbits", "/admin/defis", "/admin/badges", "/admin/certificats", "/admin/mascotte"],
  },
  {
    title: "Système & Diffusion",
    hrefs: ["/admin/notifications", "/admin/messages", "/admin/import"],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { hydrated, configured, isAuthenticated, isStaff, profile, syncError } = useUser();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (!configured) {
    return <GuardFrame><GuardCard title="Service non configuré" detail="La console est momentanément indisponible." /></GuardFrame>;
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
  const isSuperadmin = profile?.role === "superadmin";
  const availableSections = sectionsFor(profile?.role);
  const sectionMap = new Map(availableSections.map((s) => [s.href, s]));
  const currentSection = availableSections.find((s) => s.href === pathname);
  const breadcrumbLabel = currentSection?.label ?? (pathname === "/admin" ? "Vue d’ensemble" : "Console Admin");

  return (
    <div className="adm-shell">
      <a className="adm-skip-link" href="#contenu-admin">Aller au contenu admin</a>

      {/* Mobile Top Header (hidden on desktop) */}
      <header className="adm-mobile-header">
        <button
          type="button"
          className="adm-mobile-toggle"
          aria-label={mobileNavOpen ? "Fermer le menu de navigation" : "Ouvrir le menu de navigation"}
          onClick={() => setMobileNavOpen((prev) => !prev)}
        >
          {mobileNavOpen ? <IconX size={20} /> : <IconMenu size={20} />}
        </button>
        <Link href="/admin" className="adm-mobile-brand">
          <span className="adm-brand__mark">CP</span>
          <span className="adm-mobile-brand__title">CyberPingo Admin</span>
        </Link>
        <Link href="/dashboard" className="adm-mobile-exit-link" title="Retour à l'espace apprenant">
          Apprenant →
        </Link>
      </header>

      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <div
          className="adm-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Admin Sidebar */}
      <aside className={cn("adm-sidebar", mobileNavOpen && "is-open")} aria-label="Console admin">
        <div className="adm-sidebar-top">
          <Link href="/admin" className="adm-brand">
            <span className="adm-brand__mark">CP</span>
            <span>
              <span className="adm-brand__title">Console Admin</span>
              <span className="adm-brand__meta">Supervision CyberPingo</span>
            </span>
          </Link>
          <button
            type="button"
            className="adm-sidebar-close-btn"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Fermer le panneau"
          >
            <IconX size={18} />
          </button>
        </div>

        <nav className="adm-nav" aria-label="Navigation admin">
          {NAV_GROUPS.map((group) => {
            const groupSections = group.hrefs
              .map((href) => sectionMap.get(href))
              .filter((s): s is NonNullable<typeof s> => Boolean(s));

            if (groupSections.length === 0) return null;

            return (
              <div key={group.title} className="adm-nav-group">
                <span className="adm-nav-group__title">{group.title}</span>
                <div className="adm-nav-group__items">
                  {groupSections.map(({ href, label }) => {
                    const Icon = ICONS[href] ?? IconDashboard;
                    const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn("adm-nav-link", active && "is-active")}
                      >
                        <span className="adm-nav-link__icon"><Icon size={16} /></span>
                        <span className="adm-nav-link__label">{label}</span>
                        {active && <span className="adm-nav-link__dot" aria-hidden="true" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
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
          <Link href="/dashboard" className="adm-learner-link">
            ← Espace apprenant
          </Link>
        </div>
      </aside>

      {/* Main Column Wrapper */}
      <div className="adm-main-wrap">
        {/* Executive Desktop Topbar */}
        <header className="adm-topbar" aria-label="Barre d'état administration">
          <div className="adm-topbar__left">
            <span className="adm-topbar__pulse" title="Télémétrie base de données en direct">
              <span className="adm-topbar__pulse-dot" />
              <span className="adm-topbar__pulse-text">Système Opérationnel · Supabase Connecté</span>
            </span>
            <span className="adm-topbar__divider" />
            <span className="adm-topbar__breadcrumb">
              {breadcrumbLabel}
            </span>
          </div>

          <div className="adm-topbar__right">
            <span className={cn("adm-role-badge", isSuperadmin ? "adm-role-badge--superadmin" : "adm-role-badge--admin")}>
              {isSuperadmin ? "⚡ SUPERADMIN" : "🛡️ ADMIN"}
            </span>
            <Link href="/admin/utilisateurs" className="adm-topbar-link" title="Gérer les vrais comptes">
              👥 Comptes réels
            </Link>
            <Link href="/classement" className="adm-topbar-link" title="Consulter le classement en direct">
              🏆 Classement
            </Link>
            <Link href="/dashboard" className="adm-topbar-link adm-topbar-link--primary" title="Basculer vers l'espace apprenant">
              Espace Apprenant →
            </Link>
          </div>
        </header>

        <main id="contenu-admin" className="adm-main" tabIndex={-1}>
          {syncError && <p role="alert" className="adm-notice adm-notice--error adm-sync-alert">{syncError}</p>}
          {children}
        </main>
      </div>
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