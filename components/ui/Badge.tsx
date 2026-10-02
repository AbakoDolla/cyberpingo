import { cn } from "@/lib/utils";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}

export default function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return <span className={cn("ui-badge", `ui-badge--${tone}`, className)}>{children}</span>;
}
