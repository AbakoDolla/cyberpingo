"use client";

import { useParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import { Notice } from "./AdminState";

export const asInt = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};
export const lines = (value: string) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
export const joinLines = (value: string[]) => value.join("\n");

/** Route segment `[id]` of the current admin page. */
export function useRouteId(): string {
  const params = useParams<{ id: string }>();
  return String(params?.id ?? "");
}

/** `<input type="datetime-local">` value → ISO string (or null when empty). */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO string → `<input type="datetime-local">` value in the browser's timezone. */
export function isoToLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const STATUS_LABELS: Record<string, string> = { draft: "Brouillon", published: "Publié", archived: "Archivé" };
export const LEVEL_LABELS: Record<string, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" };
export const LAB_CATEGORY_LABELS: Record<string, string> = {
  reseau: "Réseau", linux: "Linux", web: "Web", cryptographie: "Cryptographie", osint: "OSINT", securite: "Sécurité",
};

export const toOptions = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm text-white/70"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-xl border border-white/10 bg-cyber-black px-4 py-3 text-white outline-none focus:border-cyber-blue ${props.className ?? ""}`} />;
}

export function StateMsg({ error, message }: { error?: string | null; message?: string | null }) {
  if (error) return <Notice kind="error">{error}</Notice>;
  if (message) return <Notice>{message}</Notice>;
  return null;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "published" || status === "actif" ? "green" : status === "archived" ? "red" : "neutral";
  return <Badge tone={tone}>{STATUS_LABELS[status] ?? status}</Badge>;
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-white/75">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-cyber-blue" />
      {label}
    </label>
  );
}
