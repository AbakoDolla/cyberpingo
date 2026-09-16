"use client";

import AppShell from "@/components/layout/AppShell";
import CourseCard from "@/components/courses/CourseCard";
import { courses } from "@/data/courses";
import { usePublishStore } from "@/hooks/usePublishStore";
import { Course } from "@/types";
import { IconBolt } from "@/components/ui/Icon";

export default function CoursesPage() {
  const { publishedCourses, hydrated } = usePublishStore();

  // Convertit les cours publiés en format Course pour CourseCard
  const publishedAsCourses: Course[] = publishedCourses.map((pc) => ({
    id: pc.id,
    slug: pc.slug,
    title: pc.title,
    description: pc.description,
    level: pc.level,
    durationMinutes: pc.durationMinutes,
    lessonCount: pc.lessons.length,
    progress: 0,
    category: pc.category,
    locked: false,
    icon: pc.icon ?? pc.slug,
    lessons: pc.lessons,
  }));

  const allCourses = [...courses, ...publishedAsCourses];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Cours</h1>
            <p className="text-white/50 text-sm mt-1">
              Progresse module par module, à ton propre rythme.
            </p>
          </div>
          {hydrated && publishedAsCourses.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-cyber-green bg-cyber-green/10 border border-cyber-green/20 px-3 py-1.5 rounded-full">
              <IconBolt size={12} />
              {publishedAsCourses.length} cours publié{publishedAsCourses.length > 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Cours officiels */}
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>

        {/* Cours publiés */}
        {hydrated && publishedAsCourses.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display font-semibold text-lg">Cours publiés par la communauté</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyber-green/10 text-cyber-green border border-cyber-green/20">
                Nouveau
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedAsCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
