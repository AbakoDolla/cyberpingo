"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  IconBolt,
  IconClock,
  IconFlame,
  IconGift,
  IconSparkles,
  IconTarget,
  IconTrophy,
} from "@/components/ui/Icon";
import RankBadge from "@/components/levels/RankBadge";
import { useTranslation } from "@/lib/i18n";
import { useUser } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { formatNumber } from "@/lib/format";
import { localizeRankTitle } from "@/lib/levels";
import { playCoinClink, playTrophyChime } from "@/lib/mascot/sound-effects";
import {
  getLeaderboard,
  getMonthlyChampionshipInfo,
  MONTHLY_GIFTS,
  type LeaderboardEntry,
  type MonthlyChampionshipInfo,
} from "@/services/leaderboard.service";

function formatCountdown(totalSeconds: number): { days: number; hours: number; minutes: number; seconds: number } {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export default function ClassementPage() {
  const { lang, t } = useTranslation();
  const { profile } = useUser();
  const userId = profile?.id ?? null;

  const [championship, setChampionship] = useState<MonthlyChampionshipInfo>(() => getMonthlyChampionshipInfo());
  const [secondsLeft, setSecondsLeft] = useState<number>(() => getMonthlyChampionshipInfo().seconds_remaining);

  const { data: entries, loading, error, reload } = useAsync<LeaderboardEntry[]>(
    () => getLeaderboard(userId),
    [userId],
  );

  // Live countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          const fresh = getMonthlyChampionshipInfo();
          setChampionship(fresh);
          return fresh.seconds_remaining;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const time = useMemo(() => formatCountdown(secondsLeft), [secondsLeft]);

  const top1 = entries?.[0] ?? null;
  const top2 = entries?.[1] ?? null;
  const top3 = entries?.[2] ?? null;
  const rest = entries?.slice(3) ?? [];

  const currentUserEntry = useMemo(
    () => entries?.find((e) => e.is_current_user || (userId && e.user_id === userId)),
    [entries, userId],
  );

  const monthName = lang === "fr" ? championship.month_name_fr : championship.month_name_en;

  return (
    <AppShell allowGuest>
      <div className="leaderboard-page">
        {/* Header Hero */}
        <header className="leaderboard-hero">
          <div className="leaderboard-hero-content">
            <div className="leaderboard-badge-row">
              <span className="badge badge-primary">
                <IconTrophy size={14} /> {lang === "fr" ? `Championnat Mensuel • ${monthName} ${championship.year}` : `Monthly Championship • ${monthName} ${championship.year}`}
              </span>
              <span className="badge badge-muted">
                <IconBolt size={14} /> {lang === "fr" ? "Ligue d'Élite CyberPingo" : "CyberPingo Elite League"}
              </span>
            </div>
            <h1 className="leaderboard-title">
              {lang === "fr" ? (
                <>Classement Mensuel & <span className="text-cyan">Cadeaux Réels</span></>
              ) : (
                <>Monthly Leaderboard & <span className="text-cyan">Real Rewards</span></>
              )}
            </h1>
            <p className="leaderboard-subtitle">
              {lang === "fr"
                ? "Chaque mois, les meilleurs apprenants remportent de véritables récompenses physiques (Clés YubiKey 5 NFC, livres spécialisés, packs goodies) ainsi que des bourses en CyberBits."
                : "Every month, top security learners win real physical hardware (YubiKey 5 NFC keys, specialized books, exclusive swag) and substantial CyberBits grants."}
            </p>
          </div>

          {/* Countdown card */}
          <div
            className="league-timer-card"
            onMouseEnter={() => playTrophyChime()}
            title={lang === "fr" ? "Clôture le dernier jour du mois à 23h59 UTC" : "Resets last day of the month at 23:59 UTC"}
          >
            <div className="league-timer-label">
              <IconClock size={16} /> {lang === "fr" ? "Fin du championnat dans" : "Championship ends in"}
            </div>
            <div className="league-timer-grid">
              <div className="league-timer-segment">
                <span className="league-timer-value">{time.days}</span>
                <span className="league-timer-unit">{lang === "fr" ? "jours" : "days"}</span>
              </div>
              <span className="league-timer-sep">:</span>
              <div className="league-timer-segment">
                <span className="league-timer-value">{String(time.hours).padStart(2, "0")}</span>
                <span className="league-timer-unit">{lang === "fr" ? "heures" : "hours"}</span>
              </div>
              <span className="league-timer-sep">:</span>
              <div className="league-timer-segment">
                <span className="league-timer-value">{String(time.minutes).padStart(2, "0")}</span>
                <span className="league-timer-unit">min</span>
              </div>
              <span className="league-timer-sep">:</span>
              <div className="league-timer-segment">
                <span className="league-timer-value">{String(time.seconds).padStart(2, "0")}</span>
                <span className="league-timer-unit">sec</span>
              </div>
            </div>
          </div>
        </header>

        {/* Monthly Gifts Showcase */}
        <section className="monthly-gifts-section" aria-label={lang === "fr" ? "Dotations et cadeaux mensuels" : "Monthly gifts and prizes"}>
          <div className="monthly-gifts-header">
            <h2>
              <IconGift size={22} style={{ color: "#f59e0b" }} />
              {lang === "fr" ? "Dotations du Mois en Jeu" : "Featured Monthly Prizes"}
            </h2>
            <span className="monthly-gifts-tag">
              <IconSparkles size={13} /> {lang === "fr" ? "Expédition offerte aux vainqueurs" : "Free worldwide shipping for winners"}
            </span>
          </div>

          <div className="monthly-gifts-grid">
            {MONTHLY_GIFTS.map((gift, idx) => {
              const isPhysical = gift.cb >= 500;
              const cardClass = idx === 0 ? "gift-top-1" : idx === 1 ? "gift-top-2" : idx === 2 ? "gift-top-3" : "";
              return (
                <article
                  key={idx}
                  className={`monthly-gift-card ${cardClass}`}
                  onClick={() => playCoinClink()}
                >
                  <div className="monthly-gift-top-row">
                    <span className="monthly-gift-rank">
                      <span className="monthly-gift-badge">{gift.badge}</span>
                      {gift.rankRange}
                    </span>
                    {isPhysical ? (
                      <span className="gift-physical-pill">
                        🎁 {lang === "fr" ? "Cadeau physique" : "Physical gift"}
                      </span>
                    ) : (
                      <span className="gift-digital-pill">
                        ⭐ {lang === "fr" ? "Titre d'honneur" : "Honorable title"}
                      </span>
                    )}
                  </div>

                  <h3 className="monthly-gift-title">
                    {lang === "fr" ? gift.titleFr : gift.titleEn}
                  </h3>
                  <p className="monthly-gift-desc">
                    {lang === "fr" ? gift.physicalGiftFr : gift.physicalGiftEn}
                  </p>

                  <div className="monthly-gift-footer">
                    <span className="text-muted">{lang === "fr" ? "Prime virtuelle" : "Virtual grant"}</span>
                    <span className="monthly-gift-cb">
                      <IconSparkles size={14} /> +{formatNumber(gift.cb)} CB
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Current User Standout (if logged in) */}
        {currentUserEntry && (
          <aside className="current-user-standing" aria-label={lang === "fr" ? "Ton classement actuel" : "Your current standing"}>
            <div className="standing-rank">
              <span className="standing-rank-num">#{currentUserEntry.rank_position}</span>
              <span className="standing-rank-tag">{lang === "fr" ? "Ton rang" : "Your rank"}</span>
            </div>
            <div className="standing-avatar" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Avatar
                src={currentUserEntry.avatar_url}
                name={currentUserEntry.display_name}
                size="md"
              />
              <RankBadge level={currentUserEntry.level} size="sm" showLabel={false} />
            </div>
            <div className="standing-info">
              <div className="standing-name">
                <strong>{currentUserEntry.display_name}</strong>
                <Badge tone="blue">Niv. {currentUserEntry.level}</Badge>
                <span className="text-muted text-sm">{localizeRankTitle(currentUserEntry.level, lang)}</span>
              </div>
              <div className="standing-meta">
                <span><IconBolt size={13} /> {formatNumber(currentUserEntry.xp)} XP</span>
                {currentUserEntry.current_streak > 0 && (
                  <span><IconFlame size={13} /> {currentUserEntry.current_streak} {lang === "fr" ? "j de série" : "day streak"}</span>
                )}
              </div>
            </div>
            <div className="standing-reward">
              <span className="standing-reward-label">{lang === "fr" ? "Prime estimée fin de mois" : "Estimated month-end prize"}</span>
              <span className="standing-reward-cb">
                <IconSparkles size={14} /> +{currentUserEntry.reward_cb} CB
              </span>
            </div>
          </aside>
        )}

        {/* Top 3 Podium */}
        {!loading && entries && entries.length >= 3 && (
          <section className="podium-section" aria-label={lang === "fr" ? "Podium des 3 premiers" : "Top 3 Podium"}>
            {/* 2nd Place */}
            {top2 && (
              <div className="podium-step podium-step-2" onClick={() => playCoinClink()}>
                <div className="podium-crown">🥈</div>
                <Avatar src={top2.avatar_url} name={top2.display_name} size="md" className="podium-avatar silver" />
                <div style={{ margin: "4px 0" }}>
                  <RankBadge level={top2.level} size="sm" showLabel={false} />
                </div>
                <h3 className="podium-name">{top2.display_name}</h3>
                <span className="podium-handle">@{top2.username}</span>
                <span className="text-muted text-xs" style={{ marginBottom: "4px" }}>
                  {localizeRankTitle(top2.level, lang)}
                </span>
                <div className="podium-xp"><IconBolt size={13} /> {formatNumber(top2.xp)} XP</div>
                <div className="podium-prize silver">
                  🎁 Bon 50€ + {top2.reward_cb} CB
                </div>
                <div className="podium-pillar pillar-2">
                  <span className="podium-rank-tag">2</span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top1 && (
              <div className="podium-step podium-step-1" onClick={() => playTrophyChime()}>
                <div className="podium-crown gold-glow">👑</div>
                <Avatar src={top1.avatar_url} name={top1.display_name} size="lg" className="podium-avatar gold" />
                <div style={{ margin: "6px 0" }}>
                  <RankBadge level={top1.level} size="md" showLabel={false} />
                </div>
                <h3 className="podium-name">{top1.display_name}</h3>
                <span className="podium-handle">@{top1.username}</span>
                <span className="text-muted text-xs" style={{ marginBottom: "6px", color: "#f59e0b" }}>
                  {localizeRankTitle(top1.level, lang)}
                </span>
                <div className="podium-xp"><IconBolt size={14} /> {formatNumber(top1.xp)} XP</div>
                <div className="podium-prize gold">
                  🏆 YubiKey 5 NFC + {top1.reward_cb} CB
                </div>
                <div className="podium-pillar pillar-1">
                  <span className="podium-rank-tag">1</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3 && (
              <div className="podium-step podium-step-3" onClick={() => playCoinClink()}>
                <div className="podium-crown">🥉</div>
                <Avatar src={top3.avatar_url} name={top3.display_name} size="md" className="podium-avatar bronze" />
                <div style={{ margin: "4px 0" }}>
                  <RankBadge level={top3.level} size="sm" showLabel={false} />
                </div>
                <h3 className="podium-name">{top3.display_name}</h3>
                <span className="podium-handle">@{top3.username}</span>
                <span className="text-muted text-xs" style={{ marginBottom: "4px" }}>
                  {localizeRankTitle(top3.level, lang)}
                </span>
                <div className="podium-xp"><IconBolt size={13} /> {formatNumber(top3.xp)} XP</div>
                <div className="podium-prize bronze">
                  📦 Swag Box + {top3.reward_cb} CB
                </div>
                <div className="podium-pillar pillar-3">
                  <span className="podium-rank-tag">3</span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Loading state */}
        {loading && (
          <div className="leaderboard-loading" aria-busy="true">
            <div className="dash-skeleton" style={{ height: "180px", borderRadius: "16px", marginBottom: "24px" }} />
            <div className="dash-skeleton" style={{ height: "320px", borderRadius: "16px" }} />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="dash-state dash-state-error" role="alert">
            <IconTarget size={22} />
            <h2>{lang === "fr" ? "Impossible de charger le classement" : "Unable to load leaderboard"}</h2>
            <p>{error.message}</p>
            <Button onClick={reload} variant="secondary">{lang === "fr" ? "Réessayer" : "Retry"}</Button>
          </div>
        )}

        {/* Full Table (from rank 4 downwards) */}
        {!loading && entries && rest.length > 0 && (
          <section className="leaderboard-table-card" aria-label={lang === "fr" ? "Liste complète des participants" : "Complete participants roster"}>
            <div className="leaderboard-table-header">
              <h2>{lang === "fr" ? `Peloton de la Ligue (${entries.length} participants)` : `League Roster (${entries.length} participants)`}</h2>
              <span className="text-muted text-sm">
                {lang === "fr" ? "Dotations et CyberBits attribués le dernier jour du mois" : "Prizes and CyberBits rewarded on the last day of each month"}
              </span>
            </div>

            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th scope="col" className="col-rank">{lang === "fr" ? "Rang" : "Rank"}</th>
                    <th scope="col" className="col-user">{lang === "fr" ? "Apprenant" : "Learner"}</th>
                    <th scope="col" className="col-level">{lang === "fr" ? "Insigne & Niveau" : "Badge & Level"}</th>
                    <th scope="col" className="col-streak">{lang === "fr" ? "Série" : "Streak"}</th>
                    <th scope="col" className="col-xp">XP</th>
                    <th scope="col" className="col-reward">{lang === "fr" ? "Prime Mensuelle" : "Monthly Reward"}</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((entry) => {
                    const isMe = entry.is_current_user || (userId && entry.user_id === userId);
                    return (
                      <tr key={entry.user_id} className={`leaderboard-row ${isMe ? "is-me" : ""}`}>
                        <td className="col-rank">
                          <span className={`rank-pill ${entry.rank_position <= 10 ? "top-10" : ""}`}>
                            #{entry.rank_position}
                          </span>
                        </td>
                        <td className="col-user">
                          <div className="user-cell">
                            <Avatar src={entry.avatar_url} name={entry.display_name} size="sm" />
                            <div className="user-names">
                              <span className="user-name">
                                {entry.display_name} {isMe && <span className="you-badge">{lang === "fr" ? "(Toi)" : "(You)"}</span>}
                              </span>
                              <span className="user-handle">@{entry.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="col-level">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <RankBadge level={entry.level} size="sm" showLabel={false} />
                            <div>
                              <span className="level-badge">{lang === "fr" ? "Niv." : "Lvl."} {entry.level}</span>
                              <span className="rank-name">{localizeRankTitle(entry.level, lang)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="col-streak">
                          {entry.current_streak > 0 ? (
                            <span className="streak-tag">
                              <IconFlame size={14} /> {entry.current_streak} {lang === "fr" ? "j" : "d"}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="col-xp">
                          <strong>{formatNumber(entry.xp)}</strong>
                          <span className="xp-unit">XP</span>
                        </td>
                        <td className="col-reward">
                          {entry.reward_cb > 0 ? (
                            <span className="reward-tag">
                              <IconSparkles size={12} /> +{entry.reward_cb} CB
                            </span>
                          ) : (
                            <span className="reward-tag zero">+10 CB {lang === "fr" ? "part." : "part."}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
