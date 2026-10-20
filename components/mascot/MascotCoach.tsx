"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import MascotSettings from "@/components/mascot/MascotSettings";
import Pingo from "@/components/mascot/Pingo";
import { useMascotPrefs } from "@/components/mascot/useMascotPrefs";
import { IconPlay, IconSettings, IconX } from "@/components/ui/Icon";
import { useUser } from "@/context/UserContext";
import { onMascot, emitMascot } from "@/lib/mascot/bus";
import { EVENT_PRIORITY, EXPRESSION_STATE } from "@/lib/mascot/events";
import { isSyntheticVoice } from "@/lib/mascot/voice";
import { IDLE_STATE, decide, displayDuration, pickLine, type SchedulerState } from "@/lib/mascot/scheduler";
import { listMascotLines } from "@/services/academy.service";
import type { MascotEvent, MascotLine } from "@/types/api";

import { DEFAULT_MASCOT_LINES } from "@/lib/mascot/elevenlabs";
import { playCyberPingoAudioUrl, speakRealisticVoice, stopRealisticVoice } from "@/lib/mascot/sound-effects";

const MAX_VOICE_MS = 30_000;
let welcomedInMemory = false;

function daysSince(date: string | null) {
  if (!date) return 0;
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(time) ? 0 : (Date.now() - time) / 86_400_000;
}

interface Active { line: MascotLine; event: MascotEvent; spoken: boolean; failed: boolean }

/**
 * Pingo as a mentor. One voice at a time, a priority between events, and automatic CyberPingo
 * ElevenLabs voice playback by default without requiring the user to press a Play button first.
 */
export default function MascotCoach() {
  const { profile } = useUser();
  const pathname = usePathname();
  const [prefs] = useMascotPrefs();
  const [lines, setLines] = useState<MascotLine[]>([...DEFAULT_MASCOT_LINES]);
  const [active, setActive] = useState<Active | null>(null);
  const [panel, setPanel] = useState(false);

  const prefsRef = useRef(prefs);
  const linesRef = useRef(lines);
  const scheduler = useRef<SchedulerState>(IDLE_STATE);
  const timer = useRef<number | null>(null);
  const token = useRef(0);
  const lastLine = useRef<string | null>(null);
  const spokenRoutes = useRef<Set<string>>(new Set());
  const hovering = useRef(false);
  const arm = useRef<(ms: number) => void>(() => undefined);

  useEffect(() => { prefsRef.current = prefs; }, [prefs]);
  useEffect(() => { linesRef.current = lines; }, [lines]);

  const hasProfile = Boolean(profile);
  useEffect(() => {
    let cancelled = false;
    listMascotLines().then((rows) => { if (!cancelled && rows.length > 0) setLines(rows); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [hasProfile]);

  const finish = useCallback((expected?: number) => {
    if (expected !== undefined && expected !== token.current) return;
    token.current += 1;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    stopRealisticVoice();
    scheduler.current = { activePriority: 0, activeUntil: 0, lastEnd: Date.now() };
    setActive(null);
    setPanel(false);
  }, []);

  const startVoice = useCallback((line: MascotLine, mine: number, volume: number) => {
    if (!line.audio_url) return;
    // Garde la bulle ouverte jusqu'à la fin de la voix (ou jusqu'au premier geste si l'onglet vient d'être ouvert à froid)
    scheduler.current = { ...scheduler.current, activeUntil: Date.now() + MAX_VOICE_MS };
    arm.current(MAX_VOICE_MS);
    playCyberPingoAudioUrl(line.audio_url, {
      volume,
      onStart: () => {
        if (mine !== token.current) return;
        scheduler.current = { ...scheduler.current, activeUntil: Date.now() + MAX_VOICE_MS };
        arm.current(MAX_VOICE_MS);
        setActive((value) => (value && value.line.id === line.id ? { ...value, spoken: true, failed: false } : value));
      },
      onEnd: () => finish(mine),
      onError: () => {
        if (mine !== token.current) return;
        setActive((value) => (value && value.line.id === line.id ? { ...value, spoken: false, failed: true } : value));
      },
    });
  }, [finish]);

  const present = useCallback((line: MascotLine, event: MascotEvent) => {
    if (timer.current) window.clearTimeout(timer.current);
    stopRealisticVoice();
    const mine = ++token.current;
    const now = Date.now();
    const duration = displayDuration(line.text_fr);
    scheduler.current = { activePriority: EVENT_PRIORITY[event], activeUntil: now + duration, lastEnd: scheduler.current.lastEnd };
    lastLine.current = line.id;
    const current = prefsRef.current;
    const voiceEnabled = current.voice && current.volume > 0;
    setActive({ line, event, spoken: voiceEnabled, failed: false });
    setPanel(false);
    const schedule = (ms: number) => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (hovering.current) { schedule(2000); return; }
        finish(mine);
      }, ms);
    };
    arm.current = schedule;
    schedule(duration);

    if (line.audio_url && voiceEnabled) {
      startVoice(line, mine, current.volume);
    } else if (voiceEnabled) {
      speakRealisticVoice(line.text_fr, {
        volume: current.volume,
        expression: line.expression,
        lineId: line.id,
        onStart: () => {
          if (mine !== token.current) return;
          setActive((value) => (value && value.line.id === line.id ? { ...value, spoken: true, failed: false } : value));
        },
        onEnd: () => finish(mine),
      });
    }
  }, [finish, startVoice]);

  const replay = useCallback((line: MascotLine) => {
    const volume = prefsRef.current.volume;
    if (line.audio_url) {
      startVoice(line, token.current, volume > 0 ? volume : 0.85);
    } else {
      speakRealisticVoice(line.text_fr, {
        volume: volume > 0 ? volume : 0.85,
        expression: line.expression,
        lineId: line.id,
      });
    }
  }, [startVoice]);

  useEffect(() => onMascot((event) => {
    if (!prefsRef.current.auto) return;
    const decision = decide(scheduler.current, event, Date.now());
    if (decision === "drop") return;
    const line = pickLine(linesRef.current, event, lastLine.current);
    if (line) present(line, event);
  }), [present]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
    stopRealisticVoice();
  }, []);

  const lastActivity = profile?.last_activity_date ?? null;
  const ready = lines.length > 0;
  useEffect(() => {
    if (!ready || pathname === "/a-propos") return;
    const wait = window.setTimeout(() => {
      if (!welcomedInMemory) {
        welcomedInMemory = true;
        emitMascot([daysSince(lastActivity) >= 7 ? "return_after_absence" : "welcome"]);
      }
    }, 250);
    return () => window.clearTimeout(wait);
  }, [ready, lastActivity, pathname]);

  useEffect(() => {
    if (!ready || !pathname.startsWith("/lessons/")) return;
    const wait = window.setTimeout(() => {
      if (!spokenRoutes.current.has(pathname)) {
        spokenRoutes.current.add(pathname);
        emitMascot(["lesson_start"]);
      }
    }, 250);
    return () => window.clearTimeout(wait);
  }, [ready, pathname]);

  if (!active) return null;
  const { line, spoken, failed } = active;
  const showText = !spoken || prefs.subtitles;
  const canReplay = !prefs.voice && !spoken && !failed;
  return (
    <aside
      className="mascot-coach"
      data-expression={line.expression}
      role="status"
      aria-live="polite"
      onMouseEnter={() => { hovering.current = true; }}
      onMouseLeave={() => { hovering.current = false; }}
    >
      <div className="mascot-coach__pingo" aria-hidden="true"><Pingo state={EXPRESSION_STATE[line.expression]} rank={profile?.level ?? 1} size={64} /></div>
      <div className="mascot-coach__bubble">
        {showText ? <p className="mascot-coach__text">{line.text_fr}</p> : <p className="mascot-coach__text mascot-coach__text--voice">Pingo te parle…</p>}
        {canReplay && (
          <button type="button" className="mascot-coach__replay" onClick={() => replay(line)}>
            <IconPlay size={14} /> Écouter la voix
          </button>
        )}
        {line.audio_url && line.voice_credit && !isSyntheticVoice(line.voice_credit) && spoken && <p className="mascot-coach__credit">Voix : {line.voice_credit}</p>}
        {panel && <MascotSettings idPrefix="coach" />}
        <div className="mascot-coach__actions">
          <button type="button" className="mascot-coach__button" onClick={() => setPanel((value) => !value)} aria-expanded={panel} aria-label="Régler Pingo"><IconSettings size={15} /></button>
          <button type="button" className="mascot-coach__button" onClick={() => finish()} aria-label="Fermer Pingo"><IconX size={15} /></button>
        </div>
      </div>
    </aside>
  );
}