"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import logo from "@/public/images/cyberpingo-transparent.png";

let shownThisLoad = false;

export default function StartupAnimation() {
  const [visible, setVisible] = useState(false);
  const shouldPlay = useRef<boolean | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (shouldPlay.current === null) {
      let seen = shownThisLoad;
      try {
        seen ||= sessionStorage.getItem("cyberpingo_intro_seen") === "1";
        if (!reducedMotion.matches) sessionStorage.setItem("cyberpingo_intro_seen", "1");
      } catch (error) {
        console.warn("La préférence d’animation ne peut pas être conservée pour cet onglet.", error);
      }
      shouldPlay.current = !seen && !reducedMotion.matches;
    }
    if (!shouldPlay.current) return;
    setVisible(true);
    const dismiss = () => { shownThisLoad = true; shouldPlay.current = false; setVisible(false); };
    const timeout = window.setTimeout(dismiss, 1700);
    window.addEventListener("pointerdown", dismiss, { once: true, capture: true });
    window.addEventListener("keydown", dismiss, { once: true, capture: true });
    reducedMotion.addEventListener("change", dismiss);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pointerdown", dismiss, true);
      window.removeEventListener("keydown", dismiss, true);
      reducedMotion.removeEventListener("change", dismiss);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className="brand-intro" aria-hidden="true">
      <div className="brand-intro-orbit" />
      <Image src={logo} alt="" width={340} height={340} priority />
      <p>Un nouveau réflexe commence ici.</p>
      <span className="brand-intro-trace" />
    </div>
  );
}
