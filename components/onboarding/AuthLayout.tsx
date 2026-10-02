"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import Image from "next/image";
import Logo from "@/components/layout/Logo";
import Pingo, { type PingoState } from "@/components/mascot/Pingo";

export type AuthScene = "login" | "register" | "recover" | "reset";

type LineKind = "cmd" | "out" | "ok";
type ScriptLine = { kind: LineKind; text: string };
type Phase = "pending" | "playing" | "done";

const SCRIPTS: Record<AuthScene, ScriptLine[]> = {
  login: [
    { kind: "cmd", text: "ssh pingo@cyberpingo" },
    { kind: "out", text: "handshake --tls 1.3" },
    { kind: "ok", text: "canal chiffré, à toi de jouer" },
  ],
  register: [
    { kind: "cmd", text: "cyberpingo init --agent" },
    { kind: "out", text: "génération du profil…" },
    { kind: "ok", text: "prêt pour ta première mission" },
  ],
  recover: [
    { kind: "cmd", text: "recover --email" },
    { kind: "out", text: "lien signé, valable 1 h" },
    { kind: "ok", text: "boîte mail en approche" },
  ],
  reset: [
    { kind: "cmd", text: "passwd --update" },
    { kind: "out", text: "8+ caractères, lettre + chiffre" },
    { kind: "ok", text: "coffre-fort prêt" },
  ],
};

const PROMPTS: Record<LineKind, string> = { cmd: "$", out: ">", ok: "✓" };
const SEEN_KEY = "cp_auth_scene_seen";
const INTRO_EVENT = "cyberpingo:intro-done";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function isPasswordField(target: EventTarget | null) {
  return target instanceof HTMLInputElement && target.type === "password";
}

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  scene = "login",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  scene?: AuthScene;
}) {
  const script = SCRIPTS[scene];
  const [phase, setPhase] = useState<Phase>("pending");
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState<string[]>([]);
  const [mood, setMood] = useState<PingoState>("idle");
  const cardRef = useRef<HTMLDivElement>(null);
  const passwordFocused = useRef(false);

  const restMood = (): PingoState => (passwordFocused.current ? "shy" : "idle");

  useIsomorphicLayoutEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      seen = false;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduced) {
      setShown(script.map((line) => line.text));
      setReady(true);
      setPhase("done");
    } else {
      setPhase("playing");
    }
  }, [script]);

  useEffect(() => {
    if (phase !== "playing") return;
    let cancelled = false;
    const cleanups: Array<() => void> = [];
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(resolve, ms);
        cleanups.push(() => window.clearTimeout(id));
      });

    const finish = (skipped: boolean) => {
      if (cancelled) return;
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
      setShown(script.map((line) => line.text));
      setReady(true);
      setPhase("done");
      setMood(skipped ? restMood() : "happy");
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* storage blocked: the scene simply plays again next time */
      }
    };

    const skip = () => finish(true);
    window.addEventListener("keydown", skip, { capture: true });
    window.addEventListener("pointerdown", skip, { capture: true });
    cleanups.push(() => {
      window.removeEventListener("keydown", skip, true);
      window.removeEventListener("pointerdown", skip, true);
    });

    const waitForIntro = () =>
      new Promise<void>((resolve) => {
        const frame = window.requestAnimationFrame(() => {
          if (document.documentElement.dataset.intro !== "playing") {
            resolve();
            return;
          }
          const done = () => {
            window.removeEventListener(INTRO_EVENT, done);
            window.clearTimeout(fallback);
            resolve();
          };
          const fallback = window.setTimeout(done, 2600);
          window.addEventListener(INTRO_EVENT, done);
          cleanups.push(() => {
            window.removeEventListener(INTRO_EVENT, done);
            window.clearTimeout(fallback);
          });
        });
        cleanups.push(() => window.cancelAnimationFrame(frame));
      });

    const run = async () => {
      await waitForIntro();
      if (cancelled) return;
      setShown([]);
      await sleep(320);
      for (let index = 0; index < script.length; index += 1) {
        if (cancelled) return;
        const line = script[index];
        if (line.kind === "cmd") {
          setMood("typing");
          setShown((previous) => [...previous.slice(0, index), ""]);
          for (let count = 1; count <= line.text.length; count += 1) {
            await sleep(32 + Math.random() * 34);
            if (cancelled) return;
            const partial = line.text.slice(0, count);
            setShown((previous) => [...previous.slice(0, index), partial]);
          }
          setMood("idle");
          if (index === 0) setReady(true);
          await sleep(240);
        } else {
          await sleep(line.kind === "ok" ? 420 : 300);
          if (cancelled) return;
          setShown((previous) => [...previous.slice(0, index), line.text]);
        }
      }
      await sleep(180);
      finish(false);
    };

    void run();
    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
    };
    // restMood reads a ref only; the sequence must not restart when it changes identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, script]);

  useEffect(() => {
    let timer: number | undefined;
    if (mood === "happy") timer = window.setTimeout(() => setMood("explain"), 900);
    else if (mood === "explain") timer = window.setTimeout(() => setMood(passwordFocused.current ? "shy" : "idle"), 2200);
    else if (mood === "sad") timer = window.setTimeout(() => setMood(passwordFocused.current ? "shy" : "idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [mood]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof HTMLElement && (node.matches('[role="alert"]') || node.querySelector('[role="alert"]'))) {
            setMood("sad");
            return;
          }
        }
        if (record.type === "characterData") {
          const parent = record.target.parentElement;
          if (parent?.closest('[role="alert"]')) {
            setMood("sad");
            return;
          }
        }
      }
    });
    observer.observe(card, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (!isPasswordField(event.target)) return;
    passwordFocused.current = true;
    setMood((current) => (current === "sad" ? current : "shy"));
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!isPasswordField(event.target)) return;
    passwordFocused.current = false;
    setMood((current) => (current === "shy" ? "idle" : current));
  };

  const activeLine = phase === "done" ? -1 : shown.length - 1;

  return (
    <div className="auth-page" data-phase={phase} data-scene={scene}>
      <div className="auth-backdrop" aria-hidden="true">
        <Image
          src="/images/scenes/auth-backdrop.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="auth-backdrop__photo"
        />
      </div>

      <section className="auth-stage" aria-label="Pingo te prépare un accès sécurisé">
        <div className="auth-stage__brand">
          <Logo />
        </div>

        <div className="auth-rig" aria-hidden="true">
          <div className="auth-rig__floor" />
          <div className="auth-laptop">
            <div className="auth-laptop__screen">
              <div className="auth-terminal">
                <div className="auth-terminal__bar">
                  <span className="auth-terminal__dot auth-terminal__dot--red" />
                  <span className="auth-terminal__dot auth-terminal__dot--amber" />
                  <span className="auth-terminal__dot auth-terminal__dot--green" />
                  <span className="auth-terminal__title">pingo@cyberpingo: ~</span>
                </div>
                <div className="auth-terminal__body">
                  {shown.map((text, index) => {
                    const kind = script[index]?.kind ?? "out";
                    return (
                      <p key={index} className={`auth-terminal__line auth-terminal__line--${kind}`}>
                        <span className="auth-terminal__prompt">{PROMPTS[kind]}</span>
                        <span>{text}</span>
                        {index === activeLine && <span className="auth-terminal__caret" />}
                      </p>
                    );
                  })}
                  {(phase === "done" || shown.length === 0) && (
                    <p className="auth-terminal__line auth-terminal__line--cmd">
                      <span className="auth-terminal__prompt">$</span>
                      <span className="auth-terminal__caret" />
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="auth-laptop__base">
              <span className="auth-laptop__keys" />
              <span className="auth-laptop__notch" />
            </div>
          </div>
          <Pingo state={mood} size={200} className="auth-pingo" />
        </div>

        <ul className="auth-assurance">
          <li>
            <span className="auth-assurance__icon auth-assurance__icon--cyan" aria-hidden="true" />
            Connexion chiffrée (HTTPS)
          </li>
          <li>
            <span className="auth-assurance__icon auth-assurance__icon--green" aria-hidden="true" />
            Session mémorisée sur cet appareil
          </li>
          <li>
            <span className="auth-assurance__icon auth-assurance__icon--violet" aria-hidden="true" />
            Ta progression n’appartient qu’à toi
          </li>
        </ul>
      </section>

      <section className="auth-panel">
        <div ref={cardRef} className="auth-card" data-ready={ready} onFocus={handleFocus} onBlur={handleBlur}>
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          <div className="auth-card__body">{children}</div>
        </div>
        {footer && <p className="auth-footer">{footer}</p>}
      </section>
    </div>
  );
}
