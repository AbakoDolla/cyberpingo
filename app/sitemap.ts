import type { MetadataRoute } from "next";
import { publicPaths } from "@/data/landing";
import { articles, informationPages } from "@/data/public-content";
import { SITE_URL } from "@/lib/seo";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { listPublishedCourses } from "@/services/courses.service";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/parcours", changeFrequency: "daily", priority: 0.95 },
    { path: "/ressources", changeFrequency: "weekly", priority: 0.9 },
    { path: "/courses", changeFrequency: "daily", priority: 0.9 },
    { path: "/challenges", changeFrequency: "weekly", priority: 0.85 },
    { path: "/materiel", changeFrequency: "monthly", priority: 0.85 },
    { path: "/fonctionnalites", changeFrequency: "monthly", priority: 0.85 },
    { path: "/a-propos", changeFrequency: "monthly", priority: 0.8 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.8 },
    { path: "/classement", changeFrequency: "daily", priority: 0.75 },
    { path: "/certificat", changeFrequency: "monthly", priority: 0.75 },
    { path: "/communaute", changeFrequency: "monthly", priority: 0.7 },
    { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
    { path: "/confidentialite", changeFrequency: "yearly", priority: 0.4 },
    { path: "/conditions", changeFrequency: "yearly", priority: 0.4 },
  ];

  for (const section of Object.keys(informationPages)) {
    if (!staticRoutes.some((entry) => entry.path === `/${section}`)) {
      staticRoutes.push({ path: `/${section}`, changeFrequency: "monthly", priority: 0.7 });
    }
  }

  const courseSlugs = new Set<string>(
    publicPaths.map((p) => p.courseSlug).filter((slug): slug is string => Boolean(slug))
  );

  const client = createSupabasePublicClient();
  if (client) {
    try {
      const publishedCourses = await listPublishedCourses(client);
      for (const course of publishedCourses) {
        if (course.slug) courseSlugs.add(course.slug);
      }
    } catch {
      // Fallback to static publicPaths course slugs when database is unreachable
    }
  }

  const entries: MetadataRoute.Sitemap = [
    ...staticRoutes.map((route) => ({
      url: `${SITE_URL}${route.path === "/" ? "" : route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...Array.from(courseSlugs).map((slug) => ({
      url: `${SITE_URL}/parcours/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...articles.map((article) => ({
      url: `${SITE_URL}/ressources/${article.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
  ];

  return entries;
}
