import { mockDelay } from "./api";
import { courses } from "@/data/courses";
import { lessons } from "@/data/lessons";
import { quizzes } from "@/data/quizzes";
import { Course, Lesson, Quiz } from "@/types";

export async function fetchCourses(): Promise<Course[]> {
  return mockDelay(courses);
}

export async function fetchCourseBySlug(slug: string): Promise<Course | undefined> {
  return mockDelay(courses.find((c) => c.slug === slug));
}

export async function fetchLessonById(id: string): Promise<Lesson | undefined> {
  return mockDelay(lessons.find((l) => l.id === id));
}

export async function fetchQuizById(id: string): Promise<Quiz | undefined> {
  return mockDelay(quizzes.find((q) => q.id === id));
}
