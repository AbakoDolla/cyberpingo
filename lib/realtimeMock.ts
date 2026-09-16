/**
 * Moteur de simulation temps réel.
 * Génère des sessions et événements vraisemblables qui évoluent
 * dynamiquement. Conçu pour être remplacé par un vrai WebSocket
 * en changeant uniquement le hook useRealtime.
 */

import {
  RealtimeSession, RealtimeEvent, RealtimeStats,
  RealtimeState, UserStatus, RealtimeAction,
} from "@/types/realtime";

// ─── Données de base ─────────────────────────────────────────────────────────

const MOCK_USERS = [
  { userId: "u-admin", username: "death", displayName: "Death", level: 5, xp: 4200 },
  { userId: "u-002", username: "neo_sec",  displayName: "Neo Sec",  level: 3, xp: 1850 },
  { userId: "u-003", username: "k4rl",     displayName: "K4rl",     level: 2, xp: 950  },
  { userId: "u-004", username: "cyph3r",   displayName: "Cyph3r",   level: 4, xp: 3100 },
  { userId: "u-005", username: "syl_v",    displayName: "Syl_V",    level: 1, xp: 420  },
  { userId: "u-006", username: "r00tkit",  displayName: "r00tkit",  level: 6, xp: 5800 },
  { userId: "u-007", username: "byte_me",  displayName: "byte_me",  level: 2, xp: 780  },
  { userId: "u-008", username: "0xFr4nc",  displayName: "0xFr4nc",  level: 3, xp: 2100 },
];

const PAGES = [
  "/dashboard",
  "/courses",
  "/courses/reseaux",
  "/courses/fondamentaux",
  "/lessons/l1",
  "/lessons/l2",
  "/lessons/l-c1-1",
  "/challenges",
  "/challenges/decouvrir-les-ports-reseau",
  "/challenges/premiers-pas-en-osint",
  "/mentor",
  "/quiz/q1",
  "/profile",
];

const PAGE_LABELS: Record<string, string> = {
  "/dashboard":           "Dashboard",
  "/courses":             "Liste des cours",
  "/courses/reseaux":     "Cours Réseaux",
  "/courses/fondamentaux":"Cours Fondamentaux",
  "/lessons/l1":          "Leçon DNS",
  "/lessons/l2":          "Leçon Ports",
  "/lessons/l-c1-1":      "Leçon Cybersécurité intro",
  "/challenges":          "Liste challenges",
  "/challenges/decouvrir-les-ports-reseau": "Challenge Ports",
  "/challenges/premiers-pas-en-osint":      "Challenge OSINT",
  "/mentor":              "Mentor IA",
  "/quiz/q1":             "Quiz DNS",
  "/profile":             "Profil",
};

const ACTION_TEMPLATES: { action: RealtimeAction; label: (page: string) => string; xpDelta?: number }[] = [
  { action: "page_view",          label: (p) => `Consulte ${PAGE_LABELS[p] ?? p}` },
  { action: "lesson_start",       label: (_) => "Démarre une leçon" },
  { action: "lesson_complete",    label: (_) => "Termne une leçon",         xpDelta: 50 },
  { action: "challenge_start",    label: (_) => "Attaque un challenge" },
  { action: "challenge_complete", label: (_) => "Résout un challenge",       xpDelta: 100 },
  { action: "quiz_start",         label: (_) => "Commence un quiz" },
  { action: "quiz_complete",      label: (_) => "Valide un quiz",            xpDelta: 80 },
  { action: "mentor_chat",        label: (_) => "Pose une question au Mentor" },
  { action: "login",              label: (_) => "Se connecte" },
  { action: "logout",             label: (_) => "Se déconnecte" },
];

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function uuid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function maskIp(): string {
  const a = Math.floor(Math.random() * 200 + 10);
  const b = Math.floor(Math.random() * 200 + 10);
  return `${a}.${b}.x.x`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function isoAgo(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickStatus(): UserStatus {
  const r = Math.random();
  if (r < 0.55) return "online";
  if (r < 0.75) return "idle";
  return "offline";
}

// ─── Génération initiale ──────────────────────────────────────────────────────

export function generateInitialState(): RealtimeState {
  const sessions: RealtimeSession[] = MOCK_USERS.map((u, i) => {
    const status = i === 0 ? "online" : pickStatus();
    const connectedAt = isoAgo(Math.random() * 3600);
    const lastActivityAt = isoAgo(Math.random() * 300);
    const page = pick(PAGES);

    const sessionEvents: RealtimeEvent[] = Array.from({ length: Math.floor(Math.random() * 5 + 2) }).map(() => {
      const tmpl = pick(ACTION_TEMPLATES.filter((t) => t.action !== "login" && t.action !== "logout"));
      const p = pick(PAGES);
      return {
        id: uuid(),
        sessionId: `s-${u.userId}`,
        userId: u.userId,
        username: u.username,
        displayName: u.displayName,
        action: tmpl.action,
        label: tmpl.label(p),
        page: p,
        timestamp: isoAgo(Math.random() * 600),
        xpDelta: tmpl.xpDelta,
      };
    });

    return {
      sessionId: `s-${u.userId}`,
      userId: u.userId,
      username: u.username,
      displayName: u.displayName,
      level: u.level,
      xp: u.xp,
      status,
      currentPage: page,
      connectedAt,
      lastActivityAt,
      disconnectedAt: status === "offline" ? isoAgo(Math.random() * 600) : undefined,
      ipMasked: maskIp(),
      actions: sessionEvents,
    };
  });

  const allEvents: RealtimeEvent[] = sessions
    .flatMap((s) => s.actions)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  return {
    sessions,
    events: allEvents,
    stats: computeStats(sessions, allEvents),
    lastUpdated: isoNow(),
    connected: true,
  };
}

// ─── Tick — mise à jour incrémentale ─────────────────────────────────────────

export function tickState(prev: RealtimeState): RealtimeState {
  const sessions = prev.sessions.map((s) => {
    // 15% de chance de changer de statut
    if (Math.random() < 0.15) {
      const newStatus = pickStatus();
      return {
        ...s,
        status: newStatus,
        lastActivityAt: newStatus !== "offline" ? isoNow() : s.lastActivityAt,
        disconnectedAt: newStatus === "offline" ? isoNow() : undefined,
        currentPage: newStatus === "online" ? pick(PAGES) : s.currentPage,
      };
    }
    // 25% de chance de changer de page (si online)
    if (s.status === "online" && Math.random() < 0.25) {
      return { ...s, currentPage: pick(PAGES), lastActivityAt: isoNow() };
    }
    return s;
  });

  // Générer 0-2 nouveaux événements
  const newEvents: RealtimeEvent[] = [];
  const onlineSessions = sessions.filter((s) => s.status === "online");
  const count = Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const s = pick(onlineSessions);
    if (!s) continue;
    const tmpl = pick(ACTION_TEMPLATES.filter((t) => t.action !== "login" && t.action !== "logout"));
    const p = s.currentPage;
    newEvents.push({
      id: uuid(),
      sessionId: s.sessionId,
      userId: s.userId,
      username: s.username,
      displayName: s.displayName,
      action: tmpl.action,
      label: tmpl.label(p),
      page: p,
      timestamp: isoNow(),
      xpDelta: tmpl.xpDelta,
    });
  }

  const events = [...newEvents, ...prev.events].slice(0, 50);

  return {
    sessions,
    events,
    stats: computeStats(sessions, events),
    lastUpdated: isoNow(),
    connected: true,
  };
}

// ─── Calcul des stats ─────────────────────────────────────────────────────────

function computeStats(sessions: RealtimeSession[], events: RealtimeEvent[]): RealtimeStats {
  const pageCounts: Record<string, number> = {};
  const actionCounts = {} as Record<RealtimeAction, number>;

  for (const e of events) {
    pageCounts[e.page] = (pageCounts[e.page] ?? 0) + 1;
    actionCounts[e.action] = (actionCounts[e.action] ?? 0) + 1;
  }

  const mostVisitedPages = Object.entries(pageCounts)
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalXpEarnedToday = events.reduce((s, e) => s + (e.xpDelta ?? 0), 0);

  return {
    totalOnline:       sessions.filter((s) => s.status === "online").length,
    totalIdle:         sessions.filter((s) => s.status === "idle").length,
    totalOffline:      sessions.filter((s) => s.status === "offline").length,
    totalSessions:     sessions.length,
    peakOnlineToday:   sessions.filter((s) => s.status !== "offline").length,
    totalLoginsToday:  sessions.length,
    totalXpEarnedToday,
    mostVisitedPages,
    actionCounts,
  };
}

export { PAGE_LABELS };
