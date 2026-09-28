"use client";

import { useState } from "react";
import { downloadText } from "@/lib/download";

export default function ContactForm() {
  const [status, setStatus] = useState("");
  return (
    <form className="public-form" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const message = String(form.get("message") ?? "").trim();
      if (message.length < 20) { setStatus("Décris le problème en au moins 20 caractères."); return; }
      try {
        downloadText("retour-cyberpingo.txt", `Sujet : ${form.get("subject")}\nContact facultatif : ${form.get("email") || "Non renseigné"}\n\n${message}\n\nBrouillon local : ce message n’a pas été envoyé.`, "text/plain;charset=utf-8");
        setStatus("Brouillon préparé. Le téléchargement a été demandé au navigateur ; aucun message n’a été envoyé.");
      } catch (error) {
        console.error("Préparation du brouillon impossible.", error);
        setStatus("Le fichier n’a pas pu être préparé. Copie ton message et publie-le sur GitHub si son contenu peut être public.");
      }
    }}>
      <label>Sujet<select name="subject"><option>Signaler un problème</option><option>Proposer un contenu</option><option>Améliorer une explication</option></select></label>
      <label>E-mail de contact (facultatif)<input type="email" name="email" autoComplete="email" maxLength={254} /></label>
      <label>Ton message<textarea name="message" required minLength={20} maxLength={5000} rows={7} placeholder="Quelle page ? Qu’attendais-tu ? Que s’est-il passé ?" /></label>
      <p>Pas de mot de passe, de clé API ou de donnée confidentielle. Ce formulaire ne transmet rien : il prépare un fichier texte à conserver ou à partager.</p>
      <button type="submit" className="public-button button-primary">Télécharger mon brouillon</button>
      <p role="status">{status}</p>
    </form>
  );
}
