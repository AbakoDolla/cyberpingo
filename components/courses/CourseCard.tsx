import Image from "next/image";
import Link from "next/link";
import BadgeMedal from "@/components/art/BadgeMedal";
import CourseArt from "@/components/art/CourseArt";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import { IconArrowRight, IconBolt, IconClock, IconCourses } from "@/components/ui/Icon";
import { formatDuration, formatRelative, levelLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { localizeCourseSummary, localizeLevel } from "@/lib/content-i18n";
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

export default function CourseCard({ course: rawCourse, href, progress, className, publicView = false }: CourseCardProps) {
  const { lang, t } = useTranslation();
  const isEn = lang === "en";
  const course = localizeCourseSummary(rawCourse, lang);

  const hasProgress = Boolean(progress);
  const progressValue = Math.round(progress?.progress_percentage ?? 0);
  const completed = progress?.status === "completed" || progressValue >= 100;

  const actionLabel = isEn
    ? completed
      ? "Review track"
      : hasProgress
      ? "Continue"
      : publicView
      ? "View curriculum"
      : "Explore track"
    : completed
    ? "Revoir le parcours"
    : hasProgress
    ? "Continuer"
    : publicView
    ? "Voir le programme"
    : "Découvrir le parcours";

  const progressLabel = isEn
    ? completed
      ? "Track completed"
      : hasProgress
      ? "In progress"
      : "Not started"
    : completed
    ? "Parcours terminé"
    : hasProgress
    ? "Progression en cours"
    : "Non commencé";

  const statusTone = completed ? "green" : hasProgress ? "blue" : "neutral";
  const statusLabel = isEn
    ? completed
      ? "Completed"
      : hasProgress
      ? "In progress"
      : "Discover"
    : completed
    ? "Terminé"
    : hasProgress
    ? "En cours"
    : "À découvrir";

  const accessLabel = course.access_level === "free"
    ? (isEn ? "Free" : "Gratuit")
    : course.access_level;

  const medalTier = completed ? "legend" : course.level === "avance" ? "gold" : course.level === "intermediaire" ? "silver" : "bronze";

  return (
    <Link href={href} className={cn("course-card-link", className)} aria-label={`${publicView ? (isEn ? "Explore" : "Découvrir") : (isEn ? "Open" : "Ouvrir")} ${course.title}`}>
      <Card glow={completed ? "green" : hasProgress ? "blue" : "purple"} className="course-card h-full">
        <div className="course-card__cover">
          <div className="course-card__cover-media" aria-hidden="true">
            {course.thumbnail_url ? (
              <Image
                src={course.thumbnail_url}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 760px) 100vw, (max-width: 1180px) 50vw, 33vw"
                className="course-card__cover-image"
              />
            ) : (
              <CourseArt slug={course.slug} category={course.category} className="course-card__cover-art" photo />
            )}
          </div>
          <div className="course-card__cover-top">
            <div className="course-card__cover-badges">
              <Badge tone="blue">{localizeLevel(course.level, lang)}</Badge>
              <Badge tone={course.access_level === "free" ? "green" : "purple"}>{accessLabel}</Badge>
            </div>
            <div className="course-card__status">
              <Badge tone={statusTone}>{statusLabel}</Badge>
            </div>
          </div>
          <div className="course-card__medal">
            <BadgeMedal icon={course.icon} earned tier={medalTier} size={72} />
          </div>
        </div>
        <div className="course-card__body">
          <p className="course-card__category">{course.category}</p>
          <h2>{course.title}</h2>
          <p>{course.short_description || course.description}</p>
        </div>
        <div className="course-card__meta" aria-label={isEn ? "Track curriculum" : "Contenu du parcours"}>
          <span><IconClock size={13} /> {formatDuration(course.estimated_duration)}</span>
          <span><IconCourses size={13} /> {plural(course.module_count, isEn ? "module" : "module")}</span>
          <span>{plural(course.lesson_count, isEn ? "lesson" : "leçon", isEn ? "lessons" : "leçons")}</span>
          <span><IconBolt size={13} /> {plural(course.quiz_count, "quiz", "quiz")}</span>
        </div>
        {hasProgress ? (
          <div className="course-card__progress">
            <div><span>{progressLabel}</span><strong>{progressValue} %</strong></div>
            <ProgressBar value={progressValue} tone={completed ? "green" : "blue"} height="sm" />
            {progress?.last_activity_at && <small>{isEn ? "Last activity" : "Dernière activité"} {formatRelative(progress.last_activity_at)}</small>}
          </div>
        ) : (
          <p className="course-card__progress course-card__progress--empty"><span>{progressLabel}</span></p>
        )}
        <p className="course-card__cta">{actionLabel}<IconArrowRight size={14} /></p>
      </Card>
    </Link>
  );
}