"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SceneBanner from "@/components/art/SceneBanner";
import { useUser } from "@/context/UserContext";
import { isSuperadmin as roleIsSuperadmin, ROLE_LABELS } from "@/lib/roles";
import { formatDateTime, formatNumber, formatRelative, plural } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AdminOverview } from "@/types/api";
import Avatar from "@/components/ui/Avatar";
import {
  IconActivity, IconAward, IconBolt, IconCertificate, IconCheck, IconCourses, IconFlame, IconMail, IconProfile, IconShield, IconTerminal, IconUsers,
} from "@/components/ui/Icon";

type IconType = React.ComponentType<{ size?: number; className?: string }>;

interface RealProfile {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  role: string;
  level: number;
  xp: number;
  current_streak: number;
  created_at: string;
}

interface RealLab {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  xp_reward: number;
  status: string;
  format: string;
  cb_price?: number | null;
}

function Metric({
  label,
  value,
  detail,
  Icon,
  tone = "adm-tone-cyan",
  href,
}: {
  label: string;
  value: string;
  detail?: string;
  Icon: IconType;
  tone?: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="adm-metric-card__top">
        <span>{label}</span>
        <Icon size={17} className={tone} />
      </span>
      <span className="adm-metric-card__value">{value}</span>
      {detail && <span className="adm-metric-card__detail">{detail}</span>}
    </>
  );
  return href ? (
    <Link href={href} className="adm-metric-card">
      {content}
    </Link>
  ) : (
    <div className="adm-metric-card">{content}</div>
  );
}

const COURSE_STATUS_LABELS = {
  draft: "brouillon",
  review: "en relecture",
  published: "publié",
  archived: "archivé",
} as const;

export default function OverviewPanel({ overview }: { overview: AdminOverview | null }) {
  const { profile } = useUser();
  const isSuperadmin = roleIsSuperadmin(profile?.role);
  const [realProfiles, setRealProfiles] = useState<RealProfile[]>([]);
  const [realLabs, setRealLabs] = useState<RealLab[]>([]);
  const [loadingReal, setLoadingReal] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchPlatformData() {
      const supabase = getSupabaseBrowserClient();
      try {
        const [profilesRes, labsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, username, display_name, email, role, level, xp, current_streak, created_at")
            .order("created_at", { ascending: false })
            .limit(6),
          supabase
            .from("labs")
            .select("id, slug, title, category, difficulty, xp_reward, status, format, cb_price")
            .order("position")
            .limit(6),
        ]);

        if (!cancelled) {
          if (profilesRes.data) {
            setRealProfiles(profilesRes.data as RealProfile[]);
          }
          if (labsRes.data) {
            setRealLabs(labsRes.data as RealLab[]);
          }
        }
      } catch {
        // En cas d'erreur de requête
      } finally {
        if (!cancelled) {
          setLoadingReal(false);
        }
      }
    }

    void fetchPlatformData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!overview) {
    return (
      <div className="adm-metric-grid" aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="adm-skeleton h-32" />
        ))}
      </div>
    );
  }

  const maxSignup = Math.max(1, ...overview.signups_by_day.map((day) => day.count));
  const maxCourse = Math.max(1, ...overview.top_courses.map((course) => course.enrollments));
  const quickActions = [
    {
      href: "/admin/utilisateurs",
      label: "Comptes & Utilisateurs",
      detail: `${formatNumber(overview.users_total)} apprenants réels enregistrés`,
    },
    {
      href: "/admin/cours",
      label: "Gérer les cours",
      detail: `${formatNumber(overview.courses.draft)} brouillon${overview.courses.draft > 1 ? "s" : ""}`,
    },
    {
      href: "/admin/labs",
      label: "Catalogue des Labs",
      detail: `${formatNumber(overview.labs_published)} labs techniques opérationnels`,
    },
    {
      href: "/admin/messages",
      label: "Traiter les messages",
      detail: `${formatNumber(overview.messages_new)} nouveau${overview.messages_new > 1 ? "x" : ""}`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Executive Command Banner */}
      <SceneBanner variant="admin" className="adm-overview-hero">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              TÉLÉMÉTRIE TEMPS RÉEL
            </span>
            <span className="text-xs text-slate-400 font-mono">SUPABASE DB CONNECTÉE</span>
          </div>
          <h2 className="adm-page-title">Centre de Commandement & Sécurité</h2>
          <p className="adm-page-description">
            Supervision en direct de la plateforme CyberPingo, gestion des comptes apprenants réels, inventaire des labs pratiques et métriques d’exploitation.
          </p>
        </div>
        <div className="adm-overview-hero__stats" aria-label="Résumé opérationnel">
          <div className="adm-overview-hero__stat">
            <strong>{formatNumber(overview.users_total)}</strong>
            <span>comptes réels</span>
          </div>
          <div className="adm-overview-hero__stat">
            <strong>{formatNumber(overview.labs_published)}</strong>
            <span>labs actifs</span>
          </div>
          <div className="adm-overview-hero__stat">
            <strong>{formatNumber(overview.courses.published)}</strong>
            <span>cours publiés</span>
          </div>
          <div className="adm-overview-hero__stat">
            <strong>{formatNumber(overview.messages_new)}</strong>
            <span>messages</span>
          </div>
        </div>
      </SceneBanner>

      {/* Primary Metrics Grid */}
      <div className="adm-metric-grid">
        <Metric
          label="Comptes Utilisateurs"
          value={formatNumber(overview.users_total)}
          detail={`+${formatNumber(overview.new_users_7d)} sur 7 j · ${formatNumber(overview.staff_total)} staff`}
          Icon={IconUsers}
          href="/admin/utilisateurs"
        />
        <Metric
          label="Apprenants Actifs"
          value={formatNumber(overview.online_now)}
          detail={`${formatNumber(overview.active_24h)} actifs sur 24 h`}
          Icon={IconActivity}
          tone="adm-tone-green"
        />
        <Metric
          label="Labs Pratiques"
          value={formatNumber(overview.labs_published)}
          detail="Environnements techniques"
          Icon={IconTerminal}
          tone="adm-tone-cyan"
          href="/admin/labs"
        />
        <Metric
          label="Cours Disponibles"
          value={formatNumber(overview.courses.published)}
          detail={`${overview.courses.draft} brouillons · ${overview.courses.archived} archivés`}
          Icon={IconCourses}
          tone="adm-tone-violet"
          href="/admin/cours"
        />
        <Metric
          label="Leçons Terminées"
          value={formatNumber(overview.lessons_completed_total)}
          detail={`+${formatNumber(overview.lessons_completed_7d)} sur 7 j`}
          Icon={IconProfile}
          tone="adm-tone-cyan"
        />
        <Metric
          label="Quiz Validés (7j)"
          value={formatNumber(overview.quiz_attempts_7d)}
          detail={`${overview.average_quiz_score_7d} % de score moyen`}
          Icon={IconAward}
          tone="adm-tone-violet"
        />
        <Metric
          label="XP Distribués"
          value={formatNumber(overview.xp_awarded_7d)}
          detail="Progression globale 7j"
          Icon={IconBolt}
          tone="adm-tone-amber"
        />
        <Metric
          label="Certificats Décrochés"
          value={formatNumber(overview.certificates_total)}
          detail={`${formatNumber(overview.courses_completed_total)} parcours validés`}
          Icon={IconCertificate}
          tone="adm-tone-green"
          href="/admin/certificats"
        />
      </div>

      {/* Real Platform Accounts Section */}
      <section className="adm-panel">
        <div className="adm-panel__head">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="adm-section-title">Comptes Réels de la Plateforme</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Liste en direct des vrais utilisateurs inscrits dans la table <code>public.profiles</code> (aucun compte fictif).
            </p>
          </div>
          <Link href="/admin/utilisateurs" className="adm-text-link">
            Gérer tous les comptes ({overview.users_total}) →
          </Link>
        </div>

        {loadingReal ? (
          <div className="space-y-2 py-4">
            <div className="adm-skeleton h-12 w-full" />
            <div className="adm-skeleton h-12 w-full" />
            <div className="adm-skeleton h-12 w-full" />
          </div>
        ) : realProfiles.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-700/60 rounded-xl">
            <IconUsers size={32} className="mx-auto text-slate-500 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Aucun profil enregistré dans la base de données.</p>
            <p className="text-xs text-slate-500 mt-1">Les nouveaux comptes inscrits apparaîtront instantanément ici.</p>
          </div>
        ) : (
          <div className="adm-table-wrap mt-4">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>E-mail</th>
                  <th>Rôle</th>
                  <th>Niveau & XP</th>
                  <th>Série</th>
                  <th>Inscrit</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {realProfiles.map((user) => {
                  const roleLabel = ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role;
                  const isStaffMember = user.role === "admin" || user.role === "superadmin";

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={user.display_name || user.username || "Apprenant"} size="sm" ringTone="none" />
                          <div className="min-w-0">
                            <span className="block font-semibold text-white truncate max-w-[160px]">
                              {user.display_name || user.username || "Sans nom"}
                            </span>
                            <span className="block text-xs text-slate-400 truncate max-w-[160px]">
                              @{user.username || "anonyme"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-slate-300 font-mono truncate max-w-[200px]">
                        {user.email || "—"}
                      </td>
                      <td>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider",
                            user.role === "superadmin" && "bg-amber-500/15 text-amber-400 border border-amber-500/30",
                            user.role === "admin" && "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
                            !isStaffMember && "bg-slate-800 text-slate-400 border border-slate-700"
                          )}
                        >
                          {user.role === "superadmin" && "⚡ "}
                          {user.role === "admin" && "🛡️ "}
                          {roleLabel}
                        </span>
                      </td>
                      <td>
                        <div className="text-xs">
                          <span className="font-bold text-cyan-300">Niv. {user.level || 1}</span>
                          <span className="text-slate-400 ml-1.5 font-mono">({formatNumber(user.xp || 0)} XP)</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-xs text-amber-300 font-semibold">
                          <IconFlame size={13} className="text-amber-400" />
                          <span>{user.current_streak || 0} j</span>
                        </div>
                      </td>
                      <td className="text-xs text-slate-400 whitespace-nowrap">
                        {user.created_at ? formatRelative(user.created_at) : "—"}
                      </td>
                      <td>
                        <Link
                          href={`/admin/utilisateurs/${user.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 transition-colors"
                        >
                          Fiche →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Real Hands-on Labs Catalog Section */}
      <section className="adm-panel">
        <div className="adm-panel__head">
          <div>
            <div className="flex items-center gap-2">
              <IconTerminal size={18} className="text-cyan-400" />
              <h2 className="adm-section-title">Labs Pratiques & Environnements Réels</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Exercices techniques configurés dans <code>public.labs</code> avec vérification de drapeaux et correction SOC.
            </p>
          </div>
          <Link href="/admin/labs" className="adm-text-link">
            Gérer les labs ({overview.labs_published}) →
          </Link>
        </div>

        {loadingReal ? (
          <div className="grid gap-3 md:grid-cols-3 mt-4">
            <div className="adm-skeleton h-24" />
            <div className="adm-skeleton h-24" />
            <div className="adm-skeleton h-24" />
          </div>
        ) : realLabs.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-700/60 rounded-xl mt-4">
            <IconTerminal size={32} className="mx-auto text-slate-500 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Aucun lab technique pour le moment.</p>
          </div>
        ) : (
          <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3 mt-4">
            {realLabs.map((lab) => (
              <div
                key={lab.id}
                className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {lab.category}
                    </span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                        lab.status === "published"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      )}
                    >
                      {lab.status === "published" ? "Publié" : "Brouillon"}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm line-clamp-1 mb-1">{lab.title}</h3>
                  <p className="text-xs text-slate-400 font-mono truncate">/{lab.slug}</p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 capitalize">{lab.difficulty}</span>
                    <span className="text-slate-600">·</span>
                    <span className="font-bold text-amber-400 font-mono">+{lab.xp_reward} XP</span>
                  </div>
                  <Link
                    href={`/challenges/${lab.slug}`}
                    target="_blank"
                    className="text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    Tester ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Ops Actions */}
      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2 className="adm-section-title">Actions Rapides & Opérations</h2>
          {isSuperadmin && (
            <Link href="/admin/journal" className="adm-text-link">
              Ouvrir le journal d’audit
            </Link>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="adm-list-row p-4">
              <span className="block font-semibold text-white">{action.label}</span>
              <span className="mt-1 block text-sm adm-muted">{action.detail}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Activity Charts Grid */}
      <div className="adm-chart-grid">
        <section className="adm-chart-card" aria-labelledby="adm-signups-title">
          <div className="adm-panel__head">
            <h2 id="adm-signups-title" className="adm-section-title">
              Inscriptions sur 14 jours
            </h2>
            <span className="adm-muted text-sm">
              {formatNumber(overview.signups_by_day.reduce((sum, day) => sum + day.count, 0))} total
            </span>
          </div>
          <ol className="adm-bars">
            {overview.signups_by_day.map((day) => (
              <li key={day.date} className="adm-bar-item">
                <span className="adm-bar-value">{day.count}</span>
                <div
                  className="adm-bar"
                  style={{ height: `${Math.max(4, (day.count / maxSignup) * 100)}%` }}
                  role="img"
                  aria-label={`${day.count} inscription(s) le ${day.date}`}
                />
                <span className="adm-bar-label">
                  {new Date(`${day.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="adm-chart-card" aria-labelledby="adm-top-courses-title">
          <div className="adm-panel__head">
            <h2 id="adm-top-courses-title" className="adm-section-title">
              Top Cours
            </h2>
            <span className="adm-muted text-sm">Inscriptions</span>
          </div>
          {overview.top_courses.length === 0 ? (
            <p className="adm-muted mt-6 text-sm">Aucun cours disponible pour le moment.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {overview.top_courses.map((course, index) => (
                <li key={course.id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <Link
                      href={`/admin/cours/${course.id}`}
                      className="truncate font-semibold text-white hover:text-cyan-100"
                    >
                      <span className="mr-2 adm-muted">#{index + 1}</span>
                      {course.title}
                    </Link>
                    <span className="tabular-nums adm-muted">{formatNumber(course.enrollments)}</span>
                  </div>
                  <div className="adm-progress-track mt-2">
                    <div
                      className="adm-progress-fill"
                      style={{ width: `${(course.enrollments / maxCourse) * 100}%` }}
                    />
                  </div>
                  <p className="adm-muted mt-1 text-xs">
                    {formatNumber(course.completions)} {plural(course.completions, "complétion")} ·{" "}
                    {COURSE_STATUS_LABELS[course.status] ?? course.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}