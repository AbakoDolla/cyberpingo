"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "./Hero";
import {
  IconArrowRight, IconAward, IconBolt, IconCheck, IconChevronDown,
  IconClock, IconCourses, IconGlobe, IconLesson, IconProfile,
  IconShield, IconTarget, IconTerminal, IconTrophy, IconX,
} from "@/components/ui/Icon";
import { getPublicCourse, publicFaq, publicPaths, publicTestimonial, type PublicPath } from "@/data/landing";

const steps = [
  { Icon: IconProfile, title: "Crée ton compte", text: "C’est rapide et gratuit !" },
  { Icon: IconCourses, title: "Apprends", text: "Des leçons courtes et claires." },
  { Icon: IconTarget, title: "Pratique", text: "Des quiz et des défis concrets." },
  { Icon: IconTrophy, title: "Progresse", text: "Gagne des XP et des badges." },
];

function CourseCard({ path, onSelect }: { path: PublicPath; onSelect: (path: PublicPath, trigger: HTMLButtonElement) => void }) {
  const course = getPublicCourse(path);
  const available = !!course && !course.locked && course.lessons.length > 0;
  const duration = course ? `${Math.floor(course.durationMinutes / 60)} h${course.durationMinutes % 60 ? ` ${course.durationMinutes % 60}` : ""}` : null;
  return (
    <button type="button" className={`public-course tone-${path.tone}`} onClick={(event) => onSelect(path, event.currentTarget)}>
      <span className="sr-only">Découvrir le parcours : </span>
      <div className="course-art">
        {path.image
          ? <Image src={`/images/${path.image}`} width={180} height={110} alt="" sizes="180px" />
          : <span className="course-fallback-art">{path.id === "linux" ? <IconTerminal size={68} /> : <IconGlobe size={68} />}</span>}
        <span className="course-level">{path.level}</span>
      </div>
      <div className="course-copy">
        <h3>{path.title}</h3>
        <p>{path.description}</p>
        <div className="course-meta">
          {available
            ? <><span><IconCourses size={13} />{course.lessons.length} leçons</span><span><IconClock size={13} />{duration}</span></>
            : <span className="coming-soon"><span /> Bientôt disponible</span>}
          <span className="course-arrow"><IconArrowRight size={16} /></span>
        </div>
      </div>
    </button>
  );
}

function CourseDialog({ path, onClose, returnFocusTo }: { path: PublicPath; onClose: () => void; returnFocusTo: HTMLButtonElement | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const course = getPublicCourse(path);
  const available = !!course && !course.locked && course.lessons.length > 0;
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
      className={`course-dialog tone-${path.tone}`}
      aria-labelledby="course-dialog-title"
      onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="course-dialog-content">
        <button type="button" className="dialog-close" aria-label="Fermer l’aperçu du parcours" onClick={onClose}><IconX size={22} /></button>
        <span className="course-level">{path.level}</span>
        <h2 id="course-dialog-title">{path.title}</h2>
        <p>{path.description}</p>
        <h3>{available ? "Ce que tu vas apprendre" : "Le programme prévu"}</h3>
        <ul>{path.topics.map((topic) => <li key={topic}><IconCheck size={18} />{topic}</li>)}</ul>
        <div className="course-dialog-notice">
          {available
            ? `${course.lessons.length} leçons disponibles. Connecte-toi pour commencer et suivre ta progression.`
            : "Ce parcours est en préparation. Tu peux déjà commencer par les fondamentaux, les réseaux ou Linux."}
        </div>
        <Link href={available ? `/courses/${course.slug}` : "/register"} className="public-button button-primary">
          {available ? "Accéder au parcours" : "Commencer par les bases"}<IconArrowRight size={17} />
        </Link>
      </div>
    </dialog>
  );
}

export default function LandingPage() {
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedPath, setSelectedPath] = useState<PublicPath | null>(null);
  const courseTrigger = useRef<HTMLButtonElement | null>(null);
  const openCourse = (path: PublicPath, trigger: HTMLButtonElement) => {
    courseTrigger.current = trigger;
    setSelectedPath(path);
  };
  return (
    <div className="public-site" data-motion={motionEnabled ? "on" : "off"}>
      <a className="skip-link" href="#main-content">Aller au contenu principal</a>
      <Navbar motionEnabled={motionEnabled} onToggleMotion={() => setMotionEnabled(!motionEnabled)} />
      <main id="main-content">
        <Hero />
        <section className="how-section" id="fonctionnalites" aria-labelledby="how-title">
          <div className="public-container how-inner">
            <div className="how-heading">
              <h2 id="how-title">Comment ça marche ?</h2>
              <p>Quelques étapes. De nouveaux réflexes.</p>
            </div>
            <ol className="how-steps">
              {steps.map(({ Icon, title, text }, index) => (
                <li key={title}>
                  <span className="step-icon"><Icon size={27} /></span>
                  <div><h3><span>{index + 1}.</span> {title}</h3><p>{text}</p></div>
                  {index < steps.length - 1 && <IconArrowRight size={16} className="step-arrow" />}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="public-container discovery-layout">
          <div className="discovery-main">
            <section id="parcours" aria-labelledby="paths-title">
              <div className="paths-heading">
                <div className="section-title">
                  <span className="heading-icon"><IconProfile size={25} /></span>
                  <div><h2 id="paths-title">Découvre nos parcours</h2><p>Des formations adaptées à ton niveau et à tes objectifs.</p></div>
                </div>
                <button type="button" className="public-text-link" aria-expanded={showAll} aria-controls="public-paths" onClick={() => setShowAll(!showAll)}>
                  {showAll ? "Voir moins" : "Voir tous les parcours"}<IconArrowRight size={15} />
                </button>
              </div>
              <div className="public-paths" id="public-paths">
                {(showAll ? publicPaths : publicPaths.slice(0, 4)).map((path) => <CourseCard key={path.id} path={path} onSelect={openCourse} />)}
              </div>
              <p className="catalog-note">Six parcours disponibles. <Link href="/parcours" className="inline-link">Consulter les programmes détaillés →</Link></p>
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
              <div className="community-content">
                <h2 id="community-title">Rejoins la communauté<br />CyberPingo</h2>
                <p>Apprends, pratique et progresse aux côtés<br className="desktop-break" /> de passionnés de cybersécurité.</p>
                <Link href="/register" className="public-button button-primary">S&apos;inscrire gratuitement<IconArrowRight size={14} /></Link>
              </div>
            </section>
            <div className="community-highlights">
              <div><IconCourses size={22} /><span><strong>Pas à pas</strong>Leçons courtes</span></div>
              <div><IconBolt size={22} /><span><strong>À ton rythme</strong>XP & niveaux</span></div>
              <div><IconAward size={22} /><span><strong>À toi de jouer</strong>Badges à gagner</span></div>
            </div>
            <figure className="testimonial">
              <span className="quote-mark" aria-hidden="true">“</span>
              <div>
                {publicTestimonial.isExample && <span className="testimonial-label">Exemple de témoignage</span>}
                <blockquote>« {publicTestimonial.quote} »</blockquote>
                <figcaption><span className="testimonial-avatar"><IconProfile size={18} /></span><span>{publicTestimonial.name} <span>· {publicTestimonial.role}</span></span></figcaption>
              </div>
            </figure>
          </aside>
        </div>

        <section className="public-container home-resources">
          <h2>Les bons réflexes, même entre deux leçons.</h2>
          <p>Comptes, phishing, sauvegardes : retrouve des guides pratiques en français, accessibles sans connexion.</p>
          <Link href="/ressources" className="public-button button-outline">Explorer les ressources<IconArrowRight size={17} /></Link>
        </section>
        <section className="public-container faq-section" id="faq" aria-labelledby="faq-title">
          <div><span className="heading-icon"><IconLesson size={24} /></span><h2 id="faq-title">Avant de te lancer</h2><p>Pas besoin d&apos;être expert.<br />Juste d&apos;être curieux.</p></div>
          <div className="faq-questions">
            {publicFaq.map(({ question, answer }) => (
              <details key={question}><summary>{question}<IconChevronDown size={18} /></summary><p>{answer}</p></details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      {selectedPath && <CourseDialog path={selectedPath} onClose={() => setSelectedPath(null)} returnFocusTo={courseTrigger.current} />}
    </div>
  );
}
