"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import type { Pingo3DPose } from "./Pingo3DScene";

const Scene = dynamic(() => import("./Pingo3DScene"), { ssr: false });

interface Pingo3DProps {
  pose?: Pingo3DPose;
  rank?: number;
  className?: string;
  fallback?: ReactNode;
  interactive?: boolean;
  label?: string;
}

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Pingo3D({ pose = "idle", rank, className = "", fallback, interactive = true, label = "Pingo, la mascotte 3D de CyberPingo" }: Pingo3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(false);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setSupported(hasWebGL());
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const node = host.current;
    if (!node || !supported) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [supported]);

  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => setSupported(false), []);

  return (
    <div ref={host} className={`pingo3d ${className}`.trim()} role="img" aria-label={label} data-ready={ready}>
      <div className="pingo3d__fallback">{fallback}</div>
      {supported && near ? (
        <div className="pingo3d__canvas">
          <SceneBoundary onError={onFail}>
            <Scene pose={pose} rank={rank} reduced={reduced} interactive={interactive} active={visible} onReady={onReady} />
          </SceneBoundary>
        </div>
      ) : null}
    </div>
  );
}

export default Pingo3D;
