import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { IconCheck, IconTerminal } from "@/components/ui/Icon";
import { levelLabel } from "@/lib/format";
import type { Lab, LabCategory } from "@/types/api";

export const LAB_CATEGORY_LABELS: Record<LabCategory, string> = {
  reseau: "Réseau",
  linux: "Linux",
  web: "Web",
  cryptographie: "Cryptographie",
  osint: "OSINT",
  securite: "Sécurité",
};

export default function ChallengeCard({ lab, href = `/challenges/${lab.slug}` }: { lab: Lab; href?: string }) {
  return (
    <Link href={href} className="lab-card-link" aria-label={`Ouvrir le lab ${lab.title}`}>
      <Card glow={lab.solved ? "green" : "purple"} className="lab-card h-full">
        <div className="lab-card__topline">
          <Badge tone="purple">{LAB_CATEGORY_LABELS[lab.category]}</Badge>
          {lab.solved ? <Badge tone="green"><IconCheck size={12} /> Résolu</Badge> : <Badge tone="blue">{levelLabel(lab.difficulty)}</Badge>}
        </div>
        <div className="lab-card__icon" aria-hidden="true"><IconTerminal size={26} /></div>
        <h2>{lab.title}</h2>
        <p>{lab.description}</p>
        <div className="lab-card__footer"><span>+{lab.xp_reward} XP</span><span>{lab.objectives.length} objectif{lab.objectives.length > 1 ? "s" : ""}</span></div>
      </Card>
    </Link>
  );
}