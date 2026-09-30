"use client";

import { formatNumber } from "@/lib/format";
import type { AdminOverview } from "@/types/api";
import Card from "@/components/ui/Card";
import { IconActivity, IconAward, IconBolt, IconCertificate, IconCourses, IconMail, IconProfile, IconUsers } from "@/components/ui/Icon";

type IconType = React.ComponentType<{ size?: number; className?: string }>;

function Metric({ label, value, detail, Icon, tone = "text-cyber-blue", onClick }: { label: string; value: string; detail?: string; Icon: IconType; tone?: string; onClick?: () => void }) {
  const content = <><span className="flex items-center justify-between text-xs text-white/55"><span>{label}</span><Icon size={16} className={tone} /></span><span className={`mt-2 block font-display text-3xl font-bold tabular-nums ${tone}`}>{value}</span>{detail && <span className="mt-1 block text-[11px] text-white/40">{detail}</span>}</>;
  const cls = "rounded-xl border border-white/5 bg-dark-navy p-4 text-left";
  return onClick ? <button type="button" onClick={onClick} className={`${cls} transition-colors hover:border-white/15`}>{content}</button> : <div className={cls}>{content}</div>;
}

export default function OverviewPanel({ overview, onOpenMessages, onOpenLearners }: { overview: AdminOverview | null; onOpenMessages?: () => void; onOpenLearners?: () => void }) {
  if (!overview) return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-28 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>;
  const maxSignup = Math.max(1, ...overview.signups_by_day.map((day) => day.count));
  const maxCourse = Math.max(1, ...overview.top_courses.map((course) => course.enrollments));
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Comptes" value={formatNumber(overview.users_total)} detail={`+${formatNumber(overview.new_users_7d)} sur 7 j · ${formatNumber(overview.staff_total)} staff`} Icon={IconUsers} onClick={onOpenLearners} />
      <Metric label="En ligne" value={formatNumber(overview.online_now)} detail={`${formatNumber(overview.active_24h)} actifs sur 24 h`} Icon={IconActivity} tone="text-cyber-green" />
      <Metric label="Cours publiés" value={formatNumber(overview.courses.published)} detail={`${overview.courses.draft} brouillons · ${overview.courses.archived} archivés`} Icon={IconCourses} tone="text-neon-purple" />
      <Metric label="Nouveaux messages" value={formatNumber(overview.messages_new)} detail="Boîte de réception" Icon={IconMail} tone={overview.messages_new ? "text-cyber-red" : "text-white/60"} onClick={onOpenMessages} />
      <Metric label="Leçons terminées" value={formatNumber(overview.lessons_completed_total)} detail={`+${formatNumber(overview.lessons_completed_7d)} sur 7 j`} Icon={IconProfile} tone="text-white" />
      <Metric label="Quiz cette semaine" value={formatNumber(overview.quiz_attempts_7d)} detail={`${overview.average_quiz_score_7d} % de score moyen`} Icon={IconAward} tone="text-neon-purple" />
      <Metric label="XP distribués" value={formatNumber(overview.xp_awarded_7d)} detail="7 derniers jours" Icon={IconBolt} tone="text-cyber-yellow" />
      <Metric label="Certificats valides" value={formatNumber(overview.certificates_total)} detail={`${formatNumber(overview.courses_completed_total)} parcours terminés`} Icon={IconCertificate} tone="text-cyber-green" />
    </div>
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><div className="flex items-baseline justify-between"><h2 className="font-display font-semibold">Inscriptions — 14 jours</h2><span className="text-xs text-white/45">{formatNumber(overview.signups_by_day.reduce((s, d) => s + d.count, 0))} total</span></div><ol className="mt-6 flex h-40 items-end gap-2">{overview.signups_by_day.map((day, index) => <li key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[11px] text-white/55 tabular-nums">{day.count}</span><div className="w-full rounded-t-md bg-gradient-to-t from-cyber-blue/30 to-cyber-blue" style={{ height: `${Math.max(4, (day.count / maxSignup) * 100)}%` }} role="img" aria-label={`${day.count} inscription(s) le ${day.date}`} /><span className="text-[10px] text-white/35">{new Date(`${day.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span></li>)}</ol></Card>
      <Card><div className="flex items-baseline justify-between"><h2 className="font-display font-semibold">Top cours</h2><span className="text-xs text-white/45">Inscriptions</span></div>{overview.top_courses.length === 0 ? <p className="mt-6 text-sm text-white/45">Aucun cours disponible pour le moment.</p> : <ul className="mt-6 space-y-4">{overview.top_courses.map((course, index) => <li key={course.id}><div className="flex justify-between gap-3 text-sm"><span className="truncate"><span className="mr-2 text-white/35">#{index + 1}</span>{course.title}</span><span className="tabular-nums text-white/55">{course.enrollments}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-cyber-green" style={{ width: `${(course.enrollments / maxCourse) * 100}%` }} /></div><p className="mt-1 text-[11px] text-white/35">{course.completions} complétion(s) · {course.status}</p></li>)}</ul>}</Card>
    </div>
  </div>;
}