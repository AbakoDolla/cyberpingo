"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  IconActivity,
  IconArrowRight,
  IconAward,
  IconBolt,
  IconCertificate,
  IconFlame,
  IconLesson,
  IconMap,
  IconTrophy,
} from "@/components/ui/Icon";
import SlugIcon from "@/components/ui/SlugIcon";
import { useLearner, useUserActions } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { formatDate, formatNumber, formatShortDate, formatDuration, greeting, levelLabel } from "@/lib/format";
import { getMyDashboard } from "@/services/gamification.service";
import type { ChallengeProgress, ContinueLearningItem, CourseRecommendation, Dashboard } from "@/types/api";

function DashboardLoading() {
  return (
    <div className="study-page" aria-busy="true">
      <div className="h-8 w-64 rounded-lg bg-white/[0.04] animate-pulse" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="h-44 rounded-xl2 bg-white/[0.04] animate-pulse md:col-span-2" />
        <div className="h-44 rounded-xl2 bg-white/[0.04] animate-pulse" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 rounded-xl2 bg-white/[0.04] animate-pulse" />)}
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="study-page">
      <Card className="border-cyber-red/30 bg-cyber-red/10">
        <h1 className="font-display text-2xl font-semibold">Impossible de charger ton tableau de bord.</h1>
        <p className="mt-3 text-sm text-red-100">{message}</p>
        <Button type="button" className="mt-5" variant="secondary" onClick={onRetry}>Réessayer</Button>
      </Card>
    </div>
  );
}

function StatTile({ label, value, detail, href, tone = "blue", icon }: { label: string; value: string | number; detail?: string; href: string; tone?: "blue" | "green" | "purple" | "neutral"; icon: React.ReactNode }) {
  const toneClass = tone === "green" ? "text-cyber-green bg-cyber-green/10 border-cyber-green/20" : tone === "purple" ? "text-neon-purple bg-neon-purple/10 border-neon-purple/20" : tone === "neutral" ? "text-white bg-white/5 border-white/10" : "text-cyber-blue bg-cyber-blue/10 border-cyber-blue/20";
  return (
    <Link href={href} className="group rounded-xl2 border border-white/5 bg-dark-navy p-5 transition-all hover:-translate-y-0.5 hover:border-cyber-blue/35 hover:bg-white/[0.03]">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl border ${toneClass}`}>{icon}</div>
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-white/60">{label}</p>
      {detail && <p className="mt-2 text-xs text-white/35">{detail}</p>}
    </Link>
  );
}

function ContinueCard({ item }: { item: ContinueLearningItem }) {
  return (
    <Card className="p-5" glow="blue">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge tone="blue">{levelLabel(item.level)} · {item.category}</Badge>
          <h3 className="mt-3 font-display text-lg font-semibold">{item.title}</h3>
          <p className="mt-1 text-sm text-white/50">{item.completed_lessons} / {item.total_lessons} leçons · activité {formatShortDate(item.last_activity_at)}</p>
        </div>
        <span className="text-sm font-semibold text-cyber-green tabular-nums">{item.progress_percentage} %</span>
      </div>
      <ProgressBar value={item.progress_percentage} tone="green" height="sm" className="mt-4" />
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/courses/${item.slug}`} className="study-button">Voir le parcours</Link>
        {item.last_lesson_id && <Link href={`/lessons/${item.last_lesson_id}`} className="study-link">Reprendre la leçon →</Link>}
      </div>
    </Card>
  );
}

function ChallengeCard({ challenge }: { challenge: ChallengeProgress }) {
  const percent = challenge.target > 0 ? Math.min(100, Math.round((challenge.progress / challenge.target) * 100)) : 0;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge tone={challenge.completed ? "green" : "purple"}>{challenge.completed ? "Défi réussi" : "Défi actif"}</Badge>
          <h3 className="mt-3 font-display font-semibold">{challenge.title}</h3>
          <p className="mt-1 text-sm text-white/55">{challenge.description}</p>
        </div>
        <span className="rounded-full bg-cyber-green/10 px-3 py-1 text-xs font-semibold text-cyber-green">+{challenge.xp_reward} XP</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-white/50">
        <span>{formatNumber(challenge.progress)} / {formatNumber(challenge.target)}</span>
        {challenge.ends_at && <span>jusqu’au {formatShortDate(challenge.ends_at)}</span>}
      </div>
      <ProgressBar value={percent} tone={challenge.completed ? "green" : "purple"} height="sm" className="mt-2" />
    </Card>
  );
}

function RecommendationCard({ course }: { course: CourseRecommendation }) {
  return (
    <Link href={`/courses/${course.slug}`} className="block rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-cyber-blue/35 hover:bg-cyber-blue/5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyber-blue/10 text-cyber-blue"><SlugIcon name={course.icon} size={20} /></span>
        <div>
          <h3 className="font-display font-semibold">{course.title}</h3>
          <p className="mt-1 text-sm text-white/55">{course.short_description}</p>
          <p className="mt-2 text-xs text-white/35">{levelLabel(course.level)} · {formatDuration(course.estimated_duration)}</p>
        </div>
      </div>
    </Link>
  );
}

function WeekChart({ week }: { week: Dashboard["week"] }) {
  const maxXp = Math.max(1, ...week.map((day) => day.xp));
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Activité sur 7 jours</h2>
        <IconActivity size={18} className="text-cyber-blue" />
      </div>
      {week.length === 0 ? (
        <p className="study-empty px-0 pb-0">Aucune activité récente. Une leçon suffit pour lancer la série.</p>
      ) : (
        <div className="mt-6 grid grid-cols-7 items-end gap-2" aria-label="XP gagnée cette semaine">
          {week.map((day) => {
            const height = Math.max(12, Math.round((day.xp / maxXp) * 96));
            return (
              <div key={day.date} className="flex flex-col items-center gap-2">
                <div className="flex h-28 w-full items-end rounded-lg bg-white/[0.03] px-1">
                  <div className="w-full rounded-md bg-cyber-gradient" style={{ height }} title={`${day.xp} XP · ${day.lessons} leçon(s) · ${day.minutes} min`} />
                </div>
                <span className="text-[10px] text-white/45">{formatShortDate(day.date).replace(" ", "\u00a0")}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function LearnerDashboard() {
  const { profile } = useLearner();
  const { setUnreadNotifications } = useUserActions();
  const { data, error, loading, reload } = useAsync(getMyDashboard, []);

  useEffect(() => {
    if (data) setUnreadNotifications(data.unread_notifications);
  }, [data, setUnreadNotifications]);

  const goalPercent = useMemo(() => data ? Math.min(100, Math.round((data.today.study_minutes / Math.max(1, data.today.goal_minutes)) * 100)) : 0, [data]);

  if (loading) return <DashboardLoading />;
  if (error) return <DashboardError message={error.message} onRetry={() => void reload()} />;
  if (!data) return <DashboardError message="Aucune donnée reçue." onRetry={() => void reload()} />;

  const noProgress = data.continue_learning.length === 0 && data.stats.lessons_completed === 0 && data.stats.quizzes_passed === 0 && data.stats.labs_solved === 0;

  return (
    <div className="study-page space-y-6">
      <header className="grid gap-5 rounded-xl2 border border-cyber-blue/20 bg-[radial-gradient(circle_at_top_left,rgba(0,168,255,.18),transparent_35%),#071426] p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex items-start gap-4">
          <Avatar name={profile.display_name} src={profile.avatar_url} size="lg" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyber-blue">Tableau de bord</p>
            <h1 className="mt-1 font-display text-2xl font-semibold md:text-4xl">{greeting(data.profile.display_name)}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
              Ton espace d’apprentissage est synchronisé avec Supabase : poursuis ton parcours, protège ta série et récupère tes récompenses.
            </p>
            {!data.profile.onboarding_completed && (
              <Link href="/onboarding" className="study-button mt-4">Finaliser mon onboarding</Link>
            )}
          </div>
        </div>
        <Card className="min-w-64 border-cyber-blue/15 bg-cyber-black/40 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Niveau {data.level.level}</p>
              <h2 className="mt-1 font-display text-xl font-semibold">{data.level.title}</h2>
            </div>
            <IconBolt size={24} className="text-cyber-blue" />
          </div>
          <ProgressBar value={data.level.progress_percentage} tone="blue" className="mt-4" />
          <p className="mt-2 text-xs text-white/45">{formatNumber(data.level.xp)} XP · {data.level.next_level_xp ? `${formatNumber(data.level.next_level_xp - data.level.xp)} XP avant ${data.level.next_title}` : "palier maximal atteint"}</p>
        </Card>
      </header>

      {noProgress && (
        <Card className="flex flex-col gap-4 border-cyber-green/20 bg-cyber-green/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge tone="green">Nouveau départ</Badge>
            <h2 className="mt-3 font-display text-xl font-semibold">Commence ton premier parcours</h2>
            <p className="mt-1 text-sm text-emerald-100/80">Choisis un parcours guidé : tes leçons, quiz et XP apparaîtront ici en temps réel.</p>
          </div>
          <Link href="/courses"><Button variant="success">Explorer les parcours</Button></Link>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-4" aria-label="Statistiques rapides">
        <StatTile label="Leçons terminées" value={data.stats.lessons_completed} href="/progression" icon={<IconLesson size={18} />} />
        <StatTile label="Quiz réussis" value={data.stats.quizzes_passed} href="/progression" tone="green" icon={<IconTrophy size={18} />} />
        <StatTile label="Badges" value={data.stats.badges} href="/profile" tone="purple" icon={<IconAward size={18} />} />
        <StatTile label="Certificats" value={data.stats.certificates} href="/profile" tone="neutral" icon={<IconCertificate size={18} />} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_.9fr]">
        <Card glow="green">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge tone={data.today.goal_reached ? "green" : "blue"}>Objectif du jour</Badge>
              <h2 className="mt-3 font-display text-2xl font-semibold">{data.today.study_minutes} / {data.today.goal_minutes} min</h2>
              <p className="mt-1 text-sm text-white/55">{data.today.lessons_completed} leçon(s), {data.today.quizzes_passed} quiz, {data.today.labs_solved} lab(s) aujourd’hui · +{data.today.xp_earned} XP</p>
            </div>
            <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${data.streak.active_today ? "bg-cyber-green/10 text-cyber-green" : "bg-cyber-yellow/10 text-cyber-yellow"}`}>
              <IconFlame size={16} /> {data.streak.current} j{data.streak.active_today ? " · actif" : " · à sauver"}
            </div>
          </div>
          <ProgressBar value={goalPercent} tone={data.today.goal_reached ? "green" : "blue"} className="mt-5" />
        </Card>
        <Card>
          <h2 className="font-display text-lg font-semibold">Série</h2>
          <p className="mt-3 text-4xl font-display font-bold text-cyber-yellow"><IconFlame size={26} className="mb-1 mr-2 inline" />{data.streak.current} jours</p>
          <p className="mt-2 text-sm text-white/55">Record : {data.streak.longest} jours. Dernière activité : {data.streak.last_activity_date ? formatDate(data.streak.last_activity_date) : "pas encore d’activité"}.</p>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_.9fr]">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">Continuer</h2>
            <Link href="/courses" className="study-link">Tous les parcours</Link>
          </div>
          {data.continue_learning.length === 0 ? (
            <Card className="text-center">
              <IconMap size={28} className="mx-auto text-cyber-blue" />
              <h3 className="mt-3 font-display text-lg font-semibold">Aucun parcours en cours.</h3>
              <p className="mt-2 text-sm text-white/55">Aucun cours disponible pour le moment ou aucun parcours démarré. Commence ton premier parcours quand tu es prêt.</p>
              <Link href="/courses" className="study-button mt-4">Commence ton premier parcours</Link>
            </Card>
          ) : (
            <div className="grid gap-4">{data.continue_learning.map((item) => <ContinueCard key={item.course_id} item={item} />)}</div>
          )}

          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">Défis actifs</h2>
            <Link href="/challenges" className="study-link">Voir les défis</Link>
          </div>
          {data.challenges.length === 0 ? (
            <Card><p className="study-empty px-0 py-0">Aucun défi actif pour le moment.</p></Card>
          ) : <div className="grid gap-4 md:grid-cols-2">{data.challenges.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} />)}</div>}
        </div>
        <div className="space-y-6">
          <WeekChart week={data.week} />
          <Card>
            <h2 className="font-display text-lg font-semibold">Badges récents</h2>
            {data.recent_badges.length === 0 ? <p className="study-empty px-0 pb-0">Aucun badge débloqué pour le moment.</p> : (
              <div className="mt-4 grid gap-3">
                {data.recent_badges.map((badge) => (
                  <div key={`${badge.id}-${badge.earned_at}`} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neon-purple/10 text-neon-purple"><SlugIcon name={badge.icon} size={20} /></span>
                    <div>
                      <p className="font-medium">{badge.name}</p>
                      <p className="text-xs text-white/45">Obtenu le {formatShortDate(badge.earned_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h2 className="font-display text-lg font-semibold">Recommandations</h2>
            {data.recommendations.length === 0 ? <p className="study-empty px-0 pb-0">Aucun cours disponible pour le moment.</p> : <div className="mt-4 grid gap-3">{data.recommendations.map((course) => <RecommendationCard key={course.course_id} course={course} />)}</div>}
          </Card>
          <Link href="/progression" className="group flex items-center justify-between rounded-xl2 border border-white/5 bg-dark-navy p-5 transition-colors hover:border-cyber-blue/35">
            <span><span className="block font-display font-semibold">Ma progression détaillée</span><span className="mt-1 block text-sm text-white/50">XP, niveaux, historique et parcours.</span></span>
            <IconArrowRight size={18} className="text-cyber-blue transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return <AppShell><LearnerDashboard /></AppShell>;
}