"use client";

import Link from "next/link";
import CoinIcon from "./CoinIcon";
import ProgressBar from "@/components/ui/ProgressBar";
import { IconArrowRight } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/format";
import { affordPercent, nextUnlock, type CbNextUnlock } from "@/lib/cyberbits";
import { useAsync } from "@/hooks/useAsync";
import { getCatalog } from "@/services/cyberbits.service";

interface DashboardCyberBitsCardProps {
  balance: number;
}

export default function DashboardCyberBitsCard({ balance }: DashboardCyberBitsCardProps) {
  const { data: catalog } = useAsync(() => getCatalog(), []);

  const next = catalog ? nextUnlock(catalog, balance) : null;
  const targetPrice = next ? next.item.price : 0;
  const progressPercent = next ? affordPercent(targetPrice, balance) : 100;

  return (
    <article className="dash-panel cb-dash-card" aria-labelledby="cb-dash-title">
      <div className="cb-dash-card__head">
        <div className="cb-dash-card__coin">
          <CoinIcon size={32} glow />
        </div>
        <div>
          <h2 id="cb-dash-title" className="cb-dash-card__title">Mes CyberBits</h2>
          <p className="cb-dash-card__tagline">La monnaie de ton apprentissage</p>
        </div>
        <div className="cb-dash-card__balance">
          <strong>{formatNumber(balance)}</strong>
          <span>CB</span>
        </div>
      </div>

      {next ? (
        <div className="cb-dash-card__next">
          <div className="cb-dash-card__next-info">
            <span>Objectif déblocage : <strong>{next.item.title}</strong></span>
            <small>
              {next.missing > 0
                ? `${formatNumber(balance)} / ${formatNumber(targetPrice)} CB (${formatNumber(next.missing)} manquants)`
                : "Prêt à débloquer !"}
            </small>
          </div>
          <ProgressBar value={progressPercent} tone={next.missing === 0 ? "green" : "blue"} height="sm" />
        </div>
      ) : (
        <p className="cb-dash-card__empty-text">
          Gagne des CyberBits en terminant tes leçons (+10 CB) et tes quiz (+5 CB).
        </p>
      )}

      <div className="cb-dash-card__actions">
        <Link href="/boutique" className="study-button study-button--sm">
          Boutique <IconArrowRight size={14} />
        </Link>
        <Link href="/boutique?tab=historique" className="study-link text-xs">
          Historique des gains
        </Link>
      </div>
    </article>
  );
}
