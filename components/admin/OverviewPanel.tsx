"use client";

import Link from "next/link";
import SceneBanner from "@/components/art/SceneBanner";
import { formatNumber, plural } from "@/lib/format";
import type { AdminOverview } from "@/types/api";
import { IconActivity, IconAward, IconBolt, IconCertificate, IconCourses, IconMail, IconProfile, IconUsers } from "@/components/ui/Icon";

type IconType = React.ComponentType<{ size?: number; className?: string }>;

function Metric({ label, value, detail, Icon, tone = "adm-tone-cyan", href }: { label: string; value: string; detail?: string; Icon: IconType; tone?: string; href?: string }) {
  const content = (
    <>
      <span className="adm-metric-card__top"><span>{label}</span><Icon size={17} className={tone} /></span>
      <span className="adm-metric-card__value">{value}</span>
      {detail && <span className="adm-metric-card__detail">{detail}</span>}
    </>
  );
  return href ? <Link href={href} className="adm-metric-card">{content}</Link> : <div className="adm-metric-card">{content}</div>;
}

const COURSE_STATUS_LABELS = { draft: "brouillon", review: "en relecture", published: "publié", archived: "archivé" } as const;

export default function OverviewPanel({ overview }: { overview: AdminOverview | null }) {
  if (!overview) {
    return (
      <div className="adm-metric-grid" aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="adm-skeleton h-32" />)}
      </div>
    );
  }
  const maxSignup = Math.max(1, ...overview.signups_by_day.map((day) => day.count));
  const maxCourse = Math.max(1, ...overview.top_courses.map((course) => course.enrollments));
  const quickActions = [
    { href: "/admin/cours", label: "Gérer les cours", detail: `${formatNumber(overview.courses.draft)} brouillon${overview.courses.draft > 1 ? "s" : ""}` },
    { href: "/admin/messages", label: "Traiter les messages", detail: `${formatNumber(overview.messages_new)} nouveau${overview.messages_new > 1 ? "x" : ""}` },
    { href: "/admin/import", label: "Importer un parcours", detail: "Créer un brouillon depuis un contenu" },
  ];
  return <div className="space-y-6">
    <SceneBanner variant="admin" className="adm-overview-hero">
      <div>
        <h2 className="adm-page-title">Pilotage en direct</h2>
        <p className="adm-page-description">Surveille la cadence des inscriptions, les contenus publiés et les signaux d’exploitation depuis une vue unique pensée pour l’équipe.</p>
      </div>
      <div className="adm-overview-hero__stats" aria-label="Résumé opérationnel">
        <div className="adm-overview-hero__stat"><strong>{formatNumber(overview.users_total)}</strong><span>comptes</span></div>
        <div className="adm-overview-hero__stat"><strong>{formatNumber(overview.courses.published)}</strong><span>cours publiés</span></div>
        <div className="adm-overview-hero__stat"><strong>{formatNumber(overview.messages_new)}</strong><span>messages neufs</span></div>
      </div>
    </SceneBanner>
    <div className="adm-metric-grid">
      <Metric label="Comptes" value={formatNumber(overview.users_total)} detail={`+${formatNumber(overview.new_users_7d)} sur 7 j · ${formatNumber(overview.staff_total)} staff`} Icon={IconUsers} href="/admin/utilisateurs" />
      <Metric label="En ligne" value={formatNumber(overview.online_now)} detail={`${formatNumber(overview.active_24h)} actifs sur 24 h`} Icon={IconActivity} tone="adm-tone-green" />
      <Metric label="Cours publiés" value={formatNumber(overview.courses.published)} detail={`${overview.courses.draft} brouillons · ${overview.courses.archived} archivés`} Icon={IconCourses} tone="adm-tone-violet" href="/admin/cours" />
      <Metric label="Nouveaux messages" value={formatNumber(overview.messages_new)} detail="Boîte de réception" Icon={IconMail} tone={overview.messages_new ? "adm-tone-red" : "adm-tone-muted"} href="/admin/messages" />
      <Metric label="Leçons terminées" value={formatNumber(overview.lessons_completed_total)} detail={`+${formatNumber(overview.lessons_completed_7d)} sur 7 j`} Icon={IconProfile} tone="adm-tone-cyan" />
      <Metric label="Quiz cette semaine" value={formatNumber(overview.quiz_attempts_7d)} detail={`${overview.average_quiz_score_7d} % de score moyen`} Icon={IconAward} tone="adm-tone-violet" />
      <Metric label="XP distribués" value={formatNumber(overview.xp_awarded_7d)} detail="7 derniers jours" Icon={IconBolt} tone="adm-tone-amber" />
      <Metric label="Certificats valides" value={formatNumber(overview.certificates_total)} detail={`${formatNumber(overview.courses_completed_total)} parcours terminés`} Icon={IconCertificate} tone="adm-tone-green" href="/admin/certificats" />
    </div>
    <section className="adm-panel">
      <div className="adm-panel__head">
        <h2 className="adm-section-title">Actions rapides</h2>
        <Link href="/admin/journal" className="adm-text-link">Ouvrir le journal</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="adm-list-row p-4">
            <span className="block font-semibold text-white">{action.label}</span>
            <span className="mt-1 block text-sm adm-muted">{action.detail}</span>
          </Link>
        ))}
      </div>
    </section>
    <div className="adm-chart-grid">
      <section className="adm-chart-card" aria-labelledby="adm-signups-title">
        <div className="adm-panel__head">
          <h2 id="adm-signups-title" className="adm-section-title">Inscriptions sur 14 jours</h2>
          <span className="adm-muted text-sm">{formatNumber(overview.signups_by_day.reduce((sum, day) => sum + day.count, 0))} total</span>
        </div>
        <ol className="adm-bars">
          {overview.signups_by_day.map((day) => (
            <li key={day.date} className="adm-bar-item">
              <span className="adm-bar-value">{day.count}</span>
              <div className="adm-bar" style={{ height: `${Math.max(4, (day.count / maxSignup) * 100)}%` }} role="img" aria-label={`${day.count} inscription(s) le ${day.date}`} />
              <span className="adm-bar-label">{new Date(`${day.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="adm-chart-card" aria-labelledby="adm-top-courses-title">
        <div className="adm-panel__head">
          <h2 id="adm-top-courses-title" className="adm-section-title">Top cours</h2>
          <span className="adm-muted text-sm">Inscriptions</span>
        </div>
        {overview.top_courses.length === 0 ? <p className="adm-muted mt-6 text-sm">Aucun cours disponible pour le moment.</p> : (
          <ul className="mt-6 space-y-4">
            {overview.top_courses.map((course, index) => (
              <li key={course.id}>
                <div className="flex justify-between gap-3 text-sm">
                  <Link href={`/admin/cours/${course.id}`} className="truncate font-semibold text-white hover:text-cyan-100">
                    <span className="mr-2 adm-muted">#{index + 1}</span>{course.title}
                  </Link>
                  <span className="tabular-nums adm-muted">{formatNumber(course.enrollments)}</span>
                </div>
                <div className="adm-progress-track mt-2"><div className="adm-progress-fill" style={{ width: `${(course.enrollments / maxCourse) * 100}%` }} /></div>
                <p className="adm-muted mt-1 text-xs">{formatNumber(course.completions)} {plural(course.completions, "complétion")} · {COURSE_STATUS_LABELS[course.status] ?? course.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  </div>;
}