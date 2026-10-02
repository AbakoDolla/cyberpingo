"use client";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

/** `eyebrow` is accepted for older callers but intentionally not rendered: the heading carries the page. */
export function AdminPageHeader({ title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="adm-page-header">
      <div className="min-w-0">
        <h1 className="adm-page-title">{title}</h1>
        {description && <p className="adm-page-description">{description}</p>}
      </div>
      {action && <div className="adm-page-action">{action}</div>}
    </header>
  );
}

export function AdminLoading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="adm-loading" aria-busy="true">
      <div className="adm-skeleton mb-4 h-5 w-48" />
      <div className="grid gap-3">
        {[0, 1, 2].map((item) => <div key={item} className="adm-skeleton h-14" />)}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function AdminError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="adm-notice adm-notice--error">
      <p>{message}</p>
      <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Réessayer</Button>
    </div>
  );
}

export function AdminEmpty({ children = "Aucune donnée disponible pour le moment." }: { children?: React.ReactNode }) {
  return <div className="adm-empty">{children}</div>;
}

export function Notice({ kind = "success", children }: { kind?: "success" | "error" | "info"; children: React.ReactNode }) {
  return <p role={kind === "error" ? "alert" : "status"} className={`adm-notice adm-notice--${kind}`}>{children}</p>;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = false,
  loading = false,
  onCancel,
  onConfirm,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Modal open={open} onClose={loading ? () => undefined : onCancel} title={title} className="max-w-lg">
      <p className={danger ? "adm-danger-copy" : "adm-muted"}>{description}</p>
      {children && <div className="mt-4">{children}</div>}
      <div className="adm-modal-actions">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button type="button" variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}