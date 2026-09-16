"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import LessonBlockRenderer from "@/components/courses/LessonBlockRenderer";
import Button from "@/components/ui/Button";
import { lessons } from "@/data/lessons";
import { useUserFull } from "@/context/UserContext";

export default function LessonPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const lesson = lessons.find((l) => l.id === params.id);
  const { completeLesson, user } = useUserFull();

  // Les leçons du même cours, pour la navigation
  const courseLessons = lesson
    ? lessons.filter((l) => l.courseId === lesson.courseId).sort((a, b) => a.order - b.order)
    : [];
  const index = courseLessons.findIndex((l) => l.id === params.id);
  const prevLesson = courseLessons[index - 1] ?? null;
  const nextLesson = courseLessons[index + 1] ?? null;

  const alreadyCompleted = lesson ? user.completedLessons.includes(lesson.id) : false;
  const [justCompleted, setJustCompleted] = useState(false);

  if (!lesson) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-white/50">Leçon introuvable.</p>
        </div>
      </AppShell>
    );
  }

  function handleComplete() {
    setJustCompleted(true);
    if (!alreadyCompleted) {
      completeLesson(lesson!.id, lesson!.xpReward);
    }
    setTimeout(() => {
      if (lesson!.quizId) {
        router.push(`/quiz/${lesson!.quizId}`);
      }
    }, 900);
  }

  const completed = alreadyCompleted || justCompleted;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-xs text-cyber-blue font-medium uppercase tracking-wide">
          Leçon {lesson.order}
        </p>
        <h1 className="font-display text-2xl md:text-3xl font-semibold mt-1">{lesson.title}</h1>
        <p className="text-white/50 text-sm mt-1">
          {lesson.durationMinutes} min · +{lesson.xpReward} XP
          {alreadyCompleted && (
            <span className="ml-2 text-cyber-green font-medium">✓ Terminée</span>
          )}
        </p>

        <div className="mt-8 space-y-6">
          {lesson.blocks.map((block, i) => (
            <LessonBlockRenderer key={i} block={block} />
          ))}
        </div>

        {completed && (
          <div className="mt-8 bg-cyber-green/10 border border-cyber-green/30 rounded-xl p-5 text-center">
            <p className="font-display font-semibold text-cyber-green">
              {justCompleted && !alreadyCompleted
                ? `Leçon terminée ! +${lesson.xpReward} XP`
                : "Tu as déjà terminé cette leçon."}
            </p>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <Button
            variant="secondary"
            disabled={!prevLesson}
            onClick={() => prevLesson && router.push(`/lessons/${prevLesson.id}`)}
          >
            Leçon précédente
          </Button>

          {completed ? (
            <Button
              variant="secondary"
              disabled={!nextLesson}
              onClick={() => nextLesson && router.push(`/lessons/${nextLesson.id}`)}
            >
              Leçon suivante
            </Button>
          ) : (
            <Button variant="success" onClick={handleComplete}>
              Terminer la leçon
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
