"use client";

import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  tone?: "success" | "error" | "info" | "level-up";
  visible: boolean;
}

const toneClasses: Record<string, string> = {
  success: "bg-cyber-green text-cyber-black border border-cyber-green/50",
  error: "bg-cyber-red text-white border border-cyber-red/50",
  info: "bg-cyber-blue text-white border border-cyber-blue/50",
  "level-up": "bg-neon-purple text-white border border-neon-purple/50 shadow-glow-purple",
};

const toneAnimation: Record<string, string> = {
  success: "animate-xp-pop",
  error: "animate-xp-pop",
  info: "animate-xp-pop",
  "level-up": "animate-level-up",
};

export default function Toast({ message, tone = "info", visible }: ToastProps) {
  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-8 left-1/2 z-50 px-5 py-3 rounded-xl shadow-soft font-semibold text-sm whitespace-nowrap",
        toneClasses[tone],
        toneAnimation[tone]
      )}
    >
      {message}
    </div>
  );
}
