"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SceneBanner from "@/components/art/SceneBanner";
import AppShell from "@/components/layout/AppShell";
import MascotSettings from "@/components/mascot/MascotSettings";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import {
  IconAlert,
  IconAward,
  IconBell,
  IconClock,
  IconDownload,
  IconList,
  IconLogout,
  IconMail,
  IconSettings,
  IconTarget,
} from "@/components/ui/Icon";
import { useLearner, useUserActions } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { levelLabel } from "@/lib/format";
import { DAILY_GOALS } from "@/lib/navigation";
import { passwordProblem, updateEmail, updatePassword } from "@/services/auth.service";
import { getMySettings, updateMySettings, type ProfileChanges, type SettingsChanges } from "@/services/profile.service";
import { useTranslation, type Language } from "@/lib/i18n";
import type { LearningGoal, SkillLevel } from "@/types/api";

const RESET_PHRASE = "RÉINITIALISER";
const DELETE_PHRASE = "SUPPRIMER";
const SKILL_LEVELS: SkillLevel[] = ["debutant", "intermediaire", "avance"];

const GOALS_FR: { value: LearningGoal; label: string; description: string }[] = [
  { value: "decouvrir", label: "Découvrir", description: "Comprendre les bases à ton rythme." },
  { value: "professionnel", label: "Professionnel", description: "Structurer une montée en compétence métier." },
  { value: "emploi", label: "Trouver un emploi", description: "Préparer un portfolio et des réflexes solides." },
  { value: "competences", label: "Compétences", description: "Renforcer tes acquis techniques." },
  { value: "certification", label: "Certification", description: "Te préparer à valider tes connaissances." },
];

const GOALS_EN: { value: LearningGoal; label: string; description: string }[] = [
  { value: "decouvrir", label: "Explore & Discover", description: "Understand fundamentals at your own pace." },
  { value: "professionnel", label: "Professional Upskilling", description: "Structure hands-on professional mastery." },
  { value: "emploi", label: "Find a Job", description: "Build a strong portfolio and SOC instincts." },
  { value: "competences", label: "Technical Skills", description: "Strengthen hands-on defense and audit abilities." },
  { value: "certification", label: "Certification", description: "Prepare to pass and validate official cyber exams." },
];

const AREAS_FR = [
  { value: "reseaux", label: "Réseaux" },
  { value: "linux", label: "Linux" },
  { value: "programmation", label: "Programmation" },
  { value: "securite", label: "Sécurité" },
  { value: "aucune", label: "Aucune" },
];

const AREAS_EN = [
  { value: "reseaux", label: "Networking" },
  { value: "linux", label: "Linux" },
  { value: "programmation", label: "Programming" },
  { value: "securite", label: "Security" },
  { value: "aucune", label: "None" },
];

const SECTIONS_FR = [
  { id: "profil-public", label: "Profil public" },
  { id: "apprentissage", label: "Apprentissage" },
  { id: "preferences", label: "Préférences" },
  { id: "pingo", label: "Pingo" },
  { id: "compte", label: "Compte" },
  { id: "donnees", label: "Données" },
  { id: "danger", label: "Zone sensible" },
] as const;

const SECTIONS_EN = [
  { id: "profil-public", label: "Public Profile" },
  { id: "apprentissage", label: "Learning Goals" },
  { id: "preferences", label: "Preferences" },
  { id: "pingo", label: "Pingo" },
  { id: "compte", label: "Account" },
  { id: "donnees", label: "Data" },
  { id: "danger", label: "Danger Zone" },
] as const;

type SectionKey = "learning" | "preferences" | "email" | "password" | "data" | "danger" | "session";
type Status = { message: string; error?: boolean };
type Busy = SectionKey | null;
type DangerAction = "reset" | "delete" | null;

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

function StatusMessage({ status }: { status: Status | null | undefined }) {
  if (!status) return null;
  return <p className={`acct-status ${status.error ? "is-error" : ""}`} role={status.error ? "alert" : "status"} aria-live="polite">{status.message}</p>;
}

function CheckSwitch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="set-switch">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
      <span className="set-switch__control" aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </label>
  );
}

function SettingsContent() {
  const router = useRouter();
  const { profile, timezone } = useLearner();
  const { lang, setLanguage, t } = useTranslation();
  const isEn = lang === "en";
  const sections = isEn ? SECTIONS_EN : SECTIONS_FR;
  const goals = isEn ? GOALS_EN : GOALS_FR;
  const areas = isEn ? AREAS_EN : AREAS_FR;

  const { updateProfile, resetProgress, deleteAccount, logout, refresh } = useUserActions();
  const { data: settings, error: settingsError, loading: settingsLoading, reload: reloadSettings } = useAsync(() => getMySettings(profile.id), [profile.id]);
  const [statuses, setStatuses] = useState<Record<SectionKey, Status | null>>({
    learning: null,
    preferences: null,
    email: null,
    password: null,
    data: null,
    danger: null,
    session: null,
  });
  const [busy, setBusy] = useState<Busy>(null);
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
  const [dangerAction, setDangerAction] = useState<DangerAction>(null);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    setGoal(profile.goal);
    setSkillLevel(profile.skill_level);
    setDailyMinutes(profile.daily_minutes);
    setKnownAreas(profile.known_areas);
    setEmail(profile.email);
  }, [profile.daily_minutes, profile.email, profile.goal, profile.known_areas, profile.skill_level]);

  useEffect(() => {
    if (settings === undefined) return;
    setPrefTimezone(settings?.timezone ?? timezone);
    setEmailNotifications(settings?.email_notifications ?? true);
    setStreakReminders(settings?.streak_reminders ?? true);
    setNewContentAlerts(settings?.new_content_alerts ?? true);
    setSoundEffects(settings?.sound_effects ?? true);
  }, [settings, timezone]);

  const timezoneOptions = useMemo(() => TIMEZONES.map((value) => ({ value, label: value.replace(/_/g, " ") })), []);
  const dangerPhrase = dangerAction === "reset" ? (isEn ? "RESET" : RESET_PHRASE) : (isEn ? "DELETE" : DELETE_PHRASE);
  const dangerTitle = dangerAction === "reset" ? (isEn ? "Reset learning progress" : "Réinitialiser la progression") : (isEn ? "Delete account" : "Supprimer le compte");

  function report(section: SectionKey, message: string, failed = false) {
    setStatuses((current) => ({ ...current, [section]: { message, error: failed } }));
  }

  function toggleArea(area: string) {
    setKnownAreas((current) => {
      if (area === "aucune") return current.includes("aucune") ? [] : ["aucune"];
      const withoutNone = current.filter((item) => item !== "aucune");
      return withoutNone.includes(area) ? withoutNone.filter((item) => item !== area) : [...withoutNone, area];
    });
  }

  async function saveLearning(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("learning");
    try {
      const changes: ProfileChanges = { goal, skill_level: skillLevel, daily_minutes: dailyMinutes, known_areas: knownAreas };
      await updateProfile(changes);
      report("learning", isEn ? "Learning goals saved successfully." : "Objectifs d’apprentissage enregistrés.");
    } catch (cause) {
      report("learning", errorMessage(cause, isEn ? "Could not save learning goals." : "Les objectifs n’ont pas pu être enregistrés."), true);
    } finally {
      setBusy(null);
    }
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("preferences");
    try {
      const changes: SettingsChanges = {
        timezone: prefTimezone,
        email_notifications: emailNotifications,
        streak_reminders: streakReminders,
        new_content_alerts: newContentAlerts,
        sound_effects: soundEffects,
      };
      await updateMySettings(profile.id, changes);
      await reloadSettings();
      await refresh();
      report("preferences", isEn ? "Preferences saved successfully." : "Préférences enregistrées.");
    } catch (cause) {
      report("preferences", errorMessage(cause, isEn ? "Could not save preferences." : "Les préférences n’ont pas pu être enregistrées."), true);
    } finally {
      setBusy(null);
    }
  }

  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) {
      report("email", isEn ? "Please enter a valid email address." : "Entre une adresse e-mail valide.", true);
      return;
    }
    if (nextEmail === profile.email) {
      report("email", isEn ? "This email is already associated with your account." : "Cette adresse est déjà associée à ton compte.");
      return;
    }
    setBusy("email");
    try {
      await updateEmail(nextEmail);
      report("email", isEn ? "Confirmation link sent. Check your inbox." : "Un lien de confirmation a été envoyé. Le changement sera actif après validation.");
    } catch (cause) {
      report("email", errorMessage(cause, isEn ? "Email address could not be updated." : "L’adresse e-mail n’a pas pu être modifiée."), true);
    } finally {
      setBusy(null);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = passwordProblem(password);
    if (problem) {
      report("password", problem, true);
      return;
    }
    if (password !== confirmPassword) {
      report("password", isEn ? "Passwords do not match." : "Les mots de passe ne correspondent pas.", true);
      return;
    }
    setBusy("password");
    try {
      await updatePassword(password);
      setPassword("");
      setConfirmPassword("");
      report("password", isEn ? "Password changed successfully." : "Mot de passe modifié. Utilise-le dès ta prochaine connexion.");
    } catch (cause) {
      report("password", errorMessage(cause, isEn ? "Could not change password." : "Le mot de passe n’a pas pu être modifié."), true);
    } finally {
      setBusy(null);
    }
  }

  function exportData() {
    try {
      const payload = {
        exported_at: new Date().toISOString(),
        profile: {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          display_name: profile.display_name,
          bio: profile.bio,
          goal: profile.goal,
          skill_level: profile.skill_level,
          daily_minutes: profile.daily_minutes,
          known_areas: profile.known_areas,
          xp: profile.xp,
          level: profile.level,
          current_streak: profile.current_streak,
          longest_streak: profile.longest_streak,
          last_activity_at: profile.last_activity_at,
          created_at: profile.created_at,
        },
        settings: settings ?? null,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `cyberpingo-${profile.username}-export.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      report("data", isEn ? "JSON export ready." : "Export JSON préparé avec les données disponibles sur cette page.");
    } catch (cause) {
      report("data", errorMessage(cause, isEn ? "Could not prepare export." : "L’export n’a pas pu être préparé."), true);
    }
  }

  async function handleLogout() {
    setBusy("session");
    try {
      await logout();
      router.replace("/login?etat=deconnexion");
      router.refresh();
    } catch (cause) {
      report("session", errorMessage(cause, isEn ? "Sign out failed." : "La déconnexion a échoué."), true);
      setBusy(null);
    }
  }

  function openDanger(action: Exclude<DangerAction, null>) {
    setDangerAction(action);
    setConfirmation("");
  }

  async function confirmDanger() {
    if (!dangerAction || confirmation !== dangerPhrase) return;
    setBusy("danger");
    try {
      if (dangerAction === "reset") {
        await resetProgress();
        setDangerAction(null);
        setConfirmation("");
        report("danger", isEn ? "Progress reset. Profile and settings preserved." : "Tes progrès ont été réinitialisés. Ton profil et tes préférences sont conservés.");
        setBusy(null);
        return;
      }
      await deleteAccount();
      router.replace("/");
      router.refresh();
    } catch (cause) {
      report("danger", errorMessage(cause, dangerAction === "reset" ? (isEn ? "Reset failed." : "La réinitialisation a échoué.") : (isEn ? "Deletion failed." : "La suppression a échoué.")), true);
      setBusy(null);
    }
  }

  return (
    <div className="study-page acct-page set-page">
      <header>
        <SceneBanner variant="settings" className="set-hero">
          <div>
            <h1>{t("settings.title")}</h1>
            <p>{t("settings.subtitle")}</p>
          </div>
          <div className="set-profile-card">
            <Avatar name={profile.display_name} src={profile.avatar_url} size="lg" />
            <div>
              <strong>{profile.display_name}</strong>
              <span>@{profile.username}</span>
              <Link href="/profile" className="study-link">{isEn ? "Edit public profile" : "Modifier l’identité publique"}</Link>
            </div>
          </div>
        </SceneBanner>
      </header>

      <div className="set-layout">
        <nav className="set-nav" aria-label={isEn ? "Settings sections" : "Sections des paramètres"}>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>{section.label}</a>
          ))}
        </nav>

        <div className="set-sections">
          <section id="profil-public" className="set-section" aria-labelledby="set-profile-title">
            <div className="set-section-head">
              <span className="set-section-icon"><IconSettings size={20} /></span>
              <div>
                <h2 id="set-profile-title">{t("settings.public_profile")}</h2>
                <p>{isEn ? "Your name, handle, bio, and avatar are managed on your profile page with live preview." : "Ton nom, ton pseudo, ta bio et ton avatar se modifient depuis la page profil pour garder une prévisualisation directe."}</p>
              </div>
            </div>
            <div className="set-callout">
              <p>{profile.display_name} · @{profile.username} · {levelLabel(profile.skill_level)}</p>
              <Link href="/profile" className="study-link">{isEn ? "Open profile editor" : "Ouvrir l’édition du profil"}</Link>
            </div>
          </section>

          <section id="apprentissage" className="set-section" aria-labelledby="set-learning-title">
            <div className="set-section-head">
              <span className="set-section-icon"><IconTarget size={20} /></span>
              <div>
                <h2 id="set-learning-title">{t("settings.learning")}</h2>
                <p>{isEn ? "These choices tune the dashboard, your daily goal, and course recommendations." : "Ces choix guident le tableau de bord, l’objectif quotidien et les recommandations."}</p>
              </div>
            </div>
            <form className="set-form" onSubmit={(event) => void saveLearning(event)}>
              <div className="set-form-grid">
                <Select label={t("settings.main_goal")} value={goal} onChange={(event) => setGoal(event.target.value as LearningGoal)} options={goals.map((item) => ({ value: item.value, label: item.label }))} />
                <Select label={t("settings.skill_level")} value={skillLevel} onChange={(event) => setSkillLevel(event.target.value as SkillLevel)} options={SKILL_LEVELS.map((value) => ({ value, label: levelLabel(value) }))} />
                <Select label={t("settings.daily_time")} value={String(dailyMinutes)} onChange={(event) => setDailyMinutes(Number(event.target.value))} options={DAILY_GOALS.map((value) => ({ value: String(value), label: `${value} ${isEn ? "min/day" : "minutes par jour"}` }))} />
              </div>
              <fieldset className="set-fieldset">
                <legend>{t("settings.existing_knowledge")}</legend>
                <div className="set-chip-grid">
                  {areas.map((area) => (
                    <label key={area.value} className={knownAreas.includes(area.value) ? "is-selected" : undefined}>
                      <input type="checkbox" checked={knownAreas.includes(area.value)} onChange={() => toggleArea(area.value)} />
                      {area.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <ul className="set-goal-notes">
                {goals.filter((item) => item.value === goal).map((item) => <li key={item.value}>{item.description}</li>)}
                <li>{isEn ? `Current daily goal: ${dailyMinutes} minutes.` : `Objectif quotidien actuel : ${dailyMinutes} minutes.`}</li>
              </ul>
              <Button type="submit" loading={busy === "learning"} disabled={busy !== null}>{t("settings.save_learning")}</Button>
            </form>
            <StatusMessage status={statuses.learning} />
          </section>

          <section id="preferences" className="set-section" aria-labelledby="set-preferences-title">
            <div className="set-section-head">
              <span className="set-section-icon"><IconBell size={20} /></span>
              <div>
                <h2 id="set-preferences-title">{t("settings.preferences")}</h2>
                <p>{isEn ? "Your timezone drives daily streaks. Notifications can be configured per channel." : "Ton fuseau horaire pilote la série quotidienne. Les notifications restent activables par canal."}</p>
              </div>
            </div>
            {settingsError && (
              <div className="acct-status is-error" role="alert">
                {settingsError.message}
                <Button type="button" variant="secondary" size="sm" onClick={() => void reloadSettings()}>{isEn ? "Retry" : "Réessayer"}</Button>
              </div>
            )}
            <form className="set-form" onSubmit={(event) => void savePreferences(event)}>
              <div className="p-4 rounded-xl border border-cyber-border bg-cyber-surface/60 mb-4">
                <label className="block text-sm font-semibold text-white mb-1">
                  {isEn ? "Platform Language / Langue de la plateforme" : "Langue de la plateforme / Platform Language"}
                </label>
                <p className="text-xs text-cyber-muted mb-3">
                  {isEn
                    ? "Changes the language across the entire platform in real time: navigation, courses, and labs."
                    : "Modifie la langue sur l’ensemble de la plateforme en temps réel : navigation, cours et labs."}
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => setLanguage("fr")}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border font-medium text-sm transition-all ${
                      lang === "fr"
                        ? "border-cyber-cyan bg-cyber-cyan/15 text-white shadow-[0_0_12px_rgba(0,240,255,0.25)]"
                        : "border-cyber-border bg-cyber-bg text-cyber-muted hover:border-cyber-border-light hover:text-white"
                    }`}
                  >
                    <span className="text-base" aria-hidden="true">🇫🇷</span>
                    <span>Français</span>
                    {lang === "fr" && <span className="text-[10px] uppercase font-bold text-cyber-cyan ml-1 bg-cyber-cyan/10 px-1.5 py-0.5 rounded">Actif</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border font-medium text-sm transition-all ${
                      lang === "en"
                        ? "border-cyber-cyan bg-cyber-cyan/15 text-white shadow-[0_0_12px_rgba(0,240,255,0.25)]"
                        : "border-cyber-border bg-cyber-bg text-cyber-muted hover:border-cyber-border-light hover:text-white"
                    }`}
                  >
                    <span className="text-base" aria-hidden="true">🇬🇧</span>
                    <span>English</span>
                    {lang === "en" && <span className="text-[10px] uppercase font-bold text-cyber-cyan ml-1 bg-cyber-cyan/10 px-1.5 py-0.5 rounded">Active</span>}
                  </button>
                </div>
              </div>
              <Select label={t("settings.timezone")} value={prefTimezone} onChange={(event) => setPrefTimezone(event.target.value)} options={timezoneOptions} disabled={settingsLoading || busy !== null} />
              {settingsLoading ? (
                <div className="set-switch-list" aria-busy="true">
                  {Array.from({ length: 4 }).map((_, index) => <span key={index} className="ui-skeleton set-switch-skeleton" />)}
                </div>
              ) : (
                <div className="set-switch-list">
                  <CheckSwitch label={t("settings.email_notif")} description={t("settings.email_notif_desc")} checked={emailNotifications} onChange={setEmailNotifications} disabled={busy !== null} />
                  <CheckSwitch label={t("settings.streak_reminders")} description={t("settings.streak_reminders_desc")} checked={streakReminders} onChange={setStreakReminders} disabled={busy !== null} />
                  <CheckSwitch label={t("settings.new_content")} description={t("settings.new_content_desc")} checked={newContentAlerts} onChange={setNewContentAlerts} disabled={busy !== null} />
                  <CheckSwitch label={t("settings.sound_fx")} description={t("settings.sound_fx_desc")} checked={soundEffects} onChange={setSoundEffects} disabled={busy !== null} />
                </div>
              )}
              <Button type="submit" loading={busy === "preferences"} disabled={busy !== null || settingsLoading}>{t("settings.save_prefs")}</Button>
            </form>
            <StatusMessage status={statuses.preferences} />
          </section>

          <section id="pingo" className="set-section" aria-labelledby="set-pingo-title">
            <div className="set-section-head">
              <span className="set-section-icon"><IconAward size={20} /></span>
              <div>
                <h2 id="set-pingo-title">{t("settings.pingo")}</h2>
                <p>{isEn ? "Choose when Pingo speaks or reacts. These settings stay local on this device." : "Choisis quand Pingo intervient. Ces réglages restent sur cet appareil et n’affectent jamais ta progression."}</p>
              </div>
            </div>
            <MascotSettings idPrefix="settings" />
          </section>

          <section id="compte" className="set-section" aria-labelledby="set-account-title">
            <div className="set-section-head">
              <span className="set-section-icon"><IconMail size={20} /></span>
              <div>
                <h2 id="set-account-title">{t("settings.account")}</h2>
                <p>{isEn ? "Sensitive credentials changes are isolated to prevent unintended modifications." : "Les changements sensibles sont séparés pour éviter les validations accidentelles."}</p>
              </div>
            </div>
            <div className="set-account-grid">
              <form className="set-form set-form--compact" onSubmit={(event) => void changeEmail(event)}>
                <Input id="settings-email" label={t("settings.new_email")} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                <Button type="submit" variant="secondary" loading={busy === "email"} disabled={busy !== null}>{t("settings.send_conf_link")}</Button>
                <StatusMessage status={statuses.email} />
              </form>
              <form className="set-form set-form--compact" onSubmit={(event) => void changePassword(event)}>
                <Input id="settings-password" label={t("settings.new_password")} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
                <Input id="settings-confirm-password" label={t("settings.confirm_password")} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
                <Button type="submit" variant="secondary" loading={busy === "password"} disabled={busy !== null}>{t("settings.change_password")}</Button>
                <StatusMessage status={statuses.password} />
              </form>
            </div>
            <div className="set-logout-row">
              <div>
                <h3>{t("settings.logout")}</h3>
                <p>{t("settings.logout_desc")}</p>
              </div>
              <Button type="button" variant="ghost" loading={busy === "session"} disabled={busy !== null} icon={<IconLogout size={15} />} onClick={() => void handleLogout()}>
                {t("settings.disconnect")}
              </Button>
            </div>
            <StatusMessage status={statuses.session} />
          </section>

          <section id="donnees" className="set-section" aria-labelledby="set-data-title">
            <div className="set-section-head">
              <span className="set-section-icon"><IconDownload size={20} /></span>
              <div>
                <h2 id="set-data-title">{t("settings.data")}</h2>
                <p>{t("settings.export_desc")}</p>
              </div>
            </div>
            <div className="set-data-card">
              <IconList size={22} aria-hidden="true" />
              <div>
                <strong>{isEn ? "Personal JSON Export" : "Export personnel"}</strong>
                <p>{isEn ? "The file is generated locally in your browser. No extra storage is created." : "Le fichier est généré dans ton navigateur. Aucun nouveau stockage n’est créé."}</p>
              </div>
              <Button type="button" variant="secondary" icon={<IconDownload size={15} />} onClick={exportData}>{t("settings.export_json")}</Button>
            </div>
            <StatusMessage status={statuses.data} />
            <Link href="/confidentialite" className="study-link">{isEn ? "Privacy Policy & Data Rights" : "Comprendre comment mes données sont utilisées"}</Link>
          </section>

          <section id="danger" className="set-section set-section--danger" aria-labelledby="set-danger-title">
            <div className="set-section-head">
              <span className="set-section-icon"><IconAlert size={20} /></span>
              <div>
                <h2 id="set-danger-title">{t("settings.danger")}</h2>
                <p>{isEn ? "These actions are isolated and require typed confirmation before executing." : "Ces actions sont isolées et demandent une confirmation tapée avant d’appeler le serveur."}</p>
              </div>
            </div>
            <div className="set-danger-grid">
              <article>
                <IconClock size={22} aria-hidden="true" />
                <h3>{isEn ? "Reset learning progress" : "Réinitialiser la progression"}</h3>
                <p>{isEn ? "Wipes XP, badges, lessons, quizzes, labs, and certificates. Your profile and preferences remain intact." : "Efface XP, badges, leçons, quiz, labs et certificats obtenus. Ton profil et tes préférences restent en place."}</p>
                <Button type="button" variant="danger" disabled={busy !== null} onClick={() => openDanger("reset")}>{isEn ? "Reset" : "Réinitialiser"}</Button>
              </article>
              <article>
                <IconAlert size={22} aria-hidden="true" />
                <h3>{isEn ? "Delete account" : "Supprimer le compte"}</h3>
                <p>{isEn ? "Permanently deletes your CyberPingo account and all associated data." : "Supprime définitivement ton compte CyberPingo et les données associées."}</p>
                <Button type="button" variant="danger" disabled={busy !== null} onClick={() => openDanger("delete")}>{isEn ? "Delete my account" : "Supprimer mon compte"}</Button>
              </article>
            </div>
            <StatusMessage status={statuses.danger} />
          </section>
        </div>
      </div>

      <Modal open={dangerAction !== null} onClose={() => { if (busy !== "danger") setDangerAction(null); }} title={dangerTitle}>
        <div className="set-danger-modal">
          <p>
            {isEn ? (
              <>This action cannot be undone. Type <strong>{dangerPhrase}</strong> to confirm.</>
            ) : (
              <>Cette action est irréversible. Tape <strong>{dangerPhrase}</strong> pour confirmer.</>
            )}
          </p>
          <Input
            id="danger-confirmation"
            label={isEn ? "Confirmation" : "Confirmation"}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            autoFocus
          />
          <div className="set-modal-actions">
            <Button type="button" variant="ghost" disabled={busy === "danger"} onClick={() => setDangerAction(null)}>{isEn ? "Cancel" : "Annuler"}</Button>
            <Button type="button" variant="danger" loading={busy === "danger"} disabled={confirmation !== dangerPhrase || busy === "danger"} onClick={() => void confirmDanger()}>
              {isEn ? "Confirm" : "Confirmer"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  return <AppShell><SettingsContent /></AppShell>;
}
