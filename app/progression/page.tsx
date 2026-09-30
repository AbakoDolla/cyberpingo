"use client";

import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import BadgesGrid from "@/components/dashboard/BadgesGrid";
import ProgressBar from "@/components/ui/ProgressBar";
import { useUser } from "@/context/UserContext";
import { courses } from "@/data/courses";
import { quizzes } from "@/data/quizzes";
import { usePublishStore } from "@/hooks/usePublishStore";
import { computeLevel } from "@/lib/learning-progress";

export default function ProgressionPage() {
  const { user } = useUser();
  const { publishedCourses } = usePublishStore();
  const allCourses = [...courses, ...publishedCourses];
  const allLessons = allCourses.flatMap((course) => course.lessons);
  const allQuizzes = [...quizzes, ...publishedCourses.flatMap((course) => course.quizzes)];
  const next = allLessons.find((lesson) => !user.completedLessons.includes(lesson.id));
  const completed = allLessons.filter((lesson) => user.completedLessons.includes(lesson.id)).length;
  const level = computeLevel(user.xp);
  const attempts = Object.entries(user.quizResults);
  return <AppShell><div className="study-page">
    <header className="study-heading"><h1>Chaque pas compte, {user.name}.</h1><p>Retrouve tes acquis, tes meilleurs scores et la prochaine étape, synchronisés sur ton compte.</p></header>
    <div className="study-overview">
      <div><p className="text-cyber-blue">Niveau {user.level}</p><h2>{user.xp} XP au total</h2><p>{level.xpToNextLevel - level.levelXp} XP avant le prochain niveau</p><ProgressBar value={level.levelXp / level.xpToNextLevel * 100} tone="blue" /></div>
      <dl><div><dt>Leçons terminées</dt><dd>{completed} / {allLessons.length}</dd></div><div><dt>Quiz validés</dt><dd>{user.completedQuizzes}</dd></div><div><dt>Défis réussis</dt><dd>{user.completedChallenges.length}</dd></div><div><dt>Série de jours (UTC)</dt><dd>{user.streak}</dd></div></dl>
    </div>
    <section className="study-next"><div><h2>{next ? "Ton prochain pas" : "Tous les parcours ont été parcourus !"}</h2><p>{next ? `${next.title} · ${next.durationMinutes} min` : "Consolide tes acquis en reprenant un quiz ou en résolvant un défi."}</p></div><Link className="study-button" href={next ? `/lessons/${next.id}` : "/challenges"}>{next ? "Continuer à apprendre" : "Explorer les défis"} →</Link></section>
    <section className="study-section"><h2>Mes parcours</h2><div className="study-course-list">{allCourses.map((course) => {
      const count = course.lessons.filter((lesson) => user.completedLessons.includes(lesson.id)).length;
      const percent = course.lessons.length ? Math.round(count / course.lessons.length * 100) : 0;
      return <Link key={course.id} href={`/courses/${course.slug}`}><div><h3>{course.title}</h3><p>{count} / {course.lessons.length} leçons · {percent === 100 ? "Terminé" : count ? "En cours" : "À découvrir"}</p></div><div><ProgressBar value={percent} tone="green" /><span>{percent} %</span></div></Link>;
    })}</div></section>
    <section className="study-section"><h2>Mes meilleurs scores</h2><p className="text-sm text-slate-300 mt-3">Un quiz est validé à 70 %. Refaire un score identique ne rapporte pas de nouveaux XP.</p>
      {!attempts.length ? <p className="study-empty">Aucun quiz tenté pour le moment. Le premier t’attend dans un parcours.</p> : <div className="study-score-list">{attempts.map(([id, result]) => {
        const quiz = allQuizzes.find((item) => item.id === id);
        return <div key={id}><span>{quiz?.title ?? "Quiz archivé"}</span><strong>{result.score} / {result.totalQuestions}</strong><span>{result.passed ? "Validé" : "À revoir"}</span>{quiz && <Link className="study-link" href={`/quiz/${id}`}>Réessayer</Link>}</div>;
      })}</div>}
    </section>
    <BadgesGrid badges={user.badges} />
    <p className="mt-7 text-sm text-slate-300">Objectif personnel : {user.dailyMinutes} min par jour, sans chronométrage automatique. <Link className="study-link" href="/parametres">Modifier mon objectif</Link></p>
  </div></AppShell>;
}
