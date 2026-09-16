// ─── Types temps réel ────────────────────────────────────────────────────────

export type UserStatus = "online" | "idle" | "offline";

export type RealtimeAction =
  | "page_view"
  | "lesson_start"
  | "lesson_complete"
  | "challenge_start"
  | "challenge_complete"
  | "quiz_start"
  | "quiz_complete"
  | "login"
  | "logout"
  | "mentor_chat";

export interface RealtimeSession {
  sessionId: string;
  userId: string;
  username: string;
  displayName: string;
  level: number;
  xp: number;
  status: UserStatus;
  currentPage: string;
  connectedAt: string;      // ISO
  lastActivityAt: string;   // ISO
  disconnectedAt?: string;  // ISO — défini si offline
  ipMasked: string;         // ex: "192.168.x.x" — masqué pour la vie privée
  actions: RealtimeEvent[];
}

export interface RealtimeEvent {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  displayName: string;
  action: RealtimeAction;
  label: string;           // Description lisible de l'action
  page: string;            // Chemin de la page concernée
  timestamp: string;       // ISO
  xpDelta?: number;        // XP gagné lors de l'action (si applicable)
}

export interface RealtimeStats {
  totalOnline: number;
  totalIdle: number;
  totalOffline: number;
  totalSessions: number;
  peakOnlineToday: number;
  totalLoginsToday: number;
  totalXpEarnedToday: number;
  mostVisitedPages: { page: string; count: number }[];
  actionCounts: Record<RealtimeAction, number>;
}

export interface RealtimeState {
  sessions: RealtimeSession[];
  events: RealtimeEvent[];   // Flux global des 50 derniers événements
  stats: RealtimeStats;
  lastUpdated: string;       // ISO
  connected: boolean;        // true = WebSocket connecté / polling actif
}
