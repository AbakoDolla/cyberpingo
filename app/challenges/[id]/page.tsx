"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell, { loginHref } from "@/components/layout/AppShell";
import LabTerminal from "@/components/challenges/LabTerminal";
import { LAB_CATEGORY_LABELS } from "@/components/challenges/ChallengeCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { IconCheck, IconHint, IconLock, IconTrophy } from "@/components/ui/Icon";
import { useUser, useUserActions } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { levelLabel } from "@/lib/format";
import { getLab } from "@/services/labs.service";
import type { LabSubmission } from "@/types/api";

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
  const { data, error, loading, reload, setData } = useAsync(async () => ({ lab: await getLab(slug, userId) }), [slug, userId]);
  const lab = data?.lab ?? null;
  const solved = Boolean(lab?.solved || (result?.correct ?? false));
  const wrong = result && !result.correct ? result : null;
  const correct = result && result.correct ? result : null;

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
      if (submission.correct) setData((current) => current?.lab ? { lab: { ...current.lab, solved: true, solved_at: new Date().toISOString() } } : current);
    } catch (cause) {
      setFormError(errorMessage(cause, "Ta réponse n’a pas pu être vérifiée."));
    } finally {
      setChecking(false);
    }
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
            <header className="lab-hero">
              <div className="course-detail-hero__badges"><Badge tone="purple">{LAB_CATEGORY_LABELS[lab.category]}</Badge><Badge tone="blue">{levelLabel(lab.difficulty)}</Badge>{solved && <Badge tone="green"><IconCheck size={12} /> Résolu</Badge>}<Badge tone="green">+{lab.xp_reward} XP</Badge></div>
              <h1>{lab.title}</h1>
              <p>{lab.description}</p>
            </header>
            <section className="lab-layout">
              <div className="lab-layout__main">
                <section className="lab-panel"><h2>Objectifs</h2><ul>{lab.objectives.map((objective) => <li key={objective}><IconCheck size={15} />{objective}</li>)}</ul></section>
                <LabTerminal lines={lab.terminal_lines} />
                {!userId ? (
                  <section className="lab-panel"><h2>Ta réponse</h2><p><IconLock size={15} /> Connecte-toi pour soumettre ton flag, suivre tes tentatives et gagner +{lab.xp_reward} XP.</p><div className="study-actions"><Link className="study-button" href={loginHref(`/challenges/${slug}`)}>Se connecter pour répondre</Link><Link className="study-button study-button--ghost" href="/register">Créer un compte gratuit</Link></div></section>
                ) : (
                <section className="lab-panel"><h2>Ta réponse</h2><div className="lab-answer"><Input id="lab-answer" label="Flag ou réponse" placeholder={lab.flag_placeholder} maxLength={300} value={answer} disabled={checking || solved} onChange={(event) => { setAnswer(event.target.value); setFormError(null); if (wrong) setResult(null); }} onKeyDown={(event) => { if (event.key === "Enter") void validate(); }} error={formError ?? undefined} /><Button variant="success" loading={checking} disabled={checking || solved} onClick={() => void validate()}>Valider</Button></div><div className="lab-feedback-zone" aria-live="polite">{wrong && <p className="lab-feedback is-wrong" role="status">Réponse incorrecte. {wrong.remaining_attempts} tentative{wrong.remaining_attempts > 1 ? "s" : ""} restante{wrong.remaining_attempts > 1 ? "s" : ""}. Relis les objectifs ou révèle un indice.</p>}{solved && <p className="lab-feedback is-correct" role="status"><IconTrophy size={16} /> Bravo, lab résolu ! {correct && "xp_awarded" in correct && correct.xp_awarded > 0 ? `+${correct.xp_awarded} XP.` : "Tu peux le relire à tout moment."}</p>}</div></section>
                )}
              </div>
              <aside className="lab-hints"><h2>Indices progressifs</h2>{lab.hints.length === 0 ? <p>Aucun indice n’est nécessaire pour ce lab.</p> : <><ol>{lab.hints.slice(0, visibleHints).map((hint, index) => <li key={hint}><IconHint size={15} /> <span>Indice {index + 1} : {hint}</span></li>)}</ol>{visibleHints < lab.hints.length ? <Button variant="secondary" size="sm" onClick={() => setVisibleHints((count) => Math.min(lab.hints.length, count + 1))}>Révéler un indice</Button> : <p>Tous les indices sont affichés.</p>}</>}</aside>
            </section>
          </>
        )}
    </div>
  );
}

/** Visitors can read a lab; the answer form is replaced by a sign-in prompt. */
export default function ChallengeDetailPage() {
  return <AppShell allowGuest><ChallengeDetailView /></AppShell>;
}
