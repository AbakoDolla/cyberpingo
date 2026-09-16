"use client";

import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Toast from "@/components/ui/Toast";
import { useXpToast } from "@/context/UserContext";

/**
 * AppShell consomme uniquement useXpToast (contexte isolé).
 * Il ne re-rend QUE quand un toast XP apparaît/disparaît,
 * et non à chaque changement de user.xp ou isAuthenticated.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const lastXpToast = useXpToast();

  return (
    <div className="flex min-h-screen bg-cyber-black">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
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
