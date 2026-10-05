"use client";

/**
 * Web Audio API synthesizer for instant zero-latency feedback (CyberBits, achievements, chest)
 * and Web Speech API calibrated for calm, articulate pedagogical French diction.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => undefined);
  }
  return audioCtx;
}

/** Plays crisp, rewarding coin chime for CyberBits */
export function playCoinSound(volume = 0.3) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc2.type = "sine";

  // B5 (987.77 Hz) to E6 (1318.51 Hz) coin clink
  osc1.frequency.setValueAtTime(988, now);
  osc1.frequency.setValueAtTime(1319, now + 0.08);

  osc2.frequency.setValueAtTime(1975, now);
  osc2.frequency.setValueAtTime(2637, now + 0.08);

  gain.gain.setValueAtTime(volume * 0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.45);
  osc2.stop(now + 0.45);
}

/** Mystery Chest fanfare: shimmer sweep + triumphant chime */
export function playChestOpenSound(volume = 0.4) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + idx * 0.08;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.6);
  });
}

/** Level-up / Rank promotion fanfare */
export function playTrophySound(volume = 0.4) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const chord = [440, 554.37, 659.25, 880]; // A4 major
  chord.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + i * 0.06;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(volume * 0.7, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 0.8);
  });
}

/** Gentle success chime */
export function playSuccessChime(volume = 0.3) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now); // A5
  osc.frequency.setValueAtTime(1174.66, now + 0.09); // D6

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.35);
}

export const playCoinClink = playCoinSound;
export const playChestFanfare = playChestOpenSound;
export const playTrophyChime = playTrophySound;

/**
 * Natural voice synthesized speech modeled on calm male teacher reading (as in vo-scene6.wav):
 * clear diction, measured pace (rate ~0.92), warm pedagogical pitch (pitch ~0.94).
 */
export function speakRealisticVoice(text: string, options?: { volume?: number; onEnd?: () => void }) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.volume = options?.volume ?? 0.85;
  utterance.rate = 0.92; // Deliberate, clear diction
  utterance.pitch = 0.94; // Calm, warm male teacher tone

  const voices = window.speechSynthesis.getVoices();
  // Prefer natural French male voices
  const preferredVoice = voices.find(
    (v) =>
      v.lang.startsWith("fr") &&
      (/thomas|henri|paul|claude|nicolas|remi|daniel|male|homme/i.test(v.name) ||
        (/google/i.test(v.name) && v.lang === "fr-FR"))
  ) || voices.find((v) => v.lang.startsWith("fr"));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  if (options?.onEnd) {
    utterance.onend = options.onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

/** Stops any active speech synthesis */
export function stopRealisticVoice() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeakingRealisticVoice(): boolean {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

