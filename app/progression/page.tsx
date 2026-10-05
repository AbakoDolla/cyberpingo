"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import BadgeMedal from "@/components/art/BadgeMedal";
import EmptyArt from "@/components/art/EmptyArt";
import SceneBanner from "@/components/art/SceneBanner";
import { badgeTierFromXp } from "@/components/art/shared";
import RankProgress from "@/components/academy/RankProgress";
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
import { RARITY_LABELS, badgeCondition } from "@/lib/academy-view";
import { useTranslation } from "@/lib/i18n";
import { PLATFORM_LEVELS, localizeRankTitle } from "@/lib/levels";
import { RankBadge } from "@/components/levels/RankBadge";
import { getMyAcademy } from "@/services/academy.service";
import { listMyCourseProgress, listPublishedCourses } from "@/services/courses.service";
import {
  getCertificatePdfUrl,
  getMyStats,
  listBadgesWithState,
  listLevels,
  listMyCertificates,
  listMyXpHistory,
} from "@/services/gamification.service";
import type { Academy, BadgeWithState, Certificate, CourseProgress, CourseSummary, LearnerStats, XpReason } from "@/types/api";

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



type LevelRow = Awaited<ReturnType<typeof listLevels>>[number];
type ProgressionData = {
  stats: LearnerStats;
  courses: CourseProgress[];
  catalog: CourseSummary[];
  history: Awaited<ReturnType<typeof listMyXpHistory>>;
  levels: LevelRow[];
  badges: BadgeWithState[];
  certificates: Certificate[];
  academy: Academy | null;
};

function xpReasonLabel(reason: string) {
  return XP_REASON_LABELS[reason as XpReason] ?? reason;
}

type BadgeNames = { labs: Map<string, string>; skills: Map<string, string> };

function badgeNamesFrom(academy: Academy | null): BadgeNames {
  const labs = new Map<string, string>();
  const skills = new Map<string, string>();
  for (const skill of academy?.skills ?? []) {
    skills.set(skill.id, skill.name);
    for (const link of skill.links) if (link.kind === "practice" || link.kind === "validation") labs.set(link.id, link.title);
  }
  return { labs, skills };
}

function badgeConditionText(badge: BadgeWithState, names: BadgeNames) {
  return badgeCondition(badge, {
    labTitle: badge.criteria_lab_id ? names.labs.get(badge.criteria_lab_id) : null,
    skillName: badge.criteria_skill_id ? names.skills.get(badge.criteria_skill_id) : null,
  });
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
        <div className="prog-empty prog-empty--art"><EmptyArt kind="activity" /><p>Aucune activité enregistrée pour le moment.</p></div>
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
        <EmptyArt kind="courses" />
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
  const { lang } = useTranslation();
  const isEn = lang === "en";
  const displayLevels = levels.length >= 20 ? levels : PLATFORM_LEVELS.map(pl => ({
    level: pl.level,
    required_xp: pl.required_xp,
    title: isEn ? pl.title_en : pl.title_fr,
  }));

  return (
    <section className="prog-panel" aria-labelledby="prog-levels-title">
      <div className="prog-section-head">
        <div>
          <h2 id="prog-levels-title">{isEn ? "Rank Ladder & Heraldry" : "Échelle des Rangs & Héraldique"}</h2>
          <p>{isEn ? "Your standing in the challenging CyberPingo progression. Every rank is earned." : "Ta position dans la progression exigeante CyberPingo. Chaque niveau est mérité."}</p>
        </div>
      </div>
      <ol className="prog-level-list space-y-3">
        {displayLevels.map((level) => {
          const state = level.level === currentLevel ? "current" : level.level < currentLevel ? "done" : "locked";
          const localizedTitle = localizeRankTitle(level.level, isEn ? "en" : "fr");
          return (
            <li key={level.level} className={`prog-level-row is-${state} flex items-center justify-between p-3 rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-sm transition-all hover:border-cyan-500/40`}>
              <div className="flex items-center gap-3 min-w-0">
                <RankBadge level={level.level} size="sm" />
                <div className="min-w-0">
                  <strong className="block text-sm font-bold text-white truncate">
                    {isEn ? `Rank ${level.level}` : `Niveau ${level.level}`} · {localizedTitle}
                  </strong>
                  <small className="text-xs text-slate-400 font-mono">
                    {formatNumber(level.required_xp)} XP {isEn ? "required" : "requis"}
                  </small>
                </div>
              </div>
              <Badge tone={state === "current" ? "blue" : state === "done" ? "green" : "neutral"}>
                {state === "current" ? (isEn ? "Current" : "Actuel") : state === "done" ? (isEn ? "Achieved" : "Atteint") : (isEn ? "Locked" : "À venir")}
              </Badge>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function BadgeGallery({ badges, names }: { badges: BadgeWithState[]; names: BadgeNames }) {
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
        <div className="prog-empty prog-empty--art"><EmptyArt kind="badges" /><p>Aucun badge disponible pour le moment.</p></div>
      ) : (
        <div className="prog-badge-grid">
          {badges.map((badge) => (
            <article key={badge.id} className={`prog-badge ${badge.earned ? "is-earned" : "is-locked"}`}>
              <span className="prog-badge-icon">
                <BadgeMedal icon={badge.icon} earned={badge.earned} tier={badgeTierFromXp(badge.xp_reward)} size={64} />
              </span>
              <div>
                <div className="prog-badge-head">
                  <h3>{badge.name}</h3>
                  <Badge tone={badge.earned ? "green" : "neutral"}>{badge.earned ? "Gagné" : "Verrouillé"}</Badge>
                </div>
                <p>{badge.description}</p>
                <small>{badge.earned_at ? `Obtenu ${formatRelative(badge.earned_at)}` : badgeConditionText(badge, names)}</small>
                <details className="prog-badge-detail">
                  <summary>Détails</summary>
                  <dl>
                    <div><dt>Rareté</dt><dd>{RARITY_LABELS[badge.rarity]}</dd></div>
                    <div><dt>Condition</dt><dd>{badgeConditionText(badge, names)}</dd></div>
                    <div><dt>Récompense</dt><dd>{formatNumber(badge.xp_reward)} XP</dd></div>
                    <div><dt>Statut</dt><dd>{badge.earned_at ? `Obtenu le ${formatDate(badge.earned_at)}` : "Pas encore obtenu"}</dd></div>
                  </dl>
                </details>
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
  const { lang } = useTranslation();
  const isEn = lang === "en";
  const { data, error, loading, reload } = useAsync<ProgressionData>(async () => {
    const [stats, courses, catalog, history, levels, badges, certificates, academy] = await Promise.all([
      getMyStats(),
      listMyCourseProgress(profile.id),
      listPublishedCourses(),
      listMyXpHistory(profile.id, 40),
      listLevels(),
      listBadgesWithState(profile.id),
      listMyCertificates(profile.id),
      getMyAcademy().catch(() => null),
    ]);
    return { stats, courses, catalog, history, levels, badges, certificates, academy };
  }, [profile.id]);

  if (loading) return <ProgressionLoading />;
  if (error) return <ErrorState message={error.message} reload={() => void reload()} />;
  if (!data) return <ErrorState message="Aucune donnée reçue." reload={() => void reload()} />;

  const attempts = data.stats.quiz_attempts || 0;
  const passRate = attempts ? Math.round((data.stats.quizzes_passed / attempts) * 100) : 0;
  const xpToNext = data.stats.level.next_level_xp ? Math.max(0, data.stats.level.next_level_xp - data.stats.xp) : null;

  return (
    <div className="prog-page">
      <header>
        <SceneBanner variant="progression" className="prog-hero">
          <div>
            <h1>Ta progression, {profile.display_name}</h1>
            <p>
              Tout ce que tu as gagné sur CyberPingo&nbsp;: niveaux, XP, rythme, badges, certificats et parcours actifs.
            </p>
          </div>
          <Link href="/parametres" className="study-button study-button--ghost">Objectif&nbsp;: {profile.daily_minutes} min / jour</Link>
        </SceneBanner>
      </header>

      <section className="prog-overview" aria-label="Résumé du niveau">
        <div className="prog-level-focus flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
          <RankBadge level={data.stats.level.level} size="xl" showLabel showTierBadge />
          <div className="flex-1 w-full text-center sm:text-left">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">{isEn ? `Rank ${data.stats.level.level}` : `Niveau ${data.stats.level.level}`}</span>
            <h2 className="text-2xl font-black text-white">{localizeRankTitle(data.stats.level.level, isEn ? "en" : "fr")}</h2>
            <p className="text-sm text-slate-300 mt-1 mb-3">
              {formatNumber(data.stats.xp)} XP {isEn ? "earned" : "cumulés"} · {xpToNext === null ? (isEn ? "maximum rank tier reached" : "dernier palier atteint") : `${formatNumber(xpToNext)} XP ${isEn ? "before" : "avant"} ${localizeRankTitle(data.stats.level.next_level ?? 0, isEn ? "en" : "fr")}`}
            </p>
            <ProgressBar value={data.stats.level.progress_percentage} tone="blue" />
          </div>
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

      {data.academy && (
        <section className="prog-panel" aria-labelledby="prog-rank-title">
          <div className="prog-section-head">
            <div>
              <h2 id="prog-rank-title">Grade et compétences</h2>
              <p>Ton grade dépend de ta pratique réelle, pas seulement de ton XP.</p>
            </div>
            <Link href="/competences" className="study-link">Voir mes compétences</Link>
          </div>
          <RankProgress academy={data.academy} />
        </section>
      )}
      <ActivityChart activity={data.stats.activity} />
      <CourseProgressList courses={data.courses} catalog={data.catalog} />
      <XpHistoryPanel data={data} />
      <section className="prog-two-col">
        <LevelLadder levels={data.levels} currentLevel={data.stats.level.level} />
        <CertificatesPanel certificates={data.certificates} />
      </section>
      <BadgeGallery badges={data.badges} names={badgeNamesFrom(data.academy)} />
      <p className="prog-footnote">
        Niveau déclaré&nbsp;: {levelLabel(profile.skill_level)}. <Link className="study-link" href="/parametres">Modifier mon profil d’apprentissage</Link>
      </p>
    </div>
  );
}

export default function ProgressionPage() {
  return <AppShell><ProgressionContent /></AppShell>;
}
