"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import SystemScreen from "@/components/layout/SystemScreen";

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <SystemScreen
      state="sad"
      title="Un imprévu est survenu"
      description="Cette page n'a pas pu s'afficher. Réessaie, ou reviens à l'accueil."
      actions={
        <>
          <Button variant="primary" onClick={reset}>Réessayer</Button>
          <Link href="/"><Button variant="secondary">Accueil</Button></Link>
        </>
      }
    />
  );
}
