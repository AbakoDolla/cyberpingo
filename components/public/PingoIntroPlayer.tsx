"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import intro from "@/data/pingo-intro.json";
import { useMascotPrefs } from "@/components/mascot/useMascotPrefs";
import { IconPause, IconPlay } from "@/components/ui/Icon";
import { isSyntheticVoice } from "@/lib/mascot/voice";

const BARS = [38, 62, 46, 78, 54, 92, 66, 48, 84, 58, 72, 40, 88, 52, 68, 44, 80, 56, 70, 36, 60, 50, 74, 42];

export default function PingoIntroPlayer() {
  const audio = useRef<HTMLAudioElement>(null);
  const [prefs] = useMascotPrefs();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const manualPauseRef = useRef(false);

  useEffect(() => {
    const element = audio.current;
    if (!element || !prefs.voice || prefs.volume <= 0) return;
    element.volume = prefs.volume;
    let started = false;

    const cleanupUnlock = () => {
      window.removeEventListener("pointerup", unlock, true);
      window.removeEventListener("click", unlock, true);
      window.removeEventListener("touchend", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };

    const unlock = () => {
      if (started || manualPauseRef.current || !audio.current) {
        cleanupUnlock();
        return;
      }
      audio.current.play().then(() => {
        started = true;
        cleanupUnlock();
      }).catch(() => undefined);
    };

    element.play().then(() => {
      started = true;
    }).catch((err: unknown) => {
      if ((err as { name?: string } | null)?.name === "NotAllowedError") {
        window.addEventListener("pointerup", unlock, { capture: true, passive: true });
        window.addEventListener("click", unlock, { capture: true, passive: true });
        window.addEventListener("touchend", unlock, { capture: true, passive: true });
        window.addEventListener("keydown", unlock, { capture: true, passive: true });
      } else {
        setFailed(true);
      }
    });

    return cleanupUnlock;
  }, [prefs.voice, prefs.volume]);

  const toggle = async () => {
    const element = audio.current;
    if (!element) return;
    if (!element.paused) {
      manualPauseRef.current = true;
      element.pause();
      return;
    }
    try {
      manualPauseRef.current = false;
      setFailed(false);
      await element.play();
    } catch {
      setFailed(true);
      setPlaying(false);
    }
  };

  return (
    <section className="intro-player" aria-labelledby="intro-player-title">
      <div className="intro-player__mark" aria-hidden="true">
        <Image src="/images/brand/cyberpingo-mark-square.webp" alt="" width={192} height={192} sizes="112px" />
      </div>
      <div className="intro-player__body">
        <p className="intro-player__kicker">Pingo se présente</p>
        <h2 id="intro-player-title">Écoute la mascotte en 30 secondes</h2>
        <div className="intro-player__controls">
          <button
            type="button"
            className="intro-player__play"
            onClick={toggle}
            aria-pressed={playing}
            aria-label={playing ? "Mettre en pause la présentation de Pingo" : "Écouter la présentation de Pingo"}
          >
            {playing ? <IconPause size={22} /> : <IconPlay size={22} />}
          </button>
          <div className={`intro-player__wave${playing ? " is-playing" : ""}`} aria-hidden="true">
            {BARS.map((height, index) => (
              <span
                key={index}
                style={{ height: `${height}%`, animationDelay: `${(index % 8) * 90}ms`, opacity: (index + 1) / BARS.length <= progress ? 1 : 0.38 }}
              />
            ))}
          </div>
        </div>
        <audio
          ref={audio}
          src={intro.audio}
          preload="auto"
          autoPlay
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setProgress(0); }}
          onTimeUpdate={(event) => {
            const { currentTime, duration } = event.currentTarget;
            setProgress(duration > 0 ? currentTime / duration : 0);
          }}
          onError={() => { setFailed(true); setPlaying(false); }}
        />
        <p className="intro-player__text">{intro.text}</p>
        {(failed || !isSyntheticVoice(intro.credit)) && (
          <p className="intro-player__credit">
            {failed ? "L’audio n’est pas disponible pour le moment, le texte reste complet. " : ""}
            {isSyntheticVoice(intro.credit) ? "" : `${intro.credit}.`}
          </p>
        )}
      </div>
    </section>
  );
}
