"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FigureView from "@/components/figures/Figure";
import { useTranslation } from "@/lib/i18n";
import {
  buildLabVideoSpec,
  buildLessonVideoSpec,
  type AcademyVideoChapter,
  type AcademyVideoSpec,
  type LabVideoInput,
  type LessonVideoInput,
} from "@/lib/academy-video";
import { formatVoiceTime } from "@/lib/mascot/voice";
import { speakRealisticVoice, stopRealisticVoice } from "@/lib/mascot/sound-effects";

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
  const [chapterElapsed, setChapterElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1); // 1x default
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);

  const playbackRate = SPEEDS[speedIndex] ?? 1;
  const chapters = videoSpec.chapters;
  const currentChapter: AcademyVideoChapter = chapters[chapterIndex] ?? chapters[0];
  const chapterDuration = Math.max(8, currentChapter?.durationSeconds ?? 24);
  const chapterProgress = Math.min(1, Math.max(0, chapterElapsed / chapterDuration));

  const spokenKeyRef = useRef<string | null>(null);
  const voiceDoneRef = useRef<boolean>(false);

  const elapsedBeforeCurrent = useMemo(
    () => chapters.slice(0, chapterIndex).reduce((sum, ch) => sum + ch.durationSeconds, 0),
    [chapters, chapterIndex]
  );
  const totalElapsed = Math.min(
    videoSpec.totalDurationSeconds,
    elapsedBeforeCurrent + chapterElapsed
  );

  const activeCaption = useMemo(() => {
    if (!currentChapter?.captions?.length) return currentChapter?.narration ?? "";
    const match = currentChapter.captions.find(
      (cap) => chapterProgress >= cap.startRatio && chapterProgress <= cap.endRatio + 0.02
    );
    return match?.text ?? currentChapter.captions[currentChapter.captions.length - 1]?.text ?? "";
  }, [currentChapter, chapterProgress]);

  const stopAudio = useCallback(() => {
    stopRealisticVoice();
    setVoiceActive(false);
  }, []);

  // Trigger CyberPingo ElevenLabs / Web Speech narration when a chapter plays
  useEffect(() => {
    if (!isPlaying || muted || !currentChapter) {
      if (muted || !isPlaying) {
        stopAudio();
      }
      return;
    }

    const key = `${videoSpec.id}::${currentChapter.id}`;
    if (spokenKeyRef.current === key) return;
    spokenKeyRef.current = key;
    voiceDoneRef.current = false;

    speakRealisticVoice(currentChapter.narration, {
      expression: "explanation",
      volume: 0.9,
      lineId: `netacad-${videoSpec.id}-${currentChapter.id}`,
      onStart: () => {
        setVoiceActive(true);
      },
      onEnd: () => {
        setVoiceActive(false);
        voiceDoneRef.current = true;
      },
    });
  }, [isPlaying, muted, currentChapter, videoSpec.id, stopAudio]);

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

  // Main playback timer loop
  useEffect(() => {
    if (!isPlaying) return undefined;

    const tickMs = 100;
    const timer = window.setInterval(() => {
      setChapterElapsed((prev) => {
        const next = prev + (tickMs / 1000) * playbackRate;
        if (next < chapterDuration) {
          return next;
        }
        // Advance to next chapter or finish video
        if (chapterIndex < chapters.length - 1) {
          spokenKeyRef.current = null;
          setChapterIndex((idx) => Math.min(chapters.length - 1, idx + 1));
          return 0;
        }
        // End of final chapter
        setIsPlaying(false);
        setVoiceActive(false);
        return chapterDuration;
      });
    }, tickMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, playbackRate, chapterDuration, chapterIndex, chapters.length]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopAudio();
      return;
    }
    setHasStarted(true);
    // If at the very end, restart from chapter 0
    if (chapterIndex === chapters.length - 1 && chapterElapsed >= chapterDuration - 0.5) {
      setChapterIndex(0);
      setChapterElapsed(0);
    }
    spokenKeyRef.current = null;
    setIsPlaying(true);
  };

  const selectChapter = (index: number, autoPlay = isPlaying) => {
    const clamped = Math.max(0, Math.min(chapters.length - 1, index));
    stopAudio();
    spokenKeyRef.current = null;
    setChapterIndex(clamped);
    setChapterElapsed(0);
    setHasStarted(true);
    setIsPlaying(autoPlay);
  };

  const handleSeekInChapter = (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
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
                    ? "Pingo Voice active"
                    : "Voix CyberPingo active"
                  : isEn
                    ? "CyberPingo Voice ready"
                    : "Voix CyberPingo prête"}
            </small>
          </div>
        </div>

        {/* Dynamic Scene Body */}
        <div className="netacad-player__scene" data-kind={currentChapter.kind}>
          {/* SCENE 1: BRIEFING & SCENARIO */}
          {currentChapter.kind === "briefing" && (
            <div className="netacad-scene netacad-scene--briefing">
              <div className="netacad-scene__card netacad-scene__card--primary">
                <span className="netacad-scene__eyebrow">{currentChapter.highlightTitle}</span>
                <h3>{videoSpec.title}</h3>
                <p>{currentChapter.highlightBody}</p>

                {currentChapter.nodes && currentChapter.nodes.length > 0 && (
                  <div className="netacad-topology-strip" aria-label={isEn ? "Architecture flow" : "Chaîne d’architecture"}>
                    {currentChapter.nodes.map((node, idx) => (
                      <div
                        key={node.id}
                        className={`netacad-topology-node tone-${node.tone} ${idx === activeNodeIndex ? "is-active" : idx < activeNodeIndex ? "is-passed" : ""}`}
                      >
                        <span className="netacad-topology-node__step">{idx + 1}</span>
                        <div>
                          <strong>{node.label}</strong>
                          <small>{node.sub}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="netacad-scene__card netacad-scene__card--list">
                <span className="netacad-scene__eyebrow">
                  {mode === "lab"
                    ? isEn
                      ? "Mission Parameters"
                      : "Paramètres de la mission"
                    : isEn
                      ? "Learning Objectives"
                      : "Objectifs d’apprentissage"}
                </span>
                <ul className="netacad-checklist">
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
            </div>
          )}

          {/* SCENE 2 & 3: ARCHITECTURE DIAGRAM / MECHANISM */}
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
              </div>

              <div className="netacad-scene__side">
                <span className="netacad-scene__eyebrow">
                  {isEn ? "Key Technical Points" : "Points clés à observer"}
                </span>
                <ul className="netacad-checklist netacad-checklist--compact">
                  {currentChapter.bullets.map((bullet, idx) => (
                    <li key={idx} className={idx <= activeBulletIndex ? "is-highlighted" : ""}>
                      <span className="netacad-checklist__index">{idx + 1}</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* SCENE 4: LIVE TERMINAL & DIAGNOSTIC WALKTHROUGH */}
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

              <div className="netacad-scene__card netacad-scene__card--case">
                <span className="netacad-scene__eyebrow">{currentChapter.highlightTitle}</span>
                <p>{currentChapter.highlightBody}</p>
                {currentChapter.bullets.length > 0 && (
                  <ul className="netacad-checklist netacad-checklist--compact">
                    {currentChapter.bullets.map((bullet, idx) => (
                      <li key={idx} className="is-highlighted">
                        <span className="netacad-checklist__index">✓</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* SCENE 5: PITFALLS & SECURITY */}
          {currentChapter.kind === "pitfalls" && (
            <div className="netacad-scene netacad-scene--pitfalls">
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
                <ul className="netacad-checklist">
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
                <ul className="netacad-checklist">
                  {(currentChapter.safeguards ?? []).map((item, idx) => (
                    <li key={idx} className="is-highlighted">
                      <span className="netacad-checklist__index netacad-checklist__index--safe">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {currentChapter.highlightBody && (
                  <p className="netacad-scene__note">{currentChapter.highlightBody}</p>
                )}
              </div>
            </div>
          )}

          {/* SCENE 6: SUMMARY & ACTION PLAN */}
          {currentChapter.kind === "summary" && (
            <div className="netacad-scene netacad-scene--summary">
              <div className="netacad-scene__card netacad-scene__card--list">
                <span className="netacad-scene__eyebrow">
                  {mode === "lab"
                    ? isEn
                      ? "Investigation Steps Overview"
                      : "Étapes de validation du laboratoire"
                    : isEn
                      ? "Essential Takeaways"
                      : "À retenir absolument"}
                </span>
                <ul className="netacad-checklist">
                  {currentChapter.bullets.map((bullet, idx) => (
                    <li key={idx} className="is-highlighted">
                      <span className="netacad-checklist__index netacad-checklist__index--safe">✓</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

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
                <button
                  type="button"
                  className="netacad-replay-btn"
                  onClick={() => selectChapter(0, true)}
                >
                  ↻ {isEn ? "Replay Video Capsule" : "Revoir la capsule depuis le début"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Click-to-start Poster Veil when not yet started */}
        {!hasStarted && !isPlaying && (
          <div className="netacad-player__poster">
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
          </div>
        )}

        {/* Closed Captions (CC) Subtitle Bar */}
        {showCaptions && activeCaption && (
          <div className="netacad-player__captions" aria-live="polite">
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
            {chapters.map((chapter, idx) => (
              <li
                key={chapter.id}
                className={idx === chapterIndex ? "is-current" : ""}
              >
                <button type="button" onClick={() => selectChapter(idx, true)}>
                  <span>{chapter.badge}</span>
                  <strong>{chapter.title}</strong>
                  <small>{formatVoiceTime(chapter.durationSeconds)}</small>
                </button>
                <p>{chapter.narration}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </figure>
  );
}
