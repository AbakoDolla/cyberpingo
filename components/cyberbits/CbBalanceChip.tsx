"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CoinIcon from "./CoinIcon";
import { useUser } from "@/context/UserContext";
import { formatNumber } from "@/lib/format";
import { subscribeCyberBits } from "@/lib/cyberbits-bus";
import { cn } from "@/lib/utils";

interface CbBalanceChipProps {
  className?: string;
  showPlus?: boolean;
}

export default function CbBalanceChip({ className = "", showPlus = true }: CbBalanceChipProps) {
  const { cbBalance, isAuthenticated } = useUser();
  const [pulse, setPulse] = useState(false);
  const [gain, setGain] = useState<number | null>(null);

  useEffect(() => {
    return subscribeCyberBits((reward) => {
      if (reward.gained > 0) {
        setGain(reward.gained);
        setPulse(true);
        const timer = setTimeout(() => {
          setPulse(false);
          setGain(null);
        }, 2400);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  if (!isAuthenticated) return null;

  return (
    <Link
      href="/boutique"
      className={cn(
        "cb-balance-chip",
        pulse && "is-pulsing",
        className
      )}
      title="Voir mon solde CyberBits et la boutique"
      aria-label={`Solde CyberBits : ${formatNumber(cbBalance)} CB. Ouvrir la boutique.`}
    >
      <CoinIcon size={18} glow={pulse} />
      <span className="cb-balance-chip__val">{formatNumber(cbBalance)}</span>
      <span className="cb-balance-chip__sym">CB</span>
      {gain !== null && (
        <span className="cb-balance-chip__gain" aria-hidden="true">
          +{gain}
        </span>
      )}
      {showPlus && (
        <span className="cb-balance-chip__btn" aria-hidden="true">
          +
        </span>
      )}
    </Link>
  );
}
