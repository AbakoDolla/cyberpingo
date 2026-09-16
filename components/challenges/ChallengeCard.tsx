import Link from "next/link";
import { Challenge } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const difficultyLabel: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

const categoryLabel: Record<string, string> = {
  reseau: "Réseau",
  linux: "Linux",
  web: "Web",
  cryptographie: "Cryptographie",
  osint: "OSINT",
  securite: "Sécurité",
};

const statusLabel: Record<string, { label: string; tone: "blue" | "green" | "neutral" }> = {
  disponible: { label: "Disponible", tone: "blue" },
  termine: { label: "Terminé", tone: "green" },
  verrouille: { label: "Verrouillé", tone: "neutral" },
};

export default function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const locked = challenge.status === "verrouille";
  const status = statusLabel[challenge.status];

  const content = (
    <Card glow={locked ? "none" : "green"} className={cn("h-full", locked && "opacity-60")}>
      <div className="flex items-center justify-between">
        <Badge tone="purple">{categoryLabel[challenge.category]}</Badge>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <h3 className="mt-4 font-display font-semibold text-lg">{challenge.title}</h3>
      <p className="mt-1.5 text-sm text-white/60 line-clamp-2">{challenge.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <Badge tone="blue">{difficultyLabel[challenge.difficulty]}</Badge>
        <span className="text-cyber-green text-sm font-medium">+{challenge.xpReward} XP</span>
      </div>
    </Card>
  );

  if (locked) return <div>{content}</div>;
  return <Link href={`/challenges/${challenge.slug}`}>{content}</Link>;
}
