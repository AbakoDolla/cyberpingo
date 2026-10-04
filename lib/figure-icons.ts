/** Icon names a figure can use. The React side maps each name to a drawing (components/figures/icons.tsx). */
export const FIGURE_ICONS = [
  // devices and network
  "router", "switch", "firewall", "server", "pc", "laptop", "phone", "tablet", "printer", "camera", "access-point", "cloud",
  "internet", "modem", "nas", "usb", "badge-reader", "watch", "wifi", "cable", "antenna", "network", "plug", "chip",
  // security
  "shield", "shield-check", "shield-alert", "lock", "unlock", "key", "fingerprint", "eye", "eye-off", "bug", "skull", "flame",
  "siren", "radar", "scan", "file-search", "mask",
  // data and documents
  "database", "file", "document", "folder", "archive", "package", "mail", "message", "paperclip", "link", "hash", "binary",
  "braces", "code", "terminal", "qr-code", "image", "bookmark",
  // people and organisation
  "user", "users", "user-check", "building", "store", "scale", "gavel", "graduation", "book", "id-card", "briefcase", "home",
  // process and signals
  "clock", "calendar", "bell", "flag", "target", "zap", "activity", "chart", "settings", "wrench", "refresh", "play", "check",
  "close", "alert", "info", "help", "search", "download", "upload", "pin", "layers", "list", "star", "heart", "bulb", "route",
  // added for the lessons: access, flows and tooling
  "globe", "user-plus", "user-x", "log-in", "log-out", "history", "filter", "gauge", "ban", "send", "inbox", "share", "boxes", "workflow",
  "microscope", "flask", "puzzle", "megaphone", "container", "git-branch", "file-lock", "folder-open", "table", "hard-drive", "monitor",
] as const;

export type FigureIcon = (typeof FIGURE_ICONS)[number];

export const isFigureIcon = (value: unknown): value is FigureIcon => typeof value === "string" && (FIGURE_ICONS as readonly string[]).includes(value);
