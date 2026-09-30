"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { useUserFull } from "@/context/UserContext";
import { downloadText } from "@/lib/download";
import Link from "next/link";
import { dailyGoals } from "@/lib/learning-progress";

const DELETE_PHRASE = "SUPPRIMER";

function SettingsForm() {
  const router = useRouter();
  const { user, updateProfile, resetProgress, deleteAccount } = useUserFull();
  const [name, setName] = useState(user.name);
  const [minutes, setMinutes] = useState(user.dailyMinutes);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<"profile" | "reset" | "delete" | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  function report(message: string, failed = false) { setError(failed); setStatus(message); }
  const failure = (cause: unknown, fallback: string) => report(cause instanceof Error ? cause.message : fallback, true);

  async function saveProfile() {
    setBusy("profile");
    try { await updateProfile(name, minutes); report("Profil enregistré. Il est à jour sur tous tes appareils."); }
    catch (cause) { failure(cause, "Le profil n’a pas pu être mis à jour."); }
    finally { setBusy(null); }
  }

  async function reset() {
    setBusy("reset");
    try { await resetProgress(); setConfirmation(false); report("Progrès réinitialisés. Ton profil et tes préférences sont conservés."); }
    catch (cause) { failure(cause, "La réinitialisation a échoué. Réessaie."); }
    finally { setBusy(null); }
  }

  async function removeAccount() {
    setBusy("delete");
    try { await deleteAccount(); router.replace("/login?etat=supprime"); router.refresh(); }
    catch (cause) { failure(cause, "La suppression a échoué. Réessaie."); setBusy(null); }
  }

  return <div className="study-page">
    <header className="study-heading"><h1>Un espace à ton rythme.</h1><p>Personnalise ton profil et garde la main sur tes données.</p></header>
    <form className="settings-form" onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
      <h2>Profil et objectif</h2><label>Nom affiché<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={50} required autoComplete="nickname" /></label>
      <label>Adresse e-mail<input value={user.email} readOnly aria-readonly="true" /></label>
      <label>Temps d’apprentissage souhaité<select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>{dailyGoals.map((value) => <option key={value} value={value}>{value} minutes par jour</option>)}</select></label>
      <p>Cet objectif sert de repère ; le temps passé n’est pas mesuré automatiquement. Les animations respectent la préférence de réduction du mouvement de ton appareil.</p>
      <Button type="submit" loading={busy === "profile"} disabled={busy !== null}>Enregistrer les préférences</Button>
    </form>
    <section className="settings-data"><h2>Une copie de tes progrès</h2><p>Télécharge ton profil, tes scores et tes badges au format JSON. Ce fichier contient ton adresse e-mail : garde-le privé.</p>
      <Button variant="secondary" onClick={() => {
        try { downloadText("cyberpingo-progression.json", JSON.stringify({ version: 3, exportedAt: new Date().toISOString(), user }, null, 2), "application/json"); report("Export préparé. Le téléchargement a été demandé au navigateur."); }
        catch (cause) { console.error("Export du profil impossible.", cause); report("L’export a échoué. Réessaie dans un navigateur autorisant les téléchargements.", true); }
      }}>Exporter mes données</Button>
    </section>
    <section className="settings-data"><h2>Recommencer à zéro</h2><p>Efface les XP, badges, leçons, scores et défis de ton compte. Ton nom, ton objectif et ta connexion sont conservés. Cette action est irréversible ; exporte tes données avant de continuer.</p>
      {!confirmation ? <Button variant="secondary" onClick={() => setConfirmation(true)} disabled={busy !== null}>Réinitialiser mes progrès…</Button> : <div className="reset-confirmation"><p id="reset-warning">Confirmer l’effacement de tous les progrès de {user.name} ?</p><div className="study-actions"><Button variant="danger" aria-describedby="reset-warning" loading={busy === "reset"} disabled={busy !== null} onClick={() => void reset()}>Oui, effacer mes progrès</Button><Button variant="secondary" onClick={() => setConfirmation(false)} disabled={busy === "reset"}>Annuler</Button></div></div>}
    </section>
    <section className="settings-data"><h2>Supprimer mon compte</h2><p>Supprime définitivement ton compte, ta progression, tes badges et ton historique d’activité. Tu pourras recréer un compte plus tard, mais rien ne pourra être restauré.</p>
      {!deleting ? <Button variant="secondary" onClick={() => setDeleting(true)} disabled={busy !== null}>Supprimer mon compte…</Button> : <div className="reset-confirmation">
        <label htmlFor="delete-phrase" id="delete-warning">Pour confirmer, tape <strong>{DELETE_PHRASE}</strong> ci-dessous.</label>
        <input id="delete-phrase" value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} autoComplete="off" aria-describedby="delete-warning" />
        <div className="study-actions"><Button variant="danger" loading={busy === "delete"} disabled={deletePhrase.trim().toUpperCase() !== DELETE_PHRASE || busy !== null} onClick={() => void removeAccount()}>Supprimer définitivement</Button><Button variant="secondary" onClick={() => { setDeleting(false); setDeletePhrase(""); }} disabled={busy === "delete"}>Annuler</Button></div>
      </div>}
    </section>
    {status && <p className={`settings-status ${error ? "is-error" : ""}`} role={error ? "alert" : "status"}>{status}</p>}
    <Link href="/confidentialite" className="study-link">Comprendre comment mes données sont utilisées →</Link>
  </div>;
}

export default function SettingsPage() {
  const { user } = useUserFull();
  return <AppShell><SettingsForm key={user.id} /></AppShell>;
}
