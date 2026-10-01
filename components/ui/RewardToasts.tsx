"use client";

import { useRewardToasts, type RewardToast } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { IconAward, IconBolt, IconStar, IconX } from "@/components/ui/Icon";

const toneClasses: Record<RewardToast["tone"], string> = {
  success: "border-cyber-green/50 bg-[#062a22] text-[#d7ffef]",
  "level-up": "border-neon-purple/60 bg-[#1c1236] text-[#efe6ff] shadow-glow-purple",
  badge: "border-[#e5b95c]/60 bg-[#2b210d] text-[#fff0cf]",
  info: "border-cyber-blue/50 bg-[#0a2340] text-[#dff3ff]",
};

const toneIcon = {
  success: IconBolt,
  "level-up": IconStar,
  badge: IconAward,
  info: IconBolt,
} as const;

/** Stack of reward notifications produced by server-validated learning actions. */
export default function RewardToasts() {
  const { toasts, dismiss } = useRewardToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-8" aria-live="polite" role="status">
      {toasts.map((toast) => {
        const Icon = toneIcon[toast.tone];
        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-soft",
              toast.tone === "level-up" ? "reward-toast-in reward-toast-level" : "reward-toast-in",
              toneClasses[toast.tone]
            )}
          >
            <Icon size={18} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{toast.title}</p>
              {toast.detail && <p className="mt-0.5 text-xs opacity-80 leading-snug">{toast.detail}</p>}
            </div>
            <button type="button" onClick={() => dismiss(toast.id)} className="-m-1 rounded-md p-1 opacity-70 hover:opacity-100" aria-label="Fermer la notification">
              <IconX size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
