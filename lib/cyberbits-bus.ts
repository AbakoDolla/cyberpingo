import type { CbReward } from "@/types/cyberbits";

type Listener = (reward: CbReward) => void;
const listeners = new Set<Listener>();

/** Announces what a learning action just paid, so the wallet in the header updates without another request. */
export function emitCyberBits(reward: CbReward) {
  for (const listener of listeners) listener(reward);
}

export function subscribeCyberBits(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
