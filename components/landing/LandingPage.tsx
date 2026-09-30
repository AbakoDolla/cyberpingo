"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "./Hero";
import ChallengesSection from "./ChallengesSection";
import ProgressionSection from "./ProgressionSection";
import {
  IconArrowRight, IconAward, IconBolt, IconCheck, IconChevronDown,
  IconClock, IconCourses, IconGlobe, IconLesson, IconProfile,
  IconShield, IconTarget, IconTerminal, IconTrophy, IconX,
} from "@/components/ui/Icon";
import { formatDuration, levelLabel } from "@/lib/format";
import { publicFaq, publicPaths, publicTestimonial, type PublicPath } from "@/data/landing";
import type { CourseSummary, Lab } from "@/types/api";

const steps = [
  { Icon: IconProfile, title: "Crée ton compte", text: "C’est rapide et gratuit !" },
  { Icon: IconCourses, title: "Apprends", text: "Des leçons courtes et claires." },
  { Icon: IconTarget, title: "Pratique", text: "Des quiz et des défis concrets." },
  { Icon: IconTrophy, title: "Progresse", text: "Gagne des XP et des badges." },
];

const fallbackTones: PublicPath["tone"][] = ["blue", "purple", "teal", "orange"];

type CoursePreview = {
  course: CourseSummary;
  path?: PublicPath;
  tone: PublicPath["tone"];
  image?: string;
  topics: string[];
};

function toPreview(course: CourseSummary, index: number): CoursePreview {
  const path = publicPaths.find((item) => item.courseSlug === course.slug);
  return {
    course,
    path,
    tone: path?.tone ?? fallbackTones[index % fallbackTones.length],
    image: path?.image,
    topics: path?.topics ?? [`${course.module_count} modules`, `${course.lesson_count} leçons`, `${course.quiz_count} quiz`],
  };
}

function CourseCard({ preview, onSelect }: { preview: CoursePreview; onSelect: (preview: CoursePreview, trigger: HTMLButtonElement) => void }) {
  const { course, path, tone, image } = preview;
  return (
    <button type="button" className={`public-course tone-${tone}`} onClick={(event) => onSelect(preview, event.currentTarget)}>
      <span className="sr-only">Découvrir le parcours : </span>
      <div className="course-art">
        {image
          ? <Image src={`/images/${image}`} width={180} height={110} alt="" sizes="180px" />
          : <span className="course-fallback-art">{course.slug === "linux" ? <IconTerminal size={68} /> : <IconGlobe size={68} />}</span>}
        <span className="course-level">{levelLabel(course.level)}</span>
      </div>
      <div className="course-copy">
        <h3>{course.title}</h3>
        <p>{course.short_description || path?.description || course.description}</p>
        <div className="course-meta">
          <span><IconCourses size={13} />{course.lesson_count} leçons</span><span><IconClock size={13} />{formatDuration(course.estimated_duration)}</span>
          <span className="course-arrow"><IconArrowRight size={16} /></span>
        </div>
      </div>
    </button>
  );
}

function CourseDialog({ preview, onClose, returnFocusTo }: { preview: CoursePreview; onClose: () => void; returnFocusTo: HTMLButtonElement | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { course, tone, topics } = preview;
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      returnFocusTo?.focus();
    };
  }, [returnFocusTo]);
  return (
    <dialog
      ref={dialog}
      className={`course-dialog tone-${tone}`}
      aria-labelledby="course-dialog-title"
      onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="course-dialog-content">
        <button type="button" className="dialog-close" aria-label="Fermer l’aperçu du parcours" onClick={onClose}><IconX size={22} /></button>
        <span className="course-level">{levelLabel(course.level)}</span>
        <h2 id="course-dialog-title">{course.title}</h2>
        <p>{course.description}</p>
        <h3>Ce que tu vas apprendre</h3>
        <ul>{topics.map((topic) => <li key={topic}><IconCheck size={18} />{topic}</li>)}</ul>
        <div className="course-dialog-notice">{course.lesson_count} leçons · {course.quiz_count} quiz · {formatDuration(course.estimated_duration)}.</div>
        <div className="study-actions">
          <Link href={`/register?next=/courses/${course.slug}`} className="public-button button-primary">Commencer ce parcours<IconArrowRight size={17} /></Link>
          <Link href={`/login?next=/courses/${course.slug}`} className="back-link">J’ai déjà un compte</Link>
        </div>
      </div>
    </dialog>
  );
}

export default function LandingPage({ courses, labs, catalogUnavailable = false }: { courses: CourseSummary[]; labs: Lab[]; catalogUnavailable?: boolean }) {
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<CoursePreview | null>(null);
  const courseTrigger = useRef<HTMLButtonElement | null>(null);
  const previews = useMemo(() => courses.map(toPreview), [courses]);
  const openCourse = (preview: CoursePreview, trigger: HTMLButtonElement) => {
    courseTrigger.current = trigger;
    setSelectedPreview(preview);
  };
  const visiblePreviews = showAll ? previews : previews.slice(0, 4);
  return (
    <div className="public-site" data-motion={motionEnabled ? "on" : "off"}>
      <a className="skip-link" href="#main-content">Aller au contenu principal</a>
      <Navbar motionEnabled={motionEnabled} onToggleMotion={() => setMotionEnabled(!motionEnabled)} />
      <main id="main-content">
        <Hero />
        <section className="how-section" id="fonctionnalites" aria-labelledby="how-title">
          <div className="public-container how-inner">
            <div className="how-heading"><h2 id="how-title">Comment ça marche ?</h2><p>Quelques étapes. De nouveaux réflexes.</p></div>
            <ol className="how-steps">
              {steps.map(({ Icon, title, text }, index) => (
                <li key={title}><span className="step-icon"><Icon size={27} /></span><div><h3><span>{index + 1}.</span> {title}</h3><p>{text}</p></div>{index < steps.length - 1 && <IconArrowRight size={16} className="step-arrow" />}</li>
              ))}
            </ol>
          </div>
        </section>

        <div className="public-container discovery-layout">
          <div className="discovery-main">
            <section id="parcours" aria-labelledby="paths-title">
              <div className="paths-heading">
                <div className="section-title"><span className="heading-icon"><IconProfile size={25} /></span><div><h2 id="paths-title">Découvre nos parcours</h2><p>Des formations publiées par l’équipe, adaptées à ton niveau.</p></div></div>
                {previews.length > 4 && <button type="button" className="public-text-link" aria-expanded={showAll} aria-controls="public-paths" onClick={() => setShowAll(!showAll)}>{showAll ? "Voir moins" : "Voir tous les parcours"}<IconArrowRight size={15} /></button>}
              </div>
              {catalogUnavailable ? <div className="library-empty"><h2>Catalogue indisponible.</h2><p>Le service Supabase n’est pas configuré ou ne répond pas pour le moment.</p></div> : visiblePreviews.length ? <div className="public-paths" id="public-paths">{visiblePreviews.map((preview) => <CourseCard key={preview.course.id} preview={preview} onSelect={openCourse} />)}</div> : <div className="library-empty"><h2>Aucun parcours publié pour le moment.</h2><p>Reviens bientôt : cette section se remplit avec le catalogue réel.</p></div>}
              {!catalogUnavailable && previews.length > 0 && <p className="catalog-note">{previews.length} parcours publié{previews.length > 1 ? "s" : ""}. <Link href="/parcours" className="inline-link">Consulter les programmes détaillés →</Link></p>}
            </section>

            <section id="a-propos" className="mission-section" aria-labelledby="mission-title">
              <span className="mission-icon"><IconShield size={31} /></span>
              <div><h2 id="mission-title">Notre mission</h2><p>Rendre la cybersécurité accessible à tous, en Afrique et partout dans le monde,<br className="desktop-break" /> grâce à une approche simple, pratique, progressive et inspirante.</p></div>
              <p className="mission-note">Ensemble pour un<br />internet plus sûr !</p>
            </section>
          </div>

          <aside className="community-column" aria-label="La communauté CyberPingo">
            <section className="community-banner" id="communaute" aria-labelledby="community-title">
              <Image src="/images/community-mascot.png" width={174} height={158} alt="" className="community-mascot" />
              <div className="community-content"><h2 id="community-title">Rejoins la communauté<br />CyberPingo</h2><p>Apprends, pratique et progresse aux côtés<br className="desktop-break" /> de passionnés de cybersécurité.</p><Link href="/register" className="public-button button-primary">S’inscrire gratuitement<IconArrowRight size={14} /></Link></div>
            </section>
            <div className="community-highlights"><div><IconCourses size={22} /><span><strong>Pas à pas</strong>Leçons courtes</span></div><div><IconBolt size={22} /><span><strong>À ton rythme</strong>XP & niveaux</span></div><div><IconAward size={22} /><span><strong>À toi de jouer</strong>Badges à gagner</span></div></div>
            <figure className="testimonial"><span className="quote-mark" aria-hidden="true">“</span><div>{publicTestimonial.isExample && <span className="testimonial-label">Exemple de témoignage</span>}<blockquote>« {publicTestimonial.quote} »</blockquote><figcaption><span className="testimonial-avatar"><IconProfile size={18} /></span><span>{publicTestimonial.name} <span>· {publicTestimonial.role}</span></span></figcaption></div></figure>
          </aside>
        </div>

        <ProgressionSection courses={courses} />
        <ChallengesSection labs={labs} />

        <section className="public-container home-resources"><h2>Les bons réflexes, même entre deux leçons.</h2><p>Comptes, phishing, sauvegardes : retrouve des guides pratiques en français, accessibles sans connexion.</p><Link href="/ressources" className="public-button button-outline">Explorer les ressources<IconArrowRight size={17} /></Link></section>
        <section className="public-container faq-section" id="faq" aria-labelledby="faq-title"><div><span className="heading-icon"><IconLesson size={24} /></span><h2 id="faq-title">Avant de te lancer</h2><p>Pas besoin d’être expert.<br />Juste d’être curieux.</p></div><div className="faq-questions">{publicFaq.map(({ question, answer }) => <details key={question}><summary>{question}<IconChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></section>
      </main>
      <Footer />
      {selectedPreview && <CourseDialog preview={selectedPreview} onClose={() => setSelectedPreview(null)} returnFocusTo={courseTrigger.current} />}
    </div>
  );
}