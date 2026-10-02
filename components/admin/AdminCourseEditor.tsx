"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { errorMessage } from "@/lib/errors";
import { formatDuration, formatNumber, levelLabel } from "@/lib/format";
import { useAsync } from "@/hooks/useAsync";
import { validateAdminQuizQuestions } from "@/lib/course-import";
import type { AdminQuizQuestion, CourseStatus, LessonBlock, QuestionType, SkillLevel } from "@/types/api";
import {
  adminCourseStats, adminGetQuiz, adminSaveQuiz, createLesson, createModule, createQuiz, deleteLesson, deleteModule, deleteQuiz,
  getAdminCourseBundle, updateCourse, updateLesson, updateModule, updateQuiz, uploadCourseThumbnail, uploadLessonAsset,
  type AdminCourseBundle, type LessonRow, type QuizRow,
} from "@/services/admin.service";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader, ConfirmModal, Notice } from "./AdminState";
import { StatusBadge } from "./AdminFields";
import { IconEdit, IconPlus, IconUpload } from "@/components/ui/Icon";

const LEVEL_OPTIONS = [{ value: "debutant", label: "Débutant" }, { value: "intermediaire", label: "Intermédiaire" }, { value: "avance", label: "Avancé" }];
const STATUS_OPTIONS = [{ value: "draft", label: "Brouillon" }, { value: "published", label: "Publié" }, { value: "archived", label: "Archivé" }];
const ACCESS_OPTIONS = [{ value: "free", label: "Gratuit" }, { value: "premium", label: "Premium" }, { value: "private", label: "Privé" }];
const QUESTION_OPTIONS = [{ value: "single_choice", label: "Choix unique" }, { value: "multiple_choice", label: "Choix multiples" }, { value: "true_false", label: "Vrai / faux" }];
const DIFFICULTY_OPTIONS = [{ value: "facile", label: "Facile" }, { value: "moyen", label: "Moyen" }, { value: "difficile", label: "Difficile" }];

type SaveState = { saving: boolean; message: string | null; error: string | null };
const initialSave: SaveState = { saving: false, message: null, error: null };
const asInt = (value: string, fallback = 0) => Number.isFinite(Number(value)) ? Math.round(Number(value)) : fallback;

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="adm-field"><span>{label}</span>{children}</label>; }
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={`adm-textarea ${props.className ?? ""}`} />; }
function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={`adm-native-select ${props.className ?? ""}`} />; }
function SubmitNotice({ state }: { state: SaveState }) { return state.error ? <Notice kind="error">{state.error}</Notice> : state.message ? <Notice>{state.message}</Notice> : null; }
function Kpi({ label, value }: { label: string; value: string }) { return <div className="adm-kpi"><p className="adm-kpi__label">{label}</p><p className="adm-kpi__value">{value}</p></div>; }
function ConfirmDeleteButton({ label = "Supprimer", description, onConfirm }: { label?: string; description: string; onConfirm: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button size="sm" variant="danger" type="button" onClick={() => setOpen(true)}>{label}</Button>
      <ConfirmModal open={open} title="Confirmer la suppression" description={description} danger confirmLabel="Supprimer" loading={busy} onCancel={() => setOpen(false)} onConfirm={() => void confirm()}>
        {error ? <Notice kind="error">{error}</Notice> : null}
      </ConfirmModal>
    </>
  );
}

export default function AdminCourseEditor() {
  const id = String(useParams<{ id: string }>().id ?? "");
  const bundle = useAsync(() => getAdminCourseBundle(id), [id]);
  const stats = useAsync(() => adminCourseStats(id), [id]);
  if (bundle.loading && !bundle.data) return <AdminLoading />;
  if (bundle.error) return <AdminError message={bundle.error.message} onRetry={bundle.reload} />;
  if (!bundle.data) return <AdminEmpty>Cours introuvable.</AdminEmpty>;
  return <><AdminPageHeader title={bundle.data.course.title} description="Édition du parcours, ordre pédagogique, questions de quiz et statistiques." action={<Link href="/admin/cours" className="adm-text-link">Retour</Link>} /><div className="space-y-6"><CourseMetaEditor bundle={bundle.data} reload={bundle.reload} /><CourseStructureTree bundle={bundle.data} /><ModulesEditor bundle={bundle.data} reload={bundle.reload} /><LessonsEditor bundle={bundle.data} reload={bundle.reload} /><QuizzesEditor bundle={bundle.data} reload={bundle.reload} />{stats.data && <section className="adm-panel"><h2 className="adm-section-title">Statistiques</h2><div className="mt-4 grid gap-3 md:grid-cols-3"><Kpi label="Inscriptions" value={formatNumber(stats.data.enrollments)} /><Kpi label="Complétions" value={formatNumber(stats.data.completions)} /><Kpi label="Progression moyenne" value={`${stats.data.average_progress} %`} /></div></section>}</div></>;
}

function CourseStructureTree({ bundle }: { bundle: AdminCourseBundle }) {
  return (
    <section className="adm-panel">
      <div className="adm-panel__head">
        <div>
          <h2 className="adm-section-title">Arborescence du parcours</h2>
          <p className="adm-muted mt-1 text-sm">Vue opérateur : modules, leçons, quiz et aperçu public.</p>
        </div>
        <div className="adm-row-actions">
          <StatusBadge status={bundle.course.status} />
          <Link href={`/courses/${bundle.course.slug}`} className="adm-action-link" target="_blank">Prévisualiser</Link>
        </div>
      </div>
      {!bundle.modules.length ? (
        <AdminEmpty>Ajoute un module pour commencer la structure du cours.</AdminEmpty>
      ) : (
        <ol className="adm-list">
          {bundle.modules.map((module) => {
            const lessons = bundle.lessons.filter((lesson) => lesson.module_id === module.id);
            const moduleQuizzes = bundle.quizzes.filter((quiz) => quiz.module_id === module.id && !quiz.lesson_id);
            return (
              <li key={module.id} className="adm-list-row p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{module.position}. {module.title}</p>
                    {module.description && <p className="adm-muted mt-1 text-sm">{module.description}</p>}
                  </div>
                  <Badge tone="blue">{lessons.length} leçon{lessons.length > 1 ? "s" : ""}</Badge>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="adm-muted mb-2 text-xs font-semibold">Leçons</p>
                    {lessons.length ? (
                      <ul className="space-y-2">
                        {lessons.map((lesson) => (
                          <li key={lesson.id} className="rounded-xl border border-[var(--cp-line)] bg-black/20 p-3">
                            <Link href={`/lessons/${lesson.id}`} className="font-medium text-white hover:text-cyan-100" target="_blank">{lesson.position}. {lesson.title}</Link>
                            <p className="adm-muted mt-1 text-xs">{lesson.content_type} · {formatDuration(lesson.duration_minutes)} · {formatNumber(lesson.xp_reward)} XP</p>
                            {bundle.quizzes.filter((quiz) => quiz.lesson_id === lesson.id).map((quiz) => (
                              <Link key={quiz.id} href={`/quiz/${quiz.id}`} className="adm-action-link mt-2 !min-h-8 !px-0" target="_blank">Quiz lié : {quiz.title}</Link>
                            ))}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="adm-muted text-sm">Aucune leçon dans ce module.</p>}
                  </div>
                  <div>
                    <p className="adm-muted mb-2 text-xs font-semibold">Quiz module</p>
                    {moduleQuizzes.length ? (
                      <ul className="space-y-2">
                        {moduleQuizzes.map((quiz) => (
                          <li key={quiz.id} className="rounded-xl border border-[var(--cp-line)] bg-black/20 p-3">
                            <Link href={`/quiz/${quiz.id}`} className="font-medium text-white hover:text-cyan-100" target="_blank">{quiz.position}. {quiz.title}</Link>
                            <p className="adm-muted mt-1 text-xs">Seuil {quiz.pass_percentage} %</p>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="adm-muted text-sm">Aucun quiz module.</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function CourseMetaEditor({ bundle, reload }: { bundle: AdminCourseBundle; reload: () => Promise<void> }) {
  const [form, setForm] = useState(bundle.course); const [state, setState] = useState<SaveState>(initialSave);
  useEffect(() => setForm(bundle.course), [bundle.course]);
  const dirty = JSON.stringify(form) !== JSON.stringify(bundle.course);
  useEffect(() => { if (!dirty) return undefined; const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [dirty]);
  async function save() { setState({ saving: true, message: null, error: null }); try { await updateCourse(bundle.course.id, { slug: form.slug, title: form.title, short_description: form.short_description, description: form.description, thumbnail_url: form.thumbnail_url, level: form.level, category: form.category, icon: form.icon, estimated_duration: form.estimated_duration, status: form.status, access_level: form.access_level, position: form.position, completion_xp: form.completion_xp, certificate_enabled: form.certificate_enabled }); setState({ saving: false, message: "Métadonnées enregistrées.", error: null }); await reload(); } catch (cause) { setState({ saving: false, message: null, error: errorMessage(cause) }); } }
  async function upload(file: File) { setState({ saving: true, message: null, error: null }); try { const url = await uploadCourseThumbnail(bundle.course.id, file); await updateCourse(bundle.course.id, { thumbnail_url: url }); setForm((current) => ({ ...current, thumbnail_url: url })); setState({ saving: false, message: "Image téléversée.", error: null }); await reload(); } catch (cause) { setState({ saving: false, message: null, error: errorMessage(cause) }); } }
  return <Card><h2 className="adm-section-title">Métadonnées</h2>{dirty && <div className="mt-4"><Notice kind="info">Modifications non enregistrées. Enregistre avant de quitter cette page.</Notice></div>}<div className="mt-4 grid gap-4 md:grid-cols-2"><Input label="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /><Input label="Résumé court" value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /><Input label="Catégorie" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /><Select label="Niveau" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as SkillLevel })} options={LEVEL_OPTIONS} /><Select label="Statut" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CourseStatus })} options={STATUS_OPTIONS} /><Select label="Accès" value={form.access_level} onChange={(e) => setForm({ ...form, access_level: e.target.value as typeof form.access_level })} options={ACCESS_OPTIONS} /><Input label="Icône" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /><Input label="Durée estimée" type="number" value={form.estimated_duration} onChange={(e) => setForm({ ...form, estimated_duration: asInt(e.target.value) })} /><Input label="Position" type="number" value={form.position} onChange={(e) => setForm({ ...form, position: asInt(e.target.value) })} /><Input label="XP complétion" type="number" value={form.completion_xp} onChange={(e) => setForm({ ...form, completion_xp: asInt(e.target.value) })} /><Field label="Certificat"><input type="checkbox" checked={form.certificate_enabled} onChange={(e) => setForm({ ...form, certificate_enabled: e.target.checked })} className="h-5 w-5 accent-cyan-400" /> <span className="ml-2 text-sm adm-muted">Activer</span></Field><Field label="Description"><Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><Field label="Image du cours"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} className="block w-full text-sm adm-muted" />{form.thumbnail_url && <a href={form.thumbnail_url} className="adm-action-link mt-2 !justify-start !px-0 text-xs" target="_blank">Voir l’image</a>}</Field></div><div className="mt-5 flex flex-wrap items-center gap-3"><Button type="button" loading={state.saving} onClick={() => void save()} icon={<IconEdit size={15} />}>Enregistrer</Button><Link href={`/courses/${form.slug}`} className="adm-action-link">Prévisualiser · {levelLabel(form.level)}</Link></div><div className="mt-4"><SubmitNotice state={state} /></div></Card>;
}

function ModulesEditor({ bundle, reload }: { bundle: AdminCourseBundle; reload: () => Promise<void> }) {
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [state, setState] = useState<SaveState>(initialSave);
  async function add() { setState({ saving: true, message: null, error: null }); try { await createModule({ course_id: bundle.course.id, title, description, position: bundle.modules.length + 1 }); setTitle(""); setDescription(""); setState({ saving: false, message: "Module créé.", error: null }); await reload(); } catch (cause) { setState({ saving: false, message: null, error: errorMessage(cause) }); } }
  return <Card><h2 className="font-display font-semibold">Modules</h2><div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} /><Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} /><Button type="button" className="mt-6" size="sm" onClick={() => void add()} loading={state.saving}>Ajouter</Button></div><div className="mt-4"><SubmitNotice state={state} /></div><ul className="mt-4 space-y-2">{bundle.modules.map((module) => <EditableModule key={module.id} module={module} reload={reload} />)}</ul></Card>;
}
function EditableModule({ module, reload }: { module: AdminCourseBundle["modules"][number]; reload: () => Promise<void> }) { const [title, setTitle] = useState(module.title); const [description, setDescription] = useState(module.description); const [position, setPosition] = useState(String(module.position)); return <li className="adm-list-row grid gap-2 p-3 md:grid-cols-[5rem_1fr_1fr_auto]"><Input aria-label="Position" type="number" value={position} onChange={(e) => setPosition(e.target.value)} /><Input aria-label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} /><Input aria-label="Description" value={description} onChange={(e) => setDescription(e.target.value)} /><div className="flex gap-2"><Button size="sm" variant="secondary" type="button" onClick={() => void updateModule(module.id, { title, description, position: asInt(position) }).then(reload)}>OK</Button><ConfirmDeleteButton label="×" description="Supprimer ce module ? Les éléments liés peuvent être retirés selon les contraintes de la base." onConfirm={() => deleteModule(module.id).then(reload)} /></div></li>; }

function LessonsEditor({ bundle, reload }: { bundle: AdminCourseBundle; reload: () => Promise<void> }) {
  const [selected, setSelected] = useState<LessonRow | null>(null);
  return <Card><div className="flex items-center justify-between"><h2 className="adm-section-title">Leçons</h2><Button type="button" size="sm" onClick={() => setSelected(null)} icon={<IconPlus size={14} />}>Nouvelle leçon</Button></div><LessonForm key={selected?.id ?? "new"} lesson={selected} bundle={bundle} reload={reload} /><ul className="mt-5 grid gap-2 md:grid-cols-2">{bundle.lessons.map((lesson) => <li key={lesson.id} className="adm-list-row p-3"><button type="button" onClick={() => setSelected(lesson)} className="adm-text-link !justify-start !px-0 text-left font-medium">{lesson.title}</button><p className="adm-muted text-xs">{bundle.modules.find((m) => m.id === lesson.module_id)?.title ?? "Module"} · {lesson.duration_minutes} min · {lesson.xp_reward} XP</p></li>)}</ul></Card>;
}function LessonForm({ lesson, bundle, reload }: { lesson: LessonRow | null; bundle: AdminCourseBundle; reload: () => Promise<void> }) {
  const [moduleId, setModuleId] = useState(lesson?.module_id ?? bundle.modules[0]?.id ?? ""); const [title, setTitle] = useState(lesson?.title ?? ""); const [summary, setSummary] = useState(lesson?.summary ?? ""); const [contentType, setContentType] = useState(lesson?.content_type ?? "article"); const [duration, setDuration] = useState(String(lesson?.duration_minutes ?? 10)); const [xp, setXp] = useState(String(lesson?.xp_reward ?? 50)); const [position, setPosition] = useState(String(lesson?.position ?? bundle.lessons.length + 1)); const [blocks, setBlocks] = useState<LessonBlock[]>(lesson?.blocks ?? [{ type: "text", content: "" }]); const [state, setState] = useState<SaveState>(initialSave);
  function updateBlock(index: number, block: LessonBlock) { setBlocks((current) => current.map((item, i) => i === index ? block : item)); }
  async function save() { setState({ saving: true, message: null, error: null }); try { const payload = { module_id: moduleId, title, summary, content_type: contentType, duration_minutes: asInt(duration, 10), xp_reward: asInt(xp, 50), position: asInt(position, 1), blocks }; if (lesson) await updateLesson(lesson.id, payload); else await createLesson({ course_id: bundle.course.id, ...payload }); setState({ saving: false, message: "Leçon enregistrée.", error: null }); await reload(); } catch (cause) { setState({ saving: false, message: null, error: errorMessage(cause) }); } }
  async function upload(index: number, file: File) { try { const url = await uploadLessonAsset(lesson?.id ?? bundle.course.id, file); const current = blocks[index]; updateBlock(index, { type: current.type === "video" || current.type === "resource" || current.type === "image" ? current.type : "resource", url, content: "" }); } catch (cause) { setState({ saving: false, message: null, error: errorMessage(cause) }); } }
  return <div className="adm-editor-panel mt-4"><div className="grid gap-3 md:grid-cols-3"><Field label="Module"><NativeSelect value={moduleId} onChange={(e) => setModuleId(e.target.value)}>{bundle.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</NativeSelect></Field><Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} /><Input label="Type" value={contentType} onChange={(e) => setContentType(e.target.value)} /><Input label="Résumé" value={summary} onChange={(e) => setSummary(e.target.value)} /><Input label="Durée" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /><Input label="XP" type="number" value={xp} onChange={(e) => setXp(e.target.value)} /><Input label="Position" type="number" value={position} onChange={(e) => setPosition(e.target.value)} /></div><h3 className="adm-section-title mt-5 text-sm">Blocs</h3><div className="mt-3 space-y-3">{blocks.map((block, index) => <BlockEditor key={index} block={block} onChange={(next) => updateBlock(index, next)} onRemove={() => setBlocks((current) => current.filter((_, i) => i !== index))} onUpload={(file) => void upload(index, file)} />)}</div><div className="mt-3 flex flex-wrap gap-2">{(["heading", "text", "callout", "code", "image", "video", "resource"] as const).map((type) => <Button key={type} type="button" size="sm" variant="secondary" onClick={() => setBlocks((current) => [...current, type === "code" ? { type, content: "", language: "bash" } : type === "image" || type === "video" || type === "resource" ? { type, url: "", content: "" } : { type, content: "" }])}>+ {type}</Button>)}</div><div className="mt-4 flex gap-2"><Button type="button" loading={state.saving} onClick={() => void save()}>Enregistrer la leçon</Button>{lesson && <ConfirmDeleteButton description="Supprimer cette leçon ? La progression liée peut être retirée selon les contraintes de la base." onConfirm={() => deleteLesson(lesson.id).then(reload)} />}</div><div className="mt-3"><SubmitNotice state={state} /></div><div className="adm-panel mt-5"><p className="adm-muted mb-3 text-xs font-semibold">Aperçu</p>{blocks.map((block, i) => <LessonBlockPreview key={i} block={block} />)}</div></div>;
}
function BlockEditor({ block, onChange, onRemove, onUpload }: { block: LessonBlock; onChange: (block: LessonBlock) => void; onRemove: () => void; onUpload: (file: File) => void }) { const type = block.type; return <div className="adm-list-row p-3"><div className="mb-2 flex items-center justify-between"><span className="adm-muted text-xs font-semibold">{type}</span><button type="button" onClick={onRemove} className="adm-danger-link">Retirer</button></div>{type === "code" ? <><Textarea rows={4} value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} /><Input label="Langage" value={block.language ?? ""} onChange={(e) => onChange({ ...block, language: e.target.value })} className="mt-2" /></> : type === "image" || type === "video" || type === "resource" ? <><Input label="URL" value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} /><Input label="Légende" value={block.content ?? ""} onChange={(e) => onChange({ ...block, content: e.target.value })} className="mt-2" /><label className="adm-file-button mt-2"><IconUpload size={14} /> Téléverser<input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); }} /></label></> : <Textarea rows={3} value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} />}</div>; }
function LessonBlockPreview({ block }: { block: LessonBlock }) { if (block.type === "heading") return <h3 className="mt-4 font-display text-xl font-semibold">{block.content}</h3>; if (block.type === "code") return <pre className="adm-code-preview my-3 p-3 text-sm"><code>{block.content}</code></pre>; if (block.type === "image") return <figure className="my-3"><Image src={block.url} alt="" width={640} height={360} unoptimized className="max-h-64 rounded-xl object-cover" /><figcaption className="adm-muted text-xs">{block.content}</figcaption></figure>; if (block.type === "video" || block.type === "resource") return <p className="adm-text-link my-2 !justify-start !px-0 text-sm">{block.type} : {block.url}</p>; return <p className="my-2 text-sm leading-relaxed text-white/75">{block.content}</p>; }

function QuizzesEditor({ bundle, reload }: { bundle: AdminCourseBundle; reload: () => Promise<void> }) { const [selected, setSelected] = useState<QuizRow | null>(bundle.quizzes[0] ?? null); return <Card><div className="flex items-center justify-between"><h2 className="adm-section-title">Quiz</h2><Button type="button" size="sm" onClick={() => setSelected(null)}>Nouveau quiz</Button></div><QuizMetaForm key={selected?.id ?? "new"} quiz={selected} bundle={bundle} reload={reload} onSelect={setSelected} />{selected?.id && <QuizQuestionsEditor quizId={selected.id} />}<ul className="mt-5 grid gap-2 md:grid-cols-2">{bundle.quizzes.map((quiz) => <li key={quiz.id} className="adm-list-row p-3"><button type="button" onClick={() => setSelected(quiz)} className="adm-text-link !justify-start !px-0 font-medium">{quiz.title}</button><p className="adm-muted text-xs">{quiz.pass_percentage} % · {quiz.lesson_id ? "lié à une leçon" : "module"}</p></li>)}</ul></Card>; }
function QuizMetaForm({ quiz, bundle, reload, onSelect }: { quiz: QuizRow | null; bundle: AdminCourseBundle; reload: () => Promise<void>; onSelect: (quiz: QuizRow | null) => void }) { const [moduleId, setModuleId] = useState(quiz?.module_id ?? bundle.modules[0]?.id ?? ""); const [lessonId, setLessonId] = useState(quiz?.lesson_id ?? ""); const [title, setTitle] = useState(quiz?.title ?? ""); const [description, setDescription] = useState(quiz?.description ?? ""); const [pass, setPass] = useState(String(quiz?.pass_percentage ?? 70)); const [position, setPosition] = useState(String(quiz?.position ?? bundle.quizzes.length + 1)); const [state, setState] = useState<SaveState>(initialSave); async function save() { setState({ saving: true, message: null, error: null }); try { const payload = { module_id: moduleId, lesson_id: lessonId || null, title, description, pass_percentage: asInt(pass, 70), position: asInt(position, 1) }; const saved = quiz ? await updateQuiz(quiz.id, payload) : await createQuiz({ course_id: bundle.course.id, ...payload }); onSelect(saved); setState({ saving: false, message: "Quiz enregistré.", error: null }); await reload(); } catch (cause) { setState({ saving: false, message: null, error: errorMessage(cause) }); } } return <div className="adm-editor-panel mt-4"><div className="grid gap-3 md:grid-cols-3"><Field label="Module"><NativeSelect value={moduleId} onChange={(e) => setModuleId(e.target.value)}>{bundle.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</NativeSelect></Field><Field label="Leçon liée"><NativeSelect value={lessonId} onChange={(e) => setLessonId(e.target.value)}><option value="">Aucune</option>{bundle.lessons.filter((l) => l.module_id === moduleId).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</NativeSelect></Field><Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} /><Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} /><Input label="Seuil %" type="number" value={pass} onChange={(e) => setPass(e.target.value)} /><Input label="Position" type="number" value={position} onChange={(e) => setPosition(e.target.value)} /></div><div className="mt-4 flex gap-2"><Button type="button" loading={state.saving} onClick={() => void save()}>Enregistrer le quiz</Button>{quiz && <ConfirmDeleteButton description="Supprimer ce quiz ? Les tentatives liées peuvent être retirées selon les contraintes de la base." onConfirm={() => deleteQuiz(quiz.id).then(reload)} />}</div><div className="mt-3"><SubmitNotice state={state} /></div></div>; }
function QuizQuestionsEditor({ quizId }: { quizId: string }) { const { data, loading, error, reload } = useAsync(() => adminGetQuiz(quizId), [quizId]); const [questions, setQuestions] = useState<AdminQuizQuestion[]>([]); const [state, setState] = useState<SaveState>(initialSave); useEffect(() => { if (data) setQuestions(data.questions); }, [data]); async function save() { const problem = validateAdminQuizQuestions(questions); if (problem) { setState({ saving: false, message: null, error: problem }); return; } setState({ saving: true, message: null, error: null }); try { const count = await adminSaveQuiz(quizId, questions); setState({ saving: false, message: `${count} question(s) enregistrée(s).`, error: null }); await reload(); } catch (cause) { setState({ saving: false, message: null, error: errorMessage(cause) }); } } if (loading && !data) return <AdminLoading />; if (error) return <AdminError message={error.message} onRetry={reload} />; return <div className="adm-panel mt-4"><h3 className="adm-section-title">Questions</h3><div className="mt-3 space-y-4">{questions.map((question, index) => <QuestionEditor key={index} question={question} index={index} onChange={(next) => setQuestions((current) => current.map((item, i) => i === index ? next : item))} onRemove={() => setQuestions((current) => current.filter((_, i) => i !== index))} />)}</div><div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" onClick={() => setQuestions((current) => [...current, { question_type: "single_choice", prompt: "", image_url: null, explanation: "", difficulty: "facile", xp_reward: 10, answers: [{ label: "", is_correct: true }, { label: "", is_correct: false }] }])}>Ajouter une question</Button><Button type="button" size="sm" loading={state.saving} onClick={() => void save()}>Enregistrer les questions</Button></div><div className="mt-3"><SubmitNotice state={state} /></div></div>; }
function QuestionEditor({ question, index, onChange, onRemove }: { question: AdminQuizQuestion; index: number; onChange: (q: AdminQuizQuestion) => void; onRemove: () => void }) { return <div className="adm-list-row p-3"><div className="flex justify-between"><span className="adm-muted text-xs">Question {index + 1}</span><button type="button" onClick={onRemove} className="adm-danger-link text-xs">Supprimer</button></div><div className="mt-3 grid gap-3 md:grid-cols-2"><Field label="Type"><NativeSelect value={question.question_type} onChange={(e) => onChange({ ...question, question_type: e.target.value as QuestionType })}>{QUESTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</NativeSelect></Field><Field label="Difficulté"><NativeSelect value={question.difficulty} onChange={(e) => onChange({ ...question, difficulty: e.target.value as typeof question.difficulty })}>{DIFFICULTY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</NativeSelect></Field><Input label="Intitulé" value={question.prompt} onChange={(e) => onChange({ ...question, prompt: e.target.value })} /><Input label="XP" type="number" value={question.xp_reward} onChange={(e) => onChange({ ...question, xp_reward: asInt(e.target.value, 10) })} /><Field label="Explication"><Textarea rows={2} value={question.explanation} onChange={(e) => onChange({ ...question, explanation: e.target.value })} /></Field><Input label="Image URL" value={question.image_url ?? ""} onChange={(e) => onChange({ ...question, image_url: e.target.value || null })} /></div><div className="mt-3 space-y-2">{question.answers.map((answer, answerIndex) => <div key={answerIndex} className="flex items-center gap-2"><input type="checkbox" checked={answer.is_correct} onChange={(e) => onChange({ ...question, answers: question.answers.map((item, i) => i === answerIndex ? { ...item, is_correct: e.target.checked } : item) })} /><Input aria-label={`Réponse ${answerIndex + 1}`} value={answer.label} onChange={(e) => onChange({ ...question, answers: question.answers.map((item, i) => i === answerIndex ? { ...item, label: e.target.value } : item) })} /><button type="button" onClick={() => onChange({ ...question, answers: question.answers.filter((_, i) => i !== answerIndex) })} className="adm-danger-link">×</button></div>)}<Button type="button" size="sm" variant="secondary" onClick={() => onChange({ ...question, answers: [...question.answers, { label: "", is_correct: false }] })}>Ajouter réponse</Button></div></div>; }