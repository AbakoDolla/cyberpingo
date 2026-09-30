"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { IconAward, IconCertificate, IconDownload, IconFlame, IconLogout } from "@/components/ui/Icon";
import SlugIcon from "@/components/ui/SlugIcon";
import { useAsync } from "@/hooks/useAsync";
import { useLearner, useUserActions } from "@/context/UserContext";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatNumber, formatShortDate, levelLabel } from "@/lib/format";
import { getCertificatePdfUrl, listBadgesWithState, listMyCertificates } from "@/services/gamification.service";
import type { BadgeCriteria, BadgeWithState, Certificate } from "@/types/api";

const CRITERIA_LABELS: Record<BadgeCriteria, string> = {
  lessons_completed: "leçons terminées",
  quizzes_passed: "quiz réussis",
  courses_completed: "parcours terminés",
  streak_days: "jours de série",
  xp_total: "XP au total",
  labs_solved: "labs résolus",
  certificates_earned: "certificats obtenus",
  course_completed: "parcours ciblé terminé",
};

type ProfileData = { badges: BadgeWithState[]; certificates: Certificate[] };
type DownloadState = { loading?: boolean; error?: string; success?: string };

function ProfileLoading() {
  return <div className="study-page" aria-busy="true"><div className="h-44 rounded-xl2 bg-white/[0.04] animate-pulse" /><div className="mt-6 grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 rounded-xl2 bg-white/[0.04] animate-pulse" />)}</div></div>;
}

function ProfileError({ message, reload }: { message: string; reload: () => void }) {
  return <div className="study-page"><Card className="border-cyber-red/30 bg-cyber-red/10"><h1 className="font-display text-2xl font-semibold">Impossible de charger ton profil.</h1><p className="mt-3 text-sm text-red-100">{message}</p><Button type="button" variant="secondary" className="mt-5" onClick={reload}>Réessayer</Button></Card></div>;
}

function BadgeGallery({ badges }: { badges: BadgeWithState[] }) {
  const earned = badges.filter((badge) => badge.earned).length;
  return <Card><div className="flex items-center justify-between gap-4"><h2 className="font-display text-xl font-semibold">Badges</h2><span className="text-sm text-white/50 tabular-nums">{earned} / {badges.length}</span></div>{badges.length === 0 ? <p className="study-empty px-0 pb-0">Aucun badge disponible pour le moment.</p> : <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{badges.map((badge) => <details key={badge.id} className={`rounded-xl border p-4 ${badge.earned ? "border-neon-purple/35 bg-neon-purple/10" : "border-white/10 bg-white/[0.02] opacity-70"}`}><summary className="cursor-pointer list-none text-center"><span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${badge.earned ? "bg-neon-purple/15 text-neon-purple" : "bg-white/5 text-white/45"}`}><SlugIcon name={badge.icon} size={24} /></span><span className="mt-2 block font-medium">{badge.name}</span><span className={badge.earned ? "mt-1 block text-xs text-cyber-green" : "mt-1 block text-xs text-white/45"}>{badge.earned ? `Obtenu le ${formatShortDate(badge.earned_at ?? new Date())}` : "À débloquer"}</span></summary><p className="mt-3 text-xs leading-6 text-white/60">{badge.description}</p><p className="mt-2 text-xs text-white/45">Critère : {badge.criteria_value} {CRITERIA_LABELS[badge.criteria_type] ?? badge.criteria_type}</p>{badge.xp_reward > 0 && <p className="mt-1 text-xs text-cyber-green">Récompense : +{badge.xp_reward} XP</p>}</details>)}</div>}</Card>;
}

function CertificatesList({ certificates, states, onDownload }: { certificates: Certificate[]; states: Record<string, DownloadState>; onDownload: (certificate: Certificate) => void }) {
  return <Card><div className="flex items-center gap-2"><IconCertificate size={18} className="text-cyber-blue" /><h2 className="font-display text-xl font-semibold">Certificats</h2></div>{certificates.length === 0 ? <p className="study-empty px-0 pb-0">Aucun certificat obtenu pour le moment.</p> : <div className="mt-5 grid gap-4">{certificates.map((certificate) => {
    const state = states[certificate.id] ?? {};
    const revoked = Boolean(certificate.revoked_at);
    return <div key={certificate.id} className={`rounded-xl border p-4 ${revoked ? "border-cyber-red/30 bg-cyber-red/10" : "border-white/10 bg-white/[0.02]"}`}><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><Badge tone={revoked ? "red" : "green"}>{revoked ? "Révoqué" : "Valide"}</Badge><h3 className="mt-3 font-display font-semibold">{certificate.course_title}</h3><p className="mt-1 text-sm text-white/55">N° {certificate.certificate_number} · délivré le {formatDate(certificate.issued_at)}</p>{revoked && <p className="mt-2 text-sm text-red-100">{certificate.revoked_reason ?? "Ce certificat n’est plus valide."}</p>}<Link href={`/certificat/${certificate.verification_code}`} className="study-link">Page publique de vérification</Link></div><Button type="button" variant="secondary" loading={state.loading} disabled={revoked || state.loading} icon={<IconDownload size={15} />} onClick={() => onDownload(certificate)}>Télécharger le PDF</Button></div>{state.error && <p role="alert" className="settings-status is-error mt-4">{state.error}</p>}{state.success && <p role="status" className="settings-status mt-4">{state.success}</p>}</div>;
  })}</div>}</Card>;
}

function ProfileContent() {
  const { profile, level, streak } = useLearner();
  const { logout } = useUserActions();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [downloadStates, setDownloadStates] = useState<Record<string, DownloadState>>({});
  const { data, error, loading, reload } = useAsync<ProfileData>(async () => {
    const [badges, certificates] = await Promise.all([listBadgesWithState(profile.id), listMyCertificates(profile.id)]);
    return { badges, certificates };
  }, [profile.id]);

  async function handleLogout() {
    setLeaving(true);
    try { await logout(); } finally { router.replace("/login?etat=deconnexion"); router.refresh(); }
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

  const earnedBadges = data.badges.filter((badge) => badge.earned).length;

  return <div className="study-page space-y-6">
    <div className="study-actions"><Link href="/progression" className="study-link">Ma progression détaillée</Link><Link href="/parametres" className="study-link">Modifier mon profil et mes préférences</Link></div>
    <section className="rounded-xl2 border border-white/5 bg-dark-navy p-8">
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
        <Avatar name={profile.display_name} src={profile.avatar_url} size="xl" />
        <div className="flex-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-[11px] uppercase tracking-[0.2em] text-cyber-blue">Profil apprenant</p><h1 className="mt-1 font-display text-3xl font-semibold">{profile.display_name}</h1><p className="text-white/50">@{profile.username}</p></div>
            <Button variant="secondary" size="sm" onClick={() => void handleLogout()} loading={leaving} icon={<IconLogout size={14} />}>Se déconnecter</Button>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{profile.bio || "Aucune bio pour le moment. Ajoute quelques mots dans les paramètres pour personnaliser ton profil."}</p>
          <p className="mt-2 text-xs text-white/40">Membre depuis le {formatDate(profile.created_at)} · objectif {profile.daily_minutes} min/jour · {levelLabel(profile.skill_level)}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-white/45">Niveau</p><p className="font-display text-xl font-semibold">{level?.level ?? profile.level} · {level?.title ?? "CyberPingo"}</p>{level && <ProgressBar value={level.progress_percentage} tone="blue" height="sm" className="mt-2" />}</div>
            <div><p className="text-xs text-white/45">XP</p><p className="font-display text-xl font-semibold text-cyber-blue">{formatNumber(profile.xp)}</p></div>
            <div><p className="text-xs text-white/45">Série</p><p className="font-display text-xl font-semibold text-cyber-yellow"><IconFlame size={17} className="mb-1 mr-1 inline" />{streak} jours</p></div>
          </div>
        </div>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-3" aria-label="Résumé du profil"><Card className="text-center"><p className="font-display text-3xl font-bold text-cyber-blue">{earnedBadges}</p><p className="mt-1 text-sm text-white/50">Badges obtenus</p></Card><Card className="text-center"><p className="font-display text-3xl font-bold text-cyber-green">{data.certificates.filter((certificate) => !certificate.revoked_at).length}</p><p className="mt-1 text-sm text-white/50">Certificats valides</p></Card><Card className="text-center"><p className="font-display text-3xl font-bold text-neon-purple">{profile.longest_streak}</p><p className="mt-1 text-sm text-white/50">Meilleure série</p></Card></section>

    <BadgeGallery badges={data.badges} />
    <CertificatesList certificates={data.certificates} states={downloadStates} onDownload={(certificate) => void downloadCertificate(certificate)} />
  </div>;
}

export default function ProfilePage() {
  return <AppShell><ProfileContent /></AppShell>;
}