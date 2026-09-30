"use client";

import { cn } from "@/lib/utils";
import { courseTitle } from "@/lib/page-labels";
import type { AdminOverview } from "@/types/database";
import {
  IconProfile, IconActivity, IconLesson, IconBolt, IconShield, IconSend, IconCourses, IconAward,
} from "@/components/ui/Icon";

type IconType = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

function Metric({ label, value, detail, Icon, accent, onClick }: {
  label: string; value: string; detail?: string; Icon: IconType; accent: string; onClick?: () => void;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between">
        <span className="text-xs text-white/55">{label}</span>
        <Icon size={15} strokeWidth={1.7} className={accent} />
      </span>
      <span className={cn("block font-display text-3xl font-bold tabular-nums mt-2", accent)}>{value}</span>
      {detail && <span className="block text-[11px] text-white/40 mt-1">{detail}</span>}
    </>
  );
  const shell = "block w-full text-left bg-dark-navy border border-white/5 rounded-xl p-4";
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(shell, "transition-colors hover:border-white/15 focus-visible:border-cyber-blue/50")}>{body}</button>
  ) : (
    <div className={shell}>{body}</div>
  );
}

const nf = (value: number) => value.toLocaleString("fr-FR");

export default function OverviewPanel({ overview, onOpenMessages, onOpenLearners }: {
  overview: AdminOverview | null;
  onOpenMessages: () => void;
  onOpenLearners: () => void;
}) {
  if (!overview) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-busy="true">
        {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 rounded-xl bg-white/[0.04] animate-pulse" />)}
      </div>
    );
  }

  const passRate = overview.quizAttempts ? Math.round((overview.quizzesPassed / overview.quizAttempts) * 100) : 0;
  const maxSignup = Math.max(1, ...overview.signupsByDay.map((day) => day.count));
  const maxCourse = Math.max(1, ...overview.topCourses.map((course) => course.completions));
  const weekSignups = overview.signupsByDay.reduce((sum, day) => sum + day.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Apprenants" value={nf(overview.learners)} detail={`+${nf(overview.newThisWeek)} cette semaine · ${nf(overview.admins)} admin`} Icon={IconProfile} accent="text-cyber-blue" onClick={onOpenLearners} />
        <Metric label="Actifs aujourd’hui" value={nf(overview.activeToday)} detail={`${nf(overview.onlineNow)} en ligne maintenant`} Icon={IconActivity} accent="text-cyber-green" />
        <Metric label="Leçons terminées" value={nf(overview.lessonsCompleted)} detail={`${nf(overview.lessonsToday)} aujourd’hui`} Icon={IconLesson} accent="text-white" />
        <Metric label="XP distribués aujourd’hui" value={nf(overview.xpToday)} Icon={IconBolt} accent="text-cyber-yellow" />
        <Metric label="Quiz réussis" value={nf(overview.quizzesPassed)} detail={`${nf(overview.quizAttempts)} tentatives · ${passRate} % de réussite`} Icon={IconAward} accent="text-neon-purple" />
        <Metric label="Score moyen aux quiz" value={`${overview.averageBestScore} %`} detail="Meilleur score de chaque apprenant" Icon={IconAward} accent="text-neon-purple" />
        <Metric label="Challenges résolus" value={nf(overview.challengesSolved)} Icon={IconShield} accent="text-cyber-green" />
        <Metric
          label="Messages à traiter"
          value={nf(overview.newMessages)}
          detail={overview.newMessages ? "Ouvrir la boîte de réception" : "Boîte de réception à jour"}
          Icon={IconSend}
          accent={overview.newMessages ? "text-cyber-red" : "text-white/60"}
          onClick={onOpenMessages}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-dark-navy border border-white/5 rounded-xl2 p-6" aria-labelledby="signups-title">
          <div className="flex items-baseline justify-between">
            <h2 id="signups-title" className="font-display font-semibold">Inscriptions sur 7 jours</h2>
            <span className="text-xs text-white/45 tabular-nums">{nf(weekSignups)} au total</span>
          </div>
          <ol className="mt-6 flex items-end gap-2 h-40">
            {overview.signupsByDay.map((day, index) => {
              const date = new Date(`${day.day}T12:00:00Z`);
              const height = Math.max(4, (day.count / maxSignup) * 100);
              return (
                <li key={day.day} className="flex-1 h-full flex flex-col justify-end items-center gap-2">
                  <span className="text-[11px] text-white/60 tabular-nums">{day.count}</span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-cyber-blue/30 to-cyber-blue/80 origin-bottom animate-grow-bar motion-reduce:animate-none"
                    style={{ height: `${height}%`, animationDelay: `${index * 60}ms` }}
                    role="img"
                    aria-label={`${day.count} inscription(s) le ${date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`}
                  />
                  <span className="text-[10px] text-white/40 capitalize">{date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="bg-dark-navy border border-white/5 rounded-xl2 p-6" aria-labelledby="top-courses-title">
          <div className="flex items-baseline justify-between">
            <h2 id="top-courses-title" className="font-display font-semibold">Cours les plus suivis</h2>
            <span className="text-xs text-white/45">Leçons terminées</span>
          </div>
          {overview.topCourses.length === 0 ? (
            <p className="mt-6 text-sm text-white/45">Aucune leçon terminée pour l’instant.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {overview.topCourses.map((course, index) => (
                <li key={course.courseId}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] text-white/35 tabular-nums w-4">{index + 1}</span>
                      <IconCourses size={13} className="text-cyber-blue shrink-0" />
                      <span className="truncate">{courseTitle(course.courseId)}</span>
                    </span>
                    <span className="text-xs text-white/55 tabular-nums">{nf(course.completions)}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-cyber-green/70 transition-[width] duration-700" style={{ width: `${(course.completions / maxCourse) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-xs text-white/40">
            {nf(overview.publishedCourses)} cours et {nf(overview.publishedChallenges)} challenges publiés par l’équipe.
          </p>
        </section>
      </div>
    </div>
  );
}
