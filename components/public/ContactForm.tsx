"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { errorMessage } from "@/lib/errors";
import { CONTACT_SUBJECTS as SUBJECTS, submitContactMessage, type ContactSubject } from "@/services/platform.service";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type State = { kind: "idle" | "sending" | "sent" | "error"; message: string };
type FieldErrors = { subject?: string; email?: string; message?: string };

export default function ContactForm() {
  const [state, setState] = useState<State>({ kind: "idle", message: "" });
  const [subject, setSubject] = useState<ContactSubject>(SUBJECTS[0]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function validateFields(nextSubject: string, nextEmail: string, nextMessage: string): FieldErrors {
    const errors: FieldErrors = {};
    if (!SUBJECTS.includes(nextSubject as ContactSubject)) errors.subject = "Choisis un sujet dans la liste.";
    if (nextEmail && !EMAIL_PATTERN.test(nextEmail)) errors.email = "L’adresse e-mail semble incomplète.";
    if (nextMessage.length < 20) errors.message = "Décris ta demande en au moins 20 caractères.";
    if (nextMessage.length > 5000) errors.message = "Ton message dépasse 5 000 caractères.";
    return errors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (String(form.get("website") ?? "")) {
      setState({ kind: "sent", message: "Merci, ton message a bien été envoyé à l’équipe." });
      return;
    }
    const submittedSubject = String(form.get("subject") ?? "");
    const submittedEmail = String(form.get("email") ?? "").trim();
    const submittedMessage = String(form.get("message") ?? "").trim();
    const errors = validateFields(submittedSubject, submittedEmail, submittedMessage);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setState({ kind: "error", message: "Corrige les champs indiqués avant l’envoi." });
      return;
    }
    if (!isSupabaseConfigured) { setState({ kind: "error", message: "L’envoi de messages n’est pas encore activé sur ce site." }); return; }

    setState({ kind: "sending", message: "Envoi en cours…" });
    try {
      await submitContactMessage(submittedSubject as ContactSubject, submittedEmail, submittedMessage);
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error, "Le message n’a pas pu être envoyé. Réessaie dans un instant.") });
      return;
    }
    formElement.reset();
    setSubject(SUBJECTS[0]);
    setEmail("");
    setMessage("");
    setFieldErrors({});
    setState({
      kind: "sent",
      message: submittedEmail
        ? "Merci ! Ton message a été transmis à l’équipe, qui te répondra à l’adresse indiquée."
        : "Merci ! Ton message a été transmis à l’équipe. Sans adresse e-mail, nous ne pourrons pas te répondre directement.",
    });
  }

  const messageLength = message.trim().length;
  const disabled = state.kind === "sending";

  return (
    <form className="public-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <label>Sujet
        <select name="subject" value={subject} onChange={(event) => { setSubject(event.target.value as ContactSubject); setFieldErrors((current) => ({ ...current, subject: undefined })); }} aria-invalid={Boolean(fieldErrors.subject)} aria-describedby={fieldErrors.subject ? "contact-subject-error" : undefined}>
          {SUBJECTS.map((subject) => <option key={subject}>{subject}</option>)}
        </select>
        {fieldErrors.subject && <span id="contact-subject-error" className="field-error">{fieldErrors.subject}</span>}
      </label>
      <label>E-mail pour te répondre (facultatif)
        <input type="email" name="email" value={email} onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: undefined })); }} autoComplete="email" maxLength={254} placeholder="toi@exemple.fr" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "contact-email-error" : "contact-email-help"} />
        <span id="contact-email-help" className="field-help">Ajoute une adresse uniquement si tu souhaites une réponse directe.</span>
        {fieldErrors.email && <span id="contact-email-error" className="field-error">{fieldErrors.email}</span>}
      </label>
      <label>Ton message
        <textarea
          name="message"
          value={message}
          required
          minLength={20}
          maxLength={5000}
          rows={7}
          placeholder="Quelle page ? Qu’attendais-tu ? Que s’est-il passé ?"
          onChange={(event) => { setMessage(event.target.value); setFieldErrors((current) => ({ ...current, message: undefined })); }}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={`contact-count${fieldErrors.message ? " contact-message-error" : ""}`}
        />
        {fieldErrors.message && <span id="contact-message-error" className="field-error">{fieldErrors.message}</span>}
      </label>
      <p id="contact-count" className="field-help">{messageLength} / 5 000 caractères, 20 minimum.</p>
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>Ne pas remplir<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <p className="form-note">N’inclus ni mot de passe, ni clé API, ni donnée confidentielle. Seule l’équipe CyberPingo lit ces messages. Limite : 5 envois par heure.</p>
      <button type="submit" className="public-button button-primary" disabled={disabled} aria-disabled={disabled}>
        {disabled ? "Envoi…" : "Envoyer à l’équipe"}
      </button>
      <p className="form-status" role={state.kind === "error" ? "alert" : "status"} data-state={state.kind} aria-live="polite">{state.message}</p>
    </form>
  );
}
