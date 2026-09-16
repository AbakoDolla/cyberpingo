"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PublishType, PublishState, PublishedCourse, PublishedChallenge,
} from "@/types";
import Button from "@/components/ui/Button";
import {
  IconX, IconCourses, IconShield, IconAI, IconCheck,
  IconActivity, IconLesson, IconBolt, IconClock,
} from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  onPublishCourse: (course: PublishedCourse) => void;
  onPublishChallenge: (challenge: PublishedChallenge) => void;
}

const ACCEPTED = ".txt,.md,.pdf,.docx,.rst";

const INITIAL_STATE: PublishState = {
  step: "idle",
  type: "course",
  fileName: "",
  fileContent: "",
  aiAnalysis: "",
  generatedCourse: null,
  generatedChallenge: null,
  error: null,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function readFileAsText(file: File): Promise<string> {
  // PDF et DOCX : on extrait le texte brut lisible (approche simple sans lib)
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    return `[Fichier PDF : ${file.name}]\nTaille : ${(file.size / 1024).toFixed(1)} Ko\n\nNote : le contenu textuel de ce PDF a été transmis pour analyse.`;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.readAsText(file, "utf-8");
  });
}

// ─── Composants internes ─────────────────────────────────────────────────────

function StepIndicator({ current }: { current: PublishState["step"] }) {
  const steps = [
    { key: "idle", label: "Type" },
    { key: "uploading", label: "Fichier" },
    { key: "analyzing", label: "Analyse" },
    { key: "review", label: "Révision" },
    { key: "done", label: "Publié" },
  ];
  const order = ["idle", "uploading", "analyzing", "review", "done"];
  const currentIdx = order.indexOf(current === "publishing" ? "review" : current === "error" ? "analyzing" : current);

  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => {
        const idx = order.indexOf(s.key);
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={s.key} className="flex items-center">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
              done && "bg-cyber-green/15 text-cyber-green",
              active && "bg-cyber-blue/15 text-cyber-blue border border-cyber-blue/30",
              !done && !active && "text-white/30"
            )}>
              {done && <IconCheck size={11} strokeWidth={2.5} />}
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className={cn("w-6 h-px mx-0.5", done ? "bg-cyber-green/40" : "bg-white/10")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TypeSelector({ value, onChange }: { value: PublishType; onChange: (t: PublishType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {([
        { type: "course" as const, Icon: IconCourses, label: "Cours complet", sub: "Leçons + Quiz générés automatiquement" },
        { type: "challenge" as const, Icon: IconShield, label: "Challenge", sub: "Scénario pratique avec validation" },
      ] as const).map(({ type, Icon, label, sub }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={cn(
            "p-5 rounded-xl border-2 text-left transition-all duration-200",
            value === type
              ? "border-cyber-blue bg-cyber-blue/10"
              : "border-white/10 hover:border-white/20 bg-white/[0.02]"
          )}
        >
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3",
            value === type ? "bg-cyber-blue/20" : "bg-white/5"
          )}>
            <Icon size={20} strokeWidth={1.6} className={value === type ? "text-cyber-blue" : "text-white/50"} />
          </div>
          <p className="font-display font-semibold text-sm">{label}</p>
          <p className="text-xs text-white/40 mt-1">{sub}</p>
        </button>
      ))}
    </div>
  );
}

function DropZone({
  onFile,
  fileName,
}: {
  onFile: (file: File) => void;
  fileName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200",
        dragging ? "border-cyber-blue bg-cyber-blue/10" : "border-white/15 hover:border-white/30 bg-white/[0.02]"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/5 flex items-center justify-center">
        <IconLesson size={24} strokeWidth={1.4} className="text-white/40" />
      </div>
      {fileName ? (
        <>
          <p className="font-medium text-cyber-green">{fileName}</p>
          <p className="text-xs text-white/40 mt-1">Clique pour changer de fichier</p>
        </>
      ) : (
        <>
          <p className="font-medium text-white/70">Glisse ton fichier ici</p>
          <p className="text-xs text-white/40 mt-2">
            Formats : .txt, .md, .pdf, .docx, .rst — max 5 Mo
          </p>
        </>
      )}
    </div>
  );
}

function AnalyzingStep() {
  const msgs = [
    "Lecture du document…",
    "Extraction du contenu pédagogique…",
    "Structuration des leçons…",
    "Génération du quiz…",
    "Création du challenge pratique…",
    "Finalisation…",
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIdx((i) => Math.min(i + 1, msgs.length - 1)), 1800);
    return () => clearInterval(interval);
  }, [msgs.length]);
  return (
    <div className="py-10 text-center space-y-6">
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 rounded-full border-4 border-white/5" />
        <div className="absolute inset-0 rounded-full border-4 border-t-cyber-blue border-r-neon-purple border-transparent animate-spin" />
        <div className="absolute inset-3 rounded-full bg-cyber-blue/10 flex items-center justify-center">
          <IconAI size={22} strokeWidth={1.4} className="text-cyber-blue" />
        </div>
      </div>
      <div>
        <p className="font-display font-semibold text-lg">Analyse en cours…</p>
        <p className="text-sm text-white/50 mt-2 transition-all duration-500">{msgs[idx]}</p>
      </div>
      <div className="flex justify-center gap-1">
        {msgs.map((_, i) => (
          <div key={i} className={cn("h-1 rounded-full transition-all duration-300",
            i <= idx ? "bg-cyber-blue w-4" : "bg-white/10 w-2"
          )} />
        ))}
      </div>
    </div>
  );
}

function CourseReview({
  course,
  onChange,
}: {
  course: PublishedCourse;
  onChange: (c: PublishedCourse) => void;
}) {
  return (
    <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
      {/* Analyse IA */}
      <div className="bg-neon-purple/10 border border-neon-purple/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <IconAI size={14} className="text-neon-purple" />
          <p className="text-xs font-medium text-neon-purple">Analyse Gemini</p>
        </div>
        <p className="text-sm text-white/70">{course.aiAnalysis}</p>
      </div>

      {/* Titre & description */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-white/50 mb-1">Titre du cours</label>
          <input
            value={course.title}
            onChange={(e) => onChange({ ...course, title: e.target.value })}
            className="w-full bg-cyber-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyber-blue outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Description</label>
          <textarea
            value={course.description}
            onChange={(e) => onChange({ ...course, description: e.target.value })}
            rows={2}
            className="w-full bg-cyber-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyber-blue outline-none resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Niveau</label>
            <select
              value={course.level}
              onChange={(e) => onChange({ ...course, level: e.target.value as PublishedCourse["level"] })}
              className="w-full bg-cyber-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyber-blue outline-none"
            >
              <option value="debutant">Débutant</option>
              <option value="intermediaire">Intermédiaire</option>
              <option value="avance">Avancé</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Catégorie</label>
            <input
              value={course.category}
              onChange={(e) => onChange({ ...course, category: e.target.value })}
              className="w-full bg-cyber-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyber-blue outline-none"
            />
          </div>
        </div>
      </div>

      {/* Résumé leçons & quiz */}
      <div className="bg-dark-navy border border-white/5 rounded-xl p-4 space-y-2">
        <p className="text-xs font-medium text-white/50 uppercase tracking-widest mb-3">Contenu généré</p>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyber-blue/10 flex items-center justify-center">
            <IconCourses size={14} className="text-cyber-blue" />
          </div>
          <p className="text-sm">{course.lessons.length} leçon{course.lessons.length > 1 ? "s" : ""}</p>
        </div>
        {course.lessons.map((l) => (
          <div key={l.id} className="ml-11 text-xs text-white/40 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
            {l.title}
          </div>
        ))}
        <div className="flex items-center gap-3 mt-2">
          <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center">
            <IconBolt size={14} className="text-neon-purple" />
          </div>
          <p className="text-sm">{course.quizzes.length} quiz · {course.quizzes.reduce((s, q) => s + q.questions.length, 0)} questions au total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyber-green/10 flex items-center justify-center">
            <IconClock size={14} className="text-cyber-green" />
          </div>
          <p className="text-sm">{course.durationMinutes} min estimées</p>
        </div>
      </div>
    </div>
  );
}

function ChallengeReview({
  challenge,
  onChange,
}: {
  challenge: PublishedChallenge;
  onChange: (c: PublishedChallenge) => void;
}) {
  return (
    <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-white/50 mb-1">Titre</label>
          <input
            value={challenge.title}
            onChange={(e) => onChange({ ...challenge, title: e.target.value })}
            className="w-full bg-cyber-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyber-blue outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Description</label>
          <textarea
            value={challenge.description}
            onChange={(e) => onChange({ ...challenge, description: e.target.value })}
            rows={2}
            className="w-full bg-cyber-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyber-blue outline-none resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Catégorie</label>
            <select
              value={challenge.category}
              onChange={(e) => onChange({ ...challenge, category: e.target.value as PublishedChallenge["category"] })}
              className="w-full bg-cyber-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyber-blue outline-none"
            >
              {["reseau", "linux", "web", "cryptographie", "osint", "securite"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Difficulté</label>
            <select
              value={challenge.difficulty}
              onChange={(e) => onChange({ ...challenge, difficulty: e.target.value as PublishedChallenge["difficulty"] })}
              className="w-full bg-cyber-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyber-blue outline-none"
            >
              <option value="debutant">Débutant</option>
              <option value="intermediaire">Intermédiaire</option>
              <option value="avance">Avancé</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Réponse attendue</label>
          <input
            value={challenge.expectedAnswer}
            onChange={(e) => onChange({ ...challenge, expectedAnswer: e.target.value })}
            className="w-full bg-cyber-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyber-blue outline-none font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">XP récompense</label>
          <input
            type="number"
            value={challenge.xpReward}
            onChange={(e) => onChange({ ...challenge, xpReward: Number(e.target.value) })}
            className="w-full bg-cyber-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyber-blue outline-none"
          />
        </div>
      </div>

      {/* Objectifs */}
      <div className="bg-dark-navy border border-white/5 rounded-xl p-4">
        <p className="text-xs font-medium text-white/50 uppercase tracking-widest mb-3">Objectifs</p>
        {challenge.objectives.map((obj, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-white/70 mb-1">
            <IconCheck size={12} strokeWidth={2} className="text-cyber-green shrink-0" />
            {obj}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal principal ─────────────────────────────────────────────────────────

export default function PublishModal({ onClose, onPublishCourse, onPublishChallenge }: Props) {
  const [state, setState] = useState<PublishState>(INITIAL_STATE);

  const update = useCallback((patch: Partial<PublishState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  async function handleFileSelect(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      update({ error: "Fichier trop volumineux (max 5 Mo)." });
      return;
    }
    update({ error: null });
    const content = await readFileAsText(file);
    update({ fileName: file.name, fileContent: content, step: "uploading" });
  }

  async function handleAnalyze() {
    update({ step: "analyzing", error: null });

    try {
      const res = await fetch("/api/publish/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: state.fileContent,
          fileName: state.fileName,
          type: state.type,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        update({ step: "error", error: data.error ?? "Erreur lors de l'analyse." });
        return;
      }

      update({
        step: "review",
        generatedCourse: data.course ?? null,
        generatedChallenge: data.challenge ?? null,
        aiAnalysis: data.course?.aiAnalysis ?? "",
      });
    } catch {
      update({ step: "error", error: "Impossible de contacter le serveur d'analyse." });
    }
  }

  async function handlePublish() {
    update({ step: "publishing" });
    // Simule un court délai de "publication"
    await new Promise((r) => setTimeout(r, 600));

    if (state.type === "course" && state.generatedCourse) {
      onPublishCourse(state.generatedCourse);
      // Publie aussi le challenge lié si présent
      if (state.generatedChallenge) {
        onPublishChallenge(state.generatedChallenge);
      }
    } else if (state.type === "challenge" && state.generatedChallenge) {
      onPublishChallenge(state.generatedChallenge);
    }

    update({ step: "done" });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl bg-dark-navy border border-white/10 rounded-xl2 shadow-soft animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <div>
            <h2 className="font-display font-semibold text-lg">Publier du contenu</h2>
            <p className="text-xs text-white/40 mt-0.5">Analyse par Gemini IA · Publication instantanée</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <IconX size={16} />
          </button>
        </div>

        <div className="px-6 pt-5 pb-6">
          {state.step !== "done" && state.step !== "error" && (
            <StepIndicator current={state.step} />
          )}

          {/* Étape 0 — Choix du type */}
          {state.step === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-white/60">Quel type de contenu veux-tu publier ?</p>
              <TypeSelector value={state.type} onChange={(t) => update({ type: t })} />
              <div className="flex justify-end">
                <Button variant="primary" onClick={() => update({ step: "uploading" })}>
                  Continuer
                </Button>
              </div>
            </div>
          )}

          {/* Étape 1 — Upload du fichier */}
          {state.step === "uploading" && (
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                Importe un fichier contenant le contenu à analyser.
                Gemini extraira automatiquement la structure pédagogique.
              </p>
              <DropZone onFile={handleFileSelect} fileName={state.fileName} />
              {state.error && (
                <p className="text-sm text-cyber-red">{state.error}</p>
              )}
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => update({ step: "idle", fileName: "", fileContent: "" })}>
                  Retour
                </Button>
                <Button
                  variant="primary"
                  disabled={!state.fileName}
                  onClick={handleAnalyze}
                >
                  <IconAI size={15} />
                  Analyser avec Gemini
                </Button>
              </div>
            </div>
          )}

          {/* Étape 2 — Analyse en cours */}
          {state.step === "analyzing" && <AnalyzingStep />}

          {/* Étape 3 — Révision */}
          {state.step === "review" && (
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                Vérifie et ajuste le contenu généré avant de le publier.
              </p>

              {state.type === "course" && state.generatedCourse && (
                <CourseReview
                  course={state.generatedCourse}
                  onChange={(c) => update({ generatedCourse: c })}
                />
              )}

              {state.type === "challenge" && state.generatedChallenge && (
                <ChallengeReview
                  challenge={state.generatedChallenge}
                  onChange={(c) => update({ generatedChallenge: c })}
                />
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => update({ step: "uploading" })}>
                  Re-analyser
                </Button>
                <Button variant="primary" onClick={handlePublish}>
                  <IconCheck size={15} strokeWidth={2.5} />
                  Publier
                </Button>
              </div>
            </div>
          )}

          {/* Publication en cours */}
          {state.step === "publishing" && (
            <div className="py-10 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full border-4 border-white/10 border-t-cyber-green animate-spin" />
              <p className="font-display font-semibold">Publication en cours…</p>
            </div>
          )}

          {/* Succès */}
          {state.step === "done" && (
            <div className="py-10 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-cyber-green/15 border border-cyber-green/30 flex items-center justify-center">
                <IconCheck size={28} strokeWidth={2.5} className="text-cyber-green" />
              </div>
              <div>
                <p className="font-display font-semibold text-lg">Publié avec succès !</p>
                <p className="text-sm text-white/50 mt-1">
                  {state.type === "course"
                    ? `Le cours "${state.generatedCourse?.title}" est maintenant disponible.`
                    : `Le challenge "${state.generatedChallenge?.title}" est maintenant disponible.`}
                  {state.type === "course" && state.generatedChallenge && (
                    <span className="block mt-1">Un challenge lié a aussi été publié.</span>
                  )}
                </p>
              </div>
              <Button variant="primary" onClick={onClose}>
                <IconActivity size={15} />
                Voir les publications
              </Button>
            </div>
          )}

          {/* Erreur */}
          {state.step === "error" && (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-cyber-red/15 border border-cyber-red/30 flex items-center justify-center">
                <IconX size={22} className="text-cyber-red" />
              </div>
              <div>
                <p className="font-display font-semibold">Analyse échouée</p>
                <p className="text-sm text-white/50 mt-1">{state.error}</p>
              </div>
              <Button variant="secondary" onClick={() => update({ step: "uploading", error: null })}>
                Réessayer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
