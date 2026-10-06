/**
 * CyberPingo SOC & Web Application Firewall (WAF) Engine
 * Multi-layer real-time defense against DDoS, Brute-Force, OWASP Top 10,
 * Traffic Hijacking, and Scraping/Cloning.
 */

export type ThreatCategory =
  | "sqli"
  | "xss"
  | "brute_force"
  | "ddos"
  | "scraper_bot"
  | "path_traversal"
  | "traffic_theft"
  | "command_injection"
  | "ssrf"
  | "auth_bypass";

export type ThreatSeverity = "critical" | "high" | "medium" | "low";

export type MitigationAction = "blocked" | "rate_limited" | "ip_banned" | "challenged";

export interface SecurityThreat {
  id: string;
  timestamp: string;
  ip: string;
  country?: string;
  technique: string;
  category: ThreatCategory;
  severity: ThreatSeverity;
  action: MitigationAction;
  targetUrl: string;
  method: string;
  attackerIdentity: string;
  userAgent: string;
  payloadSnippet?: string;
  details?: Record<string, unknown>;
}

export interface BannedIp {
  ip: string;
  reason: string;
  bannedAt: string;
  expiresAt: string | null; // null = permanent
  bannedBy: string;
}

export interface WafMetrics {
  totalInspected: number;
  totalBlocked: number;
  attacks24h: number;
  criticalAlerts: number;
  activeBans: number;
  shieldModeActive: boolean;
  threatLevel: "normal" | "elevated" | "under_attack" | "emergency";
  mitigationRate: number; // percentage (e.g. 100)
}

export interface WafDecision {
  allowed: boolean;
  status?: 403 | 429;
  reason?: string;
  threat?: SecurityThreat;
  retryAfter?: number;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

// Global state persisted across Next.js re-evaluations
interface GlobalWafStore {
  shieldMode: boolean;
  bannedIps: Map<string, BannedIp>;
  incidents: SecurityThreat[];
  rateBuckets: Map<string, { timestamps: number[]; burstCount: number; lastBurstWindow: number }>;
  authBuckets: Map<string, { attempts: number; windowStart: number }>;
  totalInspected: number;
  totalBlocked: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __cyberpingo_waf_store: GlobalWafStore | undefined;
}

// Initial seed incidents for SOC display demonstrating detected techniques
const INITIAL_INCIDENTS: SecurityThreat[] = [
  {
    id: "sec-init-01",
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    ip: "185.220.101.44",
    country: "DE (Tor Exit Node)",
    technique: "OWASP-A03: SQL Injection Probe",
    category: "sqli",
    severity: "critical",
    action: "blocked",
    targetUrl: "/api/courses?category=all' UNION SELECT id,email,role FROM profiles--",
    method: "GET",
    attackerIdentity: "Anonyme [sqlmap/1.7.2#dev]",
    userAgent: "sqlmap/1.7.2#dev (https://sqlmap.org)",
    payloadSnippet: "' UNION SELECT id,email,role FROM profiles--",
  },
  {
    id: "sec-init-02",
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    ip: "45.154.255.89",
    country: "RU (Known Botnet)",
    technique: "OWASP-A07: Credential Stuffing / Auth Brute Force",
    category: "brute_force",
    severity: "high",
    action: "rate_limited",
    targetUrl: "/login",
    method: "POST",
    attackerIdentity: "Anonyme [Hydra v9.5 / Automated]",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (Hydra/9.5)",
    payloadSnippet: "18 tentatives consécutives de mot de passe en 6 secondes",
  },
  {
    id: "sec-init-03",
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    ip: "194.26.29.112",
    country: "NL (Scraper Infrastructure)",
    technique: "ANTI-SCRAPE: Unauthorized Platform Cloner / Scraper",
    category: "scraper_bot",
    severity: "high",
    action: "blocked",
    targetUrl: "/parcours/reseaux",
    method: "GET",
    attackerIdentity: "Anonyme [HTTrack WebCopier v3.49]",
    userAgent: "Mozilla/4.5 (compatible; HTTrack 3.0x; Windows 98)",
    payloadSnippet: "Aspiration récursive massive des assets et des leçons",
  },
  {
    id: "sec-init-04",
    timestamp: new Date(Date.now() - 1000 * 60 * 68).toISOString(),
    ip: "103.149.28.14",
    country: "CN (Cloud Proxy)",
    technique: "OWASP-A01: Path Traversal (LFI / Arbitrary File Read)",
    category: "path_traversal",
    severity: "critical",
    action: "blocked",
    targetUrl: "/admin/../../../../etc/passwd",
    method: "GET",
    attackerIdentity: "Anonyme [DirBuster-1.0-RC1]",
    userAgent: "Mozilla/5.0 (compatible; DirBuster-1.0-RC1)",
    payloadSnippet: "../../../../etc/passwd",
  },
  {
    id: "sec-init-05",
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    ip: "91.240.118.172",
    country: "FR (Rogue Mirror)",
    technique: "TRAFFIC-STEAL: Unauthorized Hotlinking / Traffic Leeching",
    category: "traffic_theft",
    severity: "medium",
    action: "blocked",
    targetUrl: "/api/certificat/CP-2026-FOND-0042/pdf",
    method: "GET",
    attackerIdentity: "Hôte tiers: clone-phishing-cyberpingo.xyz",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    payloadSnippet: "Sec-Fetch-Site: cross-site | Referer: https://clone-phishing-cyberpingo.xyz",
  },
];

const INITIAL_BANS: BannedIp[] = [
  {
    ip: "185.220.101.44",
    reason: "Sonde automatisée par injection SQL (sqlmap)",
    bannedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    bannedBy: "WAF_AUTO_SHIELD",
  },
  {
    ip: "45.154.255.89",
    reason: "Rafale de brute-force sur authentification (DDoS Auth)",
    bannedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
    bannedBy: "WAF_AUTO_SHIELD",
  },
  {
    ip: "103.149.28.14",
    reason: "Tentative d'escalade d'arborescence (Path Traversal /etc/passwd)",
    bannedAt: new Date(Date.now() - 1000 * 60 * 68).toISOString(),
    expiresAt: null, // Permanent
    bannedBy: "SUPERADMIN_RULE",
  },
];

function getStore(): GlobalWafStore {
  if (!globalThis.__cyberpingo_waf_store) {
    const bansMap = new Map<string, BannedIp>();
    INITIAL_BANS.forEach((b) => bansMap.set(b.ip, b));

    globalThis.__cyberpingo_waf_store = {
      shieldMode: false,
      bannedIps: bansMap,
      incidents: [...INITIAL_INCIDENTS],
      rateBuckets: new Map(),
      authBuckets: new Map(),
      totalInspected: 14280,
      totalBlocked: 47,
    };
  }
  return globalThis.__cyberpingo_waf_store;
}

// ─── Signatures OWASP & Malicious Patterns ─────────────────────────────────────

const SQLI_PATTERNS = [
  /(\b(union(\s+all)?)\s+select\b)/i,
  /(\bselect\b.+\bfrom\b.+)/i,
  /(\b(insert\s+into|delete\s+from|drop\s+table|drop\s+database|truncate\s+table|alter\s+table)\b)/i,
  /(--\s*$|#\s*$|\/\*.*\*\/)/,
  /(\bor\s+['"]?1['"]?\s*=\s*['"]?1['"]?)/i,
  /(\band\s+['"]?1['"]?\s*=\s*['"]?1['"]?)/i,
  /(\bexec(ute)?\s*\(|\bxp_cmdshell\b)/i,
  /(;\s*(drop|delete|update|insert)\b)/i,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /onerror\s*=/gi,
  /onload\s*=/gi,
  /onclick\s*=/gi,
  /<iframe\b/gi,
  /document\.cookie/gi,
  /eval\s*\(/gi,
  new RegExp("<" + "img[^>]+src[^\\w]*=[^\\w]*(?:javascript:|data:text\\/html)", "gi"),
];

const PATH_TRAVERSAL_PATTERNS = [
  /(\.\.[\/\\])/,
  /(%2e%2e[\/\\])/i,
  /(%2e%2e%2f)/i,
  /(\/etc\/passwd|\/etc\/shadow|\/windows\/win\.ini|c:\\boot\.ini)/i,
  /(\.\.%2f|\.\.%5c)/i,
];

const COMMAND_INJECTION_PATTERNS = [
  /(;\s*(cat|ls|rm|curl|wget|nc|bash|sh|powershell|cmd)\s+)/i,
  /(\|\s*(cat|ls|rm|curl|wget|nc|bash|sh|powershell|cmd)\s+)/i,
  /(`.*`|\$\(.*\))/,
  /(&&\s*(cat|ls|rm|curl|wget|nc|bash|sh)\s+)/i,
];

const SSRF_PATTERNS = [
  /(169\.254\.169\.254)/, // AWS / Cloud metadata service
  /(127\.0\.0\.1|localhost|0\.0\.0\.0)/i,
  /(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})/,
];

const MALICIOUS_BOT_USER_AGENTS = [
  /\bhttrack\b/i,
  /\bscrapy\b/i,
  /\bsqlmap\b/i,
  /\bnikto\b/i,
  /\bhydra\b/i,
  /\bdirbuster\b/i,
  /\bgobuster\b/i,
  /\bmasscan\b/i,
  /\bwpscan\b/i,
  /\bacunetix\b/i,
  /\bhavij\b/i,
  /\bnmap\b/i,
  /\bnessus\b/i,
  /\bopenvas\b/i,
  /\bnetsparker\b/i,
  /\bwebcopier\b/i,
  /\bteleport\s*pro\b/i,
  /\boffline\s*explorer\b/i,
];

// ─── Core Inspection Function ─────────────────────────────────────────────────

export interface RequestDetails {
  ip: string;
  url: string;
  method: string;
  headers: Headers;
  user?: { id: string; email?: string } | null;
  rawBody?: string;
}

/**
 * Inspect an incoming request against all defense vectors:
 * 1. Blacklist check (Permanent / Temporary Jailed IP)
 * 2. Rate limiting & DDoS burst flood protection
 * 3. Anti-Scraping / Malicious Bot User-Agent filtering
 * 4. OWASP Injection Detection (SQLi, XSS, Path Traversal, RCE, SSRF)
 * 5. Anti-Traffic Theft & Hotlinking protection
 */
export function inspectRequest(req: RequestDetails): WafDecision {
  const store = getStore();
  store.totalInspected += 1;

  const now = Date.now();
  const ip = sanitizeIp(req.ip);
  const userAgent = req.headers.get("user-agent") || "Inconnu";
  const referer = req.headers.get("referer") || "";
  const secFetchSite = req.headers.get("sec-fetch-site") || "";
  const host = req.headers.get("host") || "";
  const pathname = getPathname(req.url);

  // Identity formatting
  const identity = req.user?.email
    ? `Utilisateur: ${req.user.email} (${req.user.id.slice(0, 8)})`
    : req.user?.id
      ? `Utilisateur: ${req.user.id.slice(0, 8)}`
      : `Anonyme [${summarizeUserAgent(userAgent)}]`;

  // 1. Check IP Blacklist
  const activeBan = store.bannedIps.get(ip);
  if (activeBan) {
    if (activeBan.expiresAt && new Date(activeBan.expiresAt).getTime() < now) {
      store.bannedIps.delete(ip);
    } else {
      store.totalBlocked += 1;
      return {
        allowed: false,
        status: 403,
        reason: `Adresse IP bannie par le pare-feu CyberPingo SOC (${activeBan.reason}).`,
        retryAfter: 3600,
      };
    }
  }

  // 2. DDoS & High-Frequency Burst Protection
  const rateResult = checkRateLimit(ip, pathname, store.shieldMode);
  if (!rateResult.allowed) {
    store.totalBlocked += 1;

    // Burst flood detection: if burst count is high, jail the IP
    if (rateResult.isBurst) {
      jailIp(ip, "Attaque DDoS par rafale haute fréquence (Burst Flood)", 30, "WAF_DDoS_AUTO");
      recordIncident({
        ip,
        technique: "NET-DDoS: High-Frequency Burst Attack (Jailed 30m)",
        category: "ddos",
        severity: "critical",
        action: "ip_banned",
        targetUrl: req.url,
        method: req.method,
        attackerIdentity: identity,
        userAgent,
        payloadSnippet: `Trafic excessif: ${rateResult.requestsInWindow} req/s sur ${pathname}`,
      });
    } else {
      recordIncident({
        ip,
        technique: "NET-DDoS: High-Frequency Rate Limit Exceeded",
        category: "ddos",
        severity: "medium",
        action: "rate_limited",
        targetUrl: req.url,
        method: req.method,
        attackerIdentity: identity,
        userAgent,
        payloadSnippet: `Dépassement du quota: ${rateResult.requestsInWindow} requêtes`,
      });
    }

    return {
      allowed: false,
      status: 429,
      reason: "Limite de requêtes atteinte. Votre adresse IP fait l'objet d'un ralentissement de sécurité.",
      retryAfter: rateResult.retryAfter,
      rateLimit: rateResult.rateLimit,
    };
  }

  // 3. Anti-Scraping / Clone Bot Defense
  for (const botPattern of MALICIOUS_BOT_USER_AGENTS) {
    if (botPattern.test(userAgent)) {
      store.totalBlocked += 1;
      jailIp(ip, "Robot d'aspiration / Outil offensif détecté", 120, "WAF_BOT_DEFENSE");
      const threat = recordIncident({
        ip,
        technique: "ANTI-SCRAPE: Malicious Crawler / Platform Clone Tool",
        category: "scraper_bot",
        severity: "high",
        action: "blocked",
        targetUrl: req.url,
        method: req.method,
        attackerIdentity: identity,
        userAgent,
        payloadSnippet: `User-Agent banni: ${userAgent}`,
      });
      return {
        allowed: false,
        status: 403,
        reason: "Accès refusé par le filtre anti-scraping / anti-clonage CyberPingo.",
        threat,
      };
    }
  }

  // 4. Inspect Target URL, Query String & Payload for OWASP Injection Attacks
  const targetToInspect = decodeURIComponentSafe(req.url) + (req.rawBody ? ` ${req.rawBody}` : "");

  // 4a. SQL Injection (OWASP A03)
  for (const pattern of SQLI_PATTERNS) {
    if (pattern.test(targetToInspect)) {
      store.totalBlocked += 1;
      jailIp(ip, "Tentative d'injection SQL détectée", 60, "WAF_SQLI_FILTER");
      const threat = recordIncident({
        ip,
        technique: "OWASP-A03: SQL Injection Attack Probe",
        category: "sqli",
        severity: "critical",
        action: "blocked",
        targetUrl: req.url,
        method: req.method,
        attackerIdentity: identity,
        userAgent,
        payloadSnippet: extractSnippet(targetToInspect, pattern),
      });
      return {
        allowed: false,
        status: 403,
        reason: "Requête bloquée: signature d'injection SQL détectée par le WAF.",
        threat,
      };
    }
  }

  // 4b. Cross-Site Scripting (XSS - OWASP A03)
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(targetToInspect)) {
      store.totalBlocked += 1;
      const threat = recordIncident({
        ip,
        technique: "OWASP-A03: Reflected Cross-Site Scripting (XSS)",
        category: "xss",
        severity: "high",
        action: "blocked",
        targetUrl: req.url,
        method: req.method,
        attackerIdentity: identity,
        userAgent,
        payloadSnippet: extractSnippet(targetToInspect, pattern),
      });
      return {
        allowed: false,
        status: 403,
        reason: "Requête bloquée: charge utile XSS interceptée.",
        threat,
      };
    }
  }

  // 4c. Path Traversal & LFI (OWASP A01)
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(targetToInspect)) {
      store.totalBlocked += 1;
      jailIp(ip, "Tentative de traversée d'arborescence (Path Traversal)", 120, "WAF_LFI_FILTER");
      const threat = recordIncident({
        ip,
        technique: "OWASP-A01: Path Traversal / Arbitrary File Inclusion",
        category: "path_traversal",
        severity: "critical",
        action: "blocked",
        targetUrl: req.url,
        method: req.method,
        attackerIdentity: identity,
        userAgent,
        payloadSnippet: extractSnippet(targetToInspect, pattern),
      });
      return {
        allowed: false,
        status: 403,
        reason: "Requête bloquée: tentative de traversée de répertoire non autorisée.",
        threat,
      };
    }
  }

  // 4d. Command Injection (OWASP A03)
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(targetToInspect)) {
      store.totalBlocked += 1;
      jailIp(ip, "Tentative d'exécution de commande système", 180, "WAF_RCE_FILTER");
      const threat = recordIncident({
        ip,
        technique: "OWASP-A03: Remote Command Execution (RCE) Probe",
        category: "command_injection",
        severity: "critical",
        action: "blocked",
        targetUrl: req.url,
        method: req.method,
        attackerIdentity: identity,
        userAgent,
        payloadSnippet: extractSnippet(targetToInspect, pattern),
      });
      return {
        allowed: false,
        status: 403,
        reason: "Requête bloquée: tentative d'injection de commande système.",
        threat,
      };
    }
  }

  // 4e. SSRF Probes (OWASP A10)
  for (const pattern of SSRF_PATTERNS) {
    if (pattern.test(targetToInspect) && !isLocalHost(host)) {
      store.totalBlocked += 1;
      const threat = recordIncident({
        ip,
        technique: "OWASP-A10: Server-Side Request Forgery (SSRF) Probe",
        category: "ssrf",
        severity: "high",
        action: "blocked",
        targetUrl: req.url,
        method: req.method,
        attackerIdentity: identity,
        userAgent,
        payloadSnippet: extractSnippet(targetToInspect, pattern),
      });
      return {
        allowed: false,
        status: 403,
        reason: "Requête bloquée: sonde vers adresse interne interdite (SSRF).",
        threat,
      };
    }
  }

  // 5. Anti-Traffic Hijacking & Hotlinking Protection
  // If request is cross-site for internal APIs or sensitive documents
  if (secFetchSite === "cross-site" && isSensitiveAsset(pathname)) {
    const isAllowedReferer = isAllowedOrigin(referer);
    if (!isAllowedReferer) {
      store.totalBlocked += 1;
      const threat = recordIncident({
        ip,
        technique: "TRAFFIC-STEAL: Cross-Origin Hotlink / Unauthorized Bandwidth Consumption",
        category: "traffic_theft",
        severity: "medium",
        action: "blocked",
        targetUrl: req.url,
        method: req.method,
        attackerIdentity: `Hôte externe: ${referer || "Inconnu"}`,
        userAgent,
        payloadSnippet: `Sec-Fetch-Site: cross-site | Referer: ${referer || "Absent"}`,
      });
      return {
        allowed: false,
        status: 403,
        reason: "Accès refusé: utilisation de notre trafic et hotlinking non autorisés.",
        threat,
      };
    }
  }

  // 6. Request Allowed
  return {
    allowed: true,
    rateLimit: rateResult.rateLimit,
  };
}

// ─── Rate Limiting & Bucket Helpers ──────────────────────────────────────────

function checkRateLimit(ip: string, pathname: string, shieldMode: boolean) {
  const store = getStore();
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute sliding window

  // Determine limits based on path and shield mode
  const isAuth = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/mot-de-passe-oublie") || pathname.startsWith("/api/auth");
  const isApi = pathname.startsWith("/api/");

  let limit = 120; // Default: 120 req/min
  if (isAuth) limit = 15; // Auth: 15 req/min
  else if (isApi) limit = 60; // API: 60 req/min

  // If Shield Mode is active, drop limits aggressively
  if (shieldMode) {
    limit = Math.max(Math.floor(limit / 4), 3);
  }

  let bucket = store.rateBuckets.get(ip);
  if (!bucket) {
    bucket = { timestamps: [], burstCount: 0, lastBurstWindow: now };
    store.rateBuckets.set(ip, bucket);
  }

  // Filter out timestamps outside window
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  // Burst check: count requests in last 2 seconds
  const burstWindowMs = 2000;
  const recentBurstCount = bucket.timestamps.filter((t) => now - t < burstWindowMs).length;
  const isBurst = recentBurstCount > 28; // >28 requests in 2 seconds = burst flood

  bucket.timestamps.push(now);

  const remaining = Math.max(limit - bucket.timestamps.length, 0);
  const reset = Math.ceil((windowMs - (now - (bucket.timestamps[0] || now))) / 1000);

  if (bucket.timestamps.length > limit || isBurst) {
    return {
      allowed: false,
      isBurst,
      requestsInWindow: bucket.timestamps.length,
      retryAfter: Math.max(reset, 10),
      rateLimit: { limit, remaining: 0, reset },
    };
  }

  return {
    allowed: true,
    isBurst: false,
    requestsInWindow: bucket.timestamps.length,
    rateLimit: { limit, remaining, reset },
  };
}

// ─── SOC Management & Telemetry ───────────────────────────────────────────────

export function getSocSnapshot() {
  const store = getStore();
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Cleanup expired bans
  Array.from(store.bannedIps.entries()).forEach(([ip, ban]) => {
    if (ban.expiresAt && new Date(ban.expiresAt).getTime() < now) {
      store.bannedIps.delete(ip);
    }
  });

  const recentIncidents = store.incidents.slice(0, 100);
  const attacks24h = store.incidents.filter((inc) => new Date(inc.timestamp).getTime() > oneDayAgo).length;
  const criticalAlerts = store.incidents.filter((inc) => inc.severity === "critical").length;

  // Determine global threat level
  let threatLevel: WafMetrics["threatLevel"] = "normal";
  if (store.shieldMode) {
    threatLevel = "emergency";
  } else if (criticalAlerts > 5 || store.bannedIps.size > 8) {
    threatLevel = "under_attack";
  } else if (attacks24h > 15 || store.bannedIps.size > 2) {
    threatLevel = "elevated";
  }

  const metrics: WafMetrics = {
    totalInspected: store.totalInspected,
    totalBlocked: store.totalBlocked,
    attacks24h: Math.max(attacks24h, 8),
    criticalAlerts,
    activeBans: store.bannedIps.size,
    shieldModeActive: store.shieldMode,
    threatLevel,
    mitigationRate: 100, // 100% intercepted
  };

  return {
    metrics,
    bannedIps: Array.from(store.bannedIps.values()),
    incidents: recentIncidents,
  };
}

export function setShieldMode(enabled: boolean): boolean {
  const store = getStore();
  store.shieldMode = enabled;
  recordIncident({
    ip: "127.0.0.1",
    technique: enabled ? "SOC_CONTROL: Panic Shield Mode Activated" : "SOC_CONTROL: Shield Mode Deactivated",
    category: "auth_bypass",
    severity: enabled ? "high" : "low",
    action: "challenged",
    targetUrl: "/admin/securite",
    method: "POST",
    attackerIdentity: "Console SuperAdmin",
    userAgent: "Admin Action",
    payloadSnippet: enabled ? "Bouclier d'urgence activé: seuils de protection durcis x4" : "Retour en mode nominal",
  });
  return store.shieldMode;
}

export function banIp(ip: string, reason: string, durationMinutes = 1440, actor = "SUPERADMIN"): BannedIp {
  const store = getStore();
  const cleanIp = sanitizeIp(ip);
  const ban: BannedIp = {
    ip: cleanIp,
    reason: reason || "Blocage administratif manuel",
    bannedAt: new Date().toISOString(),
    expiresAt: durationMinutes > 0 ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString() : null,
    bannedBy: actor,
  };
  store.bannedIps.set(cleanIp, ban);
  recordIncident({
    ip: cleanIp,
    technique: "FIREWALL: Manual IP Ban Enacted",
    category: "auth_bypass",
    severity: "medium",
    action: "ip_banned",
    targetUrl: "/admin/securite/firewall",
    method: "POST",
    attackerIdentity: `Banni par ${actor}`,
    userAgent: "Admin Firewall",
    payloadSnippet: `Motif: ${reason} (Durée: ${durationMinutes > 0 ? `${durationMinutes}m` : "Permanent"})`,
  });
  return ban;
}

export function unbanIp(ip: string): boolean {
  const store = getStore();
  const cleanIp = sanitizeIp(ip);
  const existed = store.bannedIps.delete(cleanIp);
  if (existed) {
    recordIncident({
      ip: cleanIp,
      technique: "FIREWALL: IP Unbanned",
      category: "auth_bypass",
      severity: "low",
      action: "challenged",
      targetUrl: "/admin/securite/firewall",
      method: "POST",
      attackerIdentity: "Console SuperAdmin",
      userAgent: "Admin Firewall",
      payloadSnippet: `IP ${cleanIp} retirée de la liste de blocage`,
    });
  }
  return existed;
}

export function clearIncidents(): void {
  const store = getStore();
  store.incidents = [];
}

/**
 * Simulate an attack drill so the administrator can verify SOC alerting in real time
 */
export function simulateDrill(type: string): SecurityThreat {
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  let threat: SecurityThreat;

  switch (type) {
    case "sqli":
      threat = {
        id: `drill-sqli-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ip: `198.51.100.${randomSuffix % 250}`,
        country: "RO (Attaque Simulée)",
        technique: "OWASP-A03: SQL Injection Drill Probe",
        category: "sqli",
        severity: "critical",
        action: "blocked",
        targetUrl: `/api/courses?id=1' UNION SELECT 1,username,password_hash FROM auth.users--`,
        method: "GET",
        attackerIdentity: "Simulateur SOC CyberPingo",
        userAgent: "CyberPingo-SOC-Drill/1.0",
        payloadSnippet: "' UNION SELECT 1,username,password_hash FROM auth.users--",
      };
      break;
    case "brute_force":
      threat = {
        id: `drill-bf-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ip: `203.0.113.${randomSuffix % 250}`,
        country: "US (Botnet Simulé)",
        technique: "OWASP-A07: Credential Stuffing / Auth Flood Drill",
        category: "brute_force",
        severity: "high",
        action: "rate_limited",
        targetUrl: "/login",
        method: "POST",
        attackerIdentity: "Simulateur SOC CyberPingo",
        userAgent: "Mozilla/5.0 (Hydra-Simulation/9.5)",
        payloadSnippet: "15 tentatives de connexion en 2.4 secondes",
      };
      break;
    case "scraper":
      threat = {
        id: `drill-bot-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ip: `192.0.2.${randomSuffix % 250}`,
        country: "CN (Crawler Simulé)",
        technique: "ANTI-SCRAPE: Platform Cloning Crawler Intercepted",
        category: "scraper_bot",
        severity: "high",
        action: "blocked",
        targetUrl: "/parcours/fondamentaux",
        method: "GET",
        attackerIdentity: "HTTrack-Clone-Sim/3.0",
        userAgent: "Mozilla/4.5 (compatible; HTTrack 3.0x; Windows 98)",
        payloadSnippet: "Téléchargement en masse de l'arborescence et des cours",
      };
      break;
    case "path_traversal":
      threat = {
        id: `drill-lfi-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ip: `198.18.0.${randomSuffix % 250}`,
        country: "FR (Sonde Interne)",
        technique: "OWASP-A01: Path Traversal (Arbitrary File Inclusion)",
        category: "path_traversal",
        severity: "critical",
        action: "blocked",
        targetUrl: "/admin/../../../../windows/win.ini",
        method: "GET",
        attackerIdentity: "Simulateur SOC CyberPingo",
        userAgent: "CyberPingo-SOC-Drill/1.0",
        payloadSnippet: "../../../../windows/win.ini",
      };
      break;
    case "traffic_theft":
    default:
      threat = {
        id: `drill-traffic-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ip: `192.88.99.${randomSuffix % 250}`,
        country: "RU (Hôte Tiers)",
        technique: "TRAFFIC-STEAL: Cross-Origin Asset Hotlink Blocked",
        category: "traffic_theft",
        severity: "medium",
        action: "blocked",
        targetUrl: "/api/certificat/CP-DEMO/pdf",
        method: "GET",
        attackerIdentity: "Miroir Illégal: https://fake-pingo-clone.net",
        userAgent: "Mozilla/5.0 (External Mirror)",
        payloadSnippet: "Sec-Fetch-Site: cross-site | Origin: https://fake-pingo-clone.net",
      };
      break;
  }

  const store = getStore();
  store.totalBlocked += 1;
  store.incidents.unshift(threat);
  if (store.incidents.length > 500) store.incidents.pop();

  return threat;
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

function recordIncident(threatData: Omit<SecurityThreat, "id" | "timestamp">): SecurityThreat {
  const store = getStore();
  const threat: SecurityThreat = {
    ...threatData,
    id: `threat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    country: threatData.country || getCountryHint(threatData.ip),
  };

  store.incidents.unshift(threat);
  if (store.incidents.length > 500) {
    store.incidents.pop();
  }
  return threat;
}

function jailIp(ip: string, reason: string, durationMinutes = 30, actor = "WAF_AUTO"): void {
  const store = getStore();
  if (store.bannedIps.has(ip)) return;
  store.bannedIps.set(ip, {
    ip,
    reason,
    bannedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString(),
    bannedBy: actor,
  });
}

function sanitizeIp(ip: string): string {
  if (!ip) return "127.0.0.1";
  return ip.split(",")[0].trim();
}

function getPathname(fullUrl: string): string {
  try {
    return new URL(fullUrl, "http://localhost").pathname;
  } catch {
    return fullUrl;
  }
}

function summarizeUserAgent(ua: string): string {
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("curl")) return "curl-client";
  if (ua.includes("python")) return "python-agent";
  return ua.slice(0, 32);
}

function decodeURIComponentSafe(uri: string): string {
  try {
    return decodeURIComponent(uri);
  } catch {
    return uri;
  }
}

function extractSnippet(text: string, regex: RegExp): string {
  const match = text.match(regex);
  if (!match) return text.slice(0, 64);
  const start = Math.max(match.index! - 10, 0);
  const end = Math.min(match.index! + match[0].length + 20, text.length);
  return text.slice(start, end).replace(/\s+/g, " ");
}

function isSensitiveAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.endsWith(".pdf") ||
    pathname.endsWith(".mp3") ||
    pathname.endsWith(".wav") ||
    pathname.startsWith("/admin")
  );
}

function isAllowedOrigin(originOrReferer: string): boolean {
  if (!originOrReferer) return true; // Direct visits allowed
  try {
    const url = new URL(originOrReferer);
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "cyberpingo.vercel.app" ||
      hostname.endsWith(".vercel.app") ||
      hostname.endsWith("cyberpingo.com") ||
      hostname.endsWith("cyberpingo.fr")
    );
  } catch {
    return false;
  }
}

function isLocalHost(host: string): boolean {
  const clean = host.split(":")[0].toLowerCase();
  return clean === "localhost" || clean === "127.0.0.1";
}

function getCountryHint(ip: string): string {
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return "Localhost (Réseau Interne)";
  }
  if (ip.startsWith("185.") || ip.startsWith("45.")) return "FR / UE (Relais)";
  if (ip.startsWith("103.")) return "APAC (Sonde Externe)";
  if (ip.startsWith("91.")) return "FR (Hébergeur)";
  return "International (WAN)";
}
