#!/usr/bin/env node
// Checks the lessons of an authoring part against the publication checklist (scripts/content-quality.cjs).
//   node scripts/check-path-part.cjs supabase/seed/content/reseaux-programme-a.ts
// The file must export `modules` (an array of modules written with supabase/seed/content/path-kit.ts).
const path = require("node:path");
const { load, root } = require("./ts-loader.cjs");
const { lessonIssues, moduleIssues, allowedReferenceUrls } = require("./content-quality.cjs");

function check(file) {
  const relative = path.relative(root, path.resolve(root, file)).replace(/\\/g, "/").replace(/\.ts$/, "");
  const { modules } = load(relative);
  const { REFERENCES } = load("supabase/seed/content/path-kit");
  const { quizzes: starterQuizzes } = load("supabase/seed/content/quizzes");
  if (!Array.isArray(modules)) throw new Error(`${file} doit exporter « modules ».`);
  const allowedUrls = allowedReferenceUrls(REFERENCES);
  const issues = [];
  let lessons = 0;
  const keys = new Set();
  for (const entry of modules) {
    issues.push(...moduleIssues(entry));
    for (const lesson of entry.lessons) {
      if (lesson.existing) continue;
      lessons += 1;
      if (keys.has(lesson.key)) issues.push(`${lesson.key} : clé en double`);
      keys.add(lesson.key);
      const quizInherited = Boolean(lesson.upgrade && starterQuizzes.some((quiz) => quiz.lessonId === lesson.key));
      if (quizInherited && lesson.quiz) issues.push(`${lesson.key} : la leçon de départ a déjà un quiz, ne le redéfinis pas`);
      issues.push(...lessonIssues(lesson, { level: "template", allowedUrls, quizInherited }));
      if (!/^[a-z0-9-]+$/.test(lesson.key)) issues.push(`${lesson.key} : clé invalide`);
      if (lesson.minutes < 10 || lesson.minutes > 60) issues.push(`${lesson.key} : durée ${lesson.minutes} min hors de 10 à 60`);
      if (lesson.summary.length < 40 || lesson.summary.length > 280) issues.push(`${lesson.key} : résumé de 40 à 280 caractères`);
    }
  }
  return { lessons, issues };
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("Usage : node scripts/check-path-part.cjs <fichier.ts>...");
    process.exit(2);
  }
  let failed = false;
  for (const file of files) {
    const { lessons, issues } = check(file);
    console.log(`${file} : ${lessons} leçon(s), ${issues.length} problème(s)`);
    issues.forEach((issue) => console.log(`  - ${issue}`));
    if (issues.length) failed = true;
  }
  process.exit(failed ? 1 : 0);
}

module.exports = { check };
