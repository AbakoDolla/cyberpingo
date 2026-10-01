"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Logo from "./Logo";
import Avatar from "@/components/ui/Avatar";
import RewardToasts from "@/components/ui/RewardToasts";
import { IconBell, IconBolt, IconFlame } from "@/components/ui/Icon";
import { useUser, useUserActions } from "@/context/UserContext";
import { formatNumber } from "@/lib/format";

function ShellStatus({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="study-page" role="status">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children && <div className="mt-4 max-w-prose text-sm leading-7 text-slate-300">{children}</div>}
    </div>
  );
}

/**
 * Learner area frame. Children are only mounted once the signed-in learner's profile has been
 * loaded from Supabase, so pages can rely on useLearner() instead of re-checking the session.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { configured, hydrated, isAuthenticated, isStaff, profile, level, streak, unreadNotifications, syncError } = useUser();
  const { refresh } = useUserActions();
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try { await refresh(); } finally { setRetrying(false); }
  };

  let content: React.ReactNode;
  if (!configured) {
    content = <ShellStatus title="Connexion au serveur non configurée.">
      <p>Les variables <code>NEXT_PUBLIC_SUPABASE_URL</code> et <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> sont absentes de ce déploiement. Consulte <code>docs/DEPLOYMENT.md</code> pour relier CyberPingo à Supabase.</p>
    </ShellStatus>;
  } else if (!hydrated) {
    content = <ShellStatus title="Chargement de ton espace…" />;
  } else if (!isAuthenticated) {
    content = <ShellStatus title="Reconnecte-toi pour continuer.">
      <Link href="/login" className="study-link">Ouvrir la connexion</Link>
    </ShellStatus>;
  } else if (!profile) {
    content = <ShellStatus title="Ton profil n’a pas pu être chargé.">
      <p>{syncError ?? "Vérifie ta connexion puis réessaie."}</p>
      <button type="button" className="study-button mt-4" onClick={retry} disabled={retrying}>{retrying ? "Nouvel essai…" : "Réessayer"}</button>
    </ShellStatus>;
  } else {
    content = children;
  }

  return (
    <div className="learner-shell flex min-h-screen bg-cyber-black">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-24 md:pb-0">
        <header className="learner-topbar">
          <div className="md:hidden"><Logo /></div>
          {profile ? (
            <dl className="learner-stats" aria-label="Ta progression">
              <div title={level ? `${level.title} · ${level.progress_percentage} % vers le niveau suivant` : undefined}>
                <dt>Niveau</dt>
                <dd>{profile.level}</dd>
              </div>
              <div>
                <dt><IconBolt size={14} /> XP</dt>
                <dd>{formatNumber(profile.xp)}</dd>
              </div>
              <div className={streak > 0 ? "is-hot" : undefined}>
                <dt><IconFlame size={14} /> Série</dt>
                <dd>{streak} j</dd>
              </div>
            </dl>
          ) : <p className="hidden md:block">Ton espace d’apprentissage</p>}
          <div className="learner-toplinks">
            {isStaff && <Link href="/admin" className="learner-admin-link">Console admin</Link>}
            <Link href="/ressources" className="hidden sm:inline-flex">Guides</Link>
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
          </div>
        </header>
        {profile && syncError && <div className="storage-warning" role="alert"><span>{syncError}</span> <button type="button" className="study-link" onClick={retry} disabled={retrying}>{retrying ? "Nouvel essai…" : "Réessayer"}</button></div>}
        {content}
      </main>
      <MobileNav />
      <RewardToasts />
    </div>
  );
}