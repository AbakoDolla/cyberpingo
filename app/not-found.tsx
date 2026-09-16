import Link from "next/link";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cyber-black grid-lines flex flex-col items-center justify-center px-6 text-center">
      <span className="font-display text-7xl md:text-8xl font-bold text-gradient">404</span>
      <h1 className="mt-4 font-display text-2xl md:text-3xl font-semibold">
        Cette route est verrouillée
      </h1>
      <p className="mt-3 text-white/60 max-w-md">
        La page que tu cherches n&apos;existe pas ou a été déplacée. Retourne à ton
        tableau de bord pour continuer ta progression.
      </p>
      <div className="mt-8">
        <Link href="/dashboard">
          <Button variant="primary">Retour au dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
