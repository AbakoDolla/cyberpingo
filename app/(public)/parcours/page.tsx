import type { Metadata } from "next";
import Catalog from "@/components/public/Catalog";
import { courses } from "@/data/courses";
import { lessons } from "@/data/lessons";
import { quizzes } from "@/data/quizzes";

export const metadata: Metadata = { title: "Les parcours", description: "Explore les programmes de cybersécurité : fondamentaux, réseaux, Linux, web, analyse de logs et pentest éthique." };

export default function CatalogPage() {
  return <div className="public-container inner-page">
    <header className="page-heading"><h1>Ton prochain réflexe<br /><span>commence ici.</span></h1><p>Choisis un sujet. Découvre le programme. Avance une leçon à la fois.</p><div className="page-facts"><span>{courses.length} parcours</span><span>{lessons.length} leçons</span><span>{quizzes.length} quiz</span><span>En français</span></div></header>
    <Catalog />
  </div>;
}
