"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { IconCheck, IconPlus, IconTrash } from "@/components/ui/Icon";
import { errorMessage } from "@/lib/errors";
import {
  adminGetLabTasks, adminSetLabTasks, createLabAsset, deleteLabAsset, listLabAssets, updateLabAsset,
  type LabAssetInput, type LabAssetRow, type LabTaskDraft,
} from "@/services/admin.service";
import type { LabAssetKind, LabFormat } from "@/types/api";
import { AdminLoading, Notice } from "./AdminState";
import { Field, Textarea, asInt, joinLines, lines } from "./AdminFields";

export const LAB_FORMAT_LABELS: Record<LabFormat, string> = {
  terminal: "Terminal : une réponse à trouver",
  pcap: "Analyse de capture réseau (PCAP)",
  logs: "Analyse de journaux système",
  packet_tracer: "Packet Tracer (passerelle)",
};

export const LAB_ASSET_KIND_LABELS: Record<LabAssetKind, string> = {
  pcap: "Capture réseau (PCAP)",
  log: "Journal système",
  pkt: "Fichier Packet Tracer (.pkt)",
  guide: "Guide PDF ou texte",
  image: "Image",
  topology: "Schéma de topologie",
  report_template: "Modèle de compte rendu",
};

const MAX_TASKS = 30;
const MAX_ACCEPTED = 8;

type TaskForm = { key: string; id?: string; prompt: string; hint: string; answerFormat: string; accepted: string; explanation: string };

let taskCounter = 0;
const nextKey = () => `task-${++taskCounter}`;
const blankTask = (): TaskForm => ({ key: nextKey(), prompt: "", hint: "", answerFormat: "", accepted: "", explanation: "" });
const toForm = (task: LabTaskDraft): TaskForm => ({
  key: nextKey(), id: task.id, prompt: task.prompt, hint: task.hint, answerFormat: task.answer_format, accepted: joinLines(task.accepted), explanation: task.explanation,
});

function validateTasks(tasks: TaskForm[]): string | null {
  if (tasks.length > MAX_TASKS) return `${MAX_TASKS} tâches maximum par lab.`;
  for (const [index, task] of tasks.entries()) {
    const label = `Tâche ${index + 1}`;
    const prompt = task.prompt.trim();
    if (prompt.length < 1 || prompt.length > 600) return `${label} : la consigne doit contenir entre 1 et 600 caractères.`;
    if (task.hint.trim().length > 400) return `${label} : l’indice ne doit pas dépasser 400 caractères.`;
    if (task.answerFormat.trim().length > 120) return `${label} : le format de réponse ne doit pas dépasser 120 caractères.`;
    if (task.explanation.trim().length > 1000) return `${label} : l’explication ne doit pas dépasser 1 000 caractères.`;
    const accepted = lines(task.accepted);
    if (accepted.length < 1) return `${label} : indique au moins une réponse acceptée.`;
    if (accepted.length > MAX_ACCEPTED) return `${label} : ${MAX_ACCEPTED} réponses acceptées maximum.`;
    if (accepted.some((answer) => answer.length > 200)) return `${label} : chaque réponse acceptée est limitée à 200 caractères.`;
  }
  return null;
}

/** Edits the tasks of a lab. Answers are stored in a private schema; learners never receive them. */
export function LabTasksPanel({ labId }: { labId: string }) {
  const headingId = useId();
  const [tasks, setTasks] = useState<TaskForm[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    adminGetLabTasks(labId)
      .then((rows) => { if (alive) setTasks(rows.map(toForm)); })
      .catch((cause) => { if (alive) setLoadError(errorMessage(cause, "Impossible de charger les tâches.")); });
    return () => { alive = false; };
  }, [labId]);

  function patch(key: string, changes: Partial<TaskForm>) {
    setTasks((current) => current?.map((task) => (task.key === key ? { ...task, ...changes } : task)) ?? current);
  }

  function move(index: number, delta: -1 | 1) {
    setTasks((current) => {
      if (!current) return current;
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!tasks) return;
    const problem = validateTasks(tasks);
    if (problem) { setNotice({ kind: "error", text: problem }); return; }
    setBusy(true);
    setNotice(null);
    try {
      const payload: LabTaskDraft[] = tasks.map((task) => ({
        ...(task.id ? { id: task.id } : {}),
        prompt: task.prompt.trim(),
        hint: task.hint.trim(),
        answer_format: task.answerFormat.trim(),
        accepted: lines(task.accepted),
        explanation: task.explanation.trim(),
      }));
      await adminSetLabTasks(labId, payload);
      const fresh = await adminGetLabTasks(labId);
      setTasks(fresh.map(toForm));
      setNotice({ kind: "success", text: `${fresh.length} tâche${fresh.length > 1 ? "s" : ""} enregistrée${fresh.length > 1 ? "s" : ""}.` });
    } catch (cause) {
      setNotice({ kind: "error", text: errorMessage(cause, "Les tâches n’ont pas pu être enregistrées.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={headingId} className="adm-divider mt-6 space-y-4 pt-5">
      <div>
        <h3 id={headingId} className="font-display text-sm font-semibold text-white">Tâches du lab</h3>
        <p className="adm-muted mt-1 text-sm">
          Chaque tâche est validée côté serveur. Les réponses acceptées ne sont jamais envoyées aux apprenants. Garde une tâche existante pour préserver la progression de ceux qui l’ont déjà réussie.
        </p>
      </div>
      {loadError && <Notice kind="error">{loadError}</Notice>}
      {!tasks && !loadError && <AdminLoading label="Chargement des tâches…" />}
      {tasks && (
        <form onSubmit={save} noValidate className="space-y-4">
          {tasks.length === 0 && <p className="adm-muted text-sm">Aucune tâche. Ajoute-en une, ou définis une réponse unique ci-dessous.</p>}
          <ol className="lab-task-editor">
            {tasks.map((task, index) => (
              <li key={task.key} className="lab-task-editor__item">
                <div className="lab-task-editor__head">
                  <span className="lab-task-editor__num">Tâche {index + 1}</span>
                  <span className="lab-task-editor__tools">
                    <Button type="button" size="sm" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Monter la tâche ${index + 1}`}>↑</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => move(index, 1)} disabled={index === tasks.length - 1} aria-label={`Descendre la tâche ${index + 1}`}>↓</Button>
                    <Button type="button" size="sm" variant="ghost" icon={<IconTrash size={15} />} onClick={() => setTasks(tasks.filter((item) => item.key !== task.key))} aria-label={`Retirer la tâche ${index + 1}`} />
                  </span>
                </div>
                <Field label={`Consigne (${task.prompt.length}/600)`}>
                  <Textarea value={task.prompt} onChange={(e) => patch(task.key, { prompt: e.target.value })} rows={2} maxLength={600} />
                </Field>
                <Field label={`Réponses acceptées (une par ligne, ${MAX_ACCEPTED} maximum)`}>
                  <Textarea value={task.accepted} onChange={(e) => patch(task.key, { accepted: e.target.value })} rows={2} spellCheck={false} className="font-mono text-sm" autoComplete="off" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Format attendu" value={task.answerFormat} onChange={(e) => patch(task.key, { answerFormat: e.target.value })} maxLength={120} placeholder="Ex. adresse IPv4" />
                  <Input label="Indice" value={task.hint} onChange={(e) => patch(task.key, { hint: e.target.value })} maxLength={400} />
                </div>
                <Field label="Explication affichée après réussite">
                  <Textarea value={task.explanation} onChange={(e) => patch(task.key, { explanation: e.target.value })} rows={2} maxLength={1000} />
                </Field>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" variant="secondary" icon={<IconPlus size={16} />} disabled={tasks.length >= MAX_TASKS || busy} onClick={() => setTasks([...tasks, blankTask()])}>Ajouter une tâche</Button>
            <Button type="submit" size="sm" loading={busy}>Enregistrer les tâches</Button>
          </div>
          {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
        </form>
      )}
    </section>
  );
}

const ASSET_URL_PATTERN = /^(https:\/\/\S{4,500}|\/labs\/[A-Za-z0-9._/-]{1,200})$/;

type AssetForm = { kind: LabAssetKind; title: string; description: string; url: string; position: string };
const blankAsset = (position: number): AssetForm => ({ kind: "guide", title: "", description: "", url: "", position: String(position) });

function validateAsset(form: AssetForm): string | null {
  const title = form.title.trim();
  if (title.length < 2 || title.length > 120) return "Le titre doit contenir entre 2 et 120 caractères.";
  if (form.description.trim().length > 500) return "La description ne doit pas dépasser 500 caractères.";
  const url = form.url.trim();
  if (!ASSET_URL_PATTERN.test(url) || url.includes("..")) return "L’adresse doit commencer par https:// ou par /labs/ (fichier hébergé avec le site).";
  return null;
}

/** Files attached to a lab (captures, logs, guides, the real .pkt). The URL must point to a file that exists. */
export function LabAssetsPanel({ labId }: { labId: string }) {
  const headingId = useId();
  const [assets, setAssets] = useState<LabAssetRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<AssetForm>(blankAsset(0));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    listLabAssets(labId)
      .then((rows) => { if (alive) setAssets(rows); })
      .catch((cause) => { if (alive) setLoadError(errorMessage(cause, "Impossible de charger les ressources.")); });
    return () => { alive = false; };
  }, [labId]);

  function startNew() {
    setForm(blankAsset((assets?.length ?? 0) * 10 + 10));
    setEditingId("new");
    setNotice(null);
  }

  function startEdit(asset: LabAssetRow) {
    setForm({ kind: asset.kind, title: asset.title, description: asset.description, url: asset.url, position: String(asset.position) });
    setEditingId(asset.id);
    setNotice(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const problem = validateAsset(form);
    if (problem) { setNotice({ kind: "error", text: problem }); return; }
    setBusy(true);
    setNotice(null);
    const input: LabAssetInput = { kind: form.kind, title: form.title.trim(), description: form.description.trim(), url: form.url.trim(), position: asInt(form.position) };
    try {
      const saved = editingId === "new" ? await createLabAsset(labId, input) : await updateLabAsset(String(editingId), input);
      setAssets((current) => {
        const list = current ?? [];
        const next = list.some((item) => item.id === saved.id) ? list.map((item) => (item.id === saved.id ? saved : item)) : [...list, saved];
        return next.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title, "fr"));
      });
      setEditingId(null);
      setNotice({ kind: "success", text: "Ressource enregistrée." });
    } catch (cause) {
      setNotice({ kind: "error", text: errorMessage(cause, "La ressource n’a pas pu être enregistrée.") });
    } finally {
      setBusy(false);
    }
  }

  async function remove(asset: LabAssetRow) {
    setBusy(true);
    setNotice(null);
    try {
      await deleteLabAsset(asset.id);
      setAssets((current) => current?.filter((item) => item.id !== asset.id) ?? current);
      if (editingId === asset.id) setEditingId(null);
      setNotice({ kind: "success", text: "Ressource retirée." });
    } catch (cause) {
      setNotice({ kind: "error", text: errorMessage(cause, "La ressource n’a pas pu être retirée.") });
    } finally {
      setBusy(false);
    }
  }

  const kindOptions = Object.entries(LAB_ASSET_KIND_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <section aria-labelledby={headingId} className="adm-divider mt-6 space-y-4 pt-5">
      <div>
        <h3 id={headingId} className="font-display text-sm font-semibold text-white">Ressources du lab</h3>
        <p className="adm-muted mt-1 text-sm">Captures, journaux, guides ou fichier Packet Tracer. Dépose le fichier dans <code>public/labs/</code> puis indique son adresse, ou utilise un lien https.</p>
      </div>
      {loadError && <Notice kind="error">{loadError}</Notice>}
      {!assets && !loadError && <AdminLoading label="Chargement des ressources…" />}
      {assets && (
        <>
          {assets.length === 0 && <p className="adm-muted text-sm">Aucune ressource attachée.</p>}
          <ul className="lab-task-editor">
            {assets.map((asset) => (
              <li key={asset.id} className="lab-task-editor__item lab-task-editor__item--row">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-white">{asset.title}</span>
                  <span className="adm-muted block truncate text-sm">{LAB_ASSET_KIND_LABELS[asset.kind]} · {asset.url}</span>
                </span>
                <span className="lab-task-editor__tools">
                  <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(asset)} disabled={busy}>Modifier</Button>
                  <Button type="button" size="sm" variant="ghost" icon={<IconTrash size={15} />} onClick={() => void remove(asset)} disabled={busy} aria-label={`Retirer ${asset.title}`} />
                </span>
              </li>
            ))}
          </ul>
          {editingId === null && (
            <Button type="button" size="sm" variant="secondary" icon={<IconPlus size={16} />} onClick={startNew}>Ajouter une ressource</Button>
          )}
          {editingId !== null && (
            <form onSubmit={save} noValidate className="space-y-3">
              <Select label="Type" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as LabAssetKind })} options={kindOptions} />
              <Input label="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} required />
              <Input label="Adresse du fichier" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} maxLength={508} placeholder="/labs/capture.pcap" spellCheck={false} autoCapitalize="off" required />
              <Field label={`Description (${form.description.length}/500)`}>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} maxLength={500} />
              </Field>
              <Input label="Position" type="number" inputMode="numeric" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              <div className="flex flex-wrap gap-3">
                <Button type="submit" size="sm" loading={busy} icon={<IconCheck size={16} />}>{editingId === "new" ? "Ajouter" : "Enregistrer"}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={busy}>Annuler</Button>
              </div>
            </form>
          )}
          {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
        </>
      )}
    </section>
  );
}
