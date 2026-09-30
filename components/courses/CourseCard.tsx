import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { IconBolt, IconCheck, IconClock, IconCourses } from "@/components/ui/Icon";
import { resolveSlugIcon } from "@/components/ui/SlugIcon";
import { formatDuration, levelLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CourseProgress, CourseSummary } from "@/types/api";

interface CourseCardProps {
  course: CourseSummary;
  href: string;
  progress?: CourseProgress | null;
  className?: string;
  publicView?: boolean;
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count > 1 ? pluralLabel : singular}`;
}

export default function CourseCard({ course, href, progress, className, publicView = false }: CourseCardProps) {
  const CourseIcon = resolveSlugIcon(course.icon, resolveSlugIcon(course.slug, IconCourses));
  const hasProgress = Boolean(progress);
  const progressValue = Math.round(progress?.progress_percentage ?? 0);
  const completed = progress?.status === "completed" || progressValue >= 100;

  return (
    <Link href={href} className={cn("course-card-link", className)} aria-label={`${publicView ? "Découvrir" : "Ouvrir"} le parcours ${course.title}`}>
      <Card glow={completed ? "green" : "blue"} className="course-card h-full">
        <div className="course-card__topline">
          <div className="course-card__icon" aria-hidden="true"><CourseIcon size={24} strokeWidth={1.55} /></div>
          <div className="course-card__status">
            {completed ? <Badge tone="green"><IconCheck size={12} /> Terminé</Badge> : <Badge tone="blue">{levelLabel(course.level)}</Badge>}
          </div>
        </div>
        <div className="course-card__body">
          <p className="course-card__category">{course.category}</p>
          <h2>{course.title}</h2>
          <p>{course.short_description || course.description}</p>
        </div>
        <div className="course-card__meta" aria-label="Contenu du parcours">
          <span><IconClock size={13} /> {formatDuration(course.estimated_duration)}</span>
          <span><IconCourses size={13} /> {plural(course.module_count, "module")}</span>
          <span>{plural(course.lesson_count, "leçon", "leçons")}</span>
          <span><IconBolt size={13} /> {plural(course.quiz_count, "quiz", "quiz")}</span>
        </div>
        {hasProgress ? (
          <div className="course-card__progress">
            <div><span>Ta progression</span><strong>{progressValue} %</strong></div>
            <ProgressBar value={progressValue} tone={completed ? "green" : "blue"} height="sm" />
          </div>
        ) : (
          <p className="course-card__cta">{publicView ? "Voir le programme" : "Découvrir le parcours"}</p>
        )}
      </Card>
    </Link>
  );
}