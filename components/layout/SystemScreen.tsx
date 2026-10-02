"use client";

import type { ReactNode } from "react";
import Pingo, { type PingoState } from "@/components/mascot/Pingo";

type SystemScreenProps = {
  code?: string;
  title: string;
  description?: string;
  state?: PingoState;
  actions?: ReactNode;
  live?: boolean;
};

export default function SystemScreen({ code, title, description, state = "idle", actions, live = false }: SystemScreenProps) {
  return (
    <main className="sys-screen" role={live ? "status" : undefined} aria-live={live ? "polite" : undefined}>
      <div className="sys-orbit" aria-hidden="true" />
      <div className="sys-card">
        <Pingo state={state} size={150} />
        {code ? <p className="sys-code" aria-hidden="true">{code}</p> : null}
        <h1 className="sys-title">{title}</h1>
        {description ? <p className="sys-text">{description}</p> : null}
        {actions ? <div className="sys-actions">{actions}</div> : null}
      </div>
    </main>
  );
}
