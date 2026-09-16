"use client";

import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const titleId = `modal-title-${title?.replace(/\s+/g, "-").toLowerCase() ?? "dialog"}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      onClick={onClose}
    >
      <div
        className={cn(
          "relative bg-dark-navy border border-white/10 rounded-xl2 p-6 max-w-md w-full shadow-soft",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 id={titleId} className="font-display text-xl font-semibold mb-4">{title}</h2>}
        {children}
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 text-white/50 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
