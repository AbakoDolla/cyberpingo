"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Course } from "@/types";
import ProgressBar from "@/components/ui/ProgressBar";
import { useUser } from "@/context/UserContext";
import {
  IconShield, IconNetwork, IconLinux, IconGlobe, IconCrosshair,
} from "@/components/ui/Icon";

const courseIconMap: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  fondamentaux: IconShield,
  reseaux: IconNetwork,
  linux: IconLinux,
  "securite-web": IconGlobe,
  "pentest-intro": IconCrosshair,
};

export default function CoursesInProgress({ courses }: { courses: Course[] }) {
  const { getCourseProgress } = useUser();

  // Calcule les progressions une seule fois par render
  const { active, toStart } = useMemo(() => {
    const withProgress = courses
      .filter((c) => !c.locked)
      .map((c) => ({ ...c, progress: getCourseProgress(c.id) }));

    const active = withProgress.filter((c) => c.progress > 0 && c.progress < 100);
    const toStart = active.length === 0
      ? withProgress.filter((c) => c.progress === 0).slice(0, 2)
      : [];

    return { active, toStart };
  }, [courses, getCourseProgress]);

  const displayed = active.length > 0 ? active : toStart;

  return (
    <div className="bg-dark-navy border border-white/5 rounded-xl2 p-6">
      <h3 className="font-display font-semibold text-lg mb-4">
        {active.length > 0 ? "Cours en cours" : "Commence par ici"}
      </h3>
      <div className="space-y-4">
        {displayed.map((course) => {
          const CourseIcon = courseIconMap[course.slug] ?? IconShield;
          return (
          <Link
            key={course.id}
            href={`/courses/${course.slug}`}
            className="block p-4 rounded-xl border border-white/5 hover:border-cyber-blue/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 font-medium text-sm">
                <CourseIcon size={16} strokeWidth={1.6} className="text-cyber-blue" />
                {course.title}
              </span>
              <span className="text-xs text-white/50">{course.progress}%</span>
            </div>
            <ProgressBar value={course.progress} tone="green" height="sm" />
          </Link>
          );
        })}
        {displayed.length === 0 && (
          <p className="text-sm text-white/50">Tous les cours disponibles sont terminés !</p>
        )}
      </div>
    </div>
  );
}
