import Link from "next/link";
import LabArt from "@/components/art/LabArt";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { IconArrowRight, IconCheck, IconClock, IconTerminal } from "@/components/ui/Icon";
import { formatRelative, levelLabel } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import { localizeLab, localizeLevel } from "@/lib/content-i18n";
import type { Lab, LabCategory } from "@/types/api";

export const LAB_CATEGORY_LABELS: Record<LabCategory, string> = {
  reseau: "Réseau",
  linux: "Linux",
  web: "Web",
  cryptographie: "Cryptographie",
  osint: "OSINT",
  securite: "Sécurité",
};

export const LAB_CATEGORY_I18N: Record<LabCategory, { fr: string; en: string }> = {
  reseau: { fr: "Réseau", en: "Network" },
  linux: { fr: "Linux", en: "Linux" },
  web: { fr: "Web", en: "Web" },
  cryptographie: { fr: "Cryptographie", en: "Cryptography" },
  osint: { fr: "OSINT", en: "OSINT" },
  securite: { fr: "Sécurité", en: "Security" },
};

export default function ChallengeCard({ lab: rawLab, href }: { lab: Lab; href?: string }) {
  const { lang } = useTranslation();
  const isEn = lang === "en";
  const lab = localizeLab(rawLab, lang);
  const targetHref = href ?? `/challenges/${lab.slug}`;

  const categoryLabel = LAB_CATEGORY_I18N[lab.category]?.[isEn ? "en" : "fr"] ?? lab.category;

  return (
    <Link href={targetHref} className="lab-card-link" aria-label={`${isEn ? "Open lab" : "Ouvrir le lab"} ${lab.title}`}>
      <Card glow={lab.solved ? "green" : "purple"} className="lab-card h-full">
        <div className="lab-card__cover">
          <div className="lab-card__cover-media" aria-hidden="true">
            <LabArt category={lab.category} className="lab-card__cover-art" photo />
          </div>
          <div className="lab-card__cover-top">
            <div className="lab-card__cover-badges">
              <Badge tone="purple">{categoryLabel}</Badge>
              <Badge tone="green">+{lab.xp_reward} XP</Badge>
            </div>
            <div className="lab-card__status">
              {lab.solved ? (
                <Badge tone="green"><IconCheck size={12} /> {isEn ? "Solved" : "Résolu"}</Badge>
              ) : (
                <Badge tone="blue">{localizeLevel(lab.difficulty, lang)}</Badge>
              )}
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
          <span>{lab.objectives.length} {isEn ? (lab.objectives.length > 1 ? "objectives" : "objective") : (lab.objectives.length > 1 ? "objectifs" : "objectif")}</span>
          {lab.solved_at && <span><IconClock size={13} /> {formatRelative(lab.solved_at)}</span>}
        </div>
        <p className="lab-card__cta">
          {lab.solved ? (isEn ? "Replay scenario" : "Rejouer le scénario") : (isEn ? "Open terminal" : "Ouvrir le terminal")}
          <IconArrowRight size={14} />
        </p>
      </Card>
    </Link>
  );
}