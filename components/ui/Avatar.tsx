import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  ringTone?: "blue" | "purple" | "green" | "none";
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-base",
  lg: "w-20 h-20 text-2xl",
};

const ringClasses = {
  blue: "ring-2 ring-cyber-blue",
  purple: "ring-2 ring-neon-purple",
  green: "ring-2 ring-cyber-green",
  none: "",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Avatar({ name, size = "md", className, ringTone = "blue" }: AvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full bg-cyber-gradient flex items-center justify-center font-display font-semibold text-white shrink-0",
        sizeClasses[size],
        ringClasses[ringTone],
        className
      )}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
