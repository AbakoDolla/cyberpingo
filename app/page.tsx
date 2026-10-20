import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import { publicFaq } from "@/data/landing";
import {
  SITE_DESCRIPTION,
  SITE_TAGLINE,
  buildCourseListJsonLd,
  buildFaqJsonLd,
  buildPageMetadata,
} from "@/lib/seo";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { listPublishedCourses } from "@/services/courses.service";
import { listLabs } from "@/services/labs.service";
import "./landing.css";
import "./public-pages.css";

export const revalidate = 300;

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: SITE_TAGLINE,
    description: SITE_DESCRIPTION,
    path: "/",
    keywords: [
      "apprendre la cybersécurité gratuitement",
      "formation cybersécurité débutant",
      "cours cybersécurité interactif",
      "laboratoire cybersécurité en ligne",
    ],
  }),
  title: {
    absolute: SITE_TAGLINE,
  },
};

export default async function HomePage() {
  const faqJsonLd = buildFaqJsonLd(publicFaq);
  const client = createSupabasePublicClient();
  if (!client) {
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <LandingPage courses={[]} labs={[]} catalogUnavailable />
      </>
    );
  }
  try {
    const [courses, labs] = await Promise.all([listPublishedCourses(client), listLabs(null, client)]);
    const coursesJsonLd = buildCourseListJsonLd(courses);
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        {courses.length > 0 && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(coursesJsonLd) }} />
        )}
        <LandingPage courses={courses} labs={labs} />
      </>
    );
  } catch {
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <LandingPage courses={[]} labs={[]} catalogUnavailable />
      </>
    );
  }
}