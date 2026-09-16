"use client";

import Link from "next/link";
import { Course } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import {
  IconShield, IconNetwork, IconLinux, IconGlobe, IconCrosshair, IconLock,
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

export default function CourseCard({ course }: { course: Course }) {
  const { getCourseProgress } = useUser();
  const progress = getCourseProgress(course.id);
  const CourseIcon = courseIconMap[course.slug] ?? IconShield;

  const content = (
    <Card glow={course.locked ? "none" : "blue"} className={cn("h-full", course.locked && "opacity-60")}>
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl bg-cyber-blue/10 border border-cyber-blue/15 flex items-center justify-center">
          <CourseIcon size={22} strokeWidth={1.5} className="text-cyber-blue" />
        </div>
        {course.locked && (
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
            <IconLock size={14} strokeWidth={1.6} className="text-white/30" />
          </div>
        )}
      </div>
      <h3 className="mt-4 font-display font-semibold text-lg">{course.title}</h3>
      <p className="mt-1.5 text-sm text-white/60 line-clamp-2">{course.description}</p>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Badge tone="blue">{levelLabel[course.level]}</Badge>
        <Badge tone="neutral">{course.lessonCount} leçons</Badge>
        <Badge tone="neutral">{course.durationMinutes} min</Badge>
      </div>

      {!course.locked && (
        <div className="mt-4">
          <ProgressBar value={progress} tone="green" showLabel height="sm" />
        </div>
      )}
    </Card>
  );

  if (course.locked) return <div>{content}</div>;
  return <Link href={`/courses/${course.slug}`}>{content}</Link>;
}
