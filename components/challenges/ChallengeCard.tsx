import Link from "next/link";
import LabArt from "@/components/art/LabArt";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { IconArrowRight, IconCheck, IconClock, IconTerminal } from "@/components/ui/Icon";
import { formatRelative, levelLabel } from "@/lib/format";
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
        <div className="lab-card__cover">
          <div className="lab-card__cover-media" aria-hidden="true">
            <LabArt category={lab.category} className="lab-card__cover-art" photo />
          </div>
          <div className="lab-card__cover-top">
            <div className="lab-card__cover-badges">
              <Badge tone="purple">{LAB_CATEGORY_LABELS[lab.category]}</Badge>
              <Badge tone="green">+{lab.xp_reward} XP</Badge>
            </div>
            <div className="lab-card__status">
              {lab.solved ? <Badge tone="green"><IconCheck size={12} /> Résolu</Badge> : <Badge tone="blue">{levelLabel(lab.difficulty)}</Badge>}
            </div>
          </div>
        </div>
        <div className="lab-card__body">
          <div className="lab-card__icon" aria-hidden="true"><IconTerminal size={26} /></div>
          <div>
            <h2>{lab.title}</h2>
            <p>{lab.description}</p>
          </div>
        </div>
        <div className="lab-card__footer">
          <span>+{lab.xp_reward} XP</span>
          <span>{lab.objectives.length} objectif{lab.objectives.length > 1 ? "s" : ""}</span>
          {lab.solved_at && <span><IconClock size={13} /> {formatRelative(lab.solved_at)}</span>}
        </div>
        <p className="lab-card__cta">{lab.solved ? "Rejouer le scénario" : "Ouvrir le terminal"}<IconArrowRight size={14} /></p>
      </Card>
    </Link>
  );
}