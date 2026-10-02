"use client";

import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  IconActivity,
  IconArrowRight,
  IconAward,
  IconBolt,
  IconCertificate,
  IconCheck,
  IconClock,
  IconFlame,
  IconLesson,
  IconMap,
  IconTarget,
  IconTrophy,
} from "@/components/ui/Icon";
import Pingo from "@/components/mascot/Pingo";
import { Pingo3D } from "@/components/mascot/Pingo3D";
import SlugIcon from "@/components/ui/SlugIcon";
import { useLearner, useUserActions } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { dateInZone, effectiveStreak } from "@/lib/levels";
import { formatDate, formatDuration, formatNumber, formatRelative, formatShortDate, greeting, levelLabel, plural } from "@/lib/format";
import { getMyDashboard } from "@/services/gamification.service";
import type { ChallengeProgress, ContinueLearningItem, CourseRecommendation, Dashboard } from "@/types/api";

function DashboardLoading() {
  return (
    <div className="dash-page" aria-busy="true">
      <div className="dash-skeleton dash-skeleton-title" />
      <div className="dash-loading-grid">
        <div className="dash-skeleton dash-skeleton-mission" />
        <div className="dash-skeleton dash-skeleton-panel" />
      </div>
      <div className="dash-card-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="dash-skeleton dash-skeleton-card" />
        ))}
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="dash-page">
      <section className="dash-state dash-state-error" role="alert">
        <IconTarget size={22} />
        <h1>Impossible de charger ton tableau de bord.</h1>
        <p>{message}</p>
        <Button type="button" variant="secondary" onClick={onRetry}>Réessayer</Button>
      </section>
    </div>
  );
}

function nextActionHref(item: ContinueLearningItem | null) {
  if (!item) return "/courses";
  return item.last_lesson_id ? `/lessons/${item.last_lesson_id}` : `/courses/${item.slug}`;
}

function DashboardSignal({
  icon,
  label,
  value,
  detail,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail?: string;
  href: string;
}) {
  return (
    <Link href={href} className="dash-signal">
      <span className="dash-signal-icon">{icon}</span>
      <span>
        <strong>{value}</strong>
        <span>{label}</span>
        {detail && <small>{detail}</small>}
      </span>
    </Link>
  );
}

function ContinuePanel({ item }: { item: ContinueLearningItem }) {
  return (
    <article className="dash-course-row">
      <div className="dash-course-mark">
        <SlugIcon name={item.icon} size={22} />
      </div>
      <div className="dash-course-copy">
        <div className="dash-course-head">
          <h3>{item.title}</h3>
          <strong>{item.progress_percentage} %</strong>
        </div>
        <p>
          {levelLabel(item.level)} · {item.category} · {item.completed_lessons} / {item.total_lessons} leçons
        </p>
        <ProgressBar value={item.progress_percentage} tone="green" height="sm" />
      </div>
      <Link href={nextActionHref(item)} className="dash-row-action">
        Continuer <IconArrowRight size={16} />
      </Link>
    </article>
  );
}

function ChallengePanel({ challenge }: { challenge: ChallengeProgress }) {
  const percent = challenge.target > 0 ? Math.min(100, Math.round((challenge.progress / challenge.target) * 100)) : 0;
  return (
    <article className="dash-challenge">
      <div className="dash-challenge-icon">
        <SlugIcon name={challenge.icon} size={20} />
      </div>
      <div>
        <div className="dash-challenge-head">
          <h3>{challenge.title}</h3>
          <Badge tone={challenge.completed ? "green" : "purple"}>{challenge.completed ? "Réussi" : "Actif"}</Badge>
        </div>
        <p>{challenge.description}</p>
        <div className="dash-challenge-meta">
          <span>{formatNumber(challenge.progress)} / {formatNumber(challenge.target)}</span>
          <span>+{formatNumber(challenge.xp_reward)} XP</span>
          {challenge.ends_at && <span>Fin {formatShortDate(challenge.ends_at)}</span>}
        </div>
        <ProgressBar value={percent} tone={challenge.completed ? "green" : "purple"} height="sm" />
      </div>
    </article>
  );
}

function RecommendationPanel({ course }: { course: CourseRecommendation }) {
  return (
    <Link href={`/courses/${course.slug}`} className="dash-recommendation">
      <span className="dash-recommendation-icon">
        <SlugIcon name={course.icon} size={20} />
      </span>
      <span>
        <strong>{course.title}</strong>
        <span>{course.short_description}</span>
        <small>{levelLabel(course.level)} · {formatDuration(course.estimated_duration)}</small>
      </span>
      <IconArrowRight size={16} />
    </Link>
  );
}

function WeekRhythm({ week }: { week: Dashboard["week"] }) {
  const maxXp = Math.max(1, ...week.map((day) => day.xp));
  return (
    <section className="dash-panel dash-week" aria-labelledby="dash-week-title">
      <div className="dash-section-head">
        <div>
          <h2 id="dash-week-title">Rythme des 7 derniers jours</h2>
          <p>Une lecture rapide de ton énergie d’apprentissage récente.</p>
        </div>
        <IconActivity size={18} />
      </div>
      {week.length === 0 ? (
        <p className="dash-empty">Aucune activité récente. Une leçon suffit pour lancer la série.</p>
      ) : (
        <div className="dash-week-bars" aria-label="XP gagnée cette semaine">
          {week.map((day) => {
            const height = Math.max(12, Math.round((day.xp / maxXp) * 100));
            return (
              <div key={day.date} className="dash-week-day">
                <div className="dash-week-track">
                  <span
                    style={{ "--dash-bar": `${height}%` } as CSSProperties}
                    title={`${day.xp} XP · ${day.lessons} ${plural(day.lessons, "leçon")} · ${day.minutes} min`}
                  />
                </div>
                <small>{formatShortDate(day.date).replace(" ", "\u00a0")}</small>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LearnerDashboard() {
  const { profile, level: learnerLevel, timezone } = useLearner();
  const { setUnreadNotifications } = useUserActions();
  const { data, error, loading, reload } = useAsync(getMyDashboard, []);

  useEffect(() => {
    if (data) setUnreadNotifications(data.unread_notifications);
  }, [data, setUnreadNotifications]);

  const goalPercent = useMemo(
    () => data ? Math.min(100, Math.round((data.today.study_minutes / Math.max(1, data.today.goal_minutes)) * 100)) : 0,
    [data],
  );

  if (loading) return <DashboardLoading />;
  if (error) return <DashboardError message={error.message} onRetry={() => void reload()} />;
  if (!data) return <DashboardError message="Aucune donnée reçue." onRetry={() => void reload()} />;

  const level = learnerLevel ?? data.level;
  const nextItem = data.continue_learning[0] ?? null;
  const todayInZone = dateInZone(new Date(), timezone);
  const activeToday = data.streak.active_today || data.streak.last_activity_date === todayInZone;
  const currentStreak = effectiveStreak(data.streak.current, data.streak.last_activity_date, timezone);
  const xpToNext = level.next_level_xp ? Math.max(0, level.next_level_xp - level.xp) : null;
  const noProgress = data.continue_learning.length === 0 && data.stats.lessons_completed === 0 && data.stats.quizzes_passed === 0 && data.stats.labs_solved === 0;

  return (
    <div className="dash-page">
      <section className="dash-hero" aria-labelledby="dash-title">
        <div className="dash-hero-copy">
          <div className="dash-profile-line">
            <Avatar name={profile.display_name} src={profile.avatar_url} size="lg" />
            <div>
              <h1 id="dash-title">{greeting(data.profile.display_name)}</h1>
              <p>
                Aujourd’hui, ton meilleur levier est clair&nbsp;: continuer le bon parcours, tenir ton objectif et transformer l’effort en XP utile.
              </p>
            </div>
          </div>
          <div className="dash-hero-pingo">
            <Pingo3D
              pose={activeToday ? "celebrate" : "wave"}
              label="Pingo, ta mascotte 3D"
              fallback={<Pingo state="welcome" size={190} />}
            />
          </div>
          {!data.profile.onboarding_completed && (
            <Link href="/onboarding" className="study-button dash-onboarding-link">Finaliser mon onboarding</Link>
          )}
        </div>

        <aside className="dash-level-card" aria-label={`Niveau ${level.level}`}>
          <div className="dash-level-badge">N{level.level}</div>
          <div>
            <h2>{level.title}</h2>
            <p>{formatNumber(level.xp)} XP cumulés</p>
          </div>
          <ProgressBar value={level.progress_percentage} tone="blue" />
          <p>{xpToNext === null ? "Palier maximal atteint." : `${formatNumber(xpToNext)} XP avant ${level.next_title}.`}</p>
        </aside>
      </section>

      <section className="dash-mission" aria-labelledby="dash-mission-title">
        <div className="dash-mission-main">
          <div className="dash-mission-icon">
            {nextItem ? <SlugIcon name={nextItem.icon} size={30} /> : <IconMap size={30} />}
          </div>
          <div>
            <h2 id="dash-mission-title">{nextItem ? nextItem.title : "Choisis ton premier parcours"}</h2>
            <p>
              {nextItem
                ? `${nextItem.completed_lessons} / ${nextItem.total_lessons} leçons terminées · dernière activité ${formatRelative(nextItem.last_activity_at)}.`
                : "Tu n’as pas encore démarré de parcours. Explore le catalogue quand tu es prêt."}
            </p>
            {nextItem && <ProgressBar value={nextItem.progress_percentage} tone="green" className="dash-mission-progress" />}
          </div>
        </div>
        <Link href={nextActionHref(nextItem)} className="study-button dash-primary-action">
          {nextItem ? "Continuer" : "Explorer les parcours"} <IconArrowRight size={17} />
        </Link>
      </section>

      {noProgress && (
        <section className="dash-onboarding-card">
          <IconBolt size={22} />
          <div>
            <h2>Nouveau départ</h2>
            <p>Commence un parcours guidé&nbsp;: tes leçons, quiz, labs et récompenses apparaîtront ici dès les premières actions.</p>
          </div>
          <Link href="/courses" className="study-button">Commencer</Link>
        </section>
      )}

      <section className="dash-daily-grid" aria-label="Objectif quotidien et série">
        <article className="dash-panel dash-daily">
          <div className="dash-section-head">
            <div>
              <h2>Objectif du jour</h2>
              <p>{data.today.lessons_completed} {plural(data.today.lessons_completed, "leçon")}, {data.today.quizzes_passed} quiz, {data.today.labs_solved} {plural(data.today.labs_solved, "lab")} · +{formatNumber(data.today.xp_earned)} XP</p>
            </div>
            <strong>{data.today.study_minutes} / {data.today.goal_minutes} min</strong>
          </div>
          <ProgressBar value={goalPercent} tone={data.today.goal_reached ? "green" : "blue"} />
          <div className="dash-daily-status">
            {data.today.goal_reached ? <IconCheck size={16} /> : <IconClock size={16} />}
            {data.today.goal_reached ? "Objectif validé aujourd’hui." : "Encore quelques minutes pour valider l’objectif."}
          </div>
        </article>

        <article className="dash-panel dash-streak">
          <IconFlame size={24} />
          <div>
            <h2>{formatNumber(currentStreak)} {plural(currentStreak, "jour")} de série</h2>
            <p>
              {activeToday ? "Activité enregistrée aujourd’hui." : "Série à sauver aujourd’hui."}
              {" "}Record&nbsp;: {formatNumber(data.streak.longest)} {plural(data.streak.longest, "jour")}.
            </p>
            <small>
              Dernière activité&nbsp;: {data.streak.last_activity_date ? formatDate(data.streak.last_activity_date) : "pas encore d’activité"}.
            </small>
          </div>
        </article>
      </section>

      <section className="dash-card-grid" aria-label="Signaux rapides">
        <DashboardSignal label="Leçons terminées" value={data.stats.lessons_completed} href="/progression" icon={<IconLesson size={18} />} />
        <DashboardSignal label="Quiz réussis" value={data.stats.quizzes_passed} href="/progression" icon={<IconTrophy size={18} />} />
        <DashboardSignal label="Badges obtenus" value={data.stats.badges} href="/progression" icon={<IconAward size={18} />} />
        <DashboardSignal label="Certificats" value={data.stats.certificates} href="/progression" detail={`${data.stats.courses_completed} parcours terminés`} icon={<IconCertificate size={18} />} />
      </section>

      <section className="dash-main-grid">
        <div className="dash-stack">
          <div className="dash-section-head">
            <div>
              <h2>Parcours en cours</h2>
              <p>Les formations où une prochaine action existe déjà.</p>
            </div>
            <Link href="/courses" className="study-link">Tous les parcours</Link>
          </div>
          {data.continue_learning.length === 0 ? (
            <div className="dash-empty-card">
              <IconMap size={28} />
              <h3>Aucun parcours en cours.</h3>
              <p>Tu n’as pas encore démarré de parcours.</p>
              <Link href="/courses" className="study-button">Commencer un parcours</Link>
            </div>
          ) : (
            <div className="dash-course-list">
              {data.continue_learning.map((item) => <ContinuePanel key={item.course_id} item={item} />)}
            </div>
          )}

          <div className="dash-section-head">
            <div>
              <h2>Défis actifs</h2>
              <p>Des objectifs courts qui convertissent la pratique en récompenses.</p>
            </div>
            <Link href="/challenges" className="study-link">Voir les défis</Link>
          </div>
          {data.challenges.length === 0 ? (
            <p className="dash-empty">Aucun défi actif pour le moment.</p>
          ) : (
            <div className="dash-challenge-list">
              {data.challenges.map((challenge) => <ChallengePanel key={challenge.id} challenge={challenge} />)}
            </div>
          )}
        </div>

        <aside className="dash-side">
          <WeekRhythm week={data.week} />

          <section className="dash-panel" aria-labelledby="dash-badges-title">
            <div className="dash-section-head">
              <div>
                <h2 id="dash-badges-title">Badges récents</h2>
                <p>Les dernières récompenses débloquées.</p>
              </div>
            </div>
            {data.recent_badges.length === 0 ? (
              <p className="dash-empty">Aucun badge débloqué pour le moment.</p>
            ) : (
              <div className="dash-badge-list">
                {data.recent_badges.map((badge) => (
                  <div key={`${badge.id}-${badge.earned_at}`} className="dash-badge-row">
                    <span>
                      <SlugIcon name={badge.icon} size={19} />
                    </span>
                    <div>
                      <strong>{badge.name}</strong>
                      <small>Obtenu {formatRelative(badge.earned_at)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dash-panel" aria-labelledby="dash-recommendations-title">
            <div className="dash-section-head">
              <div>
                <h2 id="dash-recommendations-title">Recommandations</h2>
                <p>La suite la plus pertinente selon ton profil.</p>
              </div>
            </div>
            {data.recommendations.length === 0 ? (
              <p className="dash-empty">Aucun cours disponible pour le moment.</p>
            ) : (
              <div className="dash-recommendation-list">
                {data.recommendations.map((course) => <RecommendationPanel key={course.course_id} course={course} />)}
              </div>
            )}
          </section>

          <Link href="/progression" className="dash-progression-link">
            <span>
              <strong>Ma progression détaillée</strong>
              <small>XP, niveaux, historique, badges et certificats.</small>
            </span>
            <IconArrowRight size={18} />
          </Link>
        </aside>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return <AppShell><LearnerDashboard /></AppShell>;
}
