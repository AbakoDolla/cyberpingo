"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { useUserActions } from "@/context/UserContext";
import { errorMessage } from "@/lib/errors";
import { getMyReport } from "@/services/labs.service";
import type { LabReport, ReportStatus } from "@/types/api";

const STATUS_LABEL: Record<ReportStatus, string> = { pending: "En attente de relecture", approved: "Validé par un formateur", changes_requested: "À corriger" };
const STATUS_TONE: Record<ReportStatus, "blue" | "green" | "amber"> = { pending: "blue", approved: "green", changes_requested: "amber" };

/** Practical work done outside the browser is handed in as a short report, then read by a trainer. */
export default function LabReportForm({ labId, userId, published }: { labId: string; userId: string; published: boolean }) {
  const { submitLabReport } = useUserActions();
  const [report, setReport] = useState<LabReport | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyReport(labId, userId)
      .then((value) => { if (cancelled) return; setReport(value); setNote(value?.note ?? ""); setLink(value?.link ?? ""); })
      .catch((cause: unknown) => { if (!cancelled) setError(errorMessage(cause, "Impossible de charger ton rapport.")); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [labId, userId]);

  async function send() {
    if (sending) return;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      await submitLabReport(labId, note, link);
      setReport(await getMyReport(labId, userId));
      setSent(true);
    } catch (cause) {
      setError(errorMessage(cause, "Ton rapport n’a pas pu être envoyé."));
    } finally {
      setSending(false);
    }
  }

  const locked = report?.status === "approved";
  return (
    <section className="lab-panel lab-report" aria-labelledby="lab-report-title">
      <div className="lab-report__head">
        <h2 id="lab-report-title">Ton rapport</h2>
        {report && <Badge tone={STATUS_TONE[report.status]}>{STATUS_LABEL[report.status]}</Badge>}
      </div>
      {!published && <p>Le dépôt de rapport sera disponible quand le lab sera publié.</p>}
      {report?.feedback && <p className="lab-report__feedback"><strong>Retour du formateur :</strong> {report.feedback}</p>}
      {published && loaded && (
        <div className="lab-report__form">
          <label className="ui-field__label" htmlFor="lab-report-note">Ce que tu as fait</label>
          <textarea id="lab-report-note" className="ui-input lab-report__note" rows={6} maxLength={2000} value={note} disabled={sending || locked}
            placeholder="Plan d’adressage, commandes utilisées, tests réalisés, difficultés rencontrées…" onChange={(event) => { setNote(event.target.value); setSent(false); }} />
          <p className="ui-field__hint">{note.length} / 2000 caractères</p>
          <Input id="lab-report-link" label="Lien vers ta preuve (facultatif)" type="url" inputMode="url" placeholder="https://…" maxLength={500} value={link} disabled={sending || locked}
            hint="Capture d’écran ou fichier hébergé, en https." onChange={(event) => { setLink(event.target.value); setSent(false); }} />
          {error && <p className="ui-field__error" role="alert">{error}</p>}
          {sent && <p className="lab-report__sent" role="status">Rapport envoyé. Un formateur le relira.</p>}
          {!locked && <Button variant="primary" loading={sending} disabled={sending || !note.trim()} onClick={() => void send()}>{report ? "Mettre à jour mon rapport" : "Envoyer mon rapport"}</Button>}
        </div>
      )}
    </section>
  );
}