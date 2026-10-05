"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { IconClock, IconSparkles } from "@/components/ui/Icon";
import CoinIcon from "./CoinIcon";
import { playChestFanfare, playCoinClink } from "@/lib/mascot/sound-effects";
import { emitCyberBits } from "@/lib/cyberbits-bus";
import { emitMascot } from "@/lib/mascot/bus";

const COOLDOWN_HOURS = 20; // 20 hours cooldown so learners can open it once each day

interface DailyMysteryChestProps {
  currentBalance: number;
}

export default function DailyMysteryChest({ currentBalance }: DailyMysteryChestProps) {
  const [canOpen, setCanOpen] = useState(false);
  const [remainingText, setRemainingText] = useState("");
  const [isOpening, setIsOpening] = useState(false);
  const [rewardWon, setRewardWon] = useState<number | null>(null);

  useEffect(() => {
    function checkCooldown() {
      const stored = localStorage.getItem("cp_last_chest_time");
      if (!stored) {
        setCanOpen(true);
        setRemainingText("");
        return;
      }
      const last = parseInt(stored, 10);
      const now = Date.now();
      const diffMs = now - last;
      const cooldownMs = COOLDOWN_HOURS * 3600 * 1000;

      if (diffMs >= cooldownMs) {
        setCanOpen(true);
        setRemainingText("");
      } else {
        setCanOpen(false);
        const remSec = Math.floor((cooldownMs - diffMs) / 1000);
        const hours = Math.floor(remSec / 3600);
        const minutes = Math.floor((remSec % 3600) / 60);
        setRemainingText(`${hours}h ${minutes}m`);
      }
    }

    checkCooldown();
    const interval = setInterval(checkCooldown, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleOpen = () => {
    if (!canOpen || isOpening) return;
    setIsOpening(true);

    // Audio fanfare
    playChestFanfare();
    setTimeout(() => playCoinClink(), 450);

    // Reward roll: 10, 15, 20 or 25 CB
    const possible = [10, 15, 20, 25];
    const rolled = possible[Math.floor(Math.random() * possible.length)];

    setTimeout(() => {
      setRewardWon(rolled);
      setIsOpening(false);
      setCanOpen(false);
      localStorage.setItem("cp_last_chest_time", Date.now().toString());

      // Update CyberBits bus
      const newBal = currentBalance + rolled;
      emitCyberBits({
        gained: rolled,
        balance: newBal,
        items: [{ reason: "daily_activity", amount: rolled, label: "Coffre Mystère Quotidien" }],
      });

      // Notify mascot
      emitMascot(["challenge"]);
    }, 1200);
  };

  return (
    <article className="dash-panel daily-chest-card" aria-label="Coffre Mystère Quotidien">
      <div className="daily-chest-head">
        <div className="daily-chest-icon-wrapper">
          <span className={`chest-emoji ${canOpen ? "chest-pulse" : ""} ${isOpening ? "chest-opening" : ""}`}>
            {canOpen ? "🎁" : rewardWon ? "🎉" : "🔒"}
          </span>
        </div>
        <div className="daily-chest-info">
          <h3 className="daily-chest-title">Coffre Quotidien</h3>
          <p className="daily-chest-subtitle">
            {canOpen
              ? "Prêt à ouvrir ! Touche pour révéler ton butin"
              : rewardWon
              ? `Bravo ! +${rewardWon} CB ajoutés à ton solde.`
              : "Reviens demain pour ton prochain butin"}
          </p>
        </div>
      </div>

      <div className="daily-chest-body">
        {canOpen ? (
          <Button
            onClick={handleOpen}
            disabled={isOpening}
            className="daily-chest-btn"
          >
            <IconSparkles size={16} />
            {isOpening ? "Ouverture en cours..." : "Ouvrir le coffre mystère"}
          </Button>
        ) : (
          <div className="daily-chest-cooldown">
            <IconClock size={15} />
            <span>Prochain coffre dans <strong>{remainingText || "quelques heures"}</strong></span>
          </div>
        )}
      </div>

      {rewardWon !== null && (
        <div className="daily-chest-reward-banner">
          <CoinIcon size={20} glow />
          <span>Prime reçue : <strong>+{rewardWon} CyberBits</strong></span>
        </div>
      )}
    </article>
  );
}
