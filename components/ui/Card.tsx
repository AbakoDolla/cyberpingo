import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: "blue" | "purple" | "green" | "none";
}

const glowClasses = {
  blue: "hover:shadow-glow",
  purple: "hover:shadow-glow-purple",
  green: "hover:shadow-glow-green",
  none: "",
};

export default function Card({ glow = "none", className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-dark-navy border border-white/5 rounded-xl2 p-6 shadow-soft transition-shadow duration-300",
        glowClasses[glow],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
