#!/usr/bin/env node
// Status of the learning content, course by course: what is really published and how much of it meets the
// publication checklist (scripts/content-quality.cjs). A course is only "terminé" when its lessons all conform,
// it has a practical assessment and it covers the planned modules. Nothing here is declared by hand.
//   node scripts/content-report.cjs          (or: npm run content:report)
const { load } = require("./ts-loader.cjs");
const { createSupabaseDatabase } = require("./pglite-supabase.cjs");
const { contentId } = require("./generate-content-seed.cjs");
const { lessonIssues, allowedReferenceUrls, ENFORCED_COURSES, PLAN } = require("./content-quality.cjs");
const { readLessons, readCourseStats, templateLessonIds } = require("./content-snapshot.cjs");

const pad = (value, width) => String(value).padEnd(width);
const hours = (minutes) => `${(minutes / 60).toFixed(1)} h`;

async function main() {
  const db = await createSupabaseDatabase({ seed: true });
  try {
    const { REFERENCES } = load("supabase/seed/content/path-kit");
    const allowedUrls = allowedReferenceUrls(REFERENCES);
    const template = templateLessonIds();
    const lessons = await readLessons(db);
    const stats = await readCourseStats(db);

    const perCourse = new Map();
    for (const lesson of lessons) {
      const entry = perCourse.get(lesson.course) ?? { total: 0, conforming: 0, videos: 0, references: 0 };
      const level = template.has(lesson.id) ? "template" : "base";
      const quizInherited = level === "template" && lesson.id === contentId("lesson", "l1");
      entry.total += 1;
      if (!lessonIssues({ key: lesson.title, title: lesson.title, blocks: lesson.blocks, quiz: lesson.quiz }, { level, allowedUrls, quizInherited }).length) entry.conforming += 1;
      entry.videos += lesson.blocks.filter((block) => block.type === "callout" && /^Vidéo à venir\s*:/u.test(block.content)).length;
      entry.references += lesson.blocks.filter((block) => block.type === "resource").length;
      perCourse.set(lesson.course, entry);
    }

    console.log("État du contenu pédagogique (ce que la base publie réellement)\n");
    console.log([pad("Cours", 34), pad("Modules", 9), pad("Leçons conformes", 18), pad("Quiz", 6), pad("Labs", 6), pad("Évals", 7), pad("Étapes", 8), pad("Compét.", 9), pad("Durée", 8), "Vidéos à produire"].join(""));
    for (const course of stats) {
      const quality = perCourse.get(course.slug) ?? { total: 0, conforming: 0, videos: 0 };
      const plan = PLAN[course.slug];
      console.log([
        pad(course.title, 34), pad(`${course.modules}/${plan?.modules ?? "?"}`, 9), pad(`${quality.conforming}/${quality.total}`, 18), pad(course.quizzes, 6),
        pad(course.labs, 6), pad(course.assessments, 7), pad(course.tasks, 8), pad(course.skills, 9), pad(hours(course.estimated_duration), 8), quality.videos,
      ].join(""));
    }

    console.log("\nVerdict");
    for (const course of stats) {
      const quality = perCourse.get(course.slug) ?? { total: 0, conforming: 0 };
      const plan = PLAN[course.slug];
      const finished = ENFORCED_COURSES.includes(course.slug) && quality.conforming === quality.total && course.assessments > 0 && course.modules >= (plan?.modules ?? 0);
      const missing = [];
      if (quality.conforming < quality.total) missing.push(`${quality.total - quality.conforming} leçon(s) à reprendre selon la grille`);
      if (course.modules < (plan?.modules ?? 0)) missing.push(`${plan.modules - course.modules} module(s) du programme à écrire`);
      if (!course.assessments) missing.push("aucune évaluation pratique");
      console.log(`  ${finished ? "TERMINÉ  " : "EN COURS "} ${pad(course.title, 34)} ${finished ? "leçons, quiz, travaux pratiques et évaluations disponibles et vérifiés" : missing.join(" ; ")}`);
    }
    console.log("\nDurées : somme des leçons publiées, travaux pratiques non comptés. Les vidéos annoncées « à venir » sont à produire par l’équipe.");
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
