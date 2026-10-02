import type { Metadata } from "next";
import Link from "next/link";
import SceneBanner from "@/components/art/SceneBanner";
import Catalog from "@/components/public/Catalog";
import ReloadButton from "@/components/public/ReloadButton";
import { errorMessage } from "@/lib/errors";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { listPublishedCourses } from "@/services/courses.service";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Parcours CyberPingo",
  description: "Explore les programmes de cybersécurité publiés par CyberPingo, leur niveau, leur durée et leur programme détaillé.",
};

export default async function CatalogPage() {
  const client = createSupabasePublicClient();
  if (!client) return <div className="public-container inner-page"><section className="public-state public-state--warning"><h1>Catalogue indisponible.</h1><p>Le service Supabase n’est pas configuré sur ce déploiement. Les parcours publiés ne peuvent pas être lus.</p></section></div>;
  try {
    const courses = await listPublishedCourses(client);
    const lessonCount = courses.reduce((sum, course) => sum + course.lesson_count, 0);
    const quizCount = courses.reduce((sum, course) => sum + course.quiz_count, 0);
    return <div className="public-container inner-page">
      <SceneBanner variant="library" anchor="end" className="page-heading page-heading--split">
        <div>
          <h1>Ton prochain réflexe<br /><span>commence ici.</span></h1>
          <p>Choisis un sujet, lis le programme complet, puis crée ton compte quand tu es prêt à enregistrer ta progression.</p>
          <div className="page-actions"><Link className="public-button button-primary" href="/register">Créer mon compte</Link><Link className="public-button button-outline" href="/ressources">Lire un guide</Link></div>
        </div>
        <aside className="page-heading-panel" aria-label="Résumé du catalogue">
          <p>Catalogue publié</p>
          <dl>
            <div><dt>Parcours</dt><dd>{courses.length}</dd></div>
            <div><dt>Leçons</dt><dd>{lessonCount}</dd></div>
            <div><dt>Quiz</dt><dd>{quizCount}</dd></div>
          </dl>
          <span>Programmes en français, visibles avant inscription.</span>
        </aside>
      </SceneBanner>
      {courses.length ? <Catalog courses={courses} /> : <div className="library-empty"><h2>Aucun cours disponible pour le moment.</h2><p>Reviens bientôt : le catalogue se remplit uniquement avec les parcours publiés.</p></div>}
    </div>;
  } catch (error) {
    return <div className="public-container inner-page"><section className="public-state public-state--error"><h1>Catalogue indisponible.</h1><p>{errorMessage(error, "Impossible de charger les parcours publiés pour le moment.")}</p><ReloadButton /></section></div>;
  }
}