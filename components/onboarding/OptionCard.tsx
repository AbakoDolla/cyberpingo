"use client";

import { cn } from "@/lib/utils";

interface OptionCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}

export default function OptionCard({ label, description, selected, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "w-full text-left px-5 py-4 rounded-xl border transition-all",
        selected
          ? "border-cyber-blue bg-cyber-blue/10 shadow-glow"
          : "border-white/10 bg-cyber-black hover:border-white/25"
      )}
    >
      <p className="font-medium">{label}</p>
      {description && <p className="text-sm text-white/50 mt-1">{description}</p>}
    </button>
  );
}
