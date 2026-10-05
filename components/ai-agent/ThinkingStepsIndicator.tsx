"use client";

import { useEffect, useState } from "react";
import type { ThinkingStep } from "@/lib/ai-agent/engine";
import { IconCheck, IconAI } from "@/components/ui/Icon";

interface ThinkingStepsIndicatorProps {
  steps: ThinkingStep[];
  active: boolean;
  onCompleted?: () => void;
}

export default function ThinkingStepsIndicator({
  steps,
  active,
  onCompleted,
}: ThinkingStepsIndicatorProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (!active || steps.length === 0) {
      setCurrentStepIndex(0);
      return;
    }

    let isSubscribed = true;
    let step = 0;

    const runNextStep = () => {
      if (!isSubscribed) return;
      if (step < steps.length - 1) {
        const duration = steps[step]?.durationMs ?? 700;
        setTimeout(() => {
          if (!isSubscribed) return;
          step += 1;
          setCurrentStepIndex(step);
          runNextStep();
        }, duration);
      } else {
        const lastDuration = steps[step]?.durationMs ?? 700;
        setTimeout(() => {
          if (!isSubscribed) return;
          onCompleted?.();
        }, lastDuration);
      }
    };

    runNextStep();

    return () => {
      isSubscribed = false;
    };
  }, [active, steps, onCompleted]);

  if (!active) return null;

  return (
    <div className="agent-thinking-card" role="status" aria-live="polite">
      <div className="agent-thinking-head">
        <div className="agent-thinking-avatar" aria-hidden="true">
          <IconAI size={18} />
          <span className="agent-thinking-glow" />
        </div>
        <div>
          <strong>Professeur Pingo mène l’analyse…</strong>
          <p>Examen méthodique et bienveillant selon les référentiels de sécurité.</p>
        </div>
      </div>

      <div className="agent-thinking-steps">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isPending = idx > currentStepIndex;

          return (
            <div
              key={step.id}
              className={`agent-thinking-step ${
                isDone ? "is-done" : isCurrent ? "is-current" : "is-pending"
              }`}
            >
              <div className="agent-thinking-step-badge">
                {isDone ? (
                  <IconCheck size={12} strokeWidth={2.4} />
                ) : isCurrent ? (
                  <span className="agent-thinking-spinner" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className="agent-thinking-step-text">
                <span className="agent-thinking-step-label">{step.label}</span>
                {isCurrent && <span className="agent-thinking-step-detail">{step.detail}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
