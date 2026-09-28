"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { useUserFull } from "@/context/UserContext";
import { downloadText } from "@/lib/download";
import Link from "next/link";
import { dailyGoals } from "@/lib/learning-progress";

function SettingsForm() {
  const { user, updateProfile, resetProgress } = useUserFull();
  const [name, setName] = useState(user.name);
  const [minutes, setMinutes] = useState(user.dailyMinutes);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  function report(message: string, failed = false) { setError(failed); setStatus(message); }
  return <div className="study-page">
    <header className="study-heading"><h1>Un espace à ton rythme.</h1><p>Personnalise ton profil et garde la main sur tes données locales.</p></header>
    <form className="settings-form" onSubmit={(event) => {
      event.preventDefault();
      try { const saved = updateProfile(name, minutes); report(saved ? "Profil enregistré sur cet appareil." : "Le profil a changé en mémoire, mais sa sauvegarde a échoué.", !saved); }
      catch (cause) { report(cause instanceof Error ? cause.message : "Le profil n’a pas pu être mis à jour.", true); }
    }}>
      <h2>Profil et objectif</h2><label>Nom affiché<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={50} required autoComplete="nickname" /></label>
      <label>Temps d’apprentissage souhaité<select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>{dailyGoals.map((value) => <option key={value} value={value}>{value} minutes par jour</option>)}</select></label>
      <p>Cet objectif sert de repère ; le temps passé n’est pas mesuré automatiquement. Les animations respectent la préférence de réduction du mouvement de ton appareil.</p>
      <Button type="submit">Enregistrer les préférences</Button>
    </form>
    <section className="settings-data"><h2>Une copie de tes progrès</h2><p>Télécharge ton profil, tes scores et tes préférences en JSON. Ce fichier contient ton adresse de démonstration : garde-le privé. Il n’existe pas encore de fonction de réimport ni de synchronisation cloud.</p>
      <Button variant="secondary" onClick={() => {
        try { downloadText("cyberpingo-progression.json", JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), user }, null, 2), "application/json"); report("Export préparé. Le téléchargement a été demandé au navigateur."); }
        catch (cause) { console.error("Export du profil impossible.", cause); report("L’export a échoué. Réessaie dans un navigateur autorisant les téléchargements.", true); }
      }}>Exporter mes données</Button>
    </section>
    <section className="settings-data"><h2>Recommencer à zéro</h2><p>Efface les XP, badges, leçons et scores de ce profil local. Ton nom, ton objectif et ta connexion sont conservés. Cette action est irréversible ; exporte tes données avant de continuer.</p>
      {!confirmation ? <Button variant="secondary" onClick={() => setConfirmation(true)}>Réinitialiser mes progrès…</Button> : <div className="reset-confirmation"><p id="reset-warning">Confirmer l’effacement de tous les progrès de {user.name} ?</p><div className="study-actions"><Button variant="danger" aria-describedby="reset-warning" onClick={() => { const saved = resetProgress(); setConfirmation(false); report(saved ? "Progrès réinitialisés. Ton profil et tes préférences sont conservés." : "Réinitialisation en mémoire seulement : le stockage n’a pas pu être mis à jour.", !saved); }}>Oui, effacer mes progrès</Button><Button variant="secondary" onClick={() => setConfirmation(false)}>Annuler</Button></div></div>}
    </section>
    {status && <p className={`settings-status ${error ? "is-error" : ""}`} role={error ? "alert" : "status"}>{status}</p>}
    <Link href="/confidentialite" className="study-link">Comprendre le stockage de mes données →</Link>
  </div>;
}

export default function SettingsPage() {
  const { user } = useUserFull();
  return <AppShell><SettingsForm key={user.id} /></AppShell>;
}
