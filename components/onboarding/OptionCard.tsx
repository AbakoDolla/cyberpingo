"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OptionCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  label: string;
  description?: string;
  meta?: string;
  icon?: ReactNode;
  selected: boolean;
  multiple?: boolean;
}

export default function OptionCard({
  label,
  description,
  meta,
  icon,
  selected,
  multiple = false,
  className,
  ...props
}: OptionCardProps) {
  return (
    <button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={selected}
      className={cn("onb-option", selected && "is-selected", className)}
      {...props}
    >
      {icon && <span className="onb-option__icon" aria-hidden="true">{icon}</span>}
      <span className="onb-option__body">
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </span>
      {meta && <small>{meta}</small>}
    </button>
  );
}
