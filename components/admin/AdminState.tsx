"use client";

import Button from "@/components/ui/Button";

/** `eyebrow` is accepted for older callers but intentionally not rendered: the heading carries the page. */
export function AdminPageHeader({ title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div className="min-w-0"><h1 className="font-display text-2xl font-semibold text-balance md:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-[70ch] text-sm text-white/65">{description}</p>}</div>{action}</header>;
}

export function AdminLoading({ label = "Chargement…" }: { label?: string }) {
  return <div className="rounded-xl2 border border-white/5 bg-dark-navy p-6" aria-busy="true"><div className="mb-3 h-4 w-40 rounded bg-white/[0.06] animate-pulse" /><div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />)}</div><span className="sr-only">{label}</span></div>;
}

export function AdminError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="rounded-xl2 border border-cyber-red/30 bg-cyber-red/10 p-6 text-red-100"><p>{message}</p><Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Réessayer</Button></div>;
}

export function AdminEmpty({ children = "Aucune donnée disponible pour le moment." }: { children?: React.ReactNode }) {
  return <div className="rounded-xl2 border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/60">{children}</div>;
}

export function Notice({ kind = "success", children }: { kind?: "success" | "error" | "info"; children: React.ReactNode }) {
  const cls = kind === "error" ? "border-cyber-red/30 bg-cyber-red/10 text-red-100" : kind === "info" ? "border-cyber-blue/25 bg-cyber-blue/10 text-blue-100" : "border-cyber-green/25 bg-cyber-green/10 text-green-100";
  return <p role={kind === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</p>;
}