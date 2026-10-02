"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { IconMic, IconPlay, IconStop, IconTrash, IconUpload } from "@/components/ui/Icon";
import { errorMessage } from "@/lib/errors";
import { MAX_VOICE_BYTES, MAX_VOICE_SECONDS, formatVoiceTime, normalizeVoiceType, pickRecorderMime } from "@/lib/mascot/voice";
import { uploadMascotVoice } from "@/services/admin.service";
import { Notice } from "./AdminState";

type Phase = "idle" | "requesting" | "recording" | "uploading";

interface Take {
  blob: Blob;
  url: string;
  seconds: number;
}

interface VoiceStudioProps {
  /** Stable name used to group the stored files (the line id, or the event for a new line). */
  lineKey: string;
  value: string;
  onChange: (url: string) => void;
}

function micErrorMessage(cause: unknown): string {
  const name = cause instanceof DOMException ? cause.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "L’accès au micro est refusé. Autorise-le dans la barre d’adresse du navigateur, puis réessaie.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Aucun micro n’a été détecté sur cet appareil.";
  if (name === "NotReadableError") return "Le micro est utilisé par une autre application. Ferme-la puis réessaie.";
  return errorMessage(cause, "L’enregistrement n’a pas pu démarrer.");
}

/** Records a voice take in the browser or imports a file, stores it in the `mascot-voice` bucket and hands back its public URL. */
export default function VoiceStudio({ lineKey, value, onChange }: VoiceStudioProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [take, setTake] = useState<Take | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const takeUrlRef = useRef<string | null>(null);

  const recordingSupported = typeof window !== "undefined"
    && typeof MediaRecorder !== "undefined"
    && !!navigator.mediaDevices?.getUserMedia;
  const busy = phase !== "idle";

  function releaseMic() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function dropTake() {
    if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
    takeUrlRef.current = null;
    setTake(null);
  }

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    releaseMic();
    if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
  }, []);

  async function start() {
    setMessage(null);
    dropTake();
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const mime = pickRecorderMime((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onerror = () => {
        releaseMic();
        setPhase("idle");
        setMessage({ kind: "error", text: "L’enregistrement a été interrompu. Réessaie." });
      };
      recorder.onstop = () => {
        const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        releaseMic();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || "audio/webm" });
        chunksRef.current = [];
        setPhase("idle");
        if (blob.size === 0) {
          setMessage({ kind: "error", text: "Rien n’a été enregistré. Vérifie ton micro et réessaie." });
          return;
        }
        const url = URL.createObjectURL(blob);
        takeUrlRef.current = url;
        setTake({ blob, url, seconds: elapsed });
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setSeconds(0);
      recorder.start();
      setPhase("recording");
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_VOICE_SECONDS) stop();
      }, 250);
    } catch (cause) {
      releaseMic();
      setPhase("idle");
      setMessage({ kind: "error", text: micErrorMessage(cause) });
    }
  }

  function stop() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function store(audio: Blob, success: string) {
    setPhase("uploading");
    setMessage(null);
    try {
      onChange(await uploadMascotVoice(lineKey, audio));
      dropTake();
      setMessage({ kind: "success", text: success });
    } catch (cause) {
      setMessage({ kind: "error", text: errorMessage(cause, "Le téléversement a échoué.") });
    } finally {
      setPhase("idle");
    }
  }

  function pickFile(files: FileList | null) {
    const file = files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!normalizeVoiceType(file.type)) {
      setMessage({ kind: "error", text: "Format audio non pris en charge. Utilise un fichier webm, ogg, mp3, m4a ou wav." });
      return;
    }
    if (file.size > MAX_VOICE_BYTES) {
      setMessage({ kind: "error", text: "Le fichier dépasse 5 Mo. Raccourcis la prise ou compresse-la." });
      return;
    }
    dropTake();
    void store(file, "Fichier importé. Enregistre la réplique pour le conserver.");
  }

  return (
    <fieldset className="voice-studio" disabled={phase === "uploading"}>
      <legend className="voice-studio__legend">Voix humaine</legend>

      {phase === "recording" ? (
        <div className="voice-studio__live" role="status" aria-live="polite">
          <span className="voice-studio__pulse" aria-hidden="true" />
          <span className="voice-studio__timer">{formatVoiceTime(seconds)}</span>
          <span className="voice-studio__hint">sur {formatVoiceTime(MAX_VOICE_SECONDS)} maximum</span>
          <Button type="button" size="sm" variant="danger" icon={<IconStop size={16} />} onClick={stop}>Arrêter</Button>
        </div>
      ) : (
        <div className="voice-studio__actions">
          <Button
            type="button" size="sm" variant="secondary" icon={<IconMic size={16} />}
            loading={phase === "requesting"} disabled={!recordingSupported || busy} onClick={() => void start()}
          >
            {take ? "Refaire une prise" : "Enregistrer"}
          </Button>
          <Button type="button" size="sm" variant="secondary" icon={<IconUpload size={16} />} disabled={busy} onClick={() => fileRef.current?.click()}>
            Importer un fichier
          </Button>
          <input
            ref={fileRef} type="file" hidden tabIndex={-1} aria-hidden="true"
            accept="audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav,.mp3,.m4a,.wav,.ogg,.webm"
            onChange={(event) => pickFile(event.target.files)}
          />
        </div>
      )}

      {!recordingSupported && (
        <p className="voice-studio__hint">L’enregistrement direct demande un navigateur récent en HTTPS. Tu peux importer un fichier à la place.</p>
      )}

      {take && phase !== "recording" && (
        <div className="voice-studio__take">
          <p className="voice-studio__hint">Écoute la prise ({formatVoiceTime(take.seconds)}) avant de la garder.</p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- the spoken sentence is the text field of the line */}
          <audio controls src={take.url} className="w-full" />
          <div className="voice-studio__actions">
            <Button type="button" size="sm" icon={<IconPlay size={16} />} loading={phase === "uploading"} onClick={() => void store(take.blob, "Prise ajoutée. Enregistre la réplique pour la conserver.")}>
              Utiliser cette prise
            </Button>
            <Button type="button" size="sm" variant="ghost" icon={<IconTrash size={16} />} disabled={busy} onClick={dropTake}>Jeter</Button>
          </div>
        </div>
      )}

      {value && !take && phase !== "recording" && (
        <div className="voice-studio__take">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- the spoken sentence is the text field of the line */}
          <audio controls preload="none" src={value} className="w-full" />
          <div className="voice-studio__actions">
            <Button type="button" size="sm" variant="ghost" icon={<IconTrash size={16} />} disabled={busy} onClick={() => { onChange(""); setMessage(null); }}>
              Retirer la voix
            </Button>
          </div>
        </div>
      )}

      {message && <Notice kind={message.kind}>{message.text}</Notice>}
    </fieldset>
  );
}
