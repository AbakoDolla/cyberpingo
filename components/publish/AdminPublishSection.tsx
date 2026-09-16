"use client";

import { useState } from "react";
import Link from "next/link";
import { PublishedCourse, PublishedChallenge } from "@/types";
import { usePublishStore } from "@/hooks/usePublishStore";
import PublishModal from "./PublishModal";
import Button from "@/components/ui/Button";
import {
  IconPlus, IconCourses, IconShield, IconLesson, IconBolt,
  IconClock, IconTrash, IconCheck, IconNetwork, IconLinux,
  IconGlobe, IconCrosshair,
} from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const categoryIconMap: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  reseau: IconNetwork,
  linux: IconLinux,
  web: IconGlobe,
  cryptographie: IconCrosshair,
  osint: IconShield,
  securite: IconShield,
};

const levelColor: Record<string, string> = {
  debutant: "text-cyber-green bg-cyber-green/10 border-cyber-green/20",
  intermediaire: "text-cyber-yellow bg-cyber-yellow/10 border-cyber-yellow/20",
  avance: "text-cyber-red bg-cyber-red/10 border-cyber-red/20",
};

const levelLabel: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Inter.",
  avance: "Avancé",
};

// ─── Cards ────────────────────────────────────────────────────────────────────

function PublishedCourseCard({
  course,
  onDelete,
}: {
  course: PublishedCourse;
  onDelete: () => void;
}) {
  return (
    <div className="bg-dark-navy border border-white/5 rounded-xl p-4 flex flex-col gap-3 hover:border-white/10 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className="w-9 h-9 rounded-lg bg-cyber-blue/10 flex items-center justify-center shrink-0">
          <IconCourses size={16} strokeWidth={1.6} className="text-cyber-blue" />
        </div>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-cyber-red hover:bg-cyber-red/10 transition-colors opacity-0 group-hover:opacity-100"
          title="Supprimer"
        >
          <IconTrash size={13} />
        </button>
      </div>

      <div className="flex-1">
        <p className="font-medium text-sm leading-tight line-clamp-2">{course.title}</p>
        <p className="text-xs text-white/40 mt-1 line-clamp-1">{course.description}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", levelColor[course.level])}>
          {levelLabel[course.level]}
        </span>
        <span className="text-[10px] text-white/30 flex items-center gap-1">
          <IconLesson size={10} />
          {course.lessons.length} leçons
        </span>
        <span className="text-[10px] text-white/30 flex items-center gap-1">
          <IconBolt size={10} />
          {course.quizzes.length} quiz
        </span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <span className="text-[10px] text-white/25">
          {new Date(course.publishedAt).toLocaleDateString("fr-FR")}
        </span>
        <Link
          href={`/courses/${course.slug}`}
          className="text-[10px] text-cyber-blue hover:underline"
        >
          Voir le cours →
        </Link>
      </div>
    </div>
  );
}

function PublishedChallengeCard({
  challenge,
  onDelete,
}: {
  challenge: PublishedChallenge;
  onDelete: () => void;
}) {
  const CatIcon = categoryIconMap[challenge.category] ?? IconShield;

  return (
    <div className="bg-dark-navy border border-white/5 rounded-xl p-4 flex flex-col gap-3 hover:border-white/10 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className="w-9 h-9 rounded-lg bg-cyber-green/10 flex items-center justify-center shrink-0">
          <CatIcon size={16} strokeWidth={1.6} className="text-cyber-green" />
        </div>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-cyber-red hover:bg-cyber-red/10 transition-colors opacity-0 group-hover:opacity-100"
          title="Supprimer"
        >
          <IconTrash size={13} />
        </button>
      </div>

      <div className="flex-1">
        <p className="font-medium text-sm leading-tight line-clamp-2">{challenge.title}</p>
        <p className="text-xs text-white/40 mt-1 line-clamp-1">{challenge.description}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", levelColor[challenge.difficulty])}>
          {levelLabel[challenge.difficulty]}
        </span>
        <span className="text-[10px] text-white/30">{challenge.category}</span>
        <span className="text-[10px] text-cyber-green/70">+{challenge.xpReward} XP</span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <span className="text-[10px] text-white/25">
          {new Date(challenge.publishedAt).toLocaleDateString("fr-FR")}
        </span>
        <Link
          href={`/challenges/${challenge.slug}`}
          className="text-[10px] text-cyber-green hover:underline"
        >
          Voir le challenge →
        </Link>
      </div>
    </div>
  );
}

// ─── Section principale ───────────────────────────────────────────────────────

export default function AdminPublishSection() {
  const {
    publishedCourses, publishedChallenges,
    publishCourse, publishChallenge,
    unpublishCourse, unpublishChallenge,
    hydrated,
  } = usePublishStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"courses" | "challenges">("courses");

  if (!hydrated) return null;

  const total = publishedCourses.length + publishedChallenges.length;

  return (
    <>
      <div className="bg-dark-navy border border-white/5 rounded-xl2 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-semibold text-lg">Publications</h3>
            <p className="text-xs text-white/40 mt-0.5">
              {total === 0
                ? "Aucun contenu publié pour le moment"
                : `${publishedCourses.length} cours · ${publishedChallenges.length} challenges`}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <IconPlus size={14} strokeWidth={2.5} />
            Publier
          </Button>
        </div>

        {/* Onglets */}
        {total > 0 && (
          <>
            <div className="flex gap-1 mb-4 bg-cyber-black/40 rounded-xl p-1">
              {(["courses", "challenges"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all",
                    activeTab === tab
                      ? "bg-dark-navy text-white shadow-soft"
                      : "text-white/40 hover:text-white/70"
                  )}
                >
                  {tab === "courses"
                    ? <IconCourses size={14} />
                    : <IconShield size={14} />}
                  {tab === "courses" ? "Cours" : "Challenges"}
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    activeTab === tab ? "bg-cyber-blue/20 text-cyber-blue" : "bg-white/5 text-white/30"
                  )}>
                    {tab === "courses" ? publishedCourses.length : publishedChallenges.length}
                  </span>
                </button>
              ))}
            </div>

            {activeTab === "courses" && (
              <div className="grid sm:grid-cols-2 gap-3">
                {publishedCourses.length === 0 ? (
                  <p className="text-sm text-white/30 col-span-2 text-center py-4">Aucun cours publié</p>
                ) : (
                  publishedCourses.map((c) => (
                    <PublishedCourseCard
                      key={c.id}
                      course={c}
                      onDelete={() => unpublishCourse(c.id)}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === "challenges" && (
              <div className="grid sm:grid-cols-2 gap-3">
                {publishedChallenges.length === 0 ? (
                  <p className="text-sm text-white/30 col-span-2 text-center py-4">Aucun challenge publié</p>
                ) : (
                  publishedChallenges.map((c) => (
                    <PublishedChallengeCard
                      key={c.id}
                      challenge={c}
                      onDelete={() => unpublishChallenge(c.id)}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {total === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
              <IconPlus size={20} strokeWidth={1.4} className="text-white/30" />
            </div>
            <p className="text-sm text-white/50">Aucune publication</p>
            <p className="text-xs text-white/30 mt-1">
              Clique sur "Publier" pour importer un fichier
            </p>
          </div>
        )}
      </div>

      {modalOpen && (
        <PublishModal
          onClose={() => setModalOpen(false)}
          onPublishCourse={(course) => { publishCourse(course); }}
          onPublishChallenge={(challenge) => { publishChallenge(challenge); }}
        />
      )}
    </>
  );
}
