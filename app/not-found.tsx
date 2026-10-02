import Link from "next/link";
import Button from "@/components/ui/Button";
import SystemScreen from "@/components/layout/SystemScreen";

export default function NotFound() {
  return (
    <SystemScreen
      code="404"
      state="sad"
      title="Cette page est introuvable"
      description="Elle n'existe pas ou a été déplacée. Reviens à l'accueil ou reprends ta progression."
      actions={
        <>
          <Link href="/dashboard"><Button variant="primary">Mon tableau de bord</Button></Link>
          <Link href="/"><Button variant="secondary">Accueil</Button></Link>
        </>
      }
    />
  );
}