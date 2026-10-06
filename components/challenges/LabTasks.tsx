"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ProgressBar from "@/components/ui/ProgressBar";
import { IconCheck, IconHint, IconLock } from "@/components/ui/Icon";
import { useUserActions } from "@/context/UserContext";
import { errorMessage } from "@/lib/errors";
import { playSuccessSound, playFailureSound } from "@/lib/mascot/sound-effects";
import type { LabTask, LabTaskResult } from "@/types/api";

interface LabTasksProps {
  tasks: LabTask[];
  signedIn: boolean;
  signInHref: string;
  xpReward: number;
  onSolved: (taskId: string, result: Extract<LabTaskResult, { correct: true }>) => void;
}

function TaskRow({
  task,
  index,
  signedIn,
  isLocked,
  onSolved,
}: {
  task: LabTask;
  index: number;
  signedIn: boolean;
  isLocked: boolean;
  onSolved: LabTasksProps["onSolved"];
}) {
  const { submitLabTask } = useUserActions();
  const [answer, setAnswer] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const inputId = `task-${task.id}`;

  async function check() {
    if (checking || task.solved || isLocked) return;
    const value = answer.trim();
    if (!value) { setError("Saisis une réponse avant de valider."); return; }
    setChecking(true);
    setError(null);
    try {
      const result = await submitLabTask(task.id, value);
      if (result.correct) {
        playSuccessSound();
        setRemaining(null);
        setExplanation(result.explanation);
        onSolved(task.id, result);
      } else {
        playFailureSound();
        setRemaining(result.remaining_attempts);
      }
    } catch (cause) {
      setError(errorMessage(cause, "Ta réponse n’a pas pu être vérifiée."));
    } finally {
      setChecking(false);
    }
  }

  return (
    <li
      id={`task-row-${task.id}`}
      className={`lab-task${task.solved ? " is-solved" : ""}${isLocked ? " is-locked" : ""}`}
    >
      <span className="lab-task__index" aria-hidden="true">
        {task.solved ? <IconCheck size={14} /> : isLocked ? <IconLock size={13} /> : index + 1}
      </span>
      <div className="lab-task__body">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="lab-task__prompt">
            <span className="sr-only">Question {index + 1} : </span>
            {task.prompt}
          </p>
          {isLocked && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <IconLock size={11} /> Verrouillée
            </span>
          )}
        </div>
        {task.solved && !explanation && <p className="lab-task__done">Question réussie.</p>}
        {explanation && <p className="lab-task__explanation" role="status">{explanation}</p>}
        {isLocked && signedIn && !task.solved && (
          <div className="lab-task__locked-notice mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
            <IconLock size={14} className="shrink-0 text-amber-400" />
            <span>
              <strong>Étape verrouillée :</strong> Réponds avec succès à la <strong>Question 1</strong> pour débloquer cette question.
            </span>
          </div>
        )}
        {!task.solved && !isLocked && signedIn && (
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
  const firstTaskSolved = tasks.length === 0 || tasks[0].solved;

  return (
    <section className="lab-panel lab-tasks" aria-labelledby="lab-tasks-title">
      <div className="lab-tasks__head">
        <h2 id="lab-tasks-title">Questions du lab</h2>
        <p className="lab-tasks__count" aria-live="polite">{done} / {tasks.length} réussies</p>
      </div>
      <ProgressBar value={percent} tone="green" height="sm" label="Questions réussies" />
      {!firstTaskSolved && tasks.length > 1 && signedIn && (
        <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
          <IconLock size={14} className="shrink-0 text-amber-400" />
          <span>
            <strong>Progression imposée :</strong> Tu dois obligatoirement répondre à la <strong>première question</strong> avant de pouvoir continuer et débloquer les suivantes.
          </span>
        </div>
      )}
      {!signedIn && (
        <p className="lab-tasks__lock"><IconLock size={15} /> Connecte-toi pour répondre, suivre ta progression et gagner +{xpReward} XP.{" "}
          <Link className="lab-tasks__link" href={signInHref}>Se connecter</Link></p>
      )}
      <ol className="lab-tasks__list">
        {tasks.map((task, index) => (
          <TaskRow
            key={task.id}
            task={task}
            index={index}
            signedIn={signedIn}
            isLocked={index > 0 && !firstTaskSolved}
            onSolved={onSolved}
          />
        ))}
      </ol>
    </section>
  );
}