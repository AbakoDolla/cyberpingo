"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import MascotSettings from "@/components/mascot/MascotSettings";
import Pingo from "@/components/mascot/Pingo";
import { useMascotPrefs } from "@/components/mascot/useMascotPrefs";
import { IconSettings, IconX } from "@/components/ui/Icon";
import { useUser } from "@/context/UserContext";
import { onMascot, emitMascot } from "@/lib/mascot/bus";
import { EVENT_PRIORITY, EXPRESSION_STATE } from "@/lib/mascot/events";
import { IDLE_STATE, decide, displayDuration, pickLine, type SchedulerState } from "@/lib/mascot/scheduler";
import { listMascotLines } from "@/services/academy.service";
import type { MascotEvent, MascotLine } from "@/types/api";

const SESSION_WELCOME = "cyberpingo.mascot.welcomed";
const MAX_VOICE_MS = 30_000;

function daysSince(date: string | null) {
  if (!date) return 0;
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(time) ? 0 : (Date.now() - time) / 86_400_000;
}

function once(key: string) {
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
    return true;
  } catch { return false; }
}

interface Active { line: MascotLine; event: MascotEvent; spoken: boolean }

/**
 * Pingo as a mentor. One voice at a time, a priority between events, and a text fallback: a missing or
 * blocked recording never hides the line and nothing here can block a lesson.
 */
export default function MascotCoach() {
  const { profile } = useUser();
  const pathname = usePathname();
  const [prefs] = useMascotPrefs();
  const [lines, setLines] = useState<MascotLine[]>([]);
  const [active, setActive] = useState<Active | null>(null);
  const [panel, setPanel] = useState(false);

  const prefsRef = useRef(prefs);
  const linesRef = useRef(lines);
  const scheduler = useRef<SchedulerState>(IDLE_STATE);
  const timer = useRef<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0);
  const lastLine = useRef<string | null>(null);
  const hovering = useRef(false);

  useEffect(() => { prefsRef.current = prefs; }, [prefs]);
  useEffect(() => { linesRef.current = lines; }, [lines]);

  const hasProfile = Boolean(profile);
  useEffect(() => {
    if (!hasProfile) return;
    let cancelled = false;
    listMascotLines().then((rows) => { if (!cancelled) setLines(rows); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [hasProfile]);

  const finish = useCallback((expected?: number) => {
    if (expected !== undefined && expected !== token.current) return;
    token.current += 1;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (audio.current) { audio.current.pause(); audio.current = null; }
    scheduler.current = { activePriority: 0, activeUntil: 0, lastEnd: Date.now() };
    setActive(null);
    setPanel(false);
  }, []);

  const present = useCallback((line: MascotLine, event: MascotEvent) => {
    if (timer.current) window.clearTimeout(timer.current);
    if (audio.current) { audio.current.pause(); audio.current = null; }
    const mine = ++token.current;
    const now = Date.now();
    const duration = displayDuration(line.text_fr);
    scheduler.current = { activePriority: EVENT_PRIORITY[event], activeUntil: now + duration, lastEnd: scheduler.current.lastEnd };
    lastLine.current = line.id;
    setActive({ line, event, spoken: false });
    setPanel(false);
    const arm = (ms: number) => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (hovering.current) { arm(2000); return; }
        finish(mine);
      }, ms);
    };
    arm(duration);

    const current = prefsRef.current;
    if (line.audio_url && current.voice && current.volume > 0) {
      const element = new Audio(line.audio_url);
      element.volume = current.volume;
      audio.current = element;
      element.addEventListener("ended", () => finish(mine));
      element.play().then(() => {
        if (mine !== token.current) return;
        scheduler.current = { ...scheduler.current, activeUntil: Date.now() + MAX_VOICE_MS };
        arm(MAX_VOICE_MS);
        setActive((value) => (value && value.line.id === line.id ? { ...value, spoken: true } : value));
      }).catch(() => undefined);
    }
  }, [finish]);

  useEffect(() => onMascot((event) => {
    if (!prefsRef.current.auto) return;
    const decision = decide(scheduler.current, event, Date.now());
    if (decision === "drop") return;
    const line = pickLine(linesRef.current, event, lastLine.current);
    if (line) present(line, event);
  }), [present]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
    if (audio.current) audio.current.pause();
  }, []);

  const lastActivity = profile?.last_activity_date ?? null;
  const ready = hasProfile && lines.length > 0;
  useEffect(() => {
    if (!ready) return;
    const wait = window.setTimeout(() => {
      if (once(SESSION_WELCOME)) emitMascot([daysSince(lastActivity) >= 7 ? "return_after_absence" : "welcome"]);
    }, 1600);
    return () => window.clearTimeout(wait);
  }, [ready, lastActivity]);

  useEffect(() => {
    if (!ready || !pathname.startsWith("/lessons/")) return;
    const wait = window.setTimeout(() => { if (once(`cyberpingo.mascot.lesson:${pathname}`)) emitMascot(["lesson_start"]); }, 2400);
    return () => window.clearTimeout(wait);
  }, [ready, pathname]);

  if (!active) return null;
  const { line, spoken } = active;
  const showText = !spoken || prefs.subtitles;
  return (
    <aside
      className="mascot-coach"
      data-expression={line.expression}
      role="status"
      aria-live="polite"
      onMouseEnter={() => { hovering.current = true; }}
      onMouseLeave={() => { hovering.current = false; }}
    >
      <div className="mascot-coach__pingo" aria-hidden="true"><Pingo state={EXPRESSION_STATE[line.expression]} size={64} /></div>
      <div className="mascot-coach__bubble">
        {showText ? <p className="mascot-coach__text">{line.text_fr}</p> : <p className="mascot-coach__text mascot-coach__text--voice">Pingo te parle…</p>}
        {line.audio_url && line.voice_credit && spoken && <p className="mascot-coach__credit">Voix : {line.voice_credit}</p>}
        {panel && <MascotSettings idPrefix="coach" />}
        <div className="mascot-coach__actions">
          <button type="button" className="mascot-coach__button" onClick={() => setPanel((value) => !value)} aria-expanded={panel} aria-label="Régler Pingo"><IconSettings size={15} /></button>
          <button type="button" className="mascot-coach__button" onClick={() => finish()} aria-label="Fermer Pingo"><IconX size={15} /></button>
        </div>
      </div>
    </aside>
  );
}