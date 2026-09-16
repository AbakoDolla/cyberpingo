import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-cyber-gradient text-white hover:shadow-glow active:scale-[0.98]",
  secondary: "bg-dark-navy text-white border border-white/10 hover:border-cyber-blue/60 hover:bg-white/5",
  ghost: "bg-transparent text-white/80 hover:text-white hover:bg-white/5",
  danger: "bg-cyber-red text-white hover:brightness-110",
  success: "bg-cyber-green text-cyber-black hover:brightness-105",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-4 py-2 rounded-xl",
  md: "text-base px-6 py-3 rounded-xl",
  lg: "text-lg px-8 py-4 rounded-xl2",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "font-display font-semibold inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
