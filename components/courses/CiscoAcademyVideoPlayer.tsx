"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FigureView from "@/components/figures/Figure";
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
import {
  prefetchRealisticVoice,
  speakRealisticVoice,
  stopRealisticVoice,
} from "@/lib/mascot/sound-effects";

export interface CiscoAcademyVideoPlayerProps {
  mode?: "lesson" | "lab";
  lessonInput?: LessonVideoInput;
  labInput?: LabVideoInput;
  spec?: AcademyVideoSpec;
  className?: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

export default function CiscoAcademyVideoPlayer({
  mode = "lesson",
  lessonInput,
  labInput,
  spec: explicitSpec,
  className = "",
}: CiscoAcademyVideoPlayerProps) {
  const { lang } = useTranslation();
  const isEn = lang === "en";

  const videoSpec = useMemo<AcademyVideoSpec>(() => {
    if (explicitSpec) return explicitSpec;
    if (mode === "lab" && labInput) {
      return buildLabVideoSpec(labInput, isEn ? "en" : "fr");
    }
    return buildLessonVideoSpec(
      lessonInput ?? { videoTitle: isEn ? "Course Technical Capsule" : "Capsule vidéo du cours" },
      isEn ? "en" : "fr"
    );
  }, [explicitSpec, mode, labInput, lessonInput, isEn]);

  const containerRef = useRef<HTMLElement | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [chapterElapsed, setChapterElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1); // 1x default
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [manualSlideIndex, setManualSlideIndex] = useState<number | null>(null);

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
    chapterCaptions[safeCaptionIndex] ?? chapterCaptions[0] ?? { startRatio: 0, endRatio: 1, text: "" };
  const activeCaption = activeCaptionItem.text || currentChapter?.narration || "";

  const chapterProgress = Math.min(1, Math.max(0, chapterElapsed / chapterDuration));

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
    return Math.min(
      chapterSlides.length - 1,
      Math.floor(chapterProgress * chapterSlides.length)
    );
  }, [chapterSlides.length, manualSlideIndex, chapterProgress]);

  const activeSlide: AcademyVideoVisualSlide | undefined =
    chapterSlides[activeSlideIndex] ?? chapterSlides[0];

  const spokenKeyRef = useRef<string | null>(null);

  const elapsedBeforeCurrent = useMemo(
    () => chapters.slice(0, chapterIndex).reduce((sum, ch) => sum + ch.durationSeconds, 0),
    [chapters, chapterIndex]
  );
  const totalElapsed = Math.min(
    videoSpec.totalDurationSeconds,
    elapsedBeforeCurrent + chapterElapsed
  );

  const stopAudio = useCallback(() => {
    stopRealisticVoice();
    setVoiceActive(false);
  }, []);

  // Reset manual slide selection when switching chapters and prefetch first sentences
  useEffect(() => {
    setManualSlideIndex(null);
    const voiceLang = isEn ? "en" : "fr";
    const firstCaption = chapterCaptions[0]?.text;
    const secondCaption = chapterCaptions[1]?.text;
    if (firstCaption) {
      prefetchRealisticVoice(firstCaption, {
        expression: "explanation",
        lang: voiceLang,
        lineId: `netacad-${videoSpec.id}-${currentChapter?.id}-0`,
      });
    }
    if (secondCaption) {
      prefetchRealisticVoice(secondCaption, {
        expression: "explanation",
        lang: voiceLang,
        lineId: `netacad-${videoSpec.id}-${currentChapter?.id}-1`,
      });
    }
  }, [chapterIndex, chapterCaptions, currentChapter?.id, isEn, videoSpec.id]);

  // Synchronized sentence-by-sentence voice narration matching the exact active subtitle
  useEffect(() => {
    if (!isPlaying || muted || !currentChapter || !activeCaption) {
      if (muted || !isPlaying) {
        stopAudio();
      }
      return;
    }

    const voiceLang = isEn ? "en" : "fr";
    const key = `${videoSpec.id}::${currentChapter.id}::${safeCaptionIndex}::${playbackRate}::${voiceLang}`;
    if (spokenKeyRef.current === key) return;
    spokenKeyRef.current = key;

    // Prefetch next sentence(s) for zero-latency transition between subtitles
    const nextInChapter = chapterCaptions[safeCaptionIndex + 1]?.text;
    const afterNextInChapter = chapterCaptions[safeCaptionIndex + 2]?.text;
    const nextChapterFirst = chapters[chapterIndex + 1]?.captions?.[0]?.text;

    if (nextInChapter) {
      prefetchRealisticVoice(nextInChapter, {
        expression: "explanation",
        lang: voiceLang,
        lineId: `netacad-${videoSpec.id}-${currentChapter.id}-${safeCaptionIndex + 1}`,
      });
    }
    if (afterNextInChapter) {
      prefetchRealisticVoice(afterNextInChapter, {
        expression: "explanation",
        lang: voiceLang,
        lineId: `netacad-${videoSpec.id}-${currentChapter.id}-${safeCaptionIndex + 2}`,
      });
    } else if (nextChapterFirst && chapters[chapterIndex + 1]) {
      prefetchRealisticVoice(nextChapterFirst, {
        expression: "explanation",
        lang: voiceLang,
        lineId: `netacad-${videoSpec.id}-${chapters[chapterIndex + 1].id}-0`,
      });
    }

    speakRealisticVoice(activeCaption, {
      expression: "explanation",
      volume: 0.95,
      playbackRate,
      lang: voiceLang,
      strictTextMatch: true,
      lineId: `netacad-${videoSpec.id}-${currentChapter.id}-${safeCaptionIndex}`,
      onStart: () => {
        setVoiceActive(true);
      },
      onEnd: () => {
        setVoiceActive(false);
        spokenKeyRef.current = null;
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
          setChapterElapsed(chapterDuration);
        }
      },
    });
  }, [
    isPlaying,
    muted,
    currentChapter,
    activeCaption,
    safeCaptionIndex,
    chapterCaptions,
    chapterDuration,
    chapterIndex,
    chapters,
    videoSpec.id,
    playbackRate,
    isEn,
    stopAudio,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRealisticVoice();
    };
  }, []);

  // Fullscreen state listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Smooth timeline interpolation synchronized with the active subtitle sentence
  useEffect(() => {
    if (!isPlaying) return undefined;

    const tickMs = 100;
    const timer = window.setInterval(() => {
      if (!muted) {
        // When voice is active, keep progress inside the current spoken sentence's window
        // so the subtitle and voice stay 100% locked together until onEnd advances to the next sentence
        const segStart = activeCaptionItem.startRatio * chapterDuration;
        const segEnd = activeCaptionItem.endRatio * chapterDuration;
        const segWindow = Math.max(1.5, segEnd - segStart);
        const estimatedSentenceSec = Math.max(
          2.2,
          Math.min(18, activeCaption.length / (14.5 * playbackRate))
        );
        const step = (segWindow / estimatedSentenceSec) * (tickMs / 1000);

        setChapterElapsed((prev) => {
          const base = Math.max(segStart, prev);
          return Math.min(segEnd - 0.04, base + step);
        });
        return;
      }

      // Muted mode: advance timer and caption index at reading speed
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
          spokenKeyRef.current = null;
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
      stopAudio();
      return;
    }
    setHasStarted(true);
    // If at the very end, restart from chapter 0, sentence 0
    if (
      chapterIndex === chapters.length - 1 &&
      safeCaptionIndex >= chapterCaptions.length - 1 &&
      chapterElapsed >= chapterDuration - 0.5
    ) {
      setChapterIndex(0);
      setCaptionIndex(0);
      setChapterElapsed(0);
    }
    spokenKeyRef.current = null;
    setIsPlaying(true);
  };

  const selectChapter = (index: number, autoPlay = isPlaying, startCaptionIdx = 0) => {
    const clamped = Math.max(0, Math.min(chapters.length - 1, index));
    const targetChapter = chapters[clamped] ?? chapters[0];
    const targetCaptions = targetChapter?.captions ?? [];
    const clampedCapIdx = Math.max(0, Math.min(Math.max(0, targetCaptions.length - 1), startCaptionIdx));
    const startRatio = targetCaptions[clampedCapIdx]?.startRatio ?? 0;
    const targetDuration = Math.max(8, targetChapter?.durationSeconds ?? 24);

    stopAudio();
    spokenKeyRef.current = null;
    setChapterIndex(clamped);
    setCaptionIndex(clampedCapIdx);
    setChapterElapsed(startRatio * targetDuration);
    setHasStarted(true);
    setIsPlaying(autoPlay);
  };

  const handleSeekInChapter = (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    const matchedIdx = chapterCaptions.findIndex(
      (cap) => clamped >= cap.startRatio && clamped <= cap.endRatio + 0.01
    );
    const nextCapIdx = matchedIdx !== -1 ? matchedIdx : chapterCaptions.length - 1;
    stopAudio();
    spokenKeyRef.current = null;
    setCaptionIndex(Math.max(0, nextCapIdx));
    setChapterElapsed(clamped * chapterDuration);
    setHasStarted(true);
  };

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      if (next) {
        stopAudio();
      } else {
        spokenKeyRef.current = null;
      }
      return next;
    });
  };

  const cycleSpeed = () => {
    setSpeedIndex((prev) => (prev + 1) % SPEEDS.length);
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

  const activeNodeIndex = useMemo(() => {
    const count = currentChapter?.nodes?.length ?? 5;
    return Math.min(count - 1, Math.floor(chapterProgress * count));
  }, [currentChapter?.nodes?.length, chapterProgress]);

  const activeBulletIndex = useMemo(() => {
    const count = Math.max(1, currentChapter?.bullets?.length ?? 1);
    return Math.min(count - 1, Math.floor(chapterProgress * count));
  }, [currentChapter?.bullets?.length, chapterProgress]);

  const visibleTerminalStepCount = useMemo(() => {
    const total = currentChapter?.terminalSteps?.length ?? 1;
    if (!hasStarted && !isPlaying) return total;
    return Math.max(1, Math.min(total, Math.ceil((chapterProgress + 0.18) * total)));
  }, [currentChapter?.terminalSteps?.length, chapterProgress, hasStarted, isPlaying]);

  const renderVisualShowcase = (compact = false) => {
    if (!activeSlide) return null;
    return (
      <div className={`netacad-visual-showcase ${compact ? "netacad-visual-showcase--compact" : ""}`}>
        <div className="netacad-visual-showcase__frame" data-playing={isPlaying ? "true" : "false"}>
          <img
            key={activeSlide.src}
            src={activeSlide.src}
            alt={activeSlide.alt}
            className={`netacad-visual-showcase__img ${activeSlide.kind === "topology" ? "is-diagram" : ""}`}
            loading="eager"
          />
          <div className="netacad-visual-showcase__overlay">
            <div className="netacad-visual-showcase__top">
              <span className="netacad-visual-showcase__badge">{activeSlide.badge}</span>
              {activeSlide.credit && (
                <span className="netacad-visual-showcase__credit">{activeSlide.credit}</span>
              )}
            </div>
            <div className="netacad-visual-showcase__caption">
              <strong>{activeSlide.title}</strong>
              <p>{activeSlide.caption}</p>
              {!compact && (activeSlide.risk || activeSlide.habit) && (
                <div className="netacad-visual-showcase__chips">
                  {activeSlide.risk && (
                    <span className="netacad-visual-chip netacad-visual-chip--risk">
                      <b>{isEn ? "Risk:" : "Risque :"}</b> {activeSlide.risk}
                    </span>
                  )}
                  {activeSlide.habit && (
                    <span className="netacad-visual-chip netacad-visual-chip--habit">
                      <b>{isEn ? "Reflex:" : "Bon réflexe :"}</b> {activeSlide.habit}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {chapterSlides.length > 1 && (
          <div
            className="netacad-slide-strip"
            role="tablist"
            aria-label={isEn ? "Chapter illustrative visuals" : "Illustrations réelles du chapitre"}
          >
            {chapterSlides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={idx === activeSlideIndex}
                className={`netacad-slide-thumb ${idx === activeSlideIndex ? "is-active" : ""}`}
                onClick={() => setManualSlideIndex(idx)}
                title={slide.title}
              >
                <img src={slide.src} alt="" loading="lazy" />
                <span>{slide.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <figure
      ref={containerRef}
      className={`lesson-media netacad-player ${isFullscreen ? "is-fullscreen" : ""} ${className}`.trim()}
      aria-label={`${isEn ? "Interactive course video" : "Capsule vidéo interactive"} : ${videoSpec.title}`}
    >
      {/* Top Header Banner */}
      <header className="netacad-player__header">
        <div className="netacad-player__brand">
          <span className="netacad-player__pill">
            <span className="netacad-player__dot" data-playing={isPlaying ? "true" : "false"} />
            {mode === "lab"
              ? isEn
                ? "NETACAD LAB BRIEFING"
                : "BRIEFING VIDÉO LAB"
              : isEn
                ? "NETACAD INTERACTIVE VIDEO"
                : "CAPSULE VIDÉO COURS"}
          </span>
          <span className="netacad-player__series">{videoSpec.seriesLabel}</span>
        </div>
        <div className="netacad-player__meta">
          <span>
            {chapters.length} {isEn ? "chapters" : "chapitres"}
          </span>
          <span>·</span>
          <span>
            {(videoSpec.visualSlides ?? []).length} {isEn ? "real visuals" : "photos & schémas"}
          </span>
          <span>·</span>
          <span>{formatVoiceTime(videoSpec.totalDurationSeconds)}</span>
        </div>
      </header>

      {/* 16:9 Stage Canvas */}
      <div className="netacad-player__stage">
        {/* Stage HUD */}
        <div className="netacad-player__hud">
          <div className="netacad-player__chapter-tag">
            <strong>{currentChapter.badge}</strong>
            <span>{currentChapter.title}</span>
          </div>
          <div className="netacad-player__voice-indicator" data-active={voiceActive ? "true" : "false"}>
            <img
              src="/images/mascot/professeur-pingo-face.png"
              alt="Professeur Pingo"
              className="netacad-player__voice-avatar"
            />
            <span className="netacad-player__wave" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <small>
              {muted
                ? isEn
                  ? "Audio muted"
                  : "Son coupé"
                : voiceActive
                  ? isEn
                    ? "ElevenLabs CyberPingo active"
                    : "Voix ElevenLabs CyberPingo active"
                  : isEn
                    ? "ElevenLabs CyberPingo ready"
                    : "Voix ElevenLabs CyberPingo"}
            </small>
          </div>
        </div>

        {/* Dynamic Scene Body */}
        <div className="netacad-player__scene" data-kind={currentChapter.kind}>
          {/* SCENE 1: BRIEFING & SCENARIO + REAL PHOTOGRAPH SHOWCASE */}
          {currentChapter.kind === "briefing" && (
            <div className="netacad-scene netacad-scene--briefing">
              <div className="netacad-scene__card netacad-scene__card--primary">
                <span className="netacad-scene__eyebrow">{currentChapter.highlightTitle}</span>
                <h3>{videoSpec.title}</h3>
                <p>{currentChapter.highlightBody}</p>

                <span className="netacad-scene__eyebrow">
                  {mode === "lab"
                    ? isEn
                      ? "Mission Parameters"
                      : "Paramètres de la mission"
                    : isEn
                      ? "Learning Objectives"
                      : "Objectifs d’apprentissage"}
                </span>
                <ul className="netacad-checklist netacad-checklist--compact">
                  {currentChapter.bullets.map((bullet, idx) => (
                    <li
                      key={idx}
                      className={idx <= activeBulletIndex ? "is-highlighted" : ""}
                    >
                      <span className="netacad-checklist__index">{idx + 1}</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {renderVisualShowcase(false)}
            </div>
          )}

          {/* SCENE 2 & 3: ARCHITECTURE DIAGRAM / MECHANISM + REAL HARDWARE PHOTOGRAPHS */}
          {(currentChapter.kind === "diagram" || currentChapter.kind === "mechanism") && (
            <div className="netacad-scene netacad-scene--diagram">
              <div className="netacad-scene__visual">
                {currentChapter.figure ? (
                  <div className="netacad-figure-frame">
                    <FigureView figure={currentChapter.figure} />
                  </div>
                ) : (
                  <div className="netacad-animated-flow">
                    <div className="netacad-animated-flow__head">
                      <span>{currentChapter.highlightTitle || videoSpec.domainLabel}</span>
                      <small>
                        {currentChapter.flowLabels?.[activeNodeIndex] ??
                          (isEn ? "Live packet & control inspection" : "Inspection des flux en temps réel")}
                      </small>
                    </div>
                    <div className="netacad-animated-flow__nodes">
                      {(currentChapter.nodes ?? []).map((node, idx) => {
                        const isCurrent = idx === activeNodeIndex;
                        const isDone = idx < activeNodeIndex;
                        return (
                          <div key={node.id} className="netacad-animated-flow__segment">
                            <div
                              className={`netacad-flow-box tone-${node.tone} ${isCurrent ? "is-current" : isDone ? "is-done" : ""}`}
                            >
                              <span className="netacad-flow-box__badge">0{idx + 1}</span>
                              <strong>{node.label}</strong>
                              <small>{node.sub}</small>
                            </div>
                            {idx < (currentChapter.nodes?.length ?? 0) - 1 && (
                              <div
                                className={`netacad-flow-connector ${isDone || isCurrent ? "is-flowing" : ""}`}
                                aria-hidden="true"
                              >
                                <span className="netacad-flow-connector__line" />
                                <span className="netacad-flow-connector__label">
                                  {currentChapter.flowLabels?.[idx] ?? "→"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentChapter.bullets.length > 0 && (
                  <ul className="netacad-checklist netacad-checklist--inline">
                    {currentChapter.bullets.slice(0, 3).map((bullet, idx) => (
                      <li key={idx} className={idx <= activeBulletIndex ? "is-highlighted" : ""}>
                        <span className="netacad-checklist__index">{idx + 1}</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="netacad-scene__side">
                {renderVisualShowcase(false)}
              </div>
            </div>
          )}

          {/* SCENE 4: LIVE TERMINAL & DIAGNOSTIC WALKTHROUGH + REAL HARDWARE CONTEXT */}
          {currentChapter.kind === "terminal" && (
            <div className="netacad-scene netacad-scene--terminal">
              <div className="netacad-terminal">
                <div className="netacad-terminal__bar">
                  <div className="netacad-terminal__dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <strong>{currentChapter.terminalPrompt || "analyst@cyberpingo:~$"}</strong>
                  <span className="netacad-terminal__tag">CLI · LIVE DEMO</span>
                </div>
                <div className="netacad-terminal__body">
                  {(currentChapter.terminalSteps ?? []).slice(0, visibleTerminalStepCount).map((step, idx) => (
                    <div key={idx} className="netacad-terminal__step">
                      {step.command && (
                        <div className="netacad-terminal__cmd">
                          <span className="netacad-terminal__prompt">$</span>
                          <code>{step.command}</code>
                        </div>
                      )}
                      {step.output && (
                        <pre className="netacad-terminal__out">
                          <code>{step.output}</code>
                        </pre>
                      )}
                      {step.note && (
                        <p className="netacad-terminal__note">
                          <span>↳</span> {step.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="netacad-scene__side">
                {renderVisualShowcase(true)}
                <div className="netacad-scene__card netacad-scene__card--case">
                  <span className="netacad-scene__eyebrow">{currentChapter.highlightTitle}</span>
                  <p>{currentChapter.highlightBody}</p>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 5: PITFALLS & SECURITY + REAL HARDWARE RISK PHOTO */}
          {currentChapter.kind === "pitfalls" && (
            <div className="netacad-scene netacad-scene--pitfalls">
              <div className="netacad-scene__pitfalls-stack">
                <div className="netacad-scene__card netacad-scene__card--warn">
                  <span className="netacad-scene__eyebrow">
                    {mode === "lab"
                      ? isEn
                        ? "Operational Constraints"
                        : "Contraintes & Cadre"
                      : isEn
                        ? "Common Mistakes to Avoid"
                        : "Erreurs fréquentes à éviter"}
                  </span>
                  <ul className="netacad-checklist netacad-checklist--compact">
                    {(currentChapter.pitfalls ?? currentChapter.bullets).map((item, idx) => (
                      <li key={idx} className="is-highlighted">
                        <span className="netacad-checklist__index netacad-checklist__index--warn">!</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="netacad-scene__card netacad-scene__card--safe">
                  <span className="netacad-scene__eyebrow">
                    {mode === "lab"
                      ? isEn
                        ? "Analyst Investigation Hints"
                        : "Conseils & Pistes d’analyste"
                      : isEn
                        ? "Security & Best Practices"
                        : "Réflexes de sécurité"}
                  </span>
                  <ul className="netacad-checklist netacad-checklist--compact">
                    {(currentChapter.safeguards ?? []).map((item, idx) => (
                      <li key={idx} className="is-highlighted">
                        <span className="netacad-checklist__index netacad-checklist__index--safe">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {renderVisualShowcase(false)}
            </div>
          )}

          {/* SCENE 6: SUMMARY & ACTION PLAN + REAL VISUAL SHOWCASE */}
          {currentChapter.kind === "summary" && (
            <div className="netacad-scene netacad-scene--summary">
              <div className="netacad-scene__card netacad-scene__card--action">
                <span className="netacad-scene__eyebrow">{currentChapter.highlightTitle}</span>
                <h3>
                  {mode === "lab"
                    ? isEn
                      ? "Ready for the Hands-On Investigation"
                      : "À toi de mener l’investigation"
                    : isEn
                      ? "From Theory to Practice"
                      : "Passer de la théorie à la pratique"}
                </h3>
                <p>{currentChapter.highlightBody}</p>
                <ul className="netacad-checklist netacad-checklist--compact">
                  {currentChapter.bullets.map((bullet, idx) => (
                    <li key={idx} className="is-highlighted">
                      <span className="netacad-checklist__index netacad-checklist__index--safe">✓</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="netacad-replay-btn"
                  onClick={() => selectChapter(0, true)}
                >
                  ↻ {isEn ? "Replay Video Capsule" : "Revoir la capsule depuis le début"}
                </button>
              </div>

              {renderVisualShowcase(false)}
            </div>
          )}
        </div>

        {/* Click-to-start Poster Veil with real background photograph when not yet started */}
        {!hasStarted && !isPlaying && (
          <div className="netacad-player__poster">
            {videoSpec.posterImage && (
              <img
                src={videoSpec.posterImage}
                alt=""
                aria-hidden="true"
                className="netacad-player__poster-bg"
              />
            )}
            <div className="netacad-player__poster-card">
              <button
                type="button"
                className="netacad-player__big-play"
                onClick={togglePlay}
                aria-label={isEn ? `Play video: ${videoSpec.title}` : `Lancer la vidéo : ${videoSpec.title}`}
              >
                <span className="netacad-player__big-play-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
                    <path d="M8 5.5v13l10.5-6.5L8 5.5z" />
                  </svg>
                </span>
                <span className="netacad-player__big-play-text">
                  <strong>
                    {mode === "lab"
                      ? isEn
                        ? "Watch Lab Briefing & Methodology"
                        : "Lancer la démonstration vidéo du lab"
                      : isEn
                        ? "Watch Interactive Course Video"
                        : "Lancer la capsule vidéo du cours"}
                  </strong>
                  <small>
                    {videoSpec.title} · {chapters.length} {isEn ? "animated chapters" : "chapitres animés"} ({formatVoiceTime(videoSpec.totalDurationSeconds)})
                  </small>
                </span>
              </button>

              {(videoSpec.visualSlides ?? []).length > 0 && (
                <div className="netacad-player__poster-thumbs" aria-hidden="true">
                  {videoSpec.visualSlides.slice(0, 4).map((slide) => (
                    <div key={slide.id} className="netacad-player__poster-thumb">
                      <img src={slide.src} alt="" loading="lazy" />
                      <span>{slide.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Closed Captions (CC) Subtitle Bar synchronized with spoken sentence */}
        {showCaptions && activeCaption && (
          <div
            className="netacad-player__captions"
            data-speaking={voiceActive ? "true" : "false"}
            aria-live="polite"
          >
            <small className="netacad-player__captions-idx" aria-hidden="true">
              {voiceActive ? "🔊" : "CC"} {safeCaptionIndex + 1}/{chapterCaptions.length}
            </small>
            <span>{activeCaption}</span>
          </div>
        )}
      </div>

      {/* Segmented Chapter Timeline Scrubber */}
      <div
        className="netacad-player__timeline"
        role="group"
        aria-label={isEn ? "Video chapters timeline" : "Chronologie des chapitres de la vidéo"}
      >
        {chapters.map((chapter, idx) => {
          const fillPct =
            idx < chapterIndex ? 100 : idx === chapterIndex ? Math.round(chapterProgress * 100) : 0;
          return (
            <button
              key={chapter.id}
              type="button"
              className={`netacad-timeline-seg ${idx === chapterIndex ? "is-current" : idx < chapterIndex ? "is-done" : ""}`}
              style={{ flexGrow: chapter.durationSeconds }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickRatio = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
                if (idx === chapterIndex) {
                  handleSeekInChapter(clickRatio);
                } else {
                  selectChapter(idx, true);
                }
              }}
              title={`${chapter.badge} — ${chapter.title}`}
              aria-label={`${chapter.badge} : ${chapter.title}`}
            >
              <span
                className="netacad-timeline-seg__fill"
                style={{ transform: `scaleX(${fillPct / 100})` }}
              />
            </button>
          );
        })}
      </div>

      {/* Transport Controls Bar */}
      <div className="netacad-player__controls">
        <div className="netacad-player__controls-left">
          <button
            type="button"
            className="netacad-ctrl-btn netacad-ctrl-btn--primary"
            onClick={togglePlay}
            aria-label={isPlaying ? (isEn ? "Pause" : "Mettre en pause") : (isEn ? "Play" : "Lire la vidéo")}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M7 5.5v13l11-6.5L7 5.5z" />
              </svg>
            )}
            <span>{isPlaying ? (isEn ? "Pause" : "Pause") : (isEn ? "Play" : "Lecture")}</span>
          </button>

          <button
            type="button"
            className="netacad-ctrl-btn"
            onClick={() => selectChapter(chapterIndex - 1)}
            disabled={chapterIndex === 0}
            aria-label={isEn ? "Previous chapter" : "Chapitre précédent"}
            title={isEn ? "Previous chapter" : "Chapitre précédent"}
          >
            ⏮
          </button>

          <button
            type="button"
            className="netacad-ctrl-btn"
            onClick={() => selectChapter(chapterIndex + 1)}
            disabled={chapterIndex >= chapters.length - 1}
            aria-label={isEn ? "Next chapter" : "Chapitre suivant"}
            title={isEn ? "Next chapter" : "Chapitre suivant"}
          >
            ⏭
          </button>

          <span className="netacad-player__time">
            {formatVoiceTime(totalElapsed)} / {formatVoiceTime(videoSpec.totalDurationSeconds)}
          </span>
        </div>

        <div className="netacad-player__controls-right">
          <button
            type="button"
            className="netacad-ctrl-btn"
            onClick={toggleMute}
            aria-pressed={!muted}
            title={muted ? (isEn ? "Unmute narration" : "Activer la voix") : (isEn ? "Mute narration" : "Couper la voix")}
          >
            {muted ? "🔇" : "🔊"} <span>{muted ? (isEn ? "Muted" : "Muet") : "Voix"}</span>
          </button>

          <button
            type="button"
            className="netacad-ctrl-btn"
            onClick={cycleSpeed}
            title={isEn ? "Playback speed" : "Vitesse de lecture"}
          >
            {playbackRate}×
          </button>

          <button
            type="button"
            className={`netacad-ctrl-btn ${showCaptions ? "is-active" : ""}`}
            onClick={() => setShowCaptions((v) => !v)}
            aria-pressed={showCaptions}
            title={isEn ? "Toggle subtitles (CC)" : "Afficher ou masquer les sous-titres (CC)"}
          >
            CC
          </button>

          <button
            type="button"
            className={`netacad-ctrl-btn ${showTranscript ? "is-active" : ""}`}
            onClick={() => setShowTranscript((v) => !v)}
            aria-expanded={showTranscript}
          >
            {isEn ? "Transcript" : "Transcription"}
          </button>

          <button
            type="button"
            className="netacad-ctrl-btn"
            onClick={() => void toggleFullscreen()}
            title={isEn ? "Fullscreen" : "Plein écran"}
            aria-label={isEn ? "Fullscreen" : "Plein écran"}
          >
            ⛶
          </button>
        </div>
      </div>

      {/* Chapter Navigation Pills */}
      <nav
        className="netacad-player__chapters"
        aria-label={isEn ? "Chapters navigation" : "Navigation par chapitre"}
      >
        {chapters.map((chapter, idx) => (
          <button
            key={chapter.id}
            type="button"
            className={`netacad-chapter-pill ${idx === chapterIndex ? "is-active" : idx < chapterIndex ? "is-done" : ""}`}
            onClick={() => selectChapter(idx, true)}
          >
            <span className="netacad-chapter-pill__num">0{idx + 1}</span>
            <span className="netacad-chapter-pill__title">{chapter.title}</span>
          </button>
        ))}
      </nav>

      {/* Expandable Synchronized Transcript Drawer */}
      {showTranscript && (
        <div className="netacad-player__transcript" aria-label={isEn ? "Video transcript" : "Transcription complète de la vidéo"}>
          <div className="netacad-player__transcript-head">
            <strong>{isEn ? "Full Chapter Transcript & Study Notes" : "Transcription complète & Plan de la capsule"}</strong>
            <small>{videoSpec.title}</small>
          </div>
          <ol className="netacad-player__transcript-list">
            {chapters.map((chapter, idx) => {
              const caps = chapter.captions?.length
                ? chapter.captions
                : [{ startRatio: 0, endRatio: 1, text: chapter.narration }];
              return (
                <li
                  key={chapter.id}
                  className={idx === chapterIndex ? "is-current" : ""}
                >
                  <button type="button" onClick={() => selectChapter(idx, true, 0)}>
                    <span>{chapter.badge}</span>
                    <strong>{chapter.title}</strong>
                    <small>{formatVoiceTime(chapter.durationSeconds)}</small>
                  </button>
                  <p className="netacad-player__transcript-sentences">
                    {caps.map((cap, capIdx) => {
                      const isActiveSentence =
                        idx === chapterIndex && capIdx === safeCaptionIndex;
                      return (
                        <span
                          key={capIdx}
                          role="button"
                          tabIndex={0}
                          className={`netacad-transcript-sentence ${isActiveSentence ? "is-speaking" : ""}`}
                          onClick={() => selectChapter(idx, true, capIdx)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              selectChapter(idx, true, capIdx);
                            }
                          }}
                        >
                          {cap.text}{" "}
                        </span>
                      );
                    })}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </figure>
  );
}
