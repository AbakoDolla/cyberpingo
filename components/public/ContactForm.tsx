"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { errorMessage } from "@/lib/errors";
import { CONTACT_SUBJECTS as SUBJECTS, submitContactMessage, type ContactSubject } from "@/services/platform.service";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type State = { kind: "idle" | "sending" | "sent" | "error"; message: string };

export default function ContactForm() {
  const [state, setState] = useState<State>({ kind: "idle", message: "" });
  const [length, setLength] = useState(0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (String(form.get("website") ?? "")) {
      setState({ kind: "sent", message: "Merci, ton message a bien été envoyé à l’équipe." });
      return;
    }
    const subject = String(form.get("subject") ?? "");
    const email = String(form.get("email") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    if (!SUBJECTS.includes(subject as ContactSubject)) { setState({ kind: "error", message: "Choisis un sujet dans la liste." }); return; }
    if (email && !EMAIL_PATTERN.test(email)) { setState({ kind: "error", message: "L’adresse e-mail semble incomplète." }); return; }
    if (message.length < 20) { setState({ kind: "error", message: "Décris ta demande en au moins 20 caractères." }); return; }
    if (message.length > 5000) { setState({ kind: "error", message: "Ton message dépasse 5 000 caractères." }); return; }
    if (!isSupabaseConfigured) { setState({ kind: "error", message: "L’envoi de messages n’est pas encore activé sur ce site." }); return; }

    setState({ kind: "sending", message: "Envoi en cours…" });
    try {
      await submitContactMessage(subject as ContactSubject, email, message);
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error, "Le message n’a pas pu être envoyé. Réessaie dans un instant.") });
      return;
    }
    formElement.reset();
    setLength(0);
    setState({
      kind: "sent",
      message: email
        ? "Merci ! Ton message a été transmis à l’équipe, qui te répondra à l’adresse indiquée."
        : "Merci ! Ton message a été transmis à l’équipe. Sans adresse e-mail, nous ne pourrons pas te répondre directement.",
    });
  }

  return (
    <form className="public-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <label>Sujet
        <select name="subject" defaultValue={SUBJECTS[0]}>
          {SUBJECTS.map((subject) => <option key={subject}>{subject}</option>)}
        </select>
      </label>
      <label>E-mail pour te répondre (facultatif)
        <input type="email" name="email" autoComplete="email" maxLength={254} placeholder="toi@exemple.fr" />
      </label>
      <label>Ton message
        <textarea
          name="message"
          required
          minLength={20}
          maxLength={5000}
          rows={7}
          placeholder="Quelle page ? Qu’attendais-tu ? Que s’est-il passé ?"
          onChange={(event) => setLength(event.target.value.trim().length)}
          aria-describedby="contact-count"
        />
      </label>
      <p id="contact-count" className="text-xs opacity-60">{length} / 5 000 caractères (20 minimum)</p>
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>Ne pas remplir<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <p>N’inclus ni mot de passe, ni clé API, ni donnée confidentielle. Seule l’équipe CyberPingo lit ces messages ; ils sont limités à 5 envois par heure.</p>
      <button type="submit" className="public-button button-primary" disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "Envoi…" : "Envoyer à l’équipe"}
      </button>
      <p role={state.kind === "error" ? "alert" : "status"} data-state={state.kind}>{state.message}</p>
    </form>
  );
}
