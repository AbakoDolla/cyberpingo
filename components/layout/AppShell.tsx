"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Logo from "./Logo";
import Avatar from "@/components/ui/Avatar";
import RewardToasts from "@/components/ui/RewardToasts";
import MascotCoach from "@/components/mascot/MascotCoach";
import { IconAlert, IconArrowRight, IconBell, IconBolt, IconFlame, IconLock } from "@/components/ui/Icon";
import { useUser, useUserActions } from "@/context/UserContext";
import { formatNumber } from "@/lib/format";

function ShellStatus({ title, tone = "info", children }: { title: string; tone?: "info" | "error"; children?: React.ReactNode }) {
  return (
    <div className="study-page">
      <div className={`ui-state${tone === "error" ? " is-error" : ""}`} role={tone === "error" ? "alert" : "status"}>
        <span className="ui-state__icon" aria-hidden="true">{tone === "error" ? <IconAlert size={22} /> : <IconLock size={22} />}</span>
        <h1>{title}</h1>
        {children && <div className="ui-state__body">{children}</div>}
      </div>
    </div>
  );
}

function ShellLoading() {
  return (
    <div className="study-page" role="status" aria-label="Chargement de ton espace">
      <div className="ui-skeleton ui-skeleton--title" />
      <div className="ui-skeleton ui-skeleton--line" />
      <div className="shell-skeleton-grid">
        <div className="ui-skeleton ui-skeleton--card" />
        <div className="ui-skeleton ui-skeleton--card" />
        <div className="ui-skeleton ui-skeleton--card" />
      </div>
    </div>
  );
}

export function loginHref(pathname: string) {
  return `/login?next=${encodeURIComponent(pathname)}`;
}

/**
 * Learner area frame. By default children are only mounted once the signed-in learner's profile
 * has been loaded, so pages can rely on useLearner(). With `allowGuest`, visitors without a session
 * also see the page (catalogue, labs) and must read the session through useUser().
 */
export default function AppShell({ children, allowGuest = false }: { children: React.ReactNode; allowGuest?: boolean }) {
  const pathname = usePathname();
  const { configured, hydrated, isAuthenticated, isStaff, profile, level, streak, unreadNotifications, syncError } = useUser();
  const { refresh } = useUserActions();
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try { await refresh(); } finally { setRetrying(false); }
  };
  const guest = hydrated && !isAuthenticated;

  let content: React.ReactNode;
  if (!configured) {
    content = <ShellStatus title="Connexion au serveur non configurée." tone="error">
      <p>Les variables <code>NEXT_PUBLIC_SUPABASE_URL</code> et <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> sont absentes de ce déploiement. Consulte <code>docs/DEPLOYMENT.md</code> pour relier CyberPingo à Supabase.</p>
    </ShellStatus>;
  } else if (!hydrated) {
    content = <ShellLoading />;
  } else if (!isAuthenticated) {
    content = allowGuest ? children : <ShellStatus title="Ta session a expiré.">
      <p>Reconnecte-toi pour retrouver ta progression, tes XP et ta série.</p>
      <div className="study-actions mt-5">
        <Link href={loginHref(pathname)} className="study-button">Se connecter <IconArrowRight size={16} /></Link>
        <Link href="/register" className="study-link">Créer un compte gratuit</Link>
      </div>
    </ShellStatus>;
  } else if (!profile) {
    content = <ShellStatus title="Ton profil n’a pas pu être chargé." tone="error">
      <p>{syncError ?? "Vérifie ta connexion puis réessaie."}</p>
      <button type="button" className="study-button mt-5" onClick={retry} disabled={retrying}>{retrying ? "Nouvel essai…" : "Réessayer"}</button>
    </ShellStatus>;
  } else {
    content = children;
  }

  const levelProgress = level?.progress_percentage ?? 0;

  return (
    <div className="learner-shell">
      <a className="learner-skip-link" href="#contenu">Aller au contenu principal</a>
      <Sidebar />
      <div className="learner-main">
        <header className="learner-topbar">
          <div className="learner-topbar__logo md:hidden"><Logo /></div>
          {profile ? (
            <dl className="learner-stats" aria-label="Ta progression">
              <div className="learner-stat learner-stat--level" title={level ? `${level.title} · ${levelProgress} % vers le niveau suivant` : undefined}>
                <span className="learner-ring" style={{ "--ring": `${levelProgress}` } as React.CSSProperties} aria-hidden="true"><span>{profile.level}</span></span>
                <span className="learner-stat__text"><dt>Niveau</dt><dd>{level?.title ?? profile.level}</dd></span>
              </div>
              <div className="learner-stat learner-stat--xp">
                <span className="learner-stat__icon" aria-hidden="true"><IconBolt size={15} /></span>
                <span className="learner-stat__text"><dt>XP</dt><dd>{formatNumber(profile.xp)}</dd></span>
              </div>
              <div className={`learner-stat learner-stat--streak${streak > 0 ? " is-hot" : ""}`}>
                <span className="learner-stat__icon" aria-hidden="true"><IconFlame size={15} /></span>
                <span className="learner-stat__text"><dt>Série</dt><dd>{streak} j</dd></span>
              </div>
            </dl>
          ) : guest ? (
            <p className="learner-guest-note"><span aria-hidden="true" />Mode découverte : connecte-toi pour enregistrer ta progression.</p>
          ) : <span className="hidden md:block" />}
          <div className="learner-toplinks">
            {isStaff && <Link href="/admin" className="learner-admin-link">Console admin</Link>}
            <Link href="/ressources" className="learner-text-link hidden sm:inline-flex">Guides</Link>
            {profile && (
              <Link href="/notifications" className="learner-bell" aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} non lues` : "Notifications"}>
                <IconBell size={20} />
                {unreadNotifications > 0 && <span aria-hidden="true">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}
              </Link>
            )}
            {profile && (
              <Link href="/profile" className="learner-avatar-link" aria-label="Mon profil">
                <Avatar name={profile.display_name} src={profile.avatar_url} size="sm" ringTone="none" />
              </Link>
            )}
            {guest && (
              <>
                <Link href={loginHref(pathname)} className="study-button study-button--ghost study-button--sm">Se connecter</Link>
                <Link href="/register" className="study-button study-button--sm">Créer un compte</Link>
              </>
            )}
          </div>
        </header>
        {profile && syncError && <div className="storage-warning" role="alert"><span>{syncError}</span> <button type="button" className="study-link" onClick={retry} disabled={retrying}>{retrying ? "Nouvel essai…" : "Réessayer"}</button></div>}
        <main className="learner-content" id="contenu" tabIndex={-1}>{content}</main>
      </div>
      <MobileNav />
      <RewardToasts />
      <MascotCoach />
    </div>
  );
}
