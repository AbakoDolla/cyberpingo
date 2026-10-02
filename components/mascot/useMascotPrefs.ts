"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PREFS, PREFS_KEY, parsePrefs, type MascotPrefs } from "@/lib/mascot/prefs";

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: MascotPrefs = DEFAULT_PREFS;

function readRaw(): string | null {
  try { return window.localStorage.getItem(PREFS_KEY); } catch { return null; }
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