"use client";

import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { courses } from "@/data/courses";
import { useUser } from "@/context/UserContext";
import { usePublishStore } from "@/hooks/usePublishStore";
import { Course } from "@/types";
import {
  IconShield, IconNetwork, IconLinux, IconGlobe, IconCrosshair,
  IconCheck, IconClock, IconLesson,
} from "@/components/ui/Icon";

const levelLabel: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

const courseIconMap: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  fondamentaux: IconShield,
  reseaux: IconNetwork,
  linux: IconLinux,
  "securite-web": IconGlobe,
  "pentest-intro": IconCrosshair,
};

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const course = courses.find((c) => c.slug === params.id);
  const { publishedCourses } = usePublishStore();
  const { getCourseProgress, user } = useUser();

  // Cherche dans les cours statiques puis publiés
  const foundCourse: Course | undefined = course ?? (() => {
    const pub = publishedCourses.find((c) => c.slug === params.id);
    if (!pub) return undefined;
    return {
      id: pub.id, slug: pub.slug, title: pub.title, description: pub.description,
      level: pub.level, durationMinutes: pub.durationMinutes,
      lessonCount: pub.lessons.length, progress: 0, category: pub.category,
      locked: false, icon: pub.slug, lessons: pub.lessons,
    };
  })();

  if (!foundCourse) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="text-white/50">Cours introuvable.</p>
        </div>
      </AppShell>
    );
  }

  const progress = getCourseProgress(foundCourse.id);
  const CourseIcon = courseIconMap[foundCourse.slug] ?? IconShield;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl2 bg-cyber-blue/10 border border-cyber-blue/20 flex items-center justify-center shrink-0">
            <CourseIcon size={28} strokeWidth={1.4} className="text-cyber-blue" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">{foundCourse.title}</h1>
            <p className="text-white/60 mt-1">{foundCourse.description}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 flex-wrap">
          <Badge tone="blue">{levelLabel[foundCourse.level]}</Badge>
          <Badge tone="neutral">{foundCourse.lessons.length} leçons</Badge>
          <div className="flex items-center gap-1 text-xs text-white/40">
            <IconClock size={13} />
            <span>{foundCourse.durationMinutes} min</span>
          </div>
          {progress === 100 && <Badge tone="green">✓ Terminé</Badge>}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/50">Progression</span>
            <span className="text-xs font-medium text-cyber-green">{progress}%</span>
          </div>
          <ProgressBar value={progress} tone="green" />
        </div>

        <div className="mt-10 bg-dark-navy border border-white/5 rounded-xl2 p-6">
          <div className="flex items-center gap-2 mb-4">
            <IconLesson size={16} className="text-white/40" />
            <h2 className="font-display font-semibold text-lg">Leçons</h2>
          </div>

          {foundCourse.lessons.length === 0 ? (
            <p className="text-sm text-white/50">Les leçons de ce module arrivent bientôt.</p>
          ) : (
            <div className="space-y-2">
              {foundCourse.lessons.map((lesson) => {
                const done = user.completedLessons.includes(lesson.id);
                return (
                  <Link
                    key={lesson.id}
                    href={`/lessons/${lesson.id}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/5 hover:border-cyber-blue/30 hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${done ? "bg-cyber-green/10" : "bg-white/5"}`}>
                        {done
                          ? <IconCheck size={14} strokeWidth={2.5} className="text-cyber-green" />
                          : <span className="text-xs text-white/30 font-mono">{lesson.order}</span>
                        }
                      </div>
                      <div>
                        <p className={`font-medium text-sm ${done ? "text-white/50" : "text-white"}`}>
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <IconClock size={11} className="text-white/30" />
                          <span className="text-xs text-white/30">{lesson.durationMinutes} min</span>
                          <span className="text-xs text-cyber-green/60">+{lesson.xpReward} XP</span>
                        </div>
                      </div>
                    </div>
                    <Button variant={done ? "ghost" : "secondary"} size="sm">
                      {done ? "Revoir" : "Ouvrir"}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
