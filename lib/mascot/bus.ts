import type { MascotEvent } from "@/types/api";
import { strongestEvent } from "@/lib/mascot/events";

const CHANNEL = "cyberpingo:mascot";

/** Asks the mascot to react. A burst of events is reduced to its strongest one. */
export function emitMascot(events: readonly MascotEvent[]) {
  const event = strongestEvent(events);
  if (!event || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<MascotEvent>(CHANNEL, { detail: event }));
}

export function onMascot(handler: (event: MascotEvent) => void): () => void {
  const listener = (raw: Event) => handler((raw as CustomEvent<MascotEvent>).detail);
  window.addEventListener(CHANNEL, listener);
  return () => window.removeEventListener(CHANNEL, listener);
}