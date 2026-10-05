"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import LabArt from "@/components/art/LabArt";
import AppShell, { loginHref } from "@/components/layout/AppShell";
import UnlockModal from "@/components/cyberbits/UnlockModal";
import LabAssets from "@/components/challenges/LabAssets";
import LabEquipment from "@/components/equipment/LabEquipment";
import LabReportForm from "@/components/challenges/LabReportForm";
import LabTasks from "@/components/challenges/LabTasks";
import LabTerminal from "@/components/challenges/LabTerminal";
import PacketTracerGateway from "@/components/challenges/PacketTracerGateway";
import { LAB_CATEGORY_LABELS } from "@/components/challenges/ChallengeCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { IconCheck, IconClock, IconHint, IconLock, IconTrophy } from "@/components/ui/Icon";
import { useUser, useUserActions } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { levelLabel } from "@/lib/format";
import { getLab, listLabAssets, listLabTasks } from "@/services/labs.service";
import type { LabFormat, LabSubmission, LabTaskResult } from "@/types/api";

const FORMAT_LABELS: Record<LabFormat, string> = { terminal: "Terminal", pcap: "Capture réseau", logs: "Journaux", packet_tracer: "Packet Tracer" };

function ChallengeDetailView() {
  const params = useParams<{ id: string }>();
  const slug = params.id;
  const { profile } = useUser();
  const userId = profile?.id ?? null;
  const { submitLab } = useUserActions();
  const [answer, setAnswer] = useState("");
  const [visibleHints, setVisibleHints] = useState(0);
  const [result, setResult] = useState<LabSubmission | null>(null);
  const [checking, setChecking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const { data, error, loading, reload, setData } = useAsync(async () => {
    const lab = await getLab(slug, userId);
    if (!lab) return { lab: null, tasks: [], assets: [] };
    const [tasks, assets] = await Promise.all([listLabTasks(lab.id, userId), listLabAssets(lab.id)]);
    return { lab, tasks, assets };
  }, [slug, userId]);
  const lab = data?.lab ?? null;
  const tasks = data?.tasks ?? [];
  const assets = data?.assets ?? [];
  const solved = Boolean(lab?.solved || (result?.correct ?? false));
  const wrong = result && !result.correct ? result : null;
  const correct = result && result.correct ? result : null;
  const isTerminal = lab?.format === "terminal";
  const published = lab?.status === "published";
  const hasReport = Boolean(lab && (lab.format === "packet_tracer" || assets.some((asset) => asset.kind === "report_template")));

  async function validate() {
    if (!lab || checking || solved || !userId) return;
    const value = answer.trim();
    if (!value) { setFormError("Saisis une réponse avant de valider."); return; }
    if (value.length > 300) { setFormError("Ta réponse doit faire 300 caractères maximum."); return; }
    setChecking(true);
    setFormError(null);
    try {
      const submission = await submitLab(lab.id, value);
      setResult(submission);
      if (submission.correct) setData((current) => current?.lab ? { ...current, lab: { ...current.lab, solved: true, solved_at: new Date().toISOString() } } : current);
    } catch (cause) {
      setFormError(errorMessage(cause, "Ta réponse n’a pas pu être vérifiée."));
    } finally {
      setChecking(false);
    }
  }

  function taskSolved(taskId: string, outcome: Extract<LabTaskResult, { correct: true }>) {
    const finished = !outcome.preview && outcome.lab_completed;
    setData((current) => current?.lab ? {
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId ? { ...task, solved: true } : task),
      lab: finished && !current.lab.solved ? { ...current.lab, solved: true, solved_at: new Date().toISOString() } : current.lab,
    } : current);
  }

  return (
    <div className="study-page lab-detail-page">
        <Link className="study-link" href="/challenges">← Tous les labs</Link>
        {loading && <div className="study-empty" role="status"><h1>Chargement du lab…</h1></div>}
        {error && !loading && <div className="study-empty" role="alert"><h1>Impossible de charger ce lab.</h1><p>{error.message}</p><Button variant="secondary" onClick={() => void reload()}>Réessayer</Button></div>}
        {!loading && !error && !lab && <div className="study-empty"><h1>Lab introuvable.</h1></div>}
        {lab && (
          <>
            {lab.status === "draft" && <div className="learning-banner learning-banner--preview">Aperçu brouillon : le lab peut être testé par l’équipe, sans XP.</div>}
            <header className="lab-hero lab-hero--visual">
              <div className="lab-hero__visual">
                <div className="lab-hero__media" aria-hidden="true"><LabArt category={lab.category} className="lab-hero__art" photo sizes="(max-width: 1100px) 100vw, 66vw" priority /></div>
                <div className="lab-hero__content">
                  <div className="course-detail-hero__badges"><Badge tone="purple">{LAB_CATEGORY_LABELS[lab.category]}</Badge><Badge tone="blue">{levelLabel(lab.difficulty)}</Badge><Badge tone="neutral">{FORMAT_LABELS[lab.format]}</Badge>{lab.is_assessment && <Badge tone="amber">Évaluation pratique</Badge>}{solved && <Badge tone="green"><IconCheck size={12} /> Résolu</Badge>}<Badge tone={(lab.cb_price === 0) ? "green" : "blue"}>{(lab.cb_price === 0) ? "Gratuit" : `${lab.cb_price ?? (lab.difficulty === "avance" ? 180 : lab.difficulty === "intermediaire" ? 80 : 30)} CB`}</Badge><Badge tone="green">+{lab.xp_reward} XP</Badge></div>
                  <h1>{lab.title.replace(/ ([:?!;])/g, "\u00A0$1")}</h1>
                  <p>{lab.description}</p>
                  <div className="lab-hero__facts" aria-label="Informations clés du lab">
                    <span>{lab.objectives.length} objectif{lab.objectives.length > 1 ? "s" : ""}</span>
                    {isTerminal ? <span>{lab.hints.length} indice{lab.hints.length > 1 ? "s" : ""}</span> : <span>{tasks.length} question{tasks.length > 1 ? "s" : ""}</span>}
                    {lab.estimated_minutes > 0 && <span><IconClock size={13} /> {lab.estimated_minutes} min</span>}
                    <span>{solved ? "Scénario résolu" : "Prêt à jouer"}</span>
                  </div>
                </div>
              </div>
            </header>
            <section className="lab-layout">
              <div className="lab-layout__main">
                {lab.briefing && <section className="lab-panel lab-briefing"><h2>Mise en situation</h2><p>{lab.briefing}</p></section>}
                <LabEquipment slug={lab.slug} />
                <figure className="lesson-media lesson-video-slot mb-4">
                  <div className="lesson-video-slot__frame" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9.5 5 2.5-5 2.5z" /></svg>
                  </div>
                  <figcaption>
                    <strong>Démonstration vidéo du lab en préparation</strong>
                    <span>Scénario : {lab.title}</span>
                    <small>Emplacement réservé. Résous le laboratoire avec le briefing, les objectifs et les outils ci-dessous.</small>
                  </figcaption>
                </figure>
                <section className="lab-panel"><h2>Objectifs</h2><ul>{lab.objectives.map((objective) => <li key={objective}><IconCheck size={15} />{objective}</li>)}</ul></section>
                {(lab.constraints.length > 0 || lab.tools.length > 0) && (
                  <section className="lab-panel lab-context" aria-label="Contraintes et outils">
                    {lab.constraints.length > 0 && <div><h2>Contraintes</h2><ul>{lab.constraints.map((item) => <li key={item}><IconLock size={14} />{item}</li>)}</ul></div>}
                    {lab.tools.length > 0 && <div><h2>Outils</h2><ul className="lab-context__tools">{lab.tools.map((tool) => <li key={tool}>{tool}</li>)}</ul></div>}
                  </section>
                )}
                {lab.format === "packet_tracer" && <PacketTracerGateway assets={assets} requiresComputer={lab.requires_computer} />}
                <LabAssets assets={assets} />
                {isTerminal && <LabTerminal lines={lab.terminal_lines} />}
                {tasks.length > 0 && <LabTasks tasks={tasks} signedIn={Boolean(userId)} signInHref={loginHref(`/challenges/${slug}`)} xpReward={lab.xp_reward} onSolved={taskSolved} />}
                {!isTerminal && tasks.length === 0 && <section className="lab-panel"><h2>Questions du lab</h2><p>Les questions de ce lab sont en cours de rédaction par l’équipe.</p></section>}
                {!isTerminal && solved && <section className="lab-panel lab-feedback-zone"><p className="lab-feedback is-correct" role="status"><IconTrophy size={16} /> Bravo, lab terminé ! Tu peux relire les fichiers à tout moment.</p></section>}
                {hasReport && userId && <LabReportForm labId={lab.id} userId={userId} published={published} />}
                {isTerminal && (!userId ? (
                  <section className="lab-panel"><h2>Ta réponse</h2><p><IconLock size={15} /> Connecte-toi pour soumettre ton flag, suivre tes tentatives et gagner +{lab.xp_reward} XP.</p><div className="study-actions"><Link className="study-button" href={loginHref(`/challenges/${slug}`)}>Se connecter pour répondre</Link><Link className="study-button study-button--ghost" href="/register">Créer un compte gratuit</Link></div></section>
                ) : (
                <section className="lab-panel"><h2>Ta réponse</h2><div className="lab-answer"><Input id="lab-answer" label="Flag ou réponse" placeholder={lab.flag_placeholder} maxLength={300} value={answer} disabled={checking || solved} onChange={(event) => { setAnswer(event.target.value); setFormError(null); if (wrong) setResult(null); }} onKeyDown={(event) => { if (event.key === "Enter") void validate(); }} error={formError ?? undefined} /><Button variant="success" loading={checking} disabled={checking || solved} onClick={() => void validate()}>Valider</Button></div>{formError && formError.includes("CyberBits") && (<div className="settings-status is-error flex items-center justify-between gap-3 mt-3" role="alert"><span>{formError}</span><Button variant="secondary" size="sm" onClick={() => setUnlockModalOpen(true)}>Débloquer ce lab ({lab.cb_price ?? (lab.difficulty === "avance" ? 180 : lab.difficulty === "intermediaire" ? 80 : 30)} CB)</Button></div>)}<div className="lab-feedback-zone" aria-live="polite">{wrong && <p className="lab-feedback is-wrong" role="status">Réponse incorrecte. {wrong.remaining_attempts} tentative{wrong.remaining_attempts > 1 ? "s" : ""} restante{wrong.remaining_attempts > 1 ? "s" : ""}. Relis les objectifs ou révèle un indice.</p>}{solved && <p className="lab-feedback is-correct" role="status"><IconTrophy size={16} /> Bravo, lab résolu ! {correct && "xp_awarded" in correct && correct.xp_awarded > 0 ? `+${correct.xp_awarded} XP.` : "Tu peux le relire à tout moment."}</p>}</div></section>
                ))}
              </div>
              {!isTerminal && tasks.length > 0 && (
                <aside className="lab-rail" aria-label="Récapitulatif du lab">
                  <h2>Parcours du lab</h2>
                  <ol className="lab-rail__steps">
                    {tasks.map((task, index) => <li key={task.id} className={task.solved ? "is-solved" : undefined}><a href={`#task-row-${task.id}`}>{task.solved ? <IconCheck size={13} /> : <span aria-hidden="true">{index + 1}</span>}Question {index + 1}</a></li>)}
                  </ol>
                  <dl className="lab-rail__facts">
                    <div><dt>Récompense</dt><dd>+{lab.xp_reward} XP</dd></div>
                    {lab.estimated_minutes > 0 && <div><dt>Durée estimée</dt><dd>{lab.estimated_minutes} min</dd></div>}
                  </dl>
                </aside>
              )}
              {isTerminal && <aside className="lab-hints"><h2>Indices progressifs</h2>{lab.hints.length === 0 ? <p>Aucun indice n’est nécessaire pour ce lab.</p> : <><ol>{lab.hints.slice(0, visibleHints).map((hint, index) => <li key={hint}><IconHint size={15} /> <span>Indice {index + 1} : {hint}</span></li>)}</ol>{visibleHints < lab.hints.length ? <Button variant="secondary" size="sm" onClick={() => setVisibleHints((count) => Math.min(lab.hints.length, count + 1))}>Révéler un indice</Button> : <p>Tous les indices sont affichés.</p>}</>}</aside>}
            </section>

            <UnlockModal
              open={unlockModalOpen}
              onClose={() => setUnlockModalOpen(false)}
              target={lab ? {
                kind: "lab",
                id: lab.id,
                slug: lab.slug,
                title: lab.title,
                price: lab.cb_price ?? (lab.difficulty === "avance" ? 180 : lab.difficulty === "intermediaire" ? 80 : 30),
                level: lab.difficulty,
                category: lab.category,
              } : null}
              onSuccess={() => {
                void reload();
              }}
            />
          </>
        )}
    </div>
  );
}

/** Visitors can read a lab; the answer form is replaced by a sign-in prompt. */
export default function ChallengeDetailPage() {
  return <AppShell allowGuest><ChallengeDetailView /></AppShell>;
}