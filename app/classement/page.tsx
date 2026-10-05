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
  IconSparkles,
  IconTarget,
  IconTrophy,
} from "@/components/ui/Icon";
import { useUser } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { formatNumber, levelLabel } from "@/lib/format";
import { playCoinClink, playTrophyChime } from "@/lib/mascot/sound-effects";
import { getLeaderboard, getWeeklyLeagueInfo } from "@/services/leaderboard.service";
import type { LeaderboardEntry, WeeklyLeagueInfo } from "@/types/api";

function formatCountdown(totalSeconds: number): { days: number; hours: number; minutes: number; seconds: number } {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function rankTitle(level: number): string {
  if (level >= 9) return "Grand Maître";
  if (level >= 7) return "Professeur Cyber";
  if (level >= 5) return "Analyste Cyber";
  if (level >= 3) return "Gardien Numérique";
  return "Initié Sécurité";
}

export default function ClassementPage() {
  const { profile } = useUser();
  const userId = profile?.id ?? null;

  const [leagueInfo, setLeagueInfo] = useState<WeeklyLeagueInfo>(() => getWeeklyLeagueInfo());
  const [secondsLeft, setSecondsLeft] = useState<number>(() => getWeeklyLeagueInfo().seconds_remaining);

  const { data: entries, loading, error, reload } = useAsync<LeaderboardEntry[]>(
    () => getLeaderboard(userId),
    [userId],
  );

  // Live countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setLeagueInfo(getWeeklyLeagueInfo());
          return getWeeklyLeagueInfo().seconds_remaining;
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

  return (
    <AppShell allowGuest>
      <div className="leaderboard-page">
        {/* Header Hero */}
        <header className="leaderboard-hero">
          <div className="leaderboard-hero-content">
            <div className="leaderboard-badge-row">
              <span className="badge badge-primary">
                <IconTrophy size={14} /> Saison {new Date().getFullYear()} • Semaine {leagueInfo.season_week}
              </span>
              <span className="badge badge-muted">
                <IconBolt size={14} /> Ligue CyberPingo
              </span>
            </div>
            <h1 className="leaderboard-title">
              Classement & Primes <span className="text-cyan">CyberBits</span>
            </h1>
            <p className="leaderboard-subtitle">
              Prouve ton excellence en sécurité, grimpe dans la ligue et empoche jusqu&apos;à 250 CB chaque dimanche.
            </p>
          </div>

          {/* Countdown card */}
          <div
            className="league-timer-card"
            onMouseEnter={() => playTrophyChime()}
            title="Réinitialisation chaque dimanche à 23h59 UTC"
          >
            <div className="league-timer-label">
              <IconClock size={16} /> Fin du classement hebdo dans
            </div>
            <div className="league-timer-grid">
              <div className="league-timer-segment">
                <span className="league-timer-value">{time.days}</span>
                <span className="league-timer-unit">jours</span>
              </div>
              <span className="league-timer-sep">:</span>
              <div className="league-timer-segment">
                <span className="league-timer-value">{String(time.hours).padStart(2, "0")}</span>
                <span className="league-timer-unit">heures</span>
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

        {/* Reward Tiers Strip */}
        <section className="league-rewards-strip" aria-label="Primes hebdomadaires">
          <h2 className="sr-only">Primes de la ligue</h2>
          <div className="league-rewards-grid">
            {leagueInfo.rewards.map((r, i) => (
              <div key={i} className="league-reward-pill" onClick={() => playCoinClink()}>
                <span className="league-reward-badge">{r.badge}</span>
                <div className="league-reward-meta">
                  <span className="league-reward-place">{r.place}</span>
                  <span className="league-reward-amount">+{r.cb} CB</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Current User Standout (if logged in) */}
        {currentUserEntry && (
          <aside className="current-user-standing" aria-label="Ton classement actuel">
            <div className="standing-rank">
              <span className="standing-rank-num">#{currentUserEntry.rank_position}</span>
              <span className="standing-rank-tag">Ton rang</span>
            </div>
            <div className="standing-avatar">
              <Avatar
                src={currentUserEntry.avatar_url}
                name={currentUserEntry.display_name}
                size="md"
              />
            </div>
            <div className="standing-info">
              <div className="standing-name">
                <strong>{currentUserEntry.display_name}</strong>
                <Badge tone="blue">Niv. {currentUserEntry.level}</Badge>
              </div>
              <div className="standing-meta">
                <span><IconBolt size={13} /> {formatNumber(currentUserEntry.xp)} XP</span>
                {currentUserEntry.current_streak > 0 && (
                  <span><IconFlame size={13} /> {currentUserEntry.current_streak} j de série</span>
                )}
              </div>
            </div>
            <div className="standing-reward">
              <span className="standing-reward-label">Prime estimée</span>
              <span className="standing-reward-cb">
                <IconSparkles size={14} /> +{currentUserEntry.reward_cb} CB
              </span>
            </div>
          </aside>
        )}

        {/* Top 3 Podium */}
        {!loading && entries && entries.length >= 3 && (
          <section className="podium-section" aria-label="Podium des 3 premiers">
            {/* 2nd Place */}
            {top2 && (
              <div className="podium-step podium-step-2" onClick={() => playCoinClink()}>
                <div className="podium-crown">🥈</div>
                <Avatar src={top2.avatar_url} name={top2.display_name} size="md" className="podium-avatar silver" />
                <h3 className="podium-name">{top2.display_name}</h3>
                <span className="podium-handle">@{top2.username}</span>
                <div className="podium-xp"><IconBolt size={13} /> {formatNumber(top2.xp)} XP</div>
                <div className="podium-prize silver">+{top2.reward_cb} CB</div>
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
                <h3 className="podium-name">{top1.display_name}</h3>
                <span className="podium-handle">@{top1.username}</span>
                <div className="podium-xp"><IconBolt size={14} /> {formatNumber(top1.xp)} XP</div>
                <div className="podium-prize gold">+{top1.reward_cb} CB</div>
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
                <h3 className="podium-name">{top3.display_name}</h3>
                <span className="podium-handle">@{top3.username}</span>
                <div className="podium-xp"><IconBolt size={13} /> {formatNumber(top3.xp)} XP</div>
                <div className="podium-prize bronze">+{top3.reward_cb} CB</div>
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
            <h2>Impossible de charger le classement</h2>
            <p>{error.message}</p>
            <Button onClick={reload} variant="secondary">Réessayer</Button>
          </div>
        )}

        {/* Full Table (from rank 4 downwards) */}
        {!loading && entries && rest.length > 0 && (
          <section className="leaderboard-table-card" aria-label="Liste complète des participants">
            <div className="leaderboard-table-header">
              <h2>Peloton de la ligue ({entries.length} participants)</h2>
              <span className="text-muted text-sm">Récompenses distribuées chaque dimanche soir</span>
            </div>

            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th scope="col" className="col-rank">Rang</th>
                    <th scope="col" className="col-user">Apprenant</th>
                    <th scope="col" className="col-level">Niveau</th>
                    <th scope="col" className="col-streak">Série</th>
                    <th scope="col" className="col-xp">XP</th>
                    <th scope="col" className="col-reward">Prime estimée</th>
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
                                {entry.display_name} {isMe && <span className="you-badge">(Toi)</span>}
                              </span>
                              <span className="user-handle">@{entry.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="col-level">
                          <span className="level-badge">Niv. {entry.level}</span>
                          <span className="rank-name">{rankTitle(entry.level)}</span>
                        </td>
                        <td className="col-streak">
                          {entry.current_streak > 0 ? (
                            <span className="streak-tag">
                              <IconFlame size={14} /> {entry.current_streak} j
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
                            <span className="reward-tag zero">+5 CB part.</span>
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
