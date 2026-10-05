"use client";

import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Pingo from "@/components/mascot/Pingo";
import { useUser } from "@/context/UserContext";
import { useTranslation } from "@/lib/i18n";
import {
  IconAI,
  IconArrowRight,
  IconClock,
  IconCourses,
  IconShield,
  IconSparkles,
  IconTerminal,
  IconTrophy,
} from "@/components/ui/Icon";

export default function MentorPage() {
  const { profile } = useUser();
  const { lang } = useTranslation();
  const isEn = lang === "en";

  const upcomingFeatures = [
    {
      icon: IconAI,
      title: isEn ? "Socratic AI Mentor" : "Tuteur Socratique IA",
      desc: isEn
        ? "Personalized guidance through maieutic inquiry, helping you reason through cybersecurity problems without spoiling flags or answers."
        : "Accompagnement guidé par la maïeutique sans divulguer directement les drapeaux ou solutions brutes.",
      tag: isEn ? "Pedagogical" : "Pédagogie",
    },
    {
      icon: IconTerminal,
      title: isEn ? "Lab Grader & Auditor" : "Correcteur de TP & Auditeur",
      desc: isEn
        ? "Rigorous evaluation of commands, scripts, and reports out of 20, checked against ANSSI & OWASP frameworks."
        : "Évaluation académique sur 20, conformité aux référentiels ANSSI & OWASP, points forts et remédiations.",
      tag: isEn ? "Grading /20" : "Barème /20",
    },
    {
      icon: IconShield,
      title: isEn ? "SOC Log Trace Analyzer" : "Analyseur de Traces SOC",
      desc: isEn
        ? "Correlate attacks across syslog, Apache, and Nginx traces. Extract IOCs and generate defense countermeasures."
        : "Corrélation d'attaques (SQLi, brute-force, XSS), extraction d'IOCs, chronologie et règles de blocage.",
      tag: isEn ? "Forensics" : "Forensics",
    },
    {
      icon: IconTrophy,
      title: isEn ? "Adaptive Flash Challenges" : "Défis Flash & Quiz Interactifs",
      desc: isEn
        ? "Dynamic training scenarios and interactive defense questions tailored to your current learning milestones."
        : "Scénarios interactifs d'entraînement contextualisés et questions d'approfondissement sur mesure.",
      tag: isEn ? "Practice" : "Entraînement",
    },
  ];

  return (
    <AppShell>
      <div className="study-page py-8 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-5">
            <Pingo state="welcome" rank={profile?.level ?? 1} size={130} />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-3">
            <IconClock size={14} />
            {isEn ? "Upcoming in next release" : "Prévu dans une prochaine mise à jour"}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            {isEn ? "AI Mentor & Pedagogical Agent" : "Mentor IA & Agent Pédagogique"}
          </h1>
          <p className="text-white/70 max-w-xl mx-auto text-sm md:text-base">
            {isEn
              ? "We are fine-tuning Professeur Pingo to deliver the most accurate, realistic, and paced cybersecurity guidance. In the meantime, continue your tracks and hands-on labs!"
              : "Nous finalisons et calibrons le Professeur Pingo pour une assistance socratique ultra-réaliste et fluide. En attendant, explore tes parcours et valide tes labs !"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
            <Link href="/dashboard" className="study-button flex items-center gap-2">
              {isEn ? "Return to Dashboard" : "Retour au tableau de bord"} <IconArrowRight size={16} />
            </Link>
            <Link href="/courses" className="study-button study-button--ghost flex items-center gap-2">
              <IconCourses size={16} /> {isEn ? "Explore Courses" : "Explorer les cours"}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Icon size={22} />
                  </span>
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-white/60 border border-white/10">
                    {feat.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">{feat.title}</h3>
                <p className="text-xs md:text-sm text-white/60 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-center">
          <p className="text-xs text-white/50 flex items-center justify-center gap-2">
            <IconSparkles size={14} className="text-cyan-400" />
            {isEn
              ? "Version 1.0 focuses on snappy navigation, zero latency, and comprehensive bilingual courses."
              : "La version 1.0 privilégie une fluidité maximale, zéro latence au clic et un apprentissage bilingue complet."}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
