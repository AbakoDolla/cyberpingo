"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import BadgeMedal from "@/components/art/BadgeMedal";
import EmptyArt from "@/components/art/EmptyArt";
import SceneBanner from "@/components/art/SceneBanner";
import { badgeTierFromXp } from "@/components/art/shared";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  IconAlert,
  IconAward,
  IconCertificate,
  IconCheck,
  IconClock,
  IconDownload,
  IconEdit,
  IconFlame,
  IconLogout,
  IconUpload,
} from "@/components/ui/Icon";
import { useUserActions, useLearner } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatNumber, formatRelative, formatShortDate, levelLabel } from "@/lib/format";
import { getCertificatePdfUrl, listBadgesWithState, listMyCertificates } from "@/services/gamification.service";
import { AVATAR_MAX_BYTES, type ProfileChanges } from "@/services/profile.service";
import type { BadgeCriteria, BadgeWithState, Certificate } from "@/types/api";

const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const CRITERIA_LABELS: Record<BadgeCriteria, [string, string]> = {
  lessons_completed: ["leçon terminée", "leçons terminées"],
  quizzes_passed: ["quiz réussi", "quiz réussis"],
  courses_completed: ["parcours terminé", "parcours terminés"],
  streak_days: ["jour de série", "jours de série"],
  xp_total: ["XP au total", "XP au total"],
  labs_solved: ["lab résolu", "labs résolus"],
  certificates_earned: ["certificat obtenu", "certificats obtenus"],
  course_completed: ["parcours ciblé terminé", "parcours ciblés terminés"],
  lab_completed: ["lab ciblé résolu", "labs ciblés résolus"],
  skill_validated: ["compétence ciblée validée", "compétences ciblées validées"],
};

function criteriaLabel(type: BadgeCriteria, value: number) {
  const labels = CRITERIA_LABELS[type];
  if (!labels) return String(type);
  return value > 1 ? labels[1] : labels[0];
}

type ProfileData = { badges: BadgeWithState[]; certificates: Certificate[] };
type DownloadState = { loading?: boolean; error?: string; success?: string };
type Status = { message: string; error?: boolean } | null;
type ProfileFields = { displayName: string; username: string; bio: string };
type ProfileErrors = Partial<Record<keyof ProfileFields, string>>;

function validateProfile(fields: ProfileFields) {
  const errors: ProfileErrors = {};
  const displayName = fields.displayName.trim();
  const username = fields.username.trim().toLowerCase();
  const bio = fields.bio.trim();
  if (displayName.length < 2 || displayName.length > 50) errors.displayName = "Entre 2 et 50 caractères.";
  if (!USERNAME_PATTERN.test(username)) errors.username = "3 à 32 caractères, uniquement a-z, 0-9 et _.";
  if (bio.length > 280) errors.bio = "Ta bio est limitée à 280 caractères.";
  return errors;
}

function ProfileLoading() {
  return (
    <div className="study-page acct-page prof-page" aria-busy="true">
      <div className="prof-shell">
        <div className="prof-hero prof-skeleton-hero">
          <div className="ui-skeleton prof-skeleton-avatar" />
          <div className="prof-skeleton-copy">
            <div className="ui-skeleton ui-skeleton--title" />
            <div className="ui-skeleton ui-skeleton--line" />
            <div className="prof-skeleton-strip">
              <span className="ui-skeleton" />
              <span className="ui-skeleton" />
              <span className="ui-skeleton" />
            </div>
          </div>
        </div>
        <div className="prof-panel-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="ui-skeleton ui-skeleton--card" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileError({ message, reload }: { message: string; reload: () => void }) {
  return (
    <div className="study-page acct-page">
      <div className="ui-state is-error" role="alert">
        <span className="ui-state__icon"><IconAlert size={20} /></span>
        <h1>Impossible de charger ton profil.</h1>
        <p className="ui-state__body">{message}</p>
        <Button type="button" variant="secondary" onClick={reload}>Réessayer</Button>
      </div>
    </div>
  );
}

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p className={`acct-status ${status.error ? "is-error" : ""}`} role={status.error ? "alert" : "status"} aria-live="polite">
      {status.message}
    </p>
  );
}

function BadgeGallery({ badges }: { badges: BadgeWithState[] }) {
  const earned = badges.filter((badge) => badge.earned).length;
  return (
    <section className="prof-panel prof-panel--wide" aria-labelledby="prof-badges-title">
      <div className="prof-section-head">
        <div>
          <h2 id="prof-badges-title">Badges</h2>
          <p>{earned} badge{earned > 1 ? "s" : ""} obtenu{earned > 1 ? "s" : ""} sur {badges.length} disponible{badges.length > 1 ? "s" : ""}.</p>
        </div>
        <IconAward size={22} aria-hidden="true" />
      </div>
      {badges.length === 0 ? (
        <div className="study-empty"><EmptyArt kind="badges" /><p>Aucun badge disponible pour le moment.</p></div>
      ) : (
        <ul className="prof-badge-list">
          {badges.map((badge) => (
            <li key={badge.id} className={`prof-badge ${badge.earned ? "is-earned" : ""}`}>
              <span className="prof-badge__icon"><BadgeMedal icon={badge.icon} earned={badge.earned} tier={badgeTierFromXp(badge.xp_reward)} size={64} /></span>
              <span className="prof-badge__body">
                <strong>{badge.name}</strong>
                <span>{badge.description}</span>
                <small>
                  {badge.earned ? `Obtenu le ${formatShortDate(badge.earned_at ?? new Date())}` : `Objectif : ${badge.criteria_value} ${criteriaLabel(badge.criteria_type, badge.criteria_value)}`}
                </small>
              </span>
              {badge.xp_reward > 0 && <Badge tone={badge.earned ? "green" : "neutral"}>+{badge.xp_reward} XP</Badge>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CertificatesList({
  certificates,
  states,
  onDownload,
}: {
  certificates: Certificate[];
  states: Record<string, DownloadState>;
  onDownload: (certificate: Certificate) => void;
}) {
  return (
    <section className="prof-panel prof-panel--wide" aria-labelledby="prof-certificates-title">
      <div className="prof-section-head">
        <div>
          <h2 id="prof-certificates-title">Certificats</h2>
          <p>Les attestations vérifiables obtenues à la fin des parcours.</p>
        </div>
        <IconCertificate size={22} aria-hidden="true" />
      </div>
      {certificates.length === 0 ? (
        <p className="study-empty">Aucun certificat obtenu pour le moment.</p>
      ) : (
        <div className="prof-certificate-list">
          {certificates.map((certificate) => {
            const state = states[certificate.id] ?? {};
            const revoked = Boolean(certificate.revoked_at);
            return (
              <article key={certificate.id} className={`prof-certificate ${revoked ? "is-revoked" : ""}`}>
                <div>
                  <Badge tone={revoked ? "red" : "green"}>{revoked ? "Révoqué" : "Valide"}</Badge>
                  <h3>{certificate.course_title}</h3>
                  <p>N° {certificate.certificate_number} · délivré le {formatDate(certificate.issued_at)}</p>
                  {revoked && <p className="prof-certificate__warning">{certificate.revoked_reason ?? "Ce certificat n’est plus valide."}</p>}
                  <Link href={`/certificat/${certificate.verification_code}`} className="study-link">Page publique de vérification</Link>
                </div>
                <div className="prof-certificate__actions">
                  <Button
                    type="button"
                    variant="secondary"
                    loading={state.loading}
                    disabled={revoked || state.loading}
                    icon={<IconDownload size={15} />}
                    onClick={() => onDownload(certificate)}
                  >
                    Télécharger le PDF
                  </Button>
                  {state.error && <p role="alert" className="acct-status is-error">{state.error}</p>}
                  {state.success && <p role="status" className="acct-status">{state.success}</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProfileContent() {
  const { profile, level, streak } = useLearner();
  const { updateProfile, updateAvatar, logout } = useUserActions();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<ProfileFields>({ displayName: profile.display_name, username: profile.username, bio: profile.bio });
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [avatarStatus, setAvatarStatus] = useState<Status>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState<{ file: File; previewUrl: string } | null>(null);
  const [downloadStates, setDownloadStates] = useState<Record<string, DownloadState>>({});

  const { data, error, loading, reload } = useAsync<ProfileData>(async () => {
    const [badges, certificates] = await Promise.all([listBadgesWithState(profile.id), listMyCertificates(profile.id)]);
    return { badges, certificates };
  }, [profile.id]);

  useEffect(() => {
    if (!editing) setFields({ displayName: profile.display_name, username: profile.username, bio: profile.bio });
  }, [editing, profile.bio, profile.display_name, profile.username]);

  useEffect(() => () => {
    if (avatarDraft) URL.revokeObjectURL(avatarDraft.previewUrl);
  }, [avatarDraft]);

  const avatarPreview = avatarDraft?.previewUrl ?? profile.avatar_url;
  const earnedBadges = data?.badges.filter((badge) => badge.earned).length ?? 0;
  const validCertificates = data?.certificates.filter((certificate) => !certificate.revoked_at).length ?? 0;
  const xpToNext = level?.next_level_xp ? Math.max(0, level.next_level_xp - level.xp) : null;
  const lastActivity = profile.last_activity_at ?? profile.last_activity_date;

  const profileSummary = useMemo(() => [
    { label: "Niveau", value: `${level?.level ?? profile.level}`, detail: level?.title ?? "CyberPingo", tone: "blue" },
    { label: "XP", value: formatNumber(profile.xp), detail: xpToNext === null ? "Palier maximal atteint" : `${formatNumber(xpToNext)} XP avant le niveau suivant`, tone: "green" },
    { label: "Série", value: `${streak} j`, detail: `record ${profile.longest_streak} j`, tone: "amber" },
    { label: "Badges", value: `${earnedBadges}`, detail: "obtenus", tone: "purple" },
    { label: "Certificats", value: `${validCertificates}`, detail: "valides", tone: "green" },
  ], [earnedBadges, level, profile.level, profile.longest_streak, profile.xp, streak, validCertificates, xpToNext]);

  function updateField(key: keyof ProfileFields, value: string) {
    setFields((current) => ({ ...current, [key]: key === "username" ? value.toLowerCase() : value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateProfile(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSavingProfile(true);
    setProfileStatus(null);
    try {
      const changes: ProfileChanges = {
        display_name: fields.displayName.trim(),
        username: fields.username.trim().toLowerCase(),
        bio: fields.bio.trim(),
      };
      await updateProfile(changes);
      setEditing(false);
      setProfileStatus({ message: "Profil enregistré. Ton identité publique est à jour." });
    } catch (cause) {
      setProfileStatus({ message: errorMessage(cause, "Le profil n’a pas pu être enregistré."), error: true });
    } finally {
      setSavingProfile(false);
    }
  }

  function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarStatus({ message: "Choisis une image PNG, JPEG ou WebP.", error: true });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarStatus({ message: `Ton avatar doit faire moins de ${Math.round(AVATAR_MAX_BYTES / 1024 / 1024)} Mo.`, error: true });
      return;
    }
    setAvatarDraft((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
    setAvatarStatus({ message: "Aperçu prêt. Enregistre l’avatar pour le publier." });
  }

  async function saveAvatar() {
    if (!avatarDraft) return;
    setSavingAvatar(true);
    setAvatarStatus(null);
    try {
      await updateAvatar(avatarDraft.file);
      setAvatarDraft(null);
      setAvatarStatus({ message: "Avatar mis à jour." });
    } catch (cause) {
      setAvatarStatus({ message: errorMessage(cause, "L’avatar n’a pas pu être envoyé."), error: true });
    } finally {
      setSavingAvatar(false);
    }
  }

  async function removeAvatar() {
    setSavingAvatar(true);
    setAvatarStatus(null);
    try {
      await updateAvatar(null);
      setAvatarDraft(null);
      setAvatarStatus({ message: "Avatar supprimé." });
    } catch (cause) {
      setAvatarStatus({ message: errorMessage(cause, "L’avatar n’a pas pu être supprimé."), error: true });
    } finally {
      setSavingAvatar(false);
    }
  }

  async function handleLogout() {
    setLeaving(true);
    try {
      await logout();
    } finally {
      router.replace("/login?etat=deconnexion");
      router.refresh();
    }
  }

  async function downloadCertificate(certificate: Certificate) {
    setDownloadStates((current) => ({ ...current, [certificate.id]: { loading: true } }));
    try {
      const url = await getCertificatePdfUrl(certificate);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) window.location.href = url;
      setDownloadStates((current) => ({ ...current, [certificate.id]: { success: "Le lien sécurisé de téléchargement est prêt." } }));
    } catch (cause) {
      setDownloadStates((current) => ({ ...current, [certificate.id]: { error: errorMessage(cause, "Le PDF n’a pas pu être récupéré.") } }));
    }
  }

  if (loading) return <ProfileLoading />;
  if (error) return <ProfileError message={error.message} reload={() => void reload()} />;
  if (!data) return <ProfileError message="Aucune donnée reçue." reload={() => void reload()} />;

  return (
    <div className="study-page acct-page prof-page">
      <div className="prof-shell">
        <div className="prof-profile-cover">
          <SceneBanner variant="profile" className="prof-hero__banner">
            <div className="prof-hero__banner-copy">
              <h1>Profil CyberPingo</h1>
              <p>Retrouve ton identité publique, tes récompenses et la trace visible de tes progrès dans la plateforme.</p>
            </div>
          </SceneBanner>

          <section className="prof-hero" aria-labelledby="prof-title">
            <div className="prof-avatar-stage">
              <Avatar name={profile.display_name} src={avatarPreview} size="xl" ringTone={avatarDraft ? "green" : "blue"} className="prof-avatar" />
              {avatarDraft && <Badge tone="green" className="prof-avatar-badge">Aperçu</Badge>}
            </div>

            <div className="prof-identity">
              <div className="prof-title-row">
                <div>
                  <h1 id="prof-title">{profile.display_name}</h1>
                  <p>@{profile.username} · membre depuis le {formatDate(profile.created_at)}</p>
                </div>
                <div className="prof-actions">
                  <Button type="button" variant="secondary" icon={<IconEdit size={15} />} onClick={() => setEditing((current) => !current)}>
                    {editing ? "Fermer l’édition" : "Modifier le profil"}
                  </Button>
                  <Button type="button" variant="ghost" loading={leaving} icon={<IconLogout size={15} />} onClick={() => void handleLogout()}>
                    Déconnexion
                  </Button>
                </div>
              </div>

              <p className="prof-bio">{profile.bio || "Ajoute une bio pour expliquer ce que tu apprends, ce que tu pratiques et le prochain défi que tu veux réussir."}</p>

              <div className="prof-meta-row" aria-label="Informations du profil">
                <span><IconAward size={16} /> {level?.title ?? "CyberPingo"}</span>
                <span><IconClock size={16} /> Objectif {profile.daily_minutes} min/jour</span>
                <span><IconFlame size={16} /> {streak} jour{streak > 1 ? "s" : ""} de série</span>
                <span><IconCheck size={16} /> {levelLabel(profile.skill_level)}</span>
              </div>

              {level && (
                <div className="prof-level-progress">
                  <div>
                    <strong>Niveau {level.level}</strong>
                    <span>{level.next_title ? `Prochain titre : ${level.next_title}` : "Dernier palier débloqué"}</span>
                  </div>
                  <ProgressBar value={level.progress_percentage} tone="brand" height="sm" label="Progression vers le niveau suivant" />
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="prof-edit-panel" aria-label="Avatar et édition du profil">
          <div className="prof-avatar-tools">
            <div>
              <h2>Avatar</h2>
              <p>PNG, JPEG ou WebP. Taille maximale : {Math.round(AVATAR_MAX_BYTES / 1024 / 1024)} Mo.</p>
            </div>
            <div className="prof-avatar-buttons">
              <label className="study-button prof-upload">
                <IconUpload size={16} /> Choisir une image
                <input type="file" accept={AVATAR_TYPES.join(",")} onChange={handleAvatar} disabled={savingAvatar} />
              </label>
              <Button type="button" variant="success" loading={savingAvatar} disabled={!avatarDraft || savingAvatar} onClick={() => void saveAvatar()}>
                Enregistrer l’avatar
              </Button>
              <Button type="button" variant="secondary" disabled={savingAvatar || (!profile.avatar_url && !avatarDraft)} onClick={() => avatarDraft ? setAvatarDraft(null) : void removeAvatar()}>
                {avatarDraft ? "Annuler l’aperçu" : "Retirer l’avatar"}
              </Button>
            </div>
            <StatusMessage status={avatarStatus} />
          </div>

          {editing && (
            <form className="prof-form" onSubmit={(event) => void saveProfile(event)} noValidate>
              <div className="prof-form-grid">
                <label className="prof-field">
                  <span>Nom affiché</span>
                  <input
                    value={fields.displayName}
                    onChange={(event) => updateField("displayName", event.target.value)}
                    minLength={2}
                    maxLength={50}
                    required
                    aria-invalid={Boolean(errors.displayName)}
                    aria-describedby={errors.displayName ? "prof-display-error" : "prof-display-hint"}
                  />
                  {errors.displayName ? <small id="prof-display-error" role="alert">{errors.displayName}</small> : <small id="prof-display-hint">{fields.displayName.trim().length}/50 caractères</small>}
                </label>
                <label className="prof-field">
                  <span>Nom d’utilisateur</span>
                  <input
                    value={fields.username}
                    onChange={(event) => updateField("username", event.target.value)}
                    pattern="[a-z0-9_]{3,32}"
                    required
                    aria-invalid={Boolean(errors.username)}
                    aria-describedby={errors.username ? "prof-username-error" : "prof-username-hint"}
                  />
                  {errors.username ? <small id="prof-username-error" role="alert">{errors.username}</small> : <small id="prof-username-hint">Minuscules, chiffres et underscores uniquement.</small>}
                </label>
              </div>
              <label className="prof-field">
                <span>Bio</span>
                <textarea
                  value={fields.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                  maxLength={280}
                  rows={4}
                  placeholder="Explique ce que tu apprends en ce moment."
                  aria-invalid={Boolean(errors.bio)}
                  aria-describedby={errors.bio ? "prof-bio-error" : "prof-bio-hint"}
                />
                {errors.bio ? <small id="prof-bio-error" role="alert">{errors.bio}</small> : <small id="prof-bio-hint">{fields.bio.length}/280 caractères</small>}
              </label>
              <div className="prof-form-actions">
                <Button type="submit" loading={savingProfile}>Enregistrer le profil</Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={savingProfile}
                  onClick={() => {
                    setFields({ displayName: profile.display_name, username: profile.username, bio: profile.bio });
                    setErrors({});
                    setEditing(false);
                  }}
                >
                  Annuler
                </Button>
              </div>
              <StatusMessage status={profileStatus} />
            </form>
          )}
          {!editing && <StatusMessage status={profileStatus} />}
        </section>

        <section className="prof-stat-strip" aria-label="Résumé du profil">
          {profileSummary.map((item) => (
            <div key={item.label} className={`prof-stat is-${item.tone}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </div>
          ))}
        </section>

        <section className="prof-panel-grid" aria-label="Activité du compte">
          <div className="prof-panel">
            <div className="prof-section-head">
              <div>
                <h2>Dernière activité</h2>
                <p>{lastActivity ? formatRelative(lastActivity) : "Aucune activité enregistrée pour le moment."}</p>
              </div>
              <IconClock size={22} aria-hidden="true" />
            </div>
            <Link href="/progression" className="study-link">Voir la progression détaillée</Link>
          </div>
          <div className="prof-panel">
            <div className="prof-section-head">
              <div>
                <h2>Objectif</h2>
                <p>{profile.daily_minutes} minutes par jour · {levelLabel(profile.skill_level)}</p>
              </div>
              <IconCheck size={22} aria-hidden="true" />
            </div>
            <Link href="/parametres" className="study-link">Ajuster mes préférences</Link>
          </div>
        </section>

        <BadgeGallery badges={data.badges} />
        <CertificatesList certificates={data.certificates} states={downloadStates} onDownload={(certificate) => void downloadCertificate(certificate)} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return <AppShell><ProfileContent /></AppShell>;
}
