"use client";

import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Toast from "@/components/ui/Toast";
import { useUser, useXpToast } from "@/context/UserContext";
import Link from "next/link";
import Logo from "./Logo";

/**
 * AppShell consomme uniquement useXpToast (contexte isolé).
 * Il ne re-rend QUE quand un toast XP apparaît/disparaît,
 * et non à chaque changement de user.xp ou isAuthenticated.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const lastXpToast = useXpToast();
  const { hydrated, isAuthenticated, storageError, user } = useUser();

  return (
    <div className="learner-shell flex min-h-screen bg-cyber-black">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-24 md:pb-0">
        <header className="learner-topbar">
          <div className="md:hidden"><Logo /></div>
          <p className="hidden md:block">Ton espace d’apprentissage <span>· Profil local</span></p>
          <div className="learner-toplinks">{user.isAdmin && <Link href="/dashboard">Admin</Link>}<Link href="/ressources">Guides</Link><Link href="/parametres">Paramètres</Link></div>
        </header>
        {storageError && <p className="storage-warning" role="alert">{storageError}</p>}
        {!hydrated ? <p className="p-10 text-slate-300" role="status">Chargement de ton profil local…</p> : !isAuthenticated ? <div className="p-10"><h1 className="text-2xl">Reconnecte-toi pour continuer.</h1><Link href="/login" className="study-link">Ouvrir la connexion</Link></div> : children}
      </main>
      <MobileNav />

      {lastXpToast && !lastXpToast.isLevelUp && (
        <Toast
          key={lastXpToast.id}
          visible
          message={`+${lastXpToast.amount} XP gagnés ! ⚡`}
          tone="success"
        />
      )}

      {lastXpToast?.isLevelUp && (
        <Toast
          key={lastXpToast.id}
          visible
          message={`Niveau supérieur ! +${lastXpToast.amount} XP`}
          tone="level-up"
        />
      )}
    </div>
  );
}
