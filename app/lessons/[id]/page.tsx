"use client";

import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import LessonBlockRenderer from "@/components/courses/LessonBlockRenderer";
import Button from "@/components/ui/Button";
import { lessons } from "@/data/lessons";
import { courses } from "@/data/courses";
import { useUserFull } from "@/context/UserContext";
import { usePublishStore } from "@/hooks/usePublishStore";

export default function LessonPage({ params }: { params: { id: string } }) {
  const { publishedCourses, hydrated } = usePublishStore();
  const { completeLesson, user } = useUserFull();
  const allLessons = [...lessons, ...publishedCourses.flatMap((course) => course.lessons)];
  const lesson = allLessons.find((item) => item.id === params.id);
  const course = [...courses, ...publishedCourses].find((item) => item.id === lesson?.courseId);
  const siblings = course?.lessons.slice().sort((a, b) => a.order - b.order) ?? [];
  const index = siblings.findIndex((item) => item.id === lesson?.id);
  const previous = siblings[index - 1];
  const next = siblings[index + 1];
  const completed = !!lesson && user.completedLessons.includes(lesson.id);

  return <AppShell>
    {!lesson ? <div className="study-empty"><h1>{hydrated ? "Leçon introuvable." : "Chargement de la leçon…"}</h1><Link className="study-link" href="/courses">Retour aux cours</Link></div> :
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href={course ? `/courses/${course.slug}` : "/courses"} className="study-link">← {course?.title ?? "Tous les cours"}</Link>
        <h1 className="font-display text-2xl md:text-3xl font-semibold mt-5">{lesson.title}</h1>
        <p className="text-slate-300 text-sm mt-3">Leçon {index + 1} sur {siblings.length} · {lesson.durationMinutes} min · {lesson.xpReward} XP{completed && <span className="ml-2 text-cyber-green">✓ Terminée</span>}</p>
        <div className="mt-8 space-y-6">{lesson.blocks.map((block, i) => <LessonBlockRenderer key={`${lesson.id}-${i}`} block={block} />)}</div>
        <div className="study-completion">
          <h2>{completed ? "Cette leçon fait partie de tes acquis." : "Prêt à retenir l’essentiel ?"}</h2>
          <p>{completed ? "Tu peux la relire à tout moment, sans gagner une deuxième fois les XP." : "Marque la leçon comme terminée, puis vérifie ta compréhension avec le quiz lorsqu’il est proposé."}</p>
          <div className="study-actions">
            {!completed && <Button variant="success" onClick={() => completeLesson(lesson.id, lesson.xpReward)}>Terminer la leçon</Button>}
            {lesson.quizId && <Link className="study-button" href={`/quiz/${lesson.quizId}`}>{user.quizResults[lesson.quizId] ? "Refaire le quiz" : "Passer le quiz"}</Link>}
          </div>
        </div>
        <nav className="study-actions justify-between mt-8" aria-label="Navigation des leçons">
          {previous && <Link className="study-link" href={`/lessons/${previous.id}`}>← Leçon précédente</Link>}
          {next ? <Link className="study-link" href={`/lessons/${next.id}`}>Leçon suivante →</Link> : <Link className="study-link" href="/progression">Voir ma progression →</Link>}
        </nav>
      </div>}
  </AppShell>;
}
