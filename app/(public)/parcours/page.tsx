import type { Metadata } from "next";
import Catalog from "@/components/public/Catalog";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { listPublishedCourses } from "@/services/courses.service";

export const revalidate = 300;
export const metadata: Metadata = { title: "Les parcours", description: "Explore les programmes de cybersécurité publiés par CyberPingo." };

export default async function CatalogPage() {
  const client = createSupabasePublicClient();
  if (!client) return <div className="public-container inner-page"><div className="library-empty"><h1>Catalogue indisponible.</h1><p>Le service Supabase n’est pas configuré sur ce déploiement.</p></div></div>;
  try {
    const courses = await listPublishedCourses(client);
    const lessonCount = courses.reduce((sum, course) => sum + course.lesson_count, 0);
    const quizCount = courses.reduce((sum, course) => sum + course.quiz_count, 0);
    return <div className="public-container inner-page">
      <header className="page-heading"><h1>Ton prochain réflexe<br /><span>commence ici.</span></h1><p>Choisis un sujet. Découvre le programme publié. Avance une leçon à la fois.</p><div className="page-facts"><span>{courses.length} parcours</span><span>{lessonCount} leçons</span><span>{quizCount} quiz</span><span>En français</span></div></header>
      {courses.length ? <Catalog courses={courses} /> : <div className="library-empty"><h2>Aucun cours disponible pour le moment.</h2></div>}
    </div>;
  } catch {
    return <div className="public-container inner-page"><div className="library-empty"><h1>Catalogue indisponible.</h1><p>Impossible de charger les parcours publiés pour le moment.</p></div></div>;
  }
}