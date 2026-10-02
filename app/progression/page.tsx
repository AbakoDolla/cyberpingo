"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  IconActivity,
  IconAlert,
  IconAward,
  IconBolt,
  IconCertificate,
  IconCheck,
  IconClock,
  IconDownload,
  IconLesson,
  IconLock,
  IconTarget,
  IconTrophy,
} from "@/components/ui/Icon";
import SlugIcon from "@/components/ui/SlugIcon";
import { useLearner } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatDuration, formatNumber, formatRelative, formatShortDate, levelLabel, plural } from "@/lib/format";
import { listMyCourseProgress, listPublishedCourses } from "@/services/courses.service";
import {
  getCertificatePdfUrl,
  getMyStats,
  listBadgesWithState,
  listLevels,
  listMyCertificates,
  listMyXpHistory,
} from "@/services/gamification.service";
import type { BadgeCriteria, BadgeWithState, Certificate, CourseProgress, CourseSummary, LearnerStats, XpReason } from "@/types/api";

const XP_REASON_LABELS: Record<XpReason, string> = {
  lesson_completed: "Leçon terminée",
  quiz_completed: "Quiz réussi",
  lab_completed: "Lab résolu",
  challenge_completed: "Défi réussi",
  course_completed: "Parcours terminé",
  achievement: "Badge",
  daily_goal: "Objectif quotidien",
  admin_adjustment: "Ajustement",
};

const BADGE_UNLOCK_LABELS: Record<BadgeCriteria, (value: number) => string> = {
  lessons_completed: (value) => `Termine ${formatNumber(value)} leçon${value > 1 ? "s" : ""}.`,
  quizzes_passed: (value) => `Réussis ${formatNumber(value)} quiz.`,
  courses_completed: (value) => `Termine ${formatNumber(value)} parcours.`,
  streak_days: (value) => `Tiens une série de ${formatNumber(value)} jour${value > 1 ? "s" : ""}.`,
  xp_total: (value) => `Atteins ${formatNumber(value)} XP cumulés.`,
  labs_solved: (value) => `Résous ${formatNumber(value)} lab${value > 1 ? "s" : ""}.`,
  certificates_earned: (value) => `Obtiens ${formatNumber(value)} certificat${value > 1 ? "s" : ""}.`,
  course_completed: () => "Termine le parcours associé.",
};

type LevelRow = Awaited<ReturnType<typeof listLevels>>[number];
type ProgressionData = {
  stats: LearnerStats;
  courses: CourseProgress[];
  catalog: CourseSummary[];
  history: Awaited<ReturnType<typeof listMyXpHistory>>;
  levels: LevelRow[];
  badges: BadgeWithState[];
  certificates: Certificate[];
};

function xpReasonLabel(reason: string) {
  return XP_REASON_LABELS[reason as XpReason] ?? reason;
}

function badgeUnlockText(badge: BadgeWithState) {
  return BADGE_UNLOCK_LABELS[badge.criteria_type]?.(badge.criteria_value) ?? "Continue ta progression pour le débloquer.";
}

function ProgressionLoading() {
  return (
    <div className="prog-page" aria-busy="true">
      <div className="prog-skeleton prog-skeleton-title" />
      <div className="prog-loading-grid">
        <div className="prog-skeleton prog-skeleton-overview" />
        <div className="prog-skeleton prog-skeleton-panel" />
      </div>
      <div className="prog-skeleton prog-skeleton-wide" />
    </div>
  );
}

function ErrorState({ message, reload }: { message: string; reload: () => void }) {
  return (
    <div className="prog-page">
      <section className="prog-state prog-state-error" role="alert">
        <IconAlert size={22} />
        <h1>Impossible de charger ta progression.</h1>
        <p>{message}</p>
        <Button type="button" variant="secondary" onClick={reload}>Réessayer</Button>
      </section>
    </div>
  );
}

function StatPill({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: ReactNode;
}) {
  return (
    <article className="prog-stat">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        {detail && <small>{detail}</small>}
      </div>
    </article>
  );
}

function ActivityChart({ activity }: { activity: LearnerStats["activity"] }) {
  const maxXp = Math.max(1, ...activity.map((day) => day.xp));
  return (
    <section className="prog-panel" aria-labelledby="prog-activity-title">
      <div className="prog-section-head">
        <div>
          <h2 id="prog-activity-title">Activité sur 30 jours</h2>
          <p>Chaque cellule révèle XP, leçons, quiz, labs et temps d’étude du jour.</p>
        </div>
        <IconActivity size={18} />
      </div>
      {activity.length === 0 ? (
        <p className="prog-empty">Aucune activité enregistrée pour le moment.</p>
      ) : (
        <div className="prog-activity-grid" aria-label="Activité quotidienne">
          {activity.map((day) => {
            const intensity = Math.max(0.16, day.xp / maxXp);
            const alpha = 0.13 + intensity * 0.55;
            const glow = intensity * 0.05;
            return (
              <span
                key={day.date}
                className="prog-activity-cell"
                style={{ "--prog-alpha": alpha, "--prog-glow": glow } as CSSProperties}
                title={`${formatShortDate(day.date)} · ${day.xp} XP · ${day.lessons} ${plural(day.lessons, "leçon")} · ${day.quizzes} quiz · ${day.labs} ${plural(day.labs, "lab")} · ${day.minutes} min`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function CourseProgressList({ courses, catalog }: { courses: CourseProgress[]; catalog: CourseSummary[] }) {
  const byId = new Map(catalog.map((course) => [course.id, course]));
  if (courses.length === 0) {
    return (
      <section className="prog-empty-card">
        <IconLesson size={28} />
        <h2>Aucun parcours démarré.</h2>
        <p>Commence ton premier parcours pour suivre tes leçons, quiz et certificats ici.</p>
        <Link href="/courses" className="study-button">Commencer un parcours</Link>
      </section>
    );
  }
  return (
    <section className="prog-panel" aria-labelledby="prog-courses-title">
      <div className="prog-section-head">
        <div>
          <h2 id="prog-courses-title">Mes parcours</h2>
          <p>Progression consolidée par formation.</p>
        </div>
      </div>
      <div className="prog-course-list">
        {courses.map((course) => {
          const summary = byId.get(course.course_id);
          return (
            <Link key={course.course_id} href={summary ? `/courses/${summary.slug}` : "/courses"} className="prog-course-row">
              <span className="prog-course-icon">
                {summary ? <SlugIcon name={summary.icon} size={21} /> : <IconLesson size={21} />}
              </span>
              <span>
                <strong>{summary?.title ?? "Parcours archivé"}</strong>
                <small>
                  {course.completed_lessons} / {course.total_lessons} leçons · {course.passed_quizzes} / {course.total_quizzes} quiz · {course.status === "completed" ? "terminé" : "en cours"}
                </small>
              </span>
              <span className="prog-course-progress">
                <span>{course.progress_percentage} %</span>
                <ProgressBar value={course.progress_percentage} tone={course.status === "completed" ? "green" : "blue"} height="sm" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function LevelLadder({ levels, currentLevel }: { levels: LevelRow[]; currentLevel: number }) {
  return (
    <section className="prog-panel" aria-labelledby="prog-levels-title">
      <div className="prog-section-head">
        <div>
          <h2 id="prog-levels-title">Échelle des niveaux</h2>
          <p>Ta position dans la progression globale CyberPingo.</p>
        </div>
      </div>
      {levels.length === 0 ? (
        <p className="prog-empty">Aucun niveau disponible pour le moment.</p>
      ) : (
        <ol className="prog-level-list">
          {levels.map((level) => {
            const state = level.level === currentLevel ? "current" : level.level < currentLevel ? "done" : "locked";
            return (
              <li key={level.level} className={`prog-level-row is-${state}`}>
                <span className="prog-level-dot">{state === "done" ? <IconCheck size={15} /> : state === "locked" ? <IconLock size={15} /> : level.level}</span>
                <span>
                  <strong>Niveau {level.level} · {level.title}</strong>
                  <small>{formatNumber(level.required_xp)} XP requis</small>
                </span>
                <Badge tone={state === "current" ? "blue" : state === "done" ? "green" : "neutral"}>
                  {state === "current" ? "Actuel" : state === "done" ? "Atteint" : "À venir"}
                </Badge>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function BadgeGallery({ badges }: { badges: BadgeWithState[] }) {
  const earned = badges.filter((badge) => badge.earned);
  const locked = badges.filter((badge) => !badge.earned);
  return (
    <section className="prog-panel" aria-labelledby="prog-badges-title">
      <div className="prog-section-head">
        <div>
          <h2 id="prog-badges-title">Badges</h2>
          <p>{earned.length} gagné(s), {locked.length} encore à débloquer.</p>
        </div>
        <IconAward size={18} />
      </div>
      {badges.length === 0 ? (
        <p className="prog-empty">Aucun badge disponible pour le moment.</p>
      ) : (
        <div className="prog-badge-grid">
          {badges.map((badge) => (
            <article key={badge.id} className={`prog-badge ${badge.earned ? "is-earned" : "is-locked"}`}>
              <span className="prog-badge-icon">
                <SlugIcon name={badge.icon} size={22} />
              </span>
              <div>
                <div className="prog-badge-head">
                  <h3>{badge.name}</h3>
                  <Badge tone={badge.earned ? "green" : "neutral"}>{badge.earned ? "Gagné" : "Verrouillé"}</Badge>
                </div>
                <p>{badge.description}</p>
                <small>{badge.earned_at ? `Obtenu ${formatRelative(badge.earned_at)}` : badgeUnlockText(badge)}</small>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function CertificatesPanel({ certificates }: { certificates: Certificate[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload(certificate: Certificate) {
    setDownloadingId(certificate.id);
    setDownloadError(null);
    try {
      const url = await getCertificatePdfUrl(certificate);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setDownloadError(errorMessage(cause, "Le téléchargement du certificat a échoué."));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <section className="prog-panel" aria-labelledby="prog-certificates-title">
      <div className="prog-section-head">
        <div>
          <h2 id="prog-certificates-title">Certificats</h2>
          <p>Documents vérifiables publiquement et téléchargeables en PDF.</p>
        </div>
        <IconCertificate size={18} />
      </div>
      {downloadError && <p className="prog-inline-error" role="alert">{downloadError}</p>}
      {certificates.length === 0 ? (
        <p className="prog-empty">Aucun certificat obtenu pour le moment.</p>
      ) : (
        <div className="prog-certificate-list">
          {certificates.map((certificate) => (
            <article key={certificate.id} className="prog-certificate">
              <div>
                <h3>{certificate.course_title}</h3>
                <p>Délivré le {formatDate(certificate.issued_at)} · n° {certificate.certificate_number}</p>
                {certificate.revoked_at && <small>Révoqué le {formatDate(certificate.revoked_at)}.</small>}
              </div>
              <div className="prog-certificate-actions">
                <Link href={`/certificat/${certificate.verification_code}`} className="study-link">Vérifier</Link>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<IconDownload size={15} />}
                  loading={downloadingId === certificate.id}
                  disabled={Boolean(certificate.revoked_at)}
                  onClick={() => void handleDownload(certificate)}
                >
                  PDF
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function XpHistoryPanel({ data }: { data: ProgressionData }) {
  const xpReasons = Object.entries(data.stats.xp_by_reason).filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1]);
  return (
    <section className="prog-history-grid">
      <div className="prog-panel" aria-labelledby="prog-history-title">
        <div className="prog-section-head">
          <div>
            <h2 id="prog-history-title">Historique XP</h2>
            <p>Les derniers gains avec leur raison et leur date relative.</p>
          </div>
        </div>
        {data.history.length === 0 ? (
          <p className="prog-empty">Aucun gain d’XP pour le moment.</p>
        ) : (
          <div className="prog-xp-list">
            {data.history.map((transaction) => (
              <article key={transaction.id} className="prog-xp-row">
                <span className={transaction.amount >= 0 ? "is-positive" : "is-negative"}>
                  {transaction.amount >= 0 ? "+" : ""}
                  {formatNumber(transaction.amount)}
                </span>
                <div>
                  <strong>{xpReasonLabel(transaction.reason)}</strong>
                  <small>{transaction.label || "Activité CyberPingo"} · {formatRelative(transaction.created_at)}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="prog-panel" aria-labelledby="prog-reasons-title">
        <div className="prog-section-head">
          <div>
            <h2 id="prog-reasons-title">XP par raison</h2>
            <p>Ce qui contribue le plus à ton niveau.</p>
          </div>
        </div>
        {xpReasons.length === 0 ? (
          <p className="prog-empty">Aucune répartition disponible.</p>
        ) : (
          <div className="prog-reason-list">
            {xpReasons.map(([reason, amount]) => (
              <div key={reason} className="prog-reason-row">
                <div>
                  <span>{xpReasonLabel(reason)}</span>
                  <strong>{formatNumber(amount)} XP</strong>
                </div>
                <ProgressBar value={Math.round((amount / Math.max(1, data.stats.xp)) * 100)} tone="purple" height="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProgressionContent() {
  const { profile } = useLearner();
  const { data, error, loading, reload } = useAsync<ProgressionData>(async () => {
    const [stats, courses, catalog, history, levels, badges, certificates] = await Promise.all([
      getMyStats(),
      listMyCourseProgress(profile.id),
      listPublishedCourses(),
      listMyXpHistory(profile.id, 40),
      listLevels(),
      listBadgesWithState(profile.id),
      listMyCertificates(profile.id),
    ]);
    return { stats, courses, catalog, history, levels, badges, certificates };
  }, [profile.id]);

  if (loading) return <ProgressionLoading />;
  if (error) return <ErrorState message={error.message} reload={() => void reload()} />;
  if (!data) return <ErrorState message="Aucune donnée reçue." reload={() => void reload()} />;

  const attempts = data.stats.quiz_attempts || 0;
  const passRate = attempts ? Math.round((data.stats.quizzes_passed / attempts) * 100) : 0;
  const xpToNext = data.stats.level.next_level_xp ? Math.max(0, data.stats.level.next_level_xp - data.stats.xp) : null;

  return (
    <div className="prog-page">
      <header className="prog-hero">
        <div>
          <h1>Ta progression, {profile.display_name}</h1>
          <p>
            Tout ce que tu as gagné sur CyberPingo&nbsp;: niveaux, XP, rythme, badges, certificats et parcours actifs.
          </p>
        </div>
        <Link href="/parametres" className="study-button study-button--ghost">Objectif&nbsp;: {profile.daily_minutes} min / jour</Link>
      </header>

      <section className="prog-overview" aria-label="Résumé du niveau">
        <div className="prog-level-focus">
          <span>Niveau {data.stats.level.level}</span>
          <h2>{data.stats.level.title}</h2>
          <p>{formatNumber(data.stats.xp)} XP cumulés · {xpToNext === null ? "dernier palier atteint" : `${formatNumber(xpToNext)} XP avant ${data.stats.level.next_title}`}</p>
          <ProgressBar value={data.stats.level.progress_percentage} tone="blue" />
        </div>
        <div className="prog-overview-stats">
          <StatPill label="Parcours terminés" value={`${data.stats.courses_completed}/${data.stats.courses_started}`} icon={<IconLesson size={18} />} />
          <StatPill label="Temps d’étude" value={formatDuration(data.stats.study_minutes)} icon={<IconClock size={18} />} />
          <StatPill label="Série actuelle" value={`${data.stats.current_streak} j`} detail={`Record ${data.stats.longest_streak} j`} icon={<IconBolt size={18} />} />
        </div>
      </section>

      <section className="prog-stat-grid" aria-label="Statistiques détaillées">
        <StatPill label="Quiz réussis" value={`${data.stats.quizzes_passed}/${attempts}`} detail={`${passRate} % de réussite · score moyen ${data.stats.average_quiz_score} %`} icon={<IconTrophy size={18} />} />
        <StatPill label="Labs résolus" value={data.stats.labs_solved} icon={<IconTarget size={18} />} />
        <StatPill label="Badges" value={data.stats.badges} icon={<IconAward size={18} />} />
        <StatPill label="Certificats" value={data.stats.certificates} icon={<IconCertificate size={18} />} />
      </section>

      <ActivityChart activity={data.stats.activity} />
      <CourseProgressList courses={data.courses} catalog={data.catalog} />
      <XpHistoryPanel data={data} />
      <section className="prog-two-col">
        <LevelLadder levels={data.levels} currentLevel={data.stats.level.level} />
        <CertificatesPanel certificates={data.certificates} />
      </section>
      <BadgeGallery badges={data.badges} />
      <p className="prog-footnote">
        Niveau déclaré&nbsp;: {levelLabel(profile.skill_level)}. <Link className="study-link" href="/parametres">Modifier mon profil d’apprentissage</Link>
      </p>
    </div>
  );
}

export default function ProgressionPage() {
  return <AppShell><ProgressionContent /></AppShell>;
}
