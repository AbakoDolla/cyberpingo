"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  /** Public URL of the uploaded avatar (Supabase Storage). Falls back to initials when missing or broken. */
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  ringTone?: "blue" | "purple" | "green" | "none";
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-base",
  lg: "w-20 h-20 text-2xl",
  xl: "w-28 h-28 text-3xl",
};

const ringClasses = {
  blue: "ring-2 ring-cyber-blue",
  purple: "ring-2 ring-neon-purple",
  green: "ring-2 ring-cyber-green",
  none: "",
};

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return letters || "?";
}

export default function Avatar({ name, src, size = "md", className, ringTone = "blue" }: AvatarProps) {
  const [broken, setBroken] = useState<string | null>(null);
  const showImage = Boolean(src) && broken !== src;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full bg-cyber-gradient flex items-center justify-center font-display font-semibold text-white shrink-0",
        sizeClasses[size],
        ringClasses[ringTone],
        className
      )}
      title={name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads live on the Supabase CDN, not in next/image's allow-list
        <img src={src ?? undefined} alt="" className="h-full w-full object-cover" onError={() => setBroken(src ?? null)} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
      <span className="sr-only">{name}</span>
    </div>
  );
}
