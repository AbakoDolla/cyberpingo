"use client";

import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { IconActivity, IconAward, IconBolt, IconCertificate, IconLesson, IconTarget, IconTrophy } from "@/components/ui/Icon";
import { useLearner } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { formatDateTime, formatDuration, formatNumber, formatShortDate, levelLabel } from "@/lib/format";
import { listMyCourseProgress, listPublishedCourses } from "@/services/courses.service";
import { getMyStats, listLevels, listMyXpHistory } from "@/services/gamification.service";
import type { CourseProgress, CourseSummary, LearnerStats, XpReason } from "@/types/api";

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
};

function xpReasonLabel(reason: string) {
  return XP_REASON_LABELS[reason as XpReason] ?? reason;
}

function ProgressionLoading() {
  return <div className="study-page" aria-busy="true"><div className="h-9 w-80 rounded-lg bg-white/[0.04] animate-pulse" /><div className="mt-8 grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 rounded-xl2 bg-white/[0.04] animate-pulse" />)}</div><div className="mt-6 h-72 rounded-xl2 bg-white/[0.04] animate-pulse" /></div>;
}

function ErrorState({ message, reload }: { message: string; reload: () => void }) {
  return <div className="study-page"><Card className="border-cyber-red/30 bg-cyber-red/10"><h1 className="font-display text-2xl font-semibold">Impossible de charger ta progression.</h1><p className="mt-3 text-sm text-red-100">{message}</p><Button type="button" variant="secondary" className="mt-5" onClick={reload}>Réessayer</Button></Card></div>;
}

function StatCard({ label, value, detail, icon, tone = "blue" }: { label: string; value: string | number; detail?: string; icon: React.ReactNode; tone?: "blue" | "green" | "purple" | "neutral" }) {
  const color = tone === "green" ? "text-cyber-green bg-cyber-green/10" : tone === "purple" ? "text-neon-purple bg-neon-purple/10" : tone === "neutral" ? "text-white/80 bg-white/5" : "text-cyber-blue bg-cyber-blue/10";
  return <Card className="p-5"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>{icon}</div><p className="font-display text-3xl font-bold tabular-nums">{value}</p><p className="mt-1 text-sm text-white/60">{label}</p>{detail && <p className="mt-2 text-xs text-white/35">{detail}</p>}</Card>;
}

function ActivityChart({ activity }: { activity: LearnerStats["activity"] }) {
  const maxXp = Math.max(1, ...activity.map((day) => day.xp));
  return <Card><div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Activité récente</h2><IconActivity size={18} className="text-cyber-blue" /></div>{activity.length === 0 ? <p className="study-empty px-0 pb-0">Aucune activité enregistrée pour le moment.</p> : <div className="mt-6 grid grid-cols-10 gap-1 sm:grid-cols-15 md:grid-cols-30" aria-label="Activité quotidienne">{activity.map((day) => {
    const opacity = Math.max(0.15, day.xp / maxXp);
    return <div key={day.date} className="h-10 rounded-md border border-white/5 bg-cyber-blue" style={{ opacity }} title={`${formatShortDate(day.date)} · ${day.xp} XP · ${day.lessons} leçon(s) · ${day.quizzes} quiz · ${day.labs} lab(s) · ${day.minutes} min`} />;
  })}</div>}</Card>;
}

function CourseProgressList({ courses, catalog }: { courses: CourseProgress[]; catalog: CourseSummary[] }) {
  const byId = new Map(catalog.map((course) => [course.id, course]));
  if (courses.length === 0) {
    return <Card className="text-center"><h2 className="font-display text-xl font-semibold">Aucun parcours démarré.</h2><p className="mt-2 text-sm text-white/55">Commence ton premier parcours pour suivre tes leçons, quiz et certificats ici.</p><Link href="/courses" className="study-button mt-4">Commencer un parcours</Link></Card>;
  }
  return <Card><h2 className="font-display text-xl font-semibold">Mes parcours</h2><div className="mt-4 divide-y divide-white/10">{courses.map((course) => {
    const summary = byId.get(course.course_id);
    return <Link key={course.course_id} href={summary ? `/courses/${summary.slug}` : "/courses"} className="grid gap-3 py-4 transition-colors hover:text-cyber-blue md:grid-cols-[1.2fr_.8fr] md:items-center"><div><h3 className="font-display font-semibold">{summary?.title ?? "Parcours archivé"}</h3><p className="mt-1 text-sm text-white/55">{course.completed_lessons} / {course.total_lessons} leçons · {course.passed_quizzes} / {course.total_quizzes} quiz · {course.status === "completed" ? "terminé" : "en cours"}</p></div><div><div className="mb-1 flex items-center justify-between text-xs text-white/45"><span>Progression</span><span>{course.progress_percentage} %</span></div><ProgressBar value={course.progress_percentage} tone={course.status === "completed" ? "green" : "blue"} height="sm" /></div></Link>;
  })}</div></Card>;
}

function LevelLadder({ levels, currentLevel }: { levels: LevelRow[]; currentLevel: number }) {
  return <Card><h2 className="font-display text-xl font-semibold">Échelle des niveaux</h2>{levels.length === 0 ? <p className="study-empty px-0 pb-0">Aucun niveau disponible pour le moment.</p> : <ol className="mt-5 space-y-3">{levels.map((level) => <li key={level.level} className={`flex items-center justify-between rounded-xl border p-3 ${level.level === currentLevel ? "border-cyber-blue/50 bg-cyber-blue/10" : level.level < currentLevel ? "border-cyber-green/20 bg-cyber-green/5" : "border-white/10 bg-white/[0.02]"}`}><div><p className="font-medium">Niveau {level.level} · {level.title}</p><p className="text-xs text-white/45">{formatNumber(level.required_xp)} XP requis</p></div>{level.level === currentLevel ? <Badge tone="blue">Actuel</Badge> : level.level < currentLevel ? <Badge tone="green">Atteint</Badge> : <Badge>À venir</Badge>}</li>)}</ol>}</Card>;
}

function ProgressionContent() {
  const { profile } = useLearner();
  const { data, error, loading, reload } = useAsync<ProgressionData>(async () => {
    const [stats, courses, catalog, history, levels] = await Promise.all([
      getMyStats(),
      listMyCourseProgress(profile.id),
      listPublishedCourses(),
      listMyXpHistory(profile.id, 40),
      listLevels(),
    ]);
    return { stats, courses, catalog, history, levels };
  }, [profile.id]);

  if (loading) return <ProgressionLoading />;
  if (error) return <ErrorState message={error.message} reload={() => void reload()} />;
  if (!data) return <ErrorState message="Aucune donnée reçue." reload={() => void reload()} />;

  const attempts = data.stats.quiz_attempts || 0;
  const passRate = attempts ? Math.round((data.stats.quizzes_passed / attempts) * 100) : 0;
  const xpReasons = Object.entries(data.stats.xp_by_reason).filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1]);

  return <div className="study-page space-y-6">
    <header className="study-heading"><p className="text-[11px] uppercase tracking-[0.2em] text-cyber-blue">Ma progression</p><h1>Chaque pas compte, {profile.display_name}.</h1><p>Retrouve tes acquis, tes meilleurs scores et ton historique XP à partir des données Supabase de ton compte.</p></header>

    <section className="study-overview"><div><p className="text-cyber-blue">Niveau {data.stats.level.level} · {data.stats.level.title}</p><h2>{formatNumber(data.stats.xp)} XP</h2><p>{data.stats.level.next_level_xp ? `${formatNumber(data.stats.level.next_level_xp - data.stats.xp)} XP avant ${data.stats.level.next_title}` : "Tu as atteint le dernier palier."}</p><ProgressBar value={data.stats.level.progress_percentage} tone="blue" /></div><dl><div><dt>Parcours</dt><dd>{data.stats.courses_completed} / {data.stats.courses_started}</dd></div><div><dt>Leçons</dt><dd>{data.stats.lessons_completed}</dd></div><div><dt>Série</dt><dd>{data.stats.current_streak} j</dd></div><div><dt>Temps d’étude</dt><dd>{formatDuration(data.stats.study_minutes)}</dd></div></dl></section>

    <section className="grid gap-4 md:grid-cols-4" aria-label="Statistiques détaillées"><StatCard label="Quiz réussis" value={`${data.stats.quizzes_passed}/${attempts}`} detail={`${passRate} % de réussite · score moyen ${data.stats.average_quiz_score} %`} icon={<IconTrophy size={18} />} tone="green" /><StatCard label="Labs résolus" value={data.stats.labs_solved} icon={<IconTarget size={18} />} tone="purple" /><StatCard label="Badges" value={data.stats.badges} detail={`${data.stats.certificates} certificat(s)`} icon={<IconAward size={18} />} /><StatCard label="Jours actifs" value={data.stats.active_days} detail={`Record : ${data.stats.longest_streak} j`} icon={<IconBolt size={18} />} tone="neutral" /></section>

    <ActivityChart activity={data.stats.activity} />
    <CourseProgressList courses={data.courses} catalog={data.catalog} />

    <section className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
      <Card><h2 className="font-display text-xl font-semibold">Historique XP</h2>{data.history.length === 0 ? <p className="study-empty px-0 pb-0">Aucun gain d’XP pour le moment.</p> : <div className="mt-4 divide-y divide-white/10">{data.history.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-medium">{xpReasonLabel(transaction.reason)}</p><p className="text-xs text-white/45">{transaction.label || "Activité CyberPingo"} · {formatDateTime(transaction.created_at)}</p></div><strong className={transaction.amount >= 0 ? "text-cyber-green" : "text-cyber-red"}>{transaction.amount >= 0 ? "+" : ""}{formatNumber(transaction.amount)} XP</strong></div>)}</div>}</Card>
      <Card><h2 className="font-display text-xl font-semibold">XP par raison</h2>{xpReasons.length === 0 ? <p className="study-empty px-0 pb-0">Aucune répartition disponible.</p> : <div className="mt-5 space-y-4">{xpReasons.map(([reason, amount]) => <div key={reason}><div className="mb-1 flex justify-between text-sm"><span>{xpReasonLabel(reason)}</span><span className="text-white/55">{formatNumber(amount)} XP</span></div><ProgressBar value={Math.round((amount / Math.max(1, data.stats.xp)) * 100)} tone="purple" height="sm" /></div>)}</div>}</Card>
    </section>

    <LevelLadder levels={data.levels} currentLevel={data.stats.level.level} />
    <p className="text-sm text-slate-300">Objectif personnel : {profile.daily_minutes} min par jour. <Link className="study-link" href="/parametres">Modifier mon objectif</Link></p>
  </div>;
}

export default function ProgressionPage() {
  return <AppShell><ProgressionContent /></AppShell>;
}