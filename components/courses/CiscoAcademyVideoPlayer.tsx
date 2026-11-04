"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CourseraAnimatedStage from "@/components/courses/CourseraAnimatedStage";
import { useTranslation } from "@/lib/i18n";
import {
  buildLabVideoSpec,
  buildLessonVideoSpec,
  type AcademyVideoChapter,
  type AcademyVideoSpec,
  type AcademyVideoVisualSlide,
  type LabVideoInput,
  type LessonVideoInput,
  type VideoCaption,
} from "@/lib/academy-video";
import { formatVoiceTime } from "@/lib/mascot/voice";
import { stopRealisticVoice } from "@/lib/mascot/sound-effects";

function pickBestSpeechVoice(
  voices: SpeechSynthesisVoice[],
  lang: "fr" | "en"
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const targetPrefix = lang === "en" ? "en" : "fr";
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(targetPrefix));
  const pool = matching.length ? matching : voices;
  const preferred = pool.find((v) =>
    /natural|neural|online|denise|henri|eloise|vivienne|remy|thomas|amelie|audrey|google|microsoft/i.test(
      v.name
    )
  );
  return preferred ?? pool[0] ?? null;
}

export interface CiscoAcademyVideoPlayerProps {
  mode?: "lesson" | "lab";
  lessonInput?: LessonVideoInput;
  labInput?: LabVideoInput;
  spec?: AcademyVideoSpec;
  className?: string;
}

type SideTab = "transcript" | "notes" | "files";
type VoiceEngineMode = "auto-tts" | "system-speech" | "studio-track";

interface SavedVideoNote {
  id: string;
  timeSec: number;
  chapterTitle: string;
  text: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

function buildSentenceTtsUrl(text: string, lang: "fr" | "en", lineId: string): string {
  const params = new URLSearchParams({
    text: text.trim().slice(0, 760),
    expression: "explanation",
    lang,
    strict: "1",
    lineId,
  });
  return `/api/tts?${params.toString()}`;
}

export default function CiscoAcademyVideoPlayer({
  mode = "lesson",
  lessonInput,
  labInput,
  spec: explicitSpec,
  className = "",
}: CiscoAcademyVideoPlayerProps) {
  const { lang } = useTranslation();
  const isEn = lang === "en";
  const voiceLang: "fr" | "en" = isEn ? "en" : "fr";

  // CRITICAL: Stabilize dependencies with primitive keys so parent 500ms timers
  // (like LessonView's setNow countdown) NEVER recreate videoSpec or interrupt voice audio.
  const lessonInputRef = useRef(lessonInput);
  lessonInputRef.current = lessonInput;
  const labInputRef = useRef(labInput);
  labInputRef.current = labInput;

  const stableSpecKey = [
    mode,
    isEn ? "en" : "fr",
    explicitSpec?.id ?? "",
    lessonInput?.id ?? "",
    lessonInput?.videoTitle ?? "",
    lessonInput?.lessonTitle ?? "",
    lessonInput?.blocks?.length ?? 0,
    labInput?.lab?.id ?? "",
    labInput?.lab?.title ?? "",
  ].join("::");

  const videoSpec = useMemo<AcademyVideoSpec>(() => {
    if (explicitSpec) return explicitSpec;
    if (mode === "lab" && labInputRef.current) {
      return buildLabVideoSpec(labInputRef.current, isEn ? "en" : "fr");
    }
    return buildLessonVideoSpec(
      lessonInputRef.current ?? {
        videoTitle: isEn ? "Course Technical Capsule" : "Capsule vidéo du cours",
      },
      isEn ? "en" : "fr"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableSpecKey, explicitSpec]);

  const containerRef = useRef<HTMLElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioKeyRef = useRef<string>("");
  const advanceAfterSpeechRef = useRef<() => void>(() => {});
  const isPlayingRef = useRef(false);

  const [chapterIndex, setChapterIndex] = useState(0);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [chapterElapsed, setChapterElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.95);
  const [showCaptions, setShowCaptions] = useState(true);
  const [sideOpen, setSideOpen] = useState(true);
  const [activeSideTab, setActiveSideTab] = useState<SideTab>("notes");
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceEngineMode>("auto-tts");
  const [speedIndex, setSpeedIndex] = useState(1); // 1x default
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatusLabel, setVoiceStatusLabel] = useState<string>("");
  const [manualSlideIndex, setManualSlideIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState<SavedVideoNote[]>([]);
  const [noteToast, setNoteToast] = useState(false);

  isPlayingRef.current = isPlaying;

  const playbackRate = SPEEDS[speedIndex] ?? 1;
  const chapters = videoSpec.chapters;
  const currentChapter: AcademyVideoChapter = chapters[chapterIndex] ?? chapters[0];
  const chapterDuration = Math.max(8, currentChapter?.durationSeconds ?? 24);

  const chapterCaptions: VideoCaption[] = useMemo(() => {
    if (currentChapter?.captions?.length) return currentChapter.captions;
    return [
      {
        startRatio: 0,
        endRatio: 1,
        text: currentChapter?.narration ?? "",
      },
    ];
  }, [currentChapter]);

  const safeCaptionIndex = Math.min(
    Math.max(0, captionIndex),
    Math.max(0, chapterCaptions.length - 1)
  );
  const activeCaptionItem: VideoCaption =
    chapterCaptions[safeCaptionIndex] ??
    chapterCaptions[0] ?? { startRatio: 0, endRatio: 1, text: "" };
  const activeCaption = activeCaptionItem.text || currentChapter?.narration || "";

  const chapterProgress = Math.min(1, Math.max(0, chapterElapsed / chapterDuration));

  const elapsedBeforeCurrent = useMemo(
    () => chapters.slice(0, chapterIndex).reduce((sum, ch) => sum + ch.durationSeconds, 0),
    [chapters, chapterIndex]
  );
  const totalElapsed = Math.min(
    videoSpec.totalDurationSeconds,
    elapsedBeforeCurrent + chapterElapsed
  );
  const totalProgressPct =
    videoSpec.totalDurationSeconds > 0
      ? Math.min(100, Math.max(0, (totalElapsed / videoSpec.totalDurationSeconds) * 100))
      : 0;

  const chapterSlides: AcademyVideoVisualSlide[] = useMemo(
    () =>
      currentChapter?.visualSlides?.length
        ? currentChapter.visualSlides
        : videoSpec.visualSlides ?? [],
    [currentChapter, videoSpec.visualSlides]
  );

  const activeSlideIndex = useMemo(() => {
    if (!chapterSlides.length) return 0;
    if (manualSlideIndex !== null && manualSlideIndex < chapterSlides.length) {
      return manualSlideIndex;
    }
    return Math.min(chapterSlides.length - 1, safeCaptionIndex);
  }, [chapterSlides.length, manualSlideIndex, safeCaptionIndex]);

  const activeSlide: AcademyVideoVisualSlide | undefined =
    (manualSlideIndex === null ? activeCaptionItem.visualSlide : undefined) ??
    chapterSlides[activeSlideIndex] ??
    chapterSlides[0];

  const activeKeywords: string[] = useMemo(() => {
    if (activeCaptionItem.keywords?.length) return activeCaptionItem.keywords;
    return [activeSlide?.title ?? videoSpec.domainLabel].slice(0, 3);
  }, [activeCaptionItem.keywords, activeSlide?.title, videoSpec.domainLabel]);

  const activeConceptTag: string =
    activeCaptionItem.conceptTag ||
    activeSlide?.badge ||
    (isEn ? `Illustration ${safeCaptionIndex + 1}` : `Illustration ${safeCaptionIndex + 1}`);

  // Load saved personal notes from localStorage for this video
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(`cyberpingo-video-notes-${videoSpec.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setNotes(parsed);
      } else {
        setNotes([]);
      }
    } catch {
      setNotes([]);
    }
  }, [videoSpec.id]);

  // Reset manual slide override when sentence or chapter changes
  useEffect(() => {
    setManualSlideIndex(null);
  }, [chapterIndex, safeCaptionIndex]);

  // Stop dedicated video audio & browser speech synthesis
  const stopVideoVoice = useCallback(() => {
    if (audioElRef.current) {
      try {
        audioElRef.current.pause();
      } catch {
        // ignore
      }
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setVoiceActive(false);
  }, []);

  // Advance to the next sentence or chapter when a spoken sentence finishes
  const advanceToNextSentence = useCallback(() => {
    if (!isPlayingRef.current) return;
    if (safeCaptionIndex < chapterCaptions.length - 1) {
      const nextIdx = safeCaptionIndex + 1;
      const nextStart = (chapterCaptions[nextIdx]?.startRatio ?? 0) * chapterDuration;
      setCaptionIndex(nextIdx);
      setChapterElapsed(nextStart);
    } else if (chapterIndex < chapters.length - 1) {
      setChapterIndex((idx) => Math.min(chapters.length - 1, idx + 1));
      setCaptionIndex(0);
      setChapterElapsed(0);
    } else {
      setIsPlaying(false);
      setVoiceActive(false);
      setChapterElapsed(chapterDuration);
    }
  }, [safeCaptionIndex, chapterCaptions, chapterDuration, chapterIndex, chapters.length]);

  advanceAfterSpeechRef.current = advanceToNextSentence;

  // Speak via browser's native Web Speech API (used as instant fallback or when selected)
  const speakWithSystemSpeech = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return false;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const bestVoice = pickBestSpeechVoice(voices, voiceLang);
        if (bestVoice) {
          utterance.voice = bestVoice;
          utterance.lang = bestVoice.lang;
        } else {
          utterance.lang = voiceLang === "en" ? "en-US" : "fr-FR";
        }
        utterance.rate = playbackRate;
        utterance.volume = muted ? 0 : volume;
        utterance.onstart = () => {
          setVoiceActive(true);
          setVoiceStatusLabel(isEn ? "System HD Voice" : "Voix Système HD");
        };
        utterance.onend = () => {
          setVoiceActive(false);
          currentAudioKeyRef.current = "";
          advanceAfterSpeechRef.current();
        };
        utterance.onerror = () => {
          setVoiceActive(false);
        };
        window.speechSynthesis.speak(utterance);
        return true;
      } catch {
        return false;
      }
    },
    [voiceLang, playbackRate, muted, volume, isEn]
  );

  // Trigger audio playback for a given sentence immediately (works inside click handlers AND effects)
  const triggerSentenceAudio = useCallback(
    (
      targetChapter: AcademyVideoChapter | undefined,
      targetCapIndex: number,
      forceRestart = false
    ) => {
      if (!targetChapter || muted) {
        stopVideoVoice();
        return;
      }
      const caps = targetChapter.captions?.length
        ? targetChapter.captions
        : [{ startRatio: 0, endRatio: 1, text: targetChapter.narration }];
      const clampedIdx = Math.min(Math.max(0, targetCapIndex), Math.max(0, caps.length - 1));
      const sentenceText = (caps[clampedIdx]?.text || targetChapter.narration || "").trim();
      if (!sentenceText) return;

      const audioKey = `${videoSpec.id}::${targetChapter.id}::${clampedIdx}::${voiceMode}::${voiceLang}`;
      if (!forceRestart && currentAudioKeyRef.current === audioKey) {
        if (
          voiceMode !== "system-speech" &&
          audioElRef.current &&
          audioElRef.current.paused &&
          audioElRef.current.src
        ) {
          audioElRef.current.playbackRate = playbackRate;
          audioElRef.current.volume = volume;
          audioElRef.current.play().catch(() => {
            speakWithSystemSpeech(sentenceText);
          });
        }
        return;
      }

      currentAudioKeyRef.current = audioKey;

      // Silence any corner mascot speech so only the video instructor speaks
      stopRealisticVoice();

      if (voiceMode === "system-speech") {
        if (audioElRef.current) audioElRef.current.pause();
        speakWithSystemSpeech(sentenceText);
        return;
      }

      const audioEl = audioElRef.current;
      if (!audioEl) {
        speakWithSystemSpeech(sentenceText);
        return;
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }

      const lineId = `netacad-${videoSpec.id}-${targetChapter.id}-${clampedIdx}`;
      const srcUrl =
        voiceMode === "studio-track" && targetChapter.audioPlaylist?.[0]
          ? targetChapter.audioPlaylist[0]
          : buildSentenceTtsUrl(sentenceText, voiceLang, lineId);

      audioEl.pause();
      audioEl.src = srcUrl;
      audioEl.playbackRate = playbackRate;
      audioEl.volume = muted ? 0 : volume;
      setVoiceStatusLabel(
        voiceMode === "studio-track"
          ? "ElevenLabs Studio MP3"
          : isEn
            ? "CyberPingo AI Voice"
            : "Voix IA CyberPingo"
      );

      const playPromise = audioEl.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          speakWithSystemSpeech(sentenceText);
        });
      }
    },
    [
      muted,
      stopVideoVoice,
      videoSpec.id,
      voiceMode,
      voiceLang,
      playbackRate,
      volume,
      isEn,
      speakWithSystemSpeech,
    ]
  );

  // Sync live volume & speed changes onto the active <audio> element
  useEffect(() => {
    const audioEl = audioElRef.current;
    if (!audioEl) return;
    audioEl.volume = muted ? 0 : volume;
    audioEl.muted = muted;
    audioEl.playbackRate = playbackRate;
  }, [volume, muted, playbackRate]);

  // Whenever chapterIndex, safeCaptionIndex, isPlaying, or voiceMode changes while playing, trigger sentence audio
  useEffect(() => {
    if (!isPlaying || muted) {
      if (!isPlaying || muted) stopVideoVoice();
      return;
    }
    triggerSentenceAudio(currentChapter, safeCaptionIndex, false);
  }, [
    isPlaying,
    muted,
    chapterIndex,
    safeCaptionIndex,
    voiceMode,
    currentChapter,
    triggerSentenceAudio,
    stopVideoVoice,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVideoVoice();
    };
  }, [stopVideoVoice]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Timeline progress interpolation + watchdog so the video smoothly advances even if audio is muted or finishes
  useEffect(() => {
    if (!isPlaying) return undefined;

    const tickMs = 100;
    const segStart = activeCaptionItem.startRatio * chapterDuration;
    const segEnd = activeCaptionItem.endRatio * chapterDuration;
    const segWindow = Math.max(1.5, segEnd - segStart);
    const estimatedSentenceSec = Math.max(
      2.6,
      Math.min(16, activeCaption.length / (14 * playbackRate))
    );
    let elapsedInSentenceSec = 0;

    const timer = window.setInterval(() => {
      elapsedInSentenceSec += tickMs / 1000;

      if (!muted && voiceMode !== "studio-track") {
        const audioEl = audioElRef.current;
        if (
          audioEl &&
          !audioEl.paused &&
          Number.isFinite(audioEl.duration) &&
          audioEl.duration > 0.4
        ) {
          const audioRatio = Math.min(1, Math.max(0, audioEl.currentTime / audioEl.duration));
          setChapterElapsed(segStart + audioRatio * segWindow);
          return;
        }

        const step = (segWindow / estimatedSentenceSec) * (tickMs / 1000);
        setChapterElapsed((prev) => {
          const base = Math.max(segStart, prev);
          return Math.min(segEnd - 0.03, base + step);
        });

        const speechBusy =
          typeof window !== "undefined" &&
          "speechSynthesis" in window &&
          window.speechSynthesis.speaking;
        const audioBusy = audioEl && !audioEl.paused && !audioEl.ended;
        if (!speechBusy && !audioBusy && elapsedInSentenceSec >= estimatedSentenceSec + 2.5) {
          currentAudioKeyRef.current = "";
          advanceAfterSpeechRef.current();
        }
        return;
      }

      setChapterElapsed((prev) => {
        const next = prev + (tickMs / 1000) * playbackRate;
        if (next < chapterDuration) {
          const nextRatio = next / chapterDuration;
          const matchedIdx = chapterCaptions.findIndex(
            (cap) => nextRatio >= cap.startRatio && nextRatio <= cap.endRatio + 0.01
          );
          if (matchedIdx !== -1 && matchedIdx !== safeCaptionIndex) {
            setCaptionIndex(matchedIdx);
          }
          return next;
        }
        if (chapterIndex < chapters.length - 1) {
          currentAudioKeyRef.current = "";
          setChapterIndex((idx) => Math.min(chapters.length - 1, idx + 1));
          setCaptionIndex(0);
          return 0;
        }
        setIsPlaying(false);
        setVoiceActive(false);
        return chapterDuration;
      });
    }, tickMs);

    return () => window.clearInterval(timer);
  }, [
    isPlaying,
    muted,
    voiceMode,
    playbackRate,
    chapterDuration,
    chapterIndex,
    chapters.length,
    activeCaptionItem.startRatio,
    activeCaptionItem.endRatio,
    activeCaption.length,
    chapterCaptions,
    safeCaptionIndex,
  ]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopVideoVoice();
      return;
    }

    setHasStarted(true);
    let nextChapIdx = chapterIndex;
    let nextCapIdx = safeCaptionIndex;

    if (
      chapterIndex === chapters.length - 1 &&
      safeCaptionIndex >= chapterCaptions.length - 1 &&
      chapterElapsed >= chapterDuration - 0.5
    ) {
      nextChapIdx = 0;
      nextCapIdx = 0;
      setChapterIndex(0);
      setCaptionIndex(0);
      setChapterElapsed(0);
      currentAudioKeyRef.current = "";
    }

    setIsPlaying(true);
    // CRITICAL: Trigger audio synchronously inside the user click gesture!
    triggerSentenceAudio(chapters[nextChapIdx] ?? currentChapter, nextCapIdx, false);
  };

  const selectChapter = (index: number, autoPlay = true, startCaptionIdx = 0) => {
    const clamped = Math.max(0, Math.min(chapters.length - 1, index));
    const targetChapter = chapters[clamped] ?? chapters[0];
    const targetCaptions = targetChapter?.captions?.length
      ? targetChapter.captions
      : [{ startRatio: 0, endRatio: 1, text: targetChapter?.narration ?? "" }];
    const clampedCapIdx = Math.max(
      0,
      Math.min(Math.max(0, targetCaptions.length - 1), startCaptionIdx)
    );
    const startRatio = targetCaptions[clampedCapIdx]?.startRatio ?? 0;
    const targetDuration = Math.max(8, targetChapter?.durationSeconds ?? 24);

    currentAudioKeyRef.current = "";
    setChapterIndex(clamped);
    setCaptionIndex(clampedCapIdx);
    setChapterElapsed(startRatio * targetDuration);
    setHasStarted(true);
    setIsPlaying(autoPlay);

    if (autoPlay && !muted) {
      triggerSentenceAudio(targetChapter, clampedCapIdx, true);
    } else {
      stopVideoVoice();
    }
  };

  const skipSeconds = (deltaSec: number) => {
    setHasStarted(true);
    if (deltaSec < 0) {
      if (safeCaptionIndex > 0) {
        selectChapter(chapterIndex, isPlaying, safeCaptionIndex - 1);
      } else if (chapterIndex > 0) {
        const prevChap = chapters[chapterIndex - 1];
        const lastCap = Math.max(0, (prevChap?.captions?.length ?? 1) - 1);
        selectChapter(chapterIndex - 1, isPlaying, lastCap);
      } else {
        selectChapter(0, isPlaying, 0);
      }
    } else {
      if (safeCaptionIndex < chapterCaptions.length - 1) {
        selectChapter(chapterIndex, isPlaying, safeCaptionIndex + 1);
      } else if (chapterIndex < chapters.length - 1) {
        selectChapter(chapterIndex + 1, isPlaying, 0);
      }
    }
  };

  const handleGlobalSeek = (globalRatio: number) => {
    const clamped = Math.max(0, Math.min(1, globalRatio));
    const targetSec = clamped * videoSpec.totalDurationSeconds;
    let acc = 0;
    for (let i = 0; i < chapters.length; i += 1) {
      const ch = chapters[i];
      if (targetSec <= acc + ch.durationSeconds || i === chapters.length - 1) {
        const localRatio = Math.max(
          0,
          Math.min(1, (targetSec - acc) / Math.max(1, ch.durationSeconds))
        );
        const caps = ch.captions?.length
          ? ch.captions
          : [{ startRatio: 0, endRatio: 1, text: ch.narration }];
        const matchedIdx = caps.findIndex(
          (cap) => localRatio >= cap.startRatio && localRatio <= cap.endRatio + 0.01
        );
        const targetCapIdx = matchedIdx !== -1 ? matchedIdx : caps.length - 1;
        selectChapter(i, isPlaying, Math.max(0, targetCapIdx));
        break;
      }
      acc += ch.durationSeconds;
    }
  };

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      if (next) {
        stopVideoVoice();
      } else if (isPlaying) {
        currentAudioKeyRef.current = "";
        triggerSentenceAudio(currentChapter, safeCaptionIndex, true);
      }
      return next;
    });
  };

  const cycleSpeed = () => {
    setSpeedIndex((prev) => (prev + 1) % SPEEDS.length);
  };

  const handleSaveNote = () => {
    const newNote: SavedVideoNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timeSec: Math.round(totalElapsed),
      chapterTitle: currentChapter?.title ?? videoSpec.title,
      text: activeCaption,
    };
    setNotes((prev) => {
      const updated = [newNote, ...prev].slice(0, 25);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `cyberpingo-video-notes-${videoSpec.id}`,
            JSON.stringify(updated)
          );
        } catch {
          // ignore
        }
      }
      return updated;
    });
    setSideOpen(true);
    setActiveSideTab("notes");
    setNoteToast(true);
    window.setTimeout(() => setNoteToast(false), 2200);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== noteId);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `cyberpingo-video-notes-${videoSpec.id}`,
            JSON.stringify(updated)
          );
        } catch {
          // ignore
        }
      }
      return updated;
    });
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen permission errors
    }
  };

  const sentenceProgressRatio = useMemo(() => {
    if (chapterCaptions.length <= 1) return Math.max(chapterProgress, 0.35);
    return Math.max(chapterProgress, (safeCaptionIndex + 1) / chapterCaptions.length);
  }, [chapterCaptions.length, chapterProgress, safeCaptionIndex]);

  const activeBulletIndex = useMemo(() => {
    const count = Math.max(1, currentChapter?.bullets?.length ?? 1);
    return Math.min(count - 1, Math.floor(sentenceProgressRatio * count));
  }, [currentChapter?.bullets?.length, sentenceProgressRatio]);

  const visibleTerminalStepCount = useMemo(() => {
    const total = currentChapter?.terminalSteps?.length ?? 1;
    if (!hasStarted && !isPlaying) return total;
    return Math.max(1, Math.min(total, Math.ceil(sentenceProgressRatio * total)));
  }, [currentChapter?.terminalSteps?.length, sentenceProgressRatio, hasStarted, isPlaying]);

  return (
    <figure
      ref={containerRef}
      className={`lesson-media netacad-player coursera-player ${isFullscreen ? "is-fullscreen" : ""} ${sideOpen ? "has-side-open" : ""} ${className}`.trim()}
      aria-label={`${isEn ? "Interactive course video" : "Capsule vidéo interactive"} : ${videoSpec.title}`}
    >
      {/* Dedicated persistent <audio> element for reliable, non-blocked voice playback */}
      <audio
        ref={audioElRef}
        preload="auto"
        onPlay={() => setVoiceActive(true)}
        onPlaying={() => setVoiceActive(true)}
        onPause={() => setVoiceActive(false)}
        onEnded={() => {
          setVoiceActive(false);
          currentAudioKeyRef.current = "";
          if (voiceMode !== "studio-track") {
            advanceAfterSpeechRef.current();
          }
        }}
        onError={() => {
          setVoiceActive(false);
          if (isPlayingRef.current && !muted) {
            speakWithSystemSpeech(activeCaption);
          }
        }}
      />

      {/* COURSERA THEATER LAYOUT: Left Video Frame + Right Collapsible Side Panel & Vertical Rail */}
      <div className="coursera-theater">
        {/* LEFT MAIN VIDEO FRAME (Blue Coursera Border) */}
        <div className="coursera-video-frame">
          {/* Top Dark Header Bar with Rounded Pill Title (Exact Coursera Screenshot Style) */}
          <header className="coursera-topbar">
            <div className="coursera-topbar__pill">
              <span className="coursera-topbar__dot" data-speaking={voiceActive ? "true" : "false"} />
              <strong>
                {isEn
                  ? `Welcome to the course: ${videoSpec.title}`
                  : `Bienvenue dans le cours : ${videoSpec.title}`}
              </strong>
            </div>

            <div className="coursera-topbar__right">
              <span className="coursera-topbar__voice-tag" data-active={voiceActive ? "true" : "false"}>
                {muted
                  ? isEn
                    ? "🔇 Muted"
                    : "🔇 Muet"
                  : voiceActive
                    ? `🔊 ${voiceStatusLabel || (isEn ? "Speaking..." : "Voix active")}`
                    : `🎙 ${isEn ? "Voice ready" : "Voix prête"}`}
              </span>
              <span className="coursera-topbar__chap-tag">
                {currentChapter?.badge} · {currentChapter?.title}
              </span>
            </div>
          </header>

          {/* 16:9 WHITE ANIMATED STAGE (Coursera / Google Cybersecurity Style) */}
          <div className="coursera-stage-viewport">
            <CourseraAnimatedStage
              chapter={currentChapter}
              domain={videoSpec.domain}
              activeSlide={activeSlide}
              chapterSlides={chapterSlides}
              activeSlideIndex={activeSlideIndex}
              safeCaptionIndex={safeCaptionIndex}
              totalCaptions={chapterCaptions.length}
              activeCaption={activeCaption}
              activeConceptTag={activeConceptTag}
              activeKeywords={activeKeywords}
              activeBulletIndex={activeBulletIndex}
              visibleTerminalStepCount={visibleTerminalStepCount}
              isPlaying={isPlaying}
              voiceActive={voiceActive}
              isEn={isEn}
              onSelectSlide={(idx) => {
                setManualSlideIndex(idx);
                if (idx < chapterCaptions.length) {
                  selectChapter(chapterIndex, isPlaying, idx);
                }
              }}
            />

            {/* Initial Play Overlay on top of the White Animated Stage */}
            {!hasStarted && !isPlaying && (
              <div className="coursera-poster-overlay">
                <button
                  type="button"
                  className="coursera-big-play-btn"
                  onClick={togglePlay}
                  aria-label={isEn ? `Play video: ${videoSpec.title}` : `Lancer la vidéo : ${videoSpec.title}`}
                >
                  <span className="coursera-big-play-btn__circle" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                      <path d="M8 5.5v13l10.5-6.5L8 5.5z" />
                    </svg>
                  </span>
                  <span className="coursera-big-play-btn__copy">
                    <strong>
                      {mode === "lab"
                        ? isEn
                          ? "Start Animated Lab Briefing"
                          : "Lancer la capsule animée du laboratoire"
                        : isEn
                          ? "Start Animated Course Video"
                          : "Lancer la capsule animée avec voix & illustrations"}
                    </strong>
                    <small>
                      {videoSpec.title} · {chapters.length} {isEn ? "chapters" : "chapitres"} (
                      {formatVoiceTime(videoSpec.totalDurationSeconds)})
                    </small>
                  </span>
                </button>
              </div>
            )}

            {/* Synchronized Subtitle Bar (CC) */}
            {showCaptions && activeCaption && (
              <div
                className="coursera-cc-overlay"
                data-speaking={voiceActive ? "true" : "false"}
                aria-live="polite"
              >
                <span className="coursera-cc-overlay__badge">
                  {voiceActive ? "🔊" : "CC"} {safeCaptionIndex + 1}/{chapterCaptions.length}
                </span>
                <p className="coursera-cc-overlay__text">{activeCaption}</p>
              </div>
            )}

            {/* Toast confirmation when a personal note is saved */}
            {noteToast && (
              <div className="coursera-note-toast" role="status">
                ✓ {isEn ? "Note saved at" : "Note enregistrée à"} {formatVoiceTime(totalElapsed)}
              </div>
            )}
          </div>

          {/* COURSERA BLUE PROGRESS SCRUBBER BAR WITH CIRCULAR THUMB */}
          <div
            className="coursera-scrubber"
            role="slider"
            tabIndex={0}
            aria-label={isEn ? "Video timeline scrubber" : "Barre de progression de la vidéo"}
            aria-valuemin={0}
            aria-valuemax={Math.round(videoSpec.totalDurationSeconds)}
            aria-valuenow={Math.round(totalElapsed)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (rect.width > 0) {
                handleGlobalSeek((e.clientX - rect.left) / rect.width);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") skipSeconds(10);
              if (e.key === "ArrowLeft") skipSeconds(-10);
            }}
          >
            <div className="coursera-scrubber__track">
              <div
                className="coursera-scrubber__fill"
                style={{ width: `${totalProgressPct}%` }}
              />
              {chapters.slice(0, -1).map((ch, idx) => {
                const cumSec = chapters
                  .slice(0, idx + 1)
                  .reduce((sum, item) => sum + item.durationSeconds, 0);
                const pct =
                  videoSpec.totalDurationSeconds > 0
                    ? (cumSec / videoSpec.totalDurationSeconds) * 100
                    : 0;
                return (
                  <span
                    key={ch.id}
                    className="coursera-scrubber__tick"
                    style={{ left: `${pct}%` }}
                    title={chapters[idx + 1]?.title}
                  />
                );
              })}
              <span
                className="coursera-scrubber__thumb"
                style={{ left: `${totalProgressPct}%` }}
              />
            </div>
          </div>

          {/* COURSERA DARK BOTTOM TRANSPORT CONTROL BAR */}
          <div className="coursera-controls">
            <div className="coursera-controls__left">
              <button
                type="button"
                className="coursera-ctrl-btn coursera-ctrl-btn--play"
                onClick={togglePlay}
                aria-label={isPlaying ? (isEn ? "Pause" : "Pause") : (isEn ? "Play" : "Lecture")}
                title={isPlaying ? (isEn ? "Pause" : "Pause") : (isEn ? "Play" : "Lecture")}
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M7 5.5v13l11-6.5L7 5.5z" />
                  </svg>
                )}
              </button>

              <div className="coursera-volume-group">
                <button
                  type="button"
                  className="coursera-ctrl-btn"
                  onClick={toggleMute}
                  aria-label={muted ? (isEn ? "Unmute" : "Activer le son") : (isEn ? "Mute" : "Couper le son")}
                  title={muted ? (isEn ? "Unmute" : "Activer la voix") : (isEn ? "Mute" : "Couper la voix")}
                >
                  {muted || volume === 0 ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                      <line x1="22" y1="9" x2="16" y2="15" />
                      <line x1="16" y1="9" x2="22" y2="15" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const nextVol = Number(e.target.value);
                    setVolume(nextVol);
                    if (nextVol > 0 && muted) setMuted(false);
                  }}
                  className="coursera-volume-slider"
                  aria-label={isEn ? "Voice volume" : "Volume de la voix"}
                />
              </div>

              <button
                type="button"
                className="coursera-ctrl-btn coursera-ctrl-btn--skip"
                onClick={() => skipSeconds(-10)}
                title={isEn ? "Back 10 seconds / previous sentence" : "Reculer de 10 secondes / phrase précédente"}
                aria-label={isEn ? "Back 10 seconds" : "Reculer de 10 secondes"}
              >
                <span aria-hidden="true">↺</span>
                <small>10</small>
              </button>

              <span className="coursera-time-display">
                {formatVoiceTime(totalElapsed)} / {formatVoiceTime(videoSpec.totalDurationSeconds)}
              </span>

              <button
                type="button"
                className="coursera-ctrl-btn coursera-ctrl-btn--skip"
                onClick={() => skipSeconds(10)}
                title={isEn ? "Forward 10 seconds / next sentence" : "Avancer de 10 secondes / phrase suivante"}
                aria-label={isEn ? "Forward 10 seconds" : "Avancer de 10 secondes"}
              >
                <span aria-hidden="true">↻</span>
                <small>10</small>
              </button>
            </div>

            <div className="coursera-controls__right">
              <button
                type="button"
                className="coursera-ctrl-btn coursera-ctrl-btn--text"
                onClick={cycleSpeed}
                title={isEn ? "Playback speed" : "Vitesse de lecture"}
              >
                {playbackRate}x
              </button>

              <div className="coursera-settings-wrap">
                <button
                  type="button"
                  className={`coursera-ctrl-btn ${showSettingsMenu ? "is-active" : ""}`}
                  onClick={() => setShowSettingsMenu((v) => !v)}
                  title={isEn ? "Audio & Voice Settings" : "Paramètres de la voix audio"}
                  aria-label={isEn ? "Audio & Voice Settings" : "Paramètres de la voix audio"}
                >
                  ⚙
                </button>
                {showSettingsMenu && (
                  <div className="coursera-settings-popover" role="dialog" aria-label="Paramètres audio">
                    <div className="coursera-settings-popover__title">
                      {isEn ? "Voice Engine & Audio" : "Moteur vocal & Audio"}
                    </div>
                    <button
                      type="button"
                      className={`coursera-settings-option ${voiceMode === "auto-tts" ? "is-selected" : ""}`}
                      onClick={() => {
                        setVoiceMode("auto-tts");
                        currentAudioKeyRef.current = "";
                        setShowSettingsMenu(false);
                        if (isPlaying) triggerSentenceAudio(currentChapter, safeCaptionIndex, true);
                      }}
                    >
                      <span>{isEn ? "CyberPingo AI Voice (Recommended)" : "Voix IA CyberPingo (Recommandé)"}</span>
                      {voiceMode === "auto-tts" && <b>✓</b>}
                    </button>
                    <button
                      type="button"
                      className={`coursera-settings-option ${voiceMode === "system-speech" ? "is-selected" : ""}`}
                      onClick={() => {
                        setVoiceMode("system-speech");
                        currentAudioKeyRef.current = "";
                        setShowSettingsMenu(false);
                        if (isPlaying) triggerSentenceAudio(currentChapter, safeCaptionIndex, true);
                      }}
                    >
                      <span>{isEn ? "Browser System HD Voice" : "Voix Système HD (Navigateur)"}</span>
                      {voiceMode === "system-speech" && <b>✓</b>}
                    </button>
                    {currentChapter?.audioPlaylist?.[0] && (
                      <button
                        type="button"
                        className={`coursera-settings-option ${voiceMode === "studio-track" ? "is-selected" : ""}`}
                        onClick={() => {
                          setVoiceMode("studio-track");
                          currentAudioKeyRef.current = "";
                          setShowSettingsMenu(false);
                          if (isPlaying) triggerSentenceAudio(currentChapter, safeCaptionIndex, true);
                        }}
                      >
                        <span>{isEn ? "ElevenLabs Studio Track" : "Piste Studio ElevenLabs (.mp3)"}</span>
                        {voiceMode === "studio-track" && <b>✓</b>}
                      </button>
                    )}
                    <div className="coursera-settings-popover__footer">
                      <button
                        type="button"
                        className="coursera-settings-test-btn"
                        onClick={() => {
                          setMuted(false);
                          setHasStarted(true);
                          setIsPlaying(true);
                          setShowSettingsMenu(false);
                          triggerSentenceAudio(currentChapter, safeCaptionIndex, true);
                        }}
                      >
                        🔊 {isEn ? "Test & Relock Voice Now" : "Tester / Relancer la voix maintenant"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="coursera-ctrl-btn"
                onClick={handleSaveNote}
                title={
                  isEn
                    ? "Save note at current timestamp"
                    : "Enregistrer une note personnelle à ce moment de la vidéo"
                }
                aria-label={isEn ? "Save note" : "Enregistrer une note"}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </button>

              <button
                type="button"
                className={`coursera-ctrl-btn coursera-ctrl-btn--text ${showCaptions ? "is-active" : ""}`}
                onClick={() => setShowCaptions((v) => !v)}
                aria-pressed={showCaptions}
                title={isEn ? "Toggle Subtitles (CC)" : "Activer / Désactiver les sous-titres (CC)"}
              >
                CC
              </button>

              <button
                type="button"
                className={`coursera-ctrl-btn ${sideOpen ? "is-active" : ""}`}
                onClick={() => setSideOpen((v) => !v)}
                aria-expanded={sideOpen}
                title={isEn ? "Toggle Side Panel" : "Afficher / Masquer le panneau latéral"}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <line x1="15" y1="4" x2="15" y2="20" />
                </svg>
              </button>

              <button
                type="button"
                className="coursera-ctrl-btn"
                onClick={() => void toggleFullscreen()}
                title={isEn ? "Fullscreen" : "Plein écran"}
                aria-label={isEn ? "Fullscreen" : "Plein écran"}
              >
                ⛶
              </button>
            </div>
          </div>

          {/* Chapter Navigation Pills below the control bar */}
          <nav
            className="coursera-chapter-bar"
            aria-label={isEn ? "Chapters navigation" : "Navigation par chapitre"}
          >
            {chapters.map((chapter, idx) => (
              <button
                key={chapter.id}
                type="button"
                className={`coursera-chapter-pill ${idx === chapterIndex ? "is-active" : idx < chapterIndex ? "is-done" : ""}`}
                onClick={() => selectChapter(idx, true, 0)}
              >
                <span className="coursera-chapter-pill__num">0{idx + 1}</span>
                <span className="coursera-chapter-pill__title">{chapter.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* RIGHT SIDE PANEL: Collapsible Drawer + Vertical 3-Tab Icon Rail (Exact Coursera Layout) */}
        <aside className="coursera-side-area" aria-label={isEn ? "Course tools" : "Outils de la capsule"}>
          {sideOpen && (
            <div className="coursera-side-drawer">
              {activeSideTab === "notes" && (
                <div className="coursera-drawer-pane">
                  <div className="coursera-drawer-head">
                    <h3>{isEn ? "Personal Notes" : "Notes Personnelles"}</h3>
                    <div className="coursera-drawer-head__actions">
                      <button
                        type="button"
                        className="coursera-drawer-link-btn"
                        onClick={() => setActiveSideTab("transcript")}
                      >
                        ↗ {isEn ? "View transcript" : "Voir toutes les notes"}
                      </button>
                      <button
                        type="button"
                        className="coursera-drawer-close"
                        onClick={() => setSideOpen(false)}
                        aria-label={isEn ? "Close panel" : "Fermer le panneau"}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="coursera-add-note-cta"
                    onClick={handleSaveNote}
                  >
                    + {isEn ? "Capture note at" : "Capturer une note à"} {formatVoiceTime(totalElapsed)}
                  </button>

                  {notes.length === 0 ? (
                    <div className="coursera-notes-empty">
                      <div className="coursera-notes-empty__icon" aria-hidden="true">
                        <svg viewBox="0 0 48 48" width="42" height="42" fill="none" stroke="#94a3b8" strokeWidth="2.5">
                          <rect x="10" y="6" width="28" height="36" rx="4" />
                          <line x1="16" y1="16" x2="32" y2="16" />
                          <line x1="16" y1="24" x2="28" y2="24" />
                          <circle cx="34" cy="34" r="8" fill="#1e293b" stroke="#60a5fa" strokeWidth="2.5" />
                          <line x1="34" y1="30" x2="34" y2="38" stroke="#60a5fa" />
                          <line x1="30" y1="34" x2="38" y2="34" stroke="#60a5fa" />
                        </svg>
                      </div>
                      <p>
                        {isEn
                          ? "Click the 'Save Note' button in the video player to capture a note at this timestamp."
                          : "Cliquez sur le bouton « Enregistrer la note » dans le lecteur vidéo pour capturer une note à ce moment précis de la vidéo."}
                      </p>
                    </div>
                  ) : (
                    <ul className="coursera-notes-list">
                      {notes.map((note) => (
                        <li key={note.id} className="coursera-note-card">
                          <div className="coursera-note-card__top">
                            <button
                              type="button"
                              className="coursera-note-card__time"
                              onClick={() =>
                                handleGlobalSeek(
                                  videoSpec.totalDurationSeconds > 0
                                    ? note.timeSec / videoSpec.totalDurationSeconds
                                    : 0
                                )
                              }
                            >
                              ▶ {formatVoiceTime(note.timeSec)}
                            </button>
                            <small>{note.chapterTitle}</small>
                            <button
                              type="button"
                              className="coursera-note-card__del"
                              onClick={() => handleDeleteNote(note.id)}
                              aria-label={isEn ? "Delete note" : "Supprimer la note"}
                            >
                              ✕
                            </button>
                          </div>
                          <p>{note.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activeSideTab === "transcript" && (
                <div className="coursera-drawer-pane">
                  <div className="coursera-drawer-head">
                    <h3>{isEn ? "Interactive Transcript" : "Transcription"}</h3>
                    <div className="coursera-drawer-head__actions">
                      <button
                        type="button"
                        className="coursera-drawer-close"
                        onClick={() => setSideOpen(false)}
                        aria-label={isEn ? "Close panel" : "Fermer le panneau"}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <ol className="coursera-transcript-list">
                    {chapters.map((chapter, idx) => {
                      const caps = chapter.captions?.length
                        ? chapter.captions
                        : [{ startRatio: 0, endRatio: 1, text: chapter.narration }];
                      return (
                        <li
                          key={chapter.id}
                          className={`coursera-transcript-chap ${idx === chapterIndex ? "is-current" : ""}`}
                        >
                          <button
                            type="button"
                            className="coursera-transcript-chap__head"
                            onClick={() => selectChapter(idx, true, 0)}
                          >
                            <span>{chapter.badge}</span>
                            <strong>{chapter.title}</strong>
                            <small>{formatVoiceTime(chapter.durationSeconds)}</small>
                          </button>
                          <div className="coursera-transcript-sentences">
                            {caps.map((cap, capIdx) => {
                              const isSpeakingNow =
                                idx === chapterIndex && capIdx === safeCaptionIndex;
                              return (
                                <button
                                  key={capIdx}
                                  type="button"
                                  className={`coursera-transcript-line ${isSpeakingNow ? "is-speaking" : ""}`}
                                  onClick={() => selectChapter(idx, true, capIdx)}
                                >
                                  <span className="coursera-transcript-line__idx">
                                    {capIdx + 1}.
                                  </span>
                                  <span>{cap.text}</span>
                                </button>
                              );
                            })}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {activeSideTab === "files" && (
                <div className="coursera-drawer-pane">
                  <div className="coursera-drawer-head">
                    <h3>{isEn ? "Visuals & Files" : "Fichiers & Schémas"}</h3>
                    <div className="coursera-drawer-head__actions">
                      <button
                        type="button"
                        className="coursera-drawer-close"
                        onClick={() => setSideOpen(false)}
                        aria-label={isEn ? "Close panel" : "Fermer le panneau"}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="coursera-files-list">
                    {(videoSpec.visualSlides ?? []).map((slide, idx) => (
                      <button
                        key={`${slide.id}-${idx}`}
                        type="button"
                        className="coursera-file-card"
                        onClick={() => {
                          setManualSlideIndex(idx % Math.max(1, chapterSlides.length));
                        }}
                      >
                        <img src={slide.src} alt={slide.alt} loading="lazy" />
                        <div>
                          <span>{slide.badge}</span>
                          <strong>{slide.title}</strong>
                          <small>{slide.caption}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Far-Right Vertical 3-Tab Icon Rail (Transcription / Notes Personnelles / Fichiers) */}
          <div className="coursera-rail" role="tablist" aria-label={isEn ? "Sidebar tabs" : "Onglets latéraux"}>
            <button
              type="button"
              role="tab"
              aria-selected={sideOpen && activeSideTab === "transcript"}
              className={`coursera-rail-btn ${sideOpen && activeSideTab === "transcript" ? "is-active" : ""}`}
              onClick={() => {
                if (sideOpen && activeSideTab === "transcript") {
                  setSideOpen(false);
                } else {
                  setActiveSideTab("transcript");
                  setSideOpen(true);
                }
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <line x1="7" y1="11" x2="17" y2="11" />
                <line x1="7" y1="15" x2="13" y2="15" />
              </svg>
              <span>{isEn ? "Transcript" : "Transcription"}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={sideOpen && activeSideTab === "notes"}
              className={`coursera-rail-btn ${sideOpen && activeSideTab === "notes" ? "is-active" : ""}`}
              onClick={() => {
                if (sideOpen && activeSideTab === "notes") {
                  setSideOpen(false);
                } else {
                  setActiveSideTab("notes");
                  setSideOpen(true);
                }
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>{isEn ? "Personal Notes" : "Notes Personnelles"}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={sideOpen && activeSideTab === "files"}
              className={`coursera-rail-btn ${sideOpen && activeSideTab === "files" ? "is-active" : ""}`}
              onClick={() => {
                if (sideOpen && activeSideTab === "files") {
                  setSideOpen(false);
                } else {
                  setActiveSideTab("files");
                  setSideOpen(true);
                }
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{isEn ? "Files" : "Fichiers"}</span>
            </button>
          </div>
        </aside>
      </div>
    </figure>
  );
}

