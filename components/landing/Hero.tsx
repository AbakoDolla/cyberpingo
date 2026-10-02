"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  IconArrowRight, IconAward, IconBolt, IconCheck, IconCourses,
  IconLesson, IconLock, IconProfile, IconShield, IconTarget, IconX,
} from "@/components/ui/Icon";
import { useUser } from "@/context/UserContext";

const benefits = [
  { Icon: IconLesson, title: "100 % en ligne", detail: "et accessible partout" },
  { Icon: IconTarget, title: "Apprentissage", detail: "gamifié" },
  { Icon: IconShield, title: "Exercices pratiques", detail: "pour les bons réflexes" },
  { Icon: IconAward, title: "Des badges", detail: "à chaque étape" },
];

function ProgressDemo() {
  const [stage, setStage] = useState<"path" | "question" | "success">("path");
  const [incorrect, setIncorrect] = useState(false);
  const completed = stage === "success";
  const xp = completed ? 380 : 320;

  return (
    <div className={`progress-demo ${completed ? "demo-complete" : ""}`} id="demo-progression">
      <div className="demo-brand">
        <span><IconShield size={21} /> CyberPingo</span>
        <span className="demo-label">Démo interactive</span>
      </div>
      <div className="demo-player">
        <span className="player-avatar"><IconProfile size={25} /></span>
        <div className="demo-player-details">
          <div><strong>Niveau 3 · Débutant</strong><span>{xp} / 500 XP</span></div>
          <div className="demo-progress" role="progressbar" aria-label="Progression de démonstration" aria-valuemin={0} aria-valuemax={500} aria-valuenow={xp}>
            <span style={{ transform: `scaleX(${xp / 500})` }} />
          </div>
        </div>
      </div>
      {stage === "question" ? (
        <div className="demo-question">
          <div className="demo-question-heading">
            <strong>Le bon réflexe cyber</strong>
            <button type="button" aria-label="Revenir au parcours de démonstration" onClick={() => setStage("path")}><IconX size={16} /></button>
          </div>
          <p>Comment protéger au mieux tes comptes ?</p>
          <button type="button" onClick={() => setIncorrect(true)}>Réutiliser un mot de passe complexe</button>
          <button type="button" onClick={() => { setIncorrect(false); setStage("success"); }}>Un mot de passe unique par compte</button>
          <p className="demo-feedback" role="status">{incorrect ? "Presque ! Un mot de passe réutilisé expose plusieurs comptes si l’un d’eux est compromis." : "Choisis une réponse. Aucun compte nécessaire."}</p>
        </div>
      ) : (
        <div className="demo-lessons">
          <div className="demo-lesson done"><span><IconShield size={17} /></span><p>Introduction à la cybersécurité</p><IconCheck size={17} /></div>
          <div className="demo-lesson done"><span><IconLock size={17} /></span><p>Les menaces du web</p><IconCheck size={17} /></div>
          <button className={`demo-lesson current ${completed ? "is-complete" : ""}`} type="button" onClick={() => { setIncorrect(false); setStage("question"); }}>
            <span><IconLock size={17} /></span><p>Sécurité des mots de passe</p>
            {completed ? <IconCheck size={17} /> : <span className="play-icon" aria-hidden="true">▶</span>}
          </button>
          <div className="demo-lesson locked"><span><IconCourses size={17} /></span><p>Réseaux et protocoles</p><IconLock size={14} /></div>
          <div className="demo-lesson locked"><span><IconShield size={17} /></span><p>Système et sécurité</p><IconLock size={14} /></div>
        </div>
      )}
      <div className={`demo-bottom ${completed ? "demo-reward" : ""}`} role="status">
        {completed
          ? <><IconAward size={17} /><span>Bien joué ! +60 XP de démonstration</span></>
          : <><IconBolt size={15} /><span>Un petit pas aujourd&apos;hui. Un niveau de plus demain.</span></>}
      </div>
    </div>
  );
}

export default function Hero() {
  const { isAuthenticated, isStaff } = useUser();
  return (
    <section id="accueil" className="public-hero" aria-labelledby="hero-title">
      <div className="hero-lab" aria-hidden="true" />
      <div className="public-container hero-inner">
        <div className="hero-copy">
          <span className="hero-badge"><IconShield size={17} /> La cybersécurité, c&apos;est pour toi !</span>
          <h1 id="hero-title">Apprends la cybersécurité <span>pas à pas, comme un jeu !</span></h1>
          <p className="hero-description">
            CyberPingo est une plateforme d&apos;apprentissage interactive qui te
            permet de maîtriser la cybersécurité, du niveau débutant à avancé,
            à travers des leçons courtes, des défis pratiques et un suivi de ta progression.
          </p>
          <div className="hero-actions">
            {isAuthenticated ? (
              <Link href={isStaff ? "/admin" : "/dashboard"} className="public-button button-primary">
                Continuer mon parcours <IconArrowRight size={17} />
              </Link>
            ) : (
              <Link href="/register" className="public-button button-primary">
                Commencer maintenant <IconArrowRight size={17} />
              </Link>
            )}
            <a href="#fonctionnalites" className="public-button button-outline">
              <span className="button-play" aria-hidden="true">▶</span> Découvrir la plateforme
            </a>
          </div>
          <ul className="hero-benefits" aria-label="Les avantages de CyberPingo">
            {benefits.map(({ Icon, title, detail }) => (
              <li key={title}><span className="benefit-icon"><Icon size={21} /></span><span>{title}<br />{detail}</span></li>
            ))}
          </ul>
        </div>
        <div className="hero-visual" aria-label="CyberPingo, ton compagnon d’apprentissage, et un aperçu interactif de la progression">
          <Image
            src="/images/hero-mascot.png"
            alt="La mascotte CyberPingo en veste à capuche, dans son laboratoire bleu lumineux."
            width={371}
            height={432}
            priority
            sizes="(max-width: 600px) 230px, (max-width: 1100px) 340px, 400px"
            className="hero-mascot"
          />
          <ProgressDemo />
          <p className="hero-note">Petits pas.<br /><span>Grands réflexes !</span><span aria-hidden="true">↙</span></p>
          <div className="companion-caption"><span className="status-dot" /> Ton compagnon de progression</div>
        </div>
      </div>
    </section>
  );
}
