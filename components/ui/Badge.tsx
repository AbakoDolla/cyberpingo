import { cn } from "@/lib/utils";

type Tone = "blue" | "purple" | "green" | "red" | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  blue: "bg-cyber-blue/15 text-cyber-blue border-cyber-blue/30",
  purple: "bg-neon-purple/15 text-neon-purple border-neon-purple/30",
  green: "bg-cyber-green/15 text-cyber-green border-cyber-green/30",
  red: "bg-cyber-red/15 text-cyber-red border-cyber-red/30",
  neutral: "bg-white/5 text-white/70 border-white/10",
};

export default function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
