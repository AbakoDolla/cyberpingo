import { clamp, cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  tone?: "blue" | "green" | "purple";
  showLabel?: boolean;
  height?: "sm" | "md";
}

const toneClasses = {
  blue: "bg-cyber-blue",
  green: "bg-cyber-green",
  purple: "bg-neon-purple",
};

export default function ProgressBar({
  value,
  className,
  tone = "blue",
  showLabel = false,
  height = "md",
}: ProgressBarProps) {
  const safeValue = clamp(value);
  return (
    <div className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "w-full bg-white/5 rounded-full overflow-hidden",
          height === "sm" ? "h-1.5" : "h-2.5"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", toneClasses[tone])}
          style={{ width: `${safeValue}%` }}
        />
      </div>
      {showLabel && <p className="mt-1 text-xs text-white/60">{safeValue}%</p>}
    </div>
  );
}
