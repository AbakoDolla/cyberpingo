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

/** Gentle success chime (two-tone ascending cyber chime) */
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
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.38);
}

/**
 * Modern cyber failure / error sound:
 * Two subtle low-frequency descending tones (gentle soft cue, non-jarring but distinct).
 */
export function playFailureSound(volume = 0.35) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Tone 1: 240 Hz descending to 160 Hz
  const osc1 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc1.type = "sawtooth";
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + 0.32);

  osc1.frequency.setValueAtTime(220, now); // A3
  osc1.frequency.setValueAtTime(164.81, now + 0.12); // E3

  gain.gain.setValueAtTime(volume * 0.7, now);
  gain.gain.setValueAtTime(volume * 0.8, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  osc1.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.4);
}

export const playSuccessSound = playSuccessChime;
export const playTaskSuccessSound = playSuccessChime;
export const playCorrectAnswerSound = playSuccessChime;
export const playErrorSound = playFailureSound;
export const playWrongAnswerSound = playFailureSound;
export const playCoinClink = playCoinSound;
export const playChestFanfare = playChestOpenSound;
export const playTrophyChime = playTrophySound;

/**
 * Synthèse vocale réaliste (TTS) propulsée par la voix "cyberpingo" sur ElevenLabs v3
 * avec balisages émotionnels automatiques (via `/api/tts`), et repli Web Speech API hors-ligne.
 */
let activeAudio: HTMLAudioElement | null = null;
let activeAbortController: AbortController | null = null;
let pendingUnlockCleanup: (() => void) | null = null;
const ttsBlobCache = new Map<string, string>();

function clearPendingUnlock(): void {
  if (pendingUnlockCleanup) {
    pendingUnlockCleanup();
    pendingUnlockCleanup = null;
  }
}

function speakFallbackBrowserVoice(
  text: string,
  options?: { volume?: number; onEnd?: () => void; onStart?: () => void }
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options?.onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.volume = options?.volume ?? 0.85;
  utterance.rate = 0.92;
  utterance.pitch = 0.94;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice =
    voices.find(
      (v) =>
        v.lang.startsWith("fr") &&
        (/thomas|henri|paul|claude|nicolas|remi|daniel|male|homme/i.test(v.name) ||
          (/google/i.test(v.name) && v.lang === "fr-FR"))
    ) || voices.find((v) => v.lang.startsWith("fr"));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  if (options?.onStart) {
    utterance.onstart = options.onStart;
  }
  if (options?.onEnd) {
    utterance.onend = options.onEnd;
    utterance.onerror = options.onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

export function speakRealisticVoice(
  text: string,
  options?: {
    volume?: number;
    expression?: string;
    lineId?: string;
    onEnd?: () => void;
    onStart?: () => void;
  }
) {
  if (typeof window === "undefined") return;

  stopRealisticVoice();

  const cleaned = text.trim();
  if (!cleaned) {
    options?.onEnd?.();
    return;
  }

  const expression = options?.expression ?? "encouraging";
  const volume = Math.max(0, Math.min(1, options?.volume ?? 0.85));
  const cacheKey = `${expression}::${options?.lineId ?? ""}::${cleaned.slice(0, 900)}`;

  const playBlobUrl = (blobUrl: string) => {
    const audio = new Audio(blobUrl);
    audio.volume = volume;
    activeAudio = audio;

    audio.onplay = () => {
      options?.onStart?.();
    };
    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
      options?.onEnd?.();
    };
    audio.onerror = () => {
      if (activeAudio === audio) activeAudio = null;
      options?.onEnd?.();
    };

    audio.play().catch((err: unknown) => {
      const isAutoplayBlocked =
        err instanceof DOMException && err.name === "NotAllowedError";
      if (isAutoplayBlocked) {
        clearPendingUnlock();
        const resumeOnGesture = () => {
          clearPendingUnlock();
          if (activeAudio === audio) {
            audio.play().catch(() => {
              if (activeAudio === audio) activeAudio = null;
              options?.onEnd?.();
            });
          }
        };
        window.addEventListener("pointerdown", resumeOnGesture, { once: true });
        window.addEventListener("keydown", resumeOnGesture, { once: true });
        pendingUnlockCleanup = () => {
          window.removeEventListener("pointerdown", resumeOnGesture);
          window.removeEventListener("keydown", resumeOnGesture);
        };
      } else {
        if (activeAudio === audio) activeAudio = null;
        speakFallbackBrowserVoice(cleaned, options);
      }
    });
  };

  const cachedUrl = ttsBlobCache.get(cacheKey);
  if (cachedUrl) {
    playBlobUrl(cachedUrl);
    return;
  }

  const controller = new AbortController();
  activeAbortController = controller;

  fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: cleaned,
      expression,
      lineId: options?.lineId,
    }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      ttsBlobCache.set(cacheKey, blobUrl);
      if (activeAbortController === controller) {
        activeAbortController = null;
        playBlobUrl(blobUrl);
      }
    })
    .catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (activeAbortController === controller) {
        activeAbortController = null;
      }
      speakFallbackBrowserVoice(cleaned, options);
    });
}

/** Stops any active speech synthesis */
export function stopRealisticVoice() {
  clearPendingUnlock();
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeakingRealisticVoice(): boolean {
  if (activeAbortController) return true;
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) return true;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

