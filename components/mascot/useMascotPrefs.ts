"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PREFS, PREFS_KEY, parsePrefs, type MascotPrefs } from "@/lib/mascot/prefs";

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: MascotPrefs = DEFAULT_PREFS;
const VOICE_DEFAULT_MIGRATION_KEY = "cyberpingo.mascot.cyberpingo_v2";

function readRaw(): string | null {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (window.localStorage.getItem(VOICE_DEFAULT_MIGRATION_KEY) !== "1") {
      window.localStorage.setItem(VOICE_DEFAULT_MIGRATION_KEY, "1");
      if (raw) {
        const parsed = parsePrefs(raw);
        if (!parsed.auto || !parsed.voice || parsed.volume <= 0) {
          const upgraded: MascotPrefs = {
            ...parsed,
            auto: true,
            voice: true,
            volume: parsed.volume > 0 ? parsed.volume : DEFAULT_PREFS.volume,
          };
          const serialized = JSON.stringify(upgraded);
          window.localStorage.setItem(PREFS_KEY, serialized);
          return serialized;
        }
      }
    }
    return raw;
  } catch {
    return null;
  }
}

function snapshot(): MascotPrefs {
  const raw = readRaw();
  if (raw !== cachedRaw) { cachedRaw = raw; cached = parsePrefs(raw); }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}

/** The learner's mascot preferences, kept in this browser and shared across tabs. */
export function useMascotPrefs(): [MascotPrefs, (changes: Partial<MascotPrefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, snapshot, () => DEFAULT_PREFS);
  const update = useCallback((changes: Partial<MascotPrefs>) => {
    const next = { ...snapshot(), ...changes };
    try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* private mode: the choice lasts until reload */ }
    cachedRaw = readRaw();
    cached = next;
    listeners.forEach((listener) => listener());
  }, []);
  return [prefs, update];
}