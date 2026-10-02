"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ProgressBar from "@/components/ui/ProgressBar";
import { IconCheck, IconHint, IconLock } from "@/components/ui/Icon";
import { useUserActions } from "@/context/UserContext";
import { errorMessage } from "@/lib/errors";
import type { LabTask, LabTaskResult } from "@/types/api";

interface LabTasksProps {
  tasks: LabTask[];
  signedIn: boolean;
  signInHref: string;
  xpReward: number;
  onSolved: (taskId: string, result: Extract<LabTaskResult, { correct: true }>) => void;
}

function TaskRow({ task, index, signedIn, onSolved }: { task: LabTask; index: number; signedIn: boolean; onSolved: LabTasksProps["onSolved"] }) {
  const { submitLabTask } = useUserActions();
  const [answer, setAnswer] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const inputId = `task-${task.id}`;

  async function check() {
    if (checking || task.solved) return;
    const value = answer.trim();
    if (!value) { setError("Saisis une réponse avant de valider."); return; }
    setChecking(true);
    setError(null);
    try {
      const result = await submitLabTask(task.id, value);
      if (result.correct) {
        setRemaining(null);
        setExplanation(result.explanation);
        onSolved(task.id, result);
      } else {
        setRemaining(result.remaining_attempts);
      }
    } catch (cause) {
      setError(errorMessage(cause, "Ta réponse n’a pas pu être vérifiée."));
    } finally {
      setChecking(false);
    }
  }

  return (
    <li id={`task-row-${task.id}`} className={`lab-task${task.solved ? " is-solved" : ""}`}>
      <span className="lab-task__index" aria-hidden="true">{task.solved ? <IconCheck size={14} /> : index + 1}</span>
      <div className="lab-task__body">
        <p className="lab-task__prompt"><span className="sr-only">Question {index + 1} : </span>{task.prompt}</p>
        {task.solved && !explanation && <p className="lab-task__done">Question réussie.</p>}
        {explanation && <p className="lab-task__explanation" role="status">{explanation}</p>}
        {!task.solved && signedIn && (
          <>
            <div className="lab-task__form">
              <Input
                id={inputId}
                label="Ta réponse"
                placeholder={task.answer_format || "Ta réponse"}
                maxLength={300}
                value={answer}
                disabled={checking}
                onChange={(event) => { setAnswer(event.target.value); setError(null); setRemaining(null); }}
                onKeyDown={(event) => { if (event.key === "Enter") void check(); }}
                error={error ?? undefined}
              />
              <Button variant="success" size="sm" loading={checking} disabled={checking} onClick={() => void check()}>Valider</Button>
            </div>
            {remaining !== null && <p className="lab-task__wrong" role="status">Réponse incorrecte. {remaining} tentative{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""} sur cette question.</p>}
            {task.hint && (hintShown
              ? <p className="lab-task__hint"><IconHint size={14} /> {task.hint}</p>
              : <button type="button" className="lab-task__hint-button" onClick={() => setHintShown(true)}><IconHint size={14} /> Voir l’indice</button>)}
          </>
        )}
      </div>
    </li>
  );
}

/** One short question per observation: the answers are checked server-side, never shipped to the browser. */
export default function LabTasks({ tasks, signedIn, signInHref, xpReward, onSolved }: LabTasksProps) {
  const done = tasks.filter((task) => task.solved).length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <section className="lab-panel lab-tasks" aria-labelledby="lab-tasks-title">
      <div className="lab-tasks__head">
        <h2 id="lab-tasks-title">Questions du lab</h2>
        <p className="lab-tasks__count" aria-live="polite">{done} / {tasks.length} réussies</p>
      </div>
      <ProgressBar value={percent} tone="green" height="sm" label="Questions réussies" />
      {!signedIn && (
        <p className="lab-tasks__lock"><IconLock size={15} /> Connecte-toi pour répondre, suivre ta progression et gagner +{xpReward} XP.{" "}
          <Link className="lab-tasks__link" href={signInHref}>Se connecter</Link></p>
      )}
      <ol className="lab-tasks__list">
        {tasks.map((task, index) => <TaskRow key={task.id} task={task} index={index} signedIn={signedIn} onSolved={onSolved} />)}
      </ol>
    </section>
  );
}