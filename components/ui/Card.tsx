import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: "blue" | "purple" | "green" | "none";
}

export default function Card({ glow = "none", className, children, ...props }: CardProps) {
  return (
    <div className={cn("ui-card", glow !== "none" && `ui-card--${glow}`, className)} {...props}>
      {children}
    </div>
  );
}
