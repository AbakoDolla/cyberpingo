import LandingPage from "@/components/landing/LandingPage";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { listPublishedCourses } from "@/services/courses.service";
import { listLabs } from "@/services/labs.service";
import "./landing.css";
import "./public-pages.css";

export const revalidate = 300;

export default async function HomePage() {
  const client = createSupabasePublicClient();
  if (!client) return <LandingPage courses={[]} labs={[]} catalogUnavailable />;
  try {
    const [courses, labs] = await Promise.all([listPublishedCourses(client), listLabs(null, client)]);
    return <LandingPage courses={courses} labs={labs} />;
  } catch {
    return <LandingPage courses={[]} labs={[]} catalogUnavailable />;
  }
}