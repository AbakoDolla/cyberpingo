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
 * avec balisages émotionnels automatiques (via `/api/tts`), lecture Web Audio API + HTMLAudioElement
 * pré-déverrouillée pour parler automatiquement sans nécessiter de bouton Play.
 */
let activeAudio: HTMLAudioElement | null = null;
let activeBufferSource: AudioBufferSourceNode | null = null;
let activeAbortController: AbortController | null = null;
let pendingUnlockCleanup: (() => void) | null = null;
let globalUnlockerInstalled = false;
let playbackGeneration = 0;
const ttsBlobCache = new Map<string, string>();
const audioBufferCache = new Map<string, AudioBuffer>();

const GESTURE_EVENTS = ["pointerdown", "pointerup", "mouseup", "click", "touchend", "keydown"] as const;

function installGlobalAudioUnlocker(): void {
  if (typeof window === "undefined" || globalUnlockerInstalled) return;
  globalUnlockerInstalled = true;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => undefined);
    }
  };

  for (const evt of GESTURE_EVENTS) {
    window.addEventListener(evt, unlock, { capture: true, passive: true });
  }
}

if (typeof window !== "undefined") {
  installGlobalAudioUnlocker();
}

function clearPendingUnlock(): void {
  if (pendingUnlockCleanup) {
    pendingUnlockCleanup();
    pendingUnlockCleanup = null;
  }
}

/**
 * Lit automatiquement un fichier ou flux audio CyberPingo (`/audio/mascot/...`, `/audio/pingo-intro.mp3`, ou blob TTS)
 * sans que l'utilisateur ait besoin d'appuyer sur un bouton Play :
 * 1. Utilise Web Audio API (`AudioContext`) si déjà déverrouillé (fonctionne même après `setTimeout` ou `fetch` asynchrone).
 * 2. Tente immédiatement `HTMLAudioElement.play()`.
 * 3. Si le navigateur bloque l'autoplay à froid (avant toute interaction sur l'onglet), arme un écouteur global
 *    qui ne se retire qu'une fois la lecture réellement démarrée.
 */
export function playCyberPingoAudioUrl(
  url: string,
  options?: {
    volume?: number;
    playbackRate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
): void {
  if (typeof window === "undefined" || !url) return;

  installGlobalAudioUnlocker();
  stopRealisticVoice();

  const gen = ++playbackGeneration;
  const volume = Math.max(0, Math.min(1, options?.volume ?? 0.85));
  const playbackRate = Math.max(0.5, Math.min(2, options?.playbackRate ?? 1));
  let started = false;

  const notifyStart = () => {
    if (started || gen !== playbackGeneration) return;
    started = true;
    clearPendingUnlock();
    options?.onStart?.();
  };

  // Si l'AudioContext est déjà en état "running", on peut jouer via AudioBufferSourceNode
  // même en dehors d'un clic direct (après un délai ou un fetch réseau).
  const ctx = getAudioContext();
  const playViaWebAudio = async (): Promise<boolean> => {
    if (!ctx || gen !== playbackGeneration) return false;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    if ((ctx.state as string) !== "running" || gen !== playbackGeneration) return false;

    try {
      let decoded = audioBufferCache.get(url);
      if (!decoded) {
        const res = await fetch(url);
        if (!res.ok) return false;
        const arr = await res.arrayBuffer();
        decoded = await ctx.decodeAudioData(arr.slice(0));
        audioBufferCache.set(url, decoded);
      }
      // Si une autre voix a pris la main pendant le chargement, on abandonne
      if (started || gen !== playbackGeneration) return true;

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;
      source.playbackRate.value = playbackRate;
      source.buffer = decoded;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      activeBufferSource = source;
      source.onended = () => {
        if (activeBufferSource === source) {
          activeBufferSource = null;
        }
        if (gen === playbackGeneration) {
          options?.onEnd?.();
        }
      };
      source.start(0);
      notifyStart();
      return true;
    } catch {
      return false;
    }
  };

  // Essai immédiat via HTMLAudioElement (et Web Audio en parallèle si déjà actif)
  const audio = new Audio(url);
  audio.preload = "auto";
  audio.volume = volume;
  audio.playbackRate = playbackRate;
  activeAudio = audio;

  audio.onplay = () => {
    notifyStart();
  };
  audio.onended = () => {
    if (activeAudio === audio) activeAudio = null;
    if (gen === playbackGeneration) options?.onEnd?.();
  };
  audio.onerror = () => {
    if (activeAudio === audio) activeAudio = null;
    if (!started && gen === playbackGeneration) options?.onError?.();
  };

  if (ctx && (ctx.state as string) === "running") {
    // Web Audio est déjà déverrouillé : contourne 100 % des blocages d'autoplay post-navigation
    activeAudio = null;
    void playViaWebAudio().then((ok) => {
      if (!ok && gen === playbackGeneration) {
        activeAudio = audio;
        audio.play().catch(() => undefined);
      }
    });
    return;
  }

  audio.play().then(() => {
    notifyStart();
  }).catch((err: unknown) => {
    if (gen !== playbackGeneration) return;
    const isAutoplayBlocked =
      (err as { name?: string } | null)?.name === "NotAllowedError";
    if (!isAutoplayBlocked) {
      if (activeAudio === audio) activeAudio = null;
      options?.onError?.();
      return;
    }

    // Pré-charge le buffer audio pendant que l'onglet attend le tout premier geste utilisateur
    if (ctx && !audioBufferCache.has(url)) {
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((arr) => (arr ? ctx.decodeAudioData(arr.slice(0)) : null))
        .then((buf) => {
          if (buf) audioBufferCache.set(url, buf);
        })
        .catch(() => undefined);
    }

    clearPendingUnlock();
    const tryUnlockAndPlay = () => {
      if (started || gen !== playbackGeneration || activeAudio !== audio) {
        clearPendingUnlock();
        return;
      }
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => undefined);
      }
      audio
        .play()
        .then(() => {
          notifyStart();
        })
        .catch(() => {
          void playViaWebAudio();
        });
    };

    for (const evt of GESTURE_EVENTS) {
      window.addEventListener(evt, tryUnlockAndPlay, { capture: true, passive: true });
    }
    pendingUnlockCleanup = () => {
      for (const evt of GESTURE_EVENTS) {
        window.removeEventListener(evt, tryUnlockAndPlay, { capture: true });
      }
    };
  });
}

const ELEVENLABS_FALLBACK_MP3_BY_EXPRESSION: Readonly<Record<string, string>> = {
  welcome: "/audio/mascot/da285d27-f5dc-9470-288b-5239d3b4d73b.mp3",
  happy: "/audio/mascot/ff1f8c62-0c3e-8b51-17fb-1aa2e1e0e778.mp3",
  proud: "/audio/mascot/f81109a2-298b-3425-fd9a-8900724b9882.mp3",
  celebration: "/audio/mascot/c92bb8fc-2df0-6989-781c-0b77358c1f0b.mp3",
  surprised: "/audio/mascot/72a62b06-091f-21d3-b2d5-d8de43eaafe2.mp3",
  encouraging: "/audio/mascot/d87276bc-32ac-b61e-b061-c611b495e6e5.mp3",
  mission: "/audio/mascot/65b23789-9944-a131-fe16-66c717af20fa.mp3",
  focused: "/audio/mascot/199c8897-2797-aff0-de28-71ca23bad1e1.mp3",
  thinking: "/audio/mascot/fdbce325-8d11-86ed-0c3f-4711db554265.mp3",
  disappointed: "/audio/mascot/d20265aa-6f59-18a3-fa9c-7efd94751304.mp3",
  expert: "/audio/mascot/6fd7b129-3f65-3b43-f76e-1dffb8b3add4.mp3",
  explanation: "/audio/videos/ch-architecture.mp3",
};

function selectFallbackElevenLabsMp3(text: string, expression?: string, lineId?: string): string {
  const lower = `${lineId ?? ""} ${text}`.toLowerCase();
  if (lower.includes("osi") || lower.includes("7 couches") || lower.includes("sept couches")) {
    return "/audio/videos/osi-briefing.mp3";
  }
  if (lower.includes("terminal") || lower.includes("commande") || lower.includes("cli")) {
    return "/audio/videos/ch-terminal.mp3";
  }
  if (lower.includes("erreur") || lower.includes("piège") || lower.includes("attention")) {
    return "/audio/videos/ch-pitfalls.mp3";
  }
  if (lower.includes("retenir") || lower.includes("récapitulons") || lower.includes("synthèse")) {
    return "/audio/videos/ch-takeaway.mp3";
  }
  if (lower.includes("laboratoire") || lower.includes("mission")) {
    return "/audio/videos/lab-methodology.mp3";
  }
  if (lower.includes("linux") || lower.includes("systemd") || lower.includes("chmod")) {
    return "/audio/videos/linux-briefing.mp3";
  }
  if (lower.includes("journal") || lower.includes("journaux") || lower.includes("soc") || lower.includes("siem")) {
    return "/audio/videos/logs-briefing.mp3";
  }
  if (lower.includes("http") || lower.includes("cookie") || lower.includes("tls") || lower.includes("web")) {
    return "/audio/videos/web-briefing.mp3";
  }
  if (lower.includes("pentest") || lower.includes("nmap") || lower.includes("intrusion")) {
    return "/audio/videos/pentest-briefing.mp3";
  }
  if (lower.includes("sha-256") || lower.includes("chiffrement") || lower.includes("crypto")) {
    return "/audio/videos/crypto-briefing.mp3";
  }
  if (lower.includes("routeur") || lower.includes("switch") || lower.includes("vlan") || lower.includes("réseau")) {
    return "/audio/videos/network-briefing.mp3";
  }
  return (
    (expression && ELEVENLABS_FALLBACK_MP3_BY_EXPRESSION[expression]) ||
    "/audio/videos/fundamentals-briefing.mp3"
  );
}

/**
 * Lit enchaîné une liste de fichiers audio MP3 ElevenLabs CyberPingo (ex: narration de chapitre + conseil Pingo)
 * avec prise en charge de la vitesse de lecture (0.75x à 1.5x).
 */
export function playCyberPingoAudioQueue(
  urls: readonly string[],
  options?: {
    volume?: number;
    playbackRate?: number;
    onStart?: () => void;
    onEnd?: () => void;
  }
): void {
  const validUrls = urls.filter(Boolean);
  if (typeof window === "undefined" || validUrls.length === 0) {
    options?.onEnd?.();
    return;
  }

  let hasStartedFirst = false;

  const playStep = (index: number) => {
    if (index >= validUrls.length) {
      options?.onEnd?.();
      return;
    }
    playCyberPingoAudioUrl(validUrls[index], {
      volume: options?.volume,
      playbackRate: options?.playbackRate,
      onStart: () => {
        if (!hasStartedFirst) {
          hasStartedFirst = true;
          options?.onStart?.();
        }
      },
      onEnd: () => {
        playStep(index + 1);
      },
      onError: () => {
        playStep(index + 1);
      },
    });
  };

  playStep(0);
}

export function speakRealisticVoice(
  text: string,
  options?: {
    volume?: number;
    playbackRate?: number;
    expression?: string;
    lineId?: string;
    fallbackAudioUrl?: string;
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
  const playbackRate = options?.playbackRate ?? 1;
  const cacheKey = `${expression}::${options?.lineId ?? ""}::${cleaned.slice(0, 900)}`;

  const playFallbackElevenLabsMp3 = () => {
    const mp3Url =
      options?.fallbackAudioUrl || selectFallbackElevenLabsMp3(cleaned, expression, options?.lineId);
    playCyberPingoAudioUrl(mp3Url, {
      volume,
      playbackRate,
      onStart: options?.onStart,
      onEnd: options?.onEnd,
      onError: options?.onEnd,
    });
  };

  const playBlobUrl = (blobUrl: string) => {
    playCyberPingoAudioUrl(blobUrl, {
      volume,
      playbackRate,
      onStart: options?.onStart,
      onEnd: options?.onEnd,
      onError: playFallbackElevenLabsMp3,
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
      playFallbackElevenLabsMp3();
    });
}

/** Stops any active speech synthesis */
export function stopRealisticVoice() {
  playbackGeneration += 1;
  clearPendingUnlock();
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  if (activeBufferSource) {
    try {
      activeBufferSource.onended = null;
      activeBufferSource.stop();
    } catch {
      // Ignore if already stopped
    }
    activeBufferSource = null;
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
  if (activeAbortController || activeBufferSource) return true;
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) return true;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

