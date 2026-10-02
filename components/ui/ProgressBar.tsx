import { clamp, cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  tone?: "brand" | "blue" | "green" | "purple";
  showLabel?: boolean;
  height?: "sm" | "md";
  label?: string;
}

export default function ProgressBar({
  value,
  className,
  tone = "brand",
  showLabel = false,
  height = "md",
  label = "Progression",
}: ProgressBarProps) {
  const safeValue = clamp(value);
  return (
    <div className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("ui-progress", height === "sm" && "ui-progress--sm")}
      >
        <span className={`ui-progress__fill is-${tone}`} style={{ transform: `scaleX(${safeValue / 100})` }} />
      </div>
      {showLabel && <p className="mt-1.5 text-xs text-[#b5c5df] tabular-nums">{safeValue} %</p>}
    </div>
  );
}
