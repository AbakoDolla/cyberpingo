"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { IconAlert, IconDownload, IconUpload } from "@/components/ui/Icon";
import { useAsync } from "@/hooks/useAsync";
import { useLearner, useUserActions } from "@/context/UserContext";
import { errorMessage } from "@/lib/errors";
import { DAILY_GOALS } from "@/lib/navigation";
import { levelLabel } from "@/lib/format";
import { passwordProblem, updateEmail, updatePassword } from "@/services/auth.service";
import { AVATAR_MAX_BYTES, getMySettings, updateMySettings, type ProfileChanges, type SettingsChanges } from "@/services/profile.service";
import type { LearningGoal, SkillLevel } from "@/types/api";

const RESET_PHRASE = "RÉINITIALISER";
const DELETE_PHRASE = "SUPPRIMER";
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const GOALS: { value: LearningGoal; label: string; description: string }[] = [
  { value: "decouvrir", label: "Découvrir", description: "Comprendre les bases à ton rythme." },
  { value: "professionnel", label: "Professionnel", description: "Structurer une montée en compétence métier." },
  { value: "emploi", label: "Trouver un emploi", description: "Préparer un portfolio et des réflexes solides." },
  { value: "competences", label: "Compétences", description: "Renforcer tes acquis techniques." },
  { value: "certification", label: "Certification", description: "Te préparer à valider tes connaissances." },
];
const SKILL_LEVELS: SkillLevel[] = ["debutant", "intermediaire", "avance"];
const AREAS = [
  { value: "reseaux", label: "Réseaux" },
  { value: "linux", label: "Linux" },
  { value: "programmation", label: "Programmation" },
  { value: "securite", label: "Sécurité" },
  { value: "aucune", label: "Aucune" },
];

type SectionKey = "profile" | "learning" | "preferences" | "account" | "danger";
type Status = { message: string; error?: boolean };

function timeZoneValues() {
  const fallback = ["Europe/Paris", "Africa/Abidjan", "Africa/Algiers", "Africa/Casablanca", "Africa/Dakar", "Africa/Lagos", "America/Montreal", "UTC"];
  try {
    const api = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] };
    return api.supportedValuesOf?.("timeZone") ?? fallback;
  } catch {
    return fallback;
  }
}
const TIMEZONES = timeZoneValues();

function StatusMessage({ status }: { status: Status | null }) {
  if (!status) return null;
  return <p className={`settings-status ${status.error ? "is-error" : ""}`} role={status.error ? "alert" : "status"}>{status.message}</p>;
}

function CheckSwitch({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="settings-check"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span><strong>{label}</strong><small>{description}</small></span></label>;
}

function SettingsContent() {
  const router = useRouter();
  const { profile, timezone } = useLearner();
  const { updateProfile, updateAvatar, resetProgress, deleteAccount, refresh } = useUserActions();
  const { data: settings, error: settingsError, loading: settingsLoading, reload: reloadSettings } = useAsync(() => getMySettings(profile.id), [profile.id]);
  const [statuses, setStatuses] = useState<Record<SectionKey, Status | null>>({ profile: null, learning: null, preferences: null, account: null, danger: null });
  const [busy, setBusy] = useState<SectionKey | "avatar" | null>(null);

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [goal, setGoal] = useState<LearningGoal>(profile.goal);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(profile.skill_level);
  const [dailyMinutes, setDailyMinutes] = useState(profile.daily_minutes);
  const [knownAreas, setKnownAreas] = useState<string[]>(profile.known_areas);
  const [prefTimezone, setPrefTimezone] = useState(timezone);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [streakReminders, setStreakReminders] = useState(true);
  const [newContentAlerts, setNewContentAlerts] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPhrase, setResetPhrase] = useState("");
  const [deletePhrase, setDeletePhrase] = useState("");

  useEffect(() => {
    if (settings === undefined) return;
    setPrefTimezone(settings?.timezone ?? timezone);
    setEmailNotifications(settings?.email_notifications ?? true);
    setStreakReminders(settings?.streak_reminders ?? true);
    setNewContentAlerts(settings?.new_content_alerts ?? true);
    setSoundEffects(settings?.sound_effects ?? true);
  }, [settings, timezone]);

  const timezoneOptions = useMemo(() => TIMEZONES.map((value) => ({ value, label: value.replace(/_/g, " ") })), []);

  function report(section: SectionKey, message: string, failed = false) {
    setStatuses((current) => ({ ...current, [section]: { message, error: failed } }));
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("profile");
    try {
      const changes: ProfileChanges = { display_name: displayName.trim(), username: username.trim().toLowerCase(), bio: bio.trim() };
      await updateProfile(changes);
      report("profile", "Profil enregistré. Il est à jour sur tous tes appareils.");
    } catch (cause) {
      report("profile", errorMessage(cause, "Le profil n’a pas pu être mis à jour."), true);
    } finally { setBusy(null); }
  }

  async function saveLearning(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("learning");
    try {
      const changes: ProfileChanges = { goal, skill_level: skillLevel, daily_minutes: dailyMinutes, known_areas: knownAreas };
      await updateProfile(changes);
      report("learning", "Préférences d’apprentissage enregistrées.");
    } catch (cause) {
      report("learning", errorMessage(cause, "Les préférences n’ont pas pu être enregistrées."), true);
    } finally { setBusy(null); }
  }

  async function savePreferences(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("preferences");
    try {
      const changes: SettingsChanges = { timezone: prefTimezone, email_notifications: emailNotifications, streak_reminders: streakReminders, new_content_alerts: newContentAlerts, sound_effects: soundEffects };
      await updateMySettings(profile.id, changes);
      await reloadSettings();
      await refresh();
      report("preferences", "Préférences enregistrées.");
    } catch (cause) {
      report("preferences", errorMessage(cause, "Les préférences n’ont pas pu être enregistrées."), true);
    } finally { setBusy(null); }
  }

  async function changeEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { report("account", "Entre une adresse e-mail valide.", true); return; }
    setBusy("account");
    try {
      await updateEmail(email);
      report("account", "Un lien de confirmation a été envoyé à la nouvelle adresse. Le changement sera actif après validation.");
    } catch (cause) {
      report("account", errorMessage(cause, "L’adresse e-mail n’a pas pu être modifiée."), true);
    } finally { setBusy(null); }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = passwordProblem(password);
    if (problem) { report("account", problem, true); return; }
    if (password !== confirmPassword) { report("account", "Les mots de passe ne correspondent pas.", true); return; }
    setBusy("account");
    try {
      await updatePassword(password);
      setPassword("");
      setConfirmPassword("");
      report("account", "Mot de passe modifié. Utilise-le dès ta prochaine connexion.");
    } catch (cause) {
      report("account", errorMessage(cause, "Le mot de passe n’a pas pu être modifié."), true);
    } finally { setBusy(null); }
  }

  async function handleAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) { report("profile", "Choisis une image PNG, JPEG ou WebP.", true); return; }
    if (file.size > AVATAR_MAX_BYTES) { report("profile", `Ton avatar doit faire moins de ${Math.round(AVATAR_MAX_BYTES / 1024 / 1024)} Mo.`, true); return; }
    setBusy("avatar");
    try { await updateAvatar(file); report("profile", "Avatar mis à jour."); }
    catch (cause) { report("profile", errorMessage(cause, "L’avatar n’a pas pu être envoyé."), true); }
    finally { setBusy(null); }
  }

  async function removeAvatar() {
    setBusy("avatar");
    try { await updateAvatar(null); report("profile", "Avatar supprimé."); }
    catch (cause) { report("profile", errorMessage(cause, "L’avatar n’a pas pu être supprimé."), true); }
    finally { setBusy(null); }
  }

  function toggleArea(area: string) {
    setKnownAreas((current) => {
      if (area === "aucune") return current.includes("aucune") ? [] : ["aucune"];
      const withoutNone = current.filter((item) => item !== "aucune");
      return withoutNone.includes(area) ? withoutNone.filter((item) => item !== area) : [...withoutNone, area];
    });
  }

  async function resetAllProgress() {
    if (resetPhrase !== RESET_PHRASE) return;
    setBusy("danger");
    try {
      await resetProgress();
      setResetPhrase("");
      report("danger", "Tes progrès ont été réinitialisés. Ton profil et tes préférences sont conservés.");
    } catch (cause) {
      report("danger", errorMessage(cause, "La réinitialisation a échoué."), true);
    } finally { setBusy(null); }
  }

  async function removeAccount() {
    if (deletePhrase !== DELETE_PHRASE) return;
    setBusy("danger");
    try {
      await deleteAccount();
      router.replace("/");
      router.refresh();
    } catch (cause) {
      report("danger", errorMessage(cause, "La suppression a échoué."), true);
      setBusy(null);
    }
  }

  return <div className="study-page space-y-8">
    <header className="study-heading"><p className="text-[11px] uppercase tracking-[0.2em] text-cyber-blue">Paramètres</p><h1>Un espace à ton rythme.</h1><p>Personnalise ton profil, tes objectifs, tes notifications et les actions sensibles de ton compte.</p></header>

    <Card>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center"><Avatar name={profile.display_name} src={profile.avatar_url} size="xl" /><div className="flex-1"><h2 className="font-display text-xl font-semibold">Profil</h2><p className="mt-1 text-sm text-white/55">Photo, nom public et bio visible sur ton compte.</p><div className="mt-4 flex flex-wrap gap-3"><label className="study-button cursor-pointer"><IconUpload size={16} /> Importer un avatar<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void handleAvatar(event)} disabled={busy !== null} /></label><Button type="button" variant="secondary" loading={busy === "avatar"} disabled={busy !== null || !profile.avatar_url} onClick={() => void removeAvatar()}>Retirer l’avatar</Button></div></div></div>
      <form className="settings-form mt-7" onSubmit={(event) => void saveProfile(event)}>
        <Input label="Nom affiché" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={50} required />
        <Input label="Nom d’utilisateur" value={username} onChange={(event) => setUsername(event.target.value)} pattern="[a-z0-9_]{3,32}" required />
        <label>Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} rows={4} placeholder="Explique ce que tu apprends en ce moment." /></label>
        <Button type="submit" loading={busy === "profile"} disabled={busy !== null}>Enregistrer le profil</Button>
      </form>
      <StatusMessage status={statuses.profile} />
    </Card>

    <Card>
      <form className="settings-form" onSubmit={(event) => void saveLearning(event)}>
        <h2>Apprentissage</h2>
        <Select label="Objectif principal" value={goal} onChange={(event) => setGoal(event.target.value as LearningGoal)} options={GOALS.map((item) => ({ value: item.value, label: item.label }))} />
        <Select label="Niveau estimé" value={skillLevel} onChange={(event) => setSkillLevel(event.target.value as SkillLevel)} options={SKILL_LEVELS.map((value) => ({ value, label: levelLabel(value) }))} />
        <Select label="Temps quotidien" value={String(dailyMinutes)} onChange={(event) => setDailyMinutes(Number(event.target.value))} options={DAILY_GOALS.map((value) => ({ value: String(value), label: `${value} minutes par jour` }))} />
        <fieldset className="settings-fieldset"><legend>Connaissances déjà présentes</legend><div className="settings-chip-grid">{AREAS.map((area) => <label key={area.value} className={knownAreas.includes(area.value) ? "is-selected" : undefined}><input type="checkbox" checked={knownAreas.includes(area.value)} onChange={() => toggleArea(area.value)} />{area.label}</label>)}</div></fieldset>
        <p>Ces informations personnalisent les recommandations et l’objectif quotidien.</p>
        <Button type="submit" loading={busy === "learning"} disabled={busy !== null}>Enregistrer l’apprentissage</Button>
      </form>
      <StatusMessage status={statuses.learning} />
    </Card>

    <Card>
      <form className="settings-form" onSubmit={(event) => void savePreferences(event)}>
        <h2>Préférences</h2>
        {settingsError && <p className="settings-status is-error" role="alert">{settingsError.message}</p>}
        <Select label="Fuseau horaire" value={prefTimezone} onChange={(event) => setPrefTimezone(event.target.value)} options={timezoneOptions} disabled={settingsLoading || busy !== null} />
        <div className="settings-toggle-list"><CheckSwitch label="Notifications e-mail" description="Recevoir les messages importants de CyberPingo." checked={emailNotifications} onChange={setEmailNotifications} /><CheckSwitch label="Rappels de série" description="Être prévenu avant de perdre ta série." checked={streakReminders} onChange={setStreakReminders} /><CheckSwitch label="Nouveaux contenus" description="Découvrir les parcours et défis publiés." checked={newContentAlerts} onChange={setNewContentAlerts} /><CheckSwitch label="Effets sonores" description="Activer les sons de réussite dans l’interface." checked={soundEffects} onChange={setSoundEffects} /></div>
        <Button type="submit" loading={busy === "preferences"} disabled={busy !== null || settingsLoading}>Enregistrer les préférences</Button>
      </form>
      <StatusMessage status={statuses.preferences} />
    </Card>

    <Card>
      <h2 className="font-display text-xl font-semibold">Compte</h2>
      <p className="mt-2 text-sm text-white/55">Changer ton e-mail envoie un lien de confirmation : la nouvelle adresse ne sera active qu’après validation.</p>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <form className="settings-form" onSubmit={(event) => void changeEmail(event)}><Input label="Nouvelle adresse e-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /><Button type="submit" variant="secondary" loading={busy === "account"} disabled={busy !== null}>Envoyer le lien de confirmation</Button></form>
        <form className="settings-form" onSubmit={(event) => void changePassword(event)}><Input label="Nouveau mot de passe" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /><Input label="Confirmer le mot de passe" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /><Button type="submit" variant="secondary" loading={busy === "account"} disabled={busy !== null}>Changer le mot de passe</Button></form>
      </div>
      <StatusMessage status={statuses.account} />
    </Card>

    <Card className="border-cyber-red/25 bg-cyber-red/5">
      <div className="flex items-start gap-3"><IconAlert size={22} className="mt-1 text-cyber-red" /><div><h2 className="font-display text-xl font-semibold">Zone sensible</h2><p className="mt-2 text-sm leading-7 text-red-100/80">Ces actions sont irréversibles. Exporte tes informations avant de continuer si tu veux garder une trace locale.</p></div></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="reset-confirmation"><h3 className="font-display font-semibold">Réinitialiser ma progression</h3><p>Tape <strong>{RESET_PHRASE}</strong> pour effacer XP, badges, leçons, quiz, labs et certificats obtenus.</p><input value={resetPhrase} onChange={(event) => setResetPhrase(event.target.value)} autoComplete="off" /><Button type="button" variant="danger" loading={busy === "danger"} disabled={busy !== null || resetPhrase !== RESET_PHRASE} onClick={() => void resetAllProgress()}>Réinitialiser</Button></section>
        <section className="reset-confirmation"><h3 className="font-display font-semibold">Supprimer mon compte</h3><p>Tape <strong>{DELETE_PHRASE}</strong> pour supprimer définitivement ton compte et toutes ses données.</p><input value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} autoComplete="off" /><Button type="button" variant="danger" loading={busy === "danger"} disabled={busy !== null || deletePhrase !== DELETE_PHRASE} onClick={() => void removeAccount()}>Supprimer mon compte</Button></section>
      </div>
      <StatusMessage status={statuses.danger} />
    </Card>

    <div className="study-actions"><Link href="/confidentialite" className="study-link">Comprendre comment mes données sont utilisées →</Link><a href="data:application/json,%7B%7D" download="cyberpingo-export-a-preparer.json" className="study-link"><IconDownload size={14} /> Export complet bientôt disponible</a></div>
  </div>;
}

export default function SettingsPage() {
  return <AppShell><SettingsContent /></AppShell>;
}