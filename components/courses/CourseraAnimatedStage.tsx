"use client";

import React from "react";
import FigureView from "@/components/figures/Figure";
import type {
  AcademyVideoChapter,
  AcademyVideoVisualSlide,
  VideoDomain,
} from "@/lib/academy-video";

export type CharacterPose = "thinking" | "explaining" | "pointing" | "warning" | "celebrating";

export type CloudSceneKind =
  | "shield-lock"
  | "lan-wan-network"
  | "osi-stack"
  | "cables-fiber"
  | "cli-terminal"
  | "threat-firewall"
  | "server-nas-backup"
  | "lab-investigation";

export function detectCharacterPose(
  sentence: string,
  chapterKind: AcademyVideoChapter["kind"],
  sentenceIndex: number
): CharacterPose {
  const lower = sentence.toLowerCase();
  if (/erreur|piège|attention|risque|danger|attaque|jamais|interdit|mistake|pitfall|risk/iu.test(lower)) {
    return "warning";
  }
  if (/bravo|prêt|valider|retenir|synthèse|félicitations|mission accomplie|ready|summary/iu.test(lower)) {
    return "celebrating";
  }
  if (/commande|terminal|observons|schéma|figure|voici|étape|exemple|inspect/iu.test(lower)) {
    return "pointing";
  }
  if (chapterKind === "pitfalls") return "warning";
  if (chapterKind === "summary") return "celebrating";
  if (chapterKind === "terminal") return "pointing";
  return sentenceIndex % 2 === 0 ? "thinking" : "explaining";
}

export function detectCloudSceneKind(
  sentence: string,
  domain: VideoDomain,
  chapterKind: AcademyVideoChapter["kind"],
  slide?: AcademyVideoVisualSlide,
  sentenceIndex = 0
): CloudSceneKind {
  const corpus = `${sentence} ${slide?.id ?? ""} ${slide?.title ?? ""}`.toLowerCase();

  if (
    /osi|7 couches|sept couches|encapsulation|pdu|modèle tcp|couche 1|couche 2|couche 3|couche 7/iu.test(
      corpus
    )
  ) {
    return "osi-stack";
  }
  if (
    /câble|cable|rj45|fibre|optique|wi-fi|wifi|radio|brassage|baie|port|led|physique/iu.test(corpus)
  ) {
    return "cables-fiber";
  }
  if (
    /terminal|commande|ping|ip addr|wireshark|pcap|tcpdump|nmap|grep|awk|cli|ssh|chmod|journal|log/iu.test(
      corpus
    ) ||
    chapterKind === "terminal"
  ) {
    return "cli-terminal";
  }
  if (
    /erreur|piège|attaque|phishing|hameçonnage|usurp|pare-feu|firewall|bloquer|menace|intrusion|brute|risque/iu.test(
      corpus
    ) ||
    chapterKind === "pitfalls"
  ) {
    return "threat-firewall";
  }
  if (/serveur|nas|sauvegarde|3-2-1|raid|stockage|chiffrement|sha-256|hash|tls|certificat/iu.test(corpus)) {
    return "server-nas-backup";
  }
  if (
    /laboratoire|packet tracer|mission|investigation|indice|étape|flag|scénario|enquête/iu.test(corpus) &&
    chapterKind === "summary"
  ) {
    return "lab-investigation";
  }
  if (
    /lan|wan|switch|commutateur|routeur|box|imprimante|poste|atelier|réseau local|passerelle|ip|mac|arp|dns|vlan/iu.test(
      corpus
    )
  ) {
    return "lan-wan-network";
  }
  if (/authentification|mfa|mot de passe|fido|yubikey|sécurité|confidentialité|intégrité|disponibilité|cid| accès/iu.test(corpus)) {
    return "shield-lock";
  }

  // Fallback rotation by domain + sentence index so every sentence shows a rich animation
  const domainDefaults: Record<VideoDomain, CloudSceneKind[]> = {
    fundamentals: ["shield-lock", "threat-firewall", "server-nas-backup", "lan-wan-network"],
    network: ["lan-wan-network", "cables-fiber", "cli-terminal", "shield-lock"],
    osi: ["osi-stack", "lan-wan-network", "cables-fiber", "cli-terminal"],
    linux: ["cli-terminal", "server-nas-backup", "shield-lock", "threat-firewall"],
    logs: ["cli-terminal", "lab-investigation", "threat-firewall", "server-nas-backup"],
    web: ["shield-lock", "threat-firewall", "server-nas-backup", "cli-terminal"],
    pentest: ["lab-investigation", "cli-terminal", "threat-firewall", "shield-lock"],
    crypto: ["shield-lock", "server-nas-backup", "threat-firewall", "cli-terminal"],
  };
  const pool = domainDefaults[domain] ?? domainDefaults.fundamentals;
  return pool[sentenceIndex % pool.length] ?? "shield-lock";
}

interface CourseraAnimatedStageProps {
  chapter: AcademyVideoChapter;
  domain: VideoDomain;
  activeSlide?: AcademyVideoVisualSlide;
  chapterSlides: AcademyVideoVisualSlide[];
  activeSlideIndex: number;
  safeCaptionIndex: number;
  totalCaptions: number;
  activeCaption: string;
  activeConceptTag: string;
  activeKeywords: string[];
  activeBulletIndex: number;
  visibleTerminalStepCount: number;
  isPlaying: boolean;
  voiceActive: boolean;
  isEn: boolean;
  onSelectSlide: (idx: number) => void;
}

export default function CourseraAnimatedStage({
  chapter,
  domain,
  activeSlide,
  chapterSlides,
  activeSlideIndex,
  safeCaptionIndex,
  totalCaptions,
  activeCaption,
  activeConceptTag,
  activeKeywords,
  activeBulletIndex,
  visibleTerminalStepCount,
  isPlaying,
  voiceActive,
  isEn,
  onSelectSlide,
}: CourseraAnimatedStageProps) {
  const pose = detectCharacterPose(activeCaption, chapter.kind, safeCaptionIndex);
  const sceneKind = detectCloudSceneKind(
    activeCaption,
    domain,
    chapter.kind,
    activeSlide,
    safeCaptionIndex
  );
  const animKey = `${chapter.id}-s${safeCaptionIndex}-${sceneKind}`;

  return (
    <div
      className="coursera-stage-canvas"
      data-playing={isPlaying ? "true" : "false"}
      data-speaking={voiceActive ? "true" : "false"}
      data-pose={pose}
      data-scene={sceneKind}
    >
      {/* LEFT COLUMN: Articulated Animated Instructor Character (Coursera / Google style) */}
      <div className="coursera-stage__character-col">
        <div className="coursera-character-wrap" data-pose={pose} data-speaking={voiceActive ? "true" : "false"}>
          <svg
            viewBox="0 0 320 420"
            className="coursera-character-svg"
            role="img"
            aria-label={isEn ? "Animated cybersecurity instructor" : "Formatrice cybersécurité animée"}
          >
            <defs>
              <linearGradient id="cpHairGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#111318" />
                <stop offset="100%" stopColor="#050608" />
              </linearGradient>
              <linearGradient id="cpTopGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f0592b" />
                <stop offset="100%" stopColor="#d94318" />
              </linearGradient>
              <linearGradient id="cpPantsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7e22ce" />
                <stop offset="100%" stopColor="#581c87" />
              </linearGradient>
              <filter id="cpSoftShadow" x="-15%" y="-15%" width="130%" height="130%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1e293b" floodOpacity="0.12" />
              </filter>
            </defs>

            {/* Back flowing hair */}
            <g className="coursera-char__hair-back">
              <path
                d="M115 74 C82 95, 76 175, 86 245 C92 260, 118 265, 132 252 L198 248 C215 245, 224 185, 212 115 C204 82, 175 64, 148 66 Z"
                fill="url(#cpHairGrad)"
              />
            </g>

            {/* Breathing Upper Body + Legs */}
            <g className="coursera-char__body">
              {/* Left Arm on Hip (Coursera confident posture) */}
              <g className="coursera-char__arm-left">
                <path
                  d="M118 192 L62 252 L112 308 L122 294 L88 252 L130 212 Z"
                  fill="#8d583e"
                />
                {/* Hand on hip */}
                <path
                  d="M108 296 C118 294, 128 302, 125 314 C120 320, 108 316, 104 306 Z"
                  fill="#8d583e"
                />
              </g>

              {/* Trousers / Lower Body */}
              <path
                d="M116 322 L202 322 L214 420 L168 420 L158 368 L148 420 L102 420 Z"
                fill="url(#cpPantsGrad)"
              />

              {/* Torso / Orange Sleeveless Top */}
              <path
                d="M122 184 C138 192, 176 192, 192 184 L204 326 L112 326 Z"
                fill="url(#cpTopGrad)"
                filter="url(#cpSoftShadow)"
              />

              {/* Neck & Collarbone */}
              <path
                d="M145 152 L171 152 L175 190 C164 198, 150 198, 141 190 Z"
                fill="#8d583e"
              />
              <path d="M145 162 Q158 172 171 160" stroke="#6f412b" strokeWidth="2" fill="none" opacity="0.55" />

              {/* Head Group (nods & tilts with speech) */}
              <g className="coursera-char__head">
                {/* Gold Left & Right Earrings */}
                <rect
                  x="114"
                  y="134"
                  width="5.5"
                  height="22"
                  rx="2.5"
                  fill="#f59e0b"
                  className="coursera-char__earring"
                />
                <rect
                  x="198"
                  y="132"
                  width="5.5"
                  height="20"
                  rx="2.5"
                  fill="#f59e0b"
                  className="coursera-char__earring"
                />

                {/* Face Base */}
                <path
                  d="M122 92 C122 65, 196 65, 196 95 C198 135, 188 164, 160 166 C132 164, 120 136, 122 92 Z"
                  fill="#8d583e"
                />

                {/* Front Hair Sweep */}
                <path
                  d="M116 105 C118 66, 165 56, 194 78 C202 86, 206 104, 202 122 C192 102, 176 88, 158 84 C142 98, 128 108, 116 112 Z"
                  fill="url(#cpHairGrad)"
                />

                {/* Eyebrows (expressive) */}
                <g className="coursera-char__brows">
                  <path
                    d="M136 104 Q146 99 154 103"
                    stroke="#1c1917"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M168 103 Q177 98 186 103"
                    stroke="#1c1917"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>

                {/* Blinking Eyes looking toward the illustration cloud */}
                <g className="coursera-char__eyes">
                  <ellipse cx="146" cy="114" rx="4.2" ry="4.5" fill="#111827" />
                  <circle cx="147.5" cy="112.5" r="1.4" fill="#ffffff" />
                  <ellipse cx="177" cy="114" rx="4.2" ry="4.5" fill="#111827" />
                  <circle cx="178.5" cy="112.5" r="1.4" fill="#ffffff" />
                </g>

                {/* Nose */}
                <path
                  d="M162 114 L166 128 L158 130"
                  stroke="#683b26"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />

                {/* Animated Lip-Sync Mouth */}
                <g className="coursera-char__mouth">
                  {/* Idle / Smiling mouth */}
                  <path
                    className="coursera-mouth-smile"
                    d="M148 140 Q162 152 175 139 Z"
                    fill="#ffffff"
                    stroke="#5c2f1c"
                    strokeWidth="1.5"
                  />
                  {/* Speaking open vowel mouth (animated via CSS when voiceActive="true") */}
                  <ellipse
                    className="coursera-mouth-talk"
                    cx="162"
                    cy="143"
                    rx="9"
                    ry="6.5"
                    fill="#451a14"
                  />
                  <path
                    className="coursera-mouth-teeth"
                    d="M154 139 L170 139 L169 142 L155 142 Z"
                    fill="#ffffff"
                  />
                  <ellipse
                    className="coursera-mouth-tongue"
                    cx="162"
                    cy="147"
                    rx="5.5"
                    ry="2.5"
                    fill="#ef4444"
                  />
                </g>
              </g>

              {/* Right Arm (Dynamic gesture based on pose: thinking chin touch OR explaining open palm OR pointing) */}
              <g className="coursera-char__arm-right">
                {pose === "thinking" ? (
                  /* Thinking pose matching screenshot: elbow down, hand raised to chin */
                  <g className="coursera-arm-pose coursera-arm-pose--thinking">
                    <path
                      d="M190 192 L222 262 L185 162"
                      stroke="#8d583e"
                      strokeWidth="22"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    {/* Hand & Finger near chin */}
                    <circle cx="182" cy="158" r="11" fill="#8d583e" />
                    <path
                      d="M178 154 L170 143"
                      stroke="#8d583e"
                      strokeWidth="6.5"
                      strokeLinecap="round"
                    />
                  </g>
                ) : pose === "pointing" ? (
                  /* Pointing directly toward the animated cloud diagram */
                  <g className="coursera-arm-pose coursera-arm-pose--pointing">
                    <path
                      d="M190 194 L232 232 L278 192"
                      stroke="#8d583e"
                      strokeWidth="21"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <circle cx="282" cy="189" r="10" fill="#8d583e" />
                    <path
                      d="M286 187 L304 178"
                      stroke="#8d583e"
                      strokeWidth="6.5"
                      strokeLinecap="round"
                    />
                  </g>
                ) : (
                  /* Explaining / Presenting open hand gesture */
                  <g className="coursera-arm-pose coursera-arm-pose--explaining">
                    <path
                      d="M190 194 L228 246 L268 216"
                      stroke="#8d583e"
                      strokeWidth="21"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <ellipse
                      cx="275"
                      cy="212"
                      rx="13"
                      ry="8"
                      transform="rotate(-22 275 212)"
                      fill="#8d583e"
                    />
                  </g>
                )}
              </g>
            </g>

            {/* Floating thought bubbles connecting Character to the Cloud (exact Coursera style) */}
            <circle
              cx="248"
              cy="170"
              r="7.5"
              fill="#dce6fb"
              className="coursera-thought-dot coursera-thought-dot--1"
            />
            <circle
              cx="276"
              cy="148"
              r="12"
              fill="#dce6fb"
              className="coursera-thought-dot coursera-thought-dot--2"
            />
          </svg>

          {/* Character & Pingo Companion Badge */}
          <div className="coursera-instructor-pill">
            <img
              src="/images/mascot/professeur-pingo-face.png"
              alt="Professeur Pingo"
              className="coursera-instructor-pill__avatar"
            />
            <div>
              <strong>Awa & Prof. Pingo</strong>
              <small>
                {voiceActive
                  ? isEn
                    ? "Speaking live..."
                    : "Explication vocale en cours..."
                  : isEn
                    ? "CyberPingo Instructor"
                    : "Instructeurs CyberPingo"}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Animated Periwinkle Cloud + Dynamic Multi-Part Illustrations */}
      <div className="coursera-stage__cloud-col">
        <div key={animKey} className="coursera-cloud-container">
          {/* Animated Cloud Backdrop SVG */}
          <svg
            viewBox="0 0 680 390"
            className="coursera-cloud-bg-svg"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <path
              d="M115 318
                 C54 316, 20 272, 34 218
                 C14 176, 38 122, 88 112
                 C104 62, 168 38, 224 62
                 C268 22, 352 20, 398 58
                 C454 30, 534 48, 558 102
                 C618 108, 656 158, 638 214
                 C658 266, 620 318, 560 322
                 C522 356, 444 360, 396 336
                 C340 364, 252 362, 204 332
                 C168 346, 134 336, 115 318 Z"
              fill="#dce6fb"
            />
          </svg>

          {/* Foreground Content Inside the Cloud */}
          <div className="coursera-cloud-content">
            {/* Top Concept Header inside Cloud */}
            <div className="coursera-cloud-header">
              <span className="coursera-cloud-step-badge">
                {chapter.badge} · {safeCaptionIndex + 1}/{Math.max(1, totalCaptions)}
              </span>
              <span className="coursera-cloud-concept-pill">
                <i className="coursera-cloud-concept-dot" />
                {activeConceptTag}
              </span>
            </div>

            {/* Main Centerpiece: Animated Vector Scene + Synchronized Equipment Visual */}
            <div className="coursera-cloud-main-grid">
              {/* Left of Cloud: Custom Animated Vector Illustration matched to current sentence */}
              <div className="coursera-vector-scene">
                {sceneKind === "shield-lock" && (
                  <svg viewBox="0 0 260 220" className="coursera-vector-svg">
                    {/* Pulsing halo rings */}
                    <circle cx="130" cy="110" r="88" fill="#bfdbfe" opacity="0.45" className="cv-pulse-ring" />
                    <circle cx="130" cy="110" r="68" fill="#93c5fd" opacity="0.35" className="cv-pulse-ring cv-pulse-ring--delay" />
                    {/* 3D Green Security Shield (exact Coursera screenshot style) */}
                    <g className="cv-float-main">
                      <path
                        d="M130 22 L206 54 C206 122, 182 172, 130 198 C78 172, 54 122, 54 54 Z"
                        fill="#43a047"
                      />
                      <path
                        d="M130 22 L206 54 C206 122, 182 172, 130 198 Z"
                        fill="#2e7d32"
                      />
                      <path
                        d="M130 38 L188 63 C188 116, 168 156, 130 178 C92 156, 72 116, 72 63 Z"
                        fill="#66bb6a"
                      />
                      <path
                        d="M130 38 L188 63 C188 116, 168 156, 130 178 Z"
                        fill="#388e3c"
                      />
                      {/* Animated Golden Padlock */}
                      <g className="cv-padlock">
                        <path
                          className="cv-padlock__shackle"
                          d="M108 100 L108 76 C108 60, 152 60, 152 76 L152 100"
                          fill="none"
                          stroke="#f8fafc"
                          strokeWidth="12"
                          strokeLinecap="round"
                        />
                        <rect x="94" y="96" width="72" height="56" rx="10" fill="#fbc02d" />
                        <rect x="130" y="96" width="36" height="56" rx="6" fill="#f57f17" />
                        <circle cx="130" cy="118" r="7" fill="#78350f" />
                        <rect x="127" y="122" width="6" height="15" rx="3" fill="#78350f" />
                      </g>
                    </g>
                    {/* Floating Orbiting Security Badges */}
                    <g className="cv-orbit-badge cv-orbit-badge--1">
                      <rect x="16" y="36" width="54" height="24" rx="12" fill="#ffffff" stroke="#3b82f6" strokeWidth="2" />
                      <text x="43" y="52" textAnchor="middle" fill="#1e3a8a" fontSize="11" fontWeight="700">MFA ✓</text>
                    </g>
                    <g className="cv-orbit-badge cv-orbit-badge--2">
                      <rect x="188" y="148" width="58" height="24" rx="12" fill="#ffffff" stroke="#16a34a" strokeWidth="2" />
                      <text x="217" y="164" textAnchor="middle" fill="#14532d" fontSize="11" fontWeight="700">C · I · D</text>
                    </g>
                  </svg>
                )}

                {sceneKind === "lan-wan-network" && (
                  <svg viewBox="0 0 280 220" className="coursera-vector-svg">
                    {/* Network Links */}
                    <line x1="58" y1="62" x2="136" y2="112" stroke="#60a5fa" strokeWidth="4" strokeDasharray="6 4" className="cv-net-line" />
                    <line x1="58" y1="162" x2="136" y2="112" stroke="#60a5fa" strokeWidth="4" strokeDasharray="6 4" className="cv-net-line" />
                    <line x1="136" y1="112" x2="224" y2="112" stroke="#2563eb" strokeWidth="5" />

                    {/* Animated Moving Packets */}
                    <circle cx="58" cy="62" r="6" fill="#10b981" className="cv-packet cv-packet--lan1" />
                    <circle cx="58" cy="162" r="6" fill="#3b82f6" className="cv-packet cv-packet--lan2" />
                    <circle cx="136" cy="112" r="7" fill="#f59e0b" className="cv-packet cv-packet--wan" />

                    {/* PC Workstation Node */}
                    <g className="cv-node-pop" transform="translate(22, 34)">
                      <rect x="0" y="0" width="68" height="46" rx="8" fill="#1e3a8a" />
                      <rect x="5" y="5" width="58" height="32" rx="4" fill="#60a5fa" />
                      <rect x="22" y="46" width="24" height="6" fill="#475569" />
                      <text x="34" y="25" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="700">PC LAN</text>
                    </g>

                    {/* Printer / Local Host Node */}
                    <g className="cv-node-pop cv-node-pop--delay1" transform="translate(22, 134)">
                      <rect x="4" y="12" width="60" height="34" rx="6" fill="#334155" />
                      <rect x="14" y="2" width="40" height="14" rx="3" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
                      <circle cx="52" cy="24" r="3" fill="#22c55e" />
                      <text x="34" y="36" textAnchor="middle" fill="#f8fafc" fontSize="9.5" fontWeight="700">IMPRIMANTE</text>
                    </g>

                    {/* Central Switch Node */}
                    <g className="cv-node-pop cv-node-pop--delay2" transform="translate(100, 86)">
                      <rect x="0" y="0" width="76" height="50" rx="10" fill="#0284c7" />
                      <rect x="8" y="10" width="60" height="12" rx="3" fill="#0f172a" />
                      <circle cx="16" cy="16" r="2.5" fill="#4ade80" className="cv-led-blink" />
                      <circle cx="26" cy="16" r="2.5" fill="#4ade80" className="cv-led-blink" />
                      <circle cx="36" cy="16" r="2.5" fill="#fbbf24" className="cv-led-blink" />
                      <circle cx="46" cy="16" r="2.5" fill="#4ade80" className="cv-led-blink" />
                      <text x="38" y="39" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="800">SWITCH L2</text>
                    </g>

                    {/* WAN Router / Gateway Node */}
                    <g className="cv-node-pop cv-node-pop--delay3" transform="translate(194, 78)">
                      <circle cx="34" cy="34" r="34" fill="#16a34a" />
                      <path d="M18 34 L50 34 M34 18 L34 50" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
                      <text x="34" y="82" textAnchor="middle" fill="#0f172a" fontSize="10.5" fontWeight="800">ROUTEUR WAN</text>
                    </g>
                  </svg>
                )}

                {sceneKind === "osi-stack" && (
                  <svg viewBox="0 0 270 220" className="coursera-vector-svg">
                    {[
                      { num: 7, name: "Application (HTTP, DNS)", color: "#2563eb" },
                      { num: 6, name: "Présentation (TLS)", color: "#3b82f6" },
                      { num: 5, name: "Session", color: "#0284c7" },
                      { num: 4, name: "Transport (TCP/UDP)", color: "#0d9488" },
                      { num: 3, name: "Réseau (IP / Routeur)", color: "#16a34a" },
                      { num: 2, name: "Liaison (MAC / Switch)", color: "#d97706" },
                      { num: 1, name: "Physique (Câble / Fibre)", color: "#e11d48" },
                    ].map((layer, idx) => (
                      <g
                        key={layer.num}
                        className="cv-osi-bar"
                        style={{ animationDelay: `${idx * 70}ms` }}
                        transform={`translate(24, ${12 + idx * 28})`}
                      >
                        <rect x="0" y="0" width="222" height="23" rx="6" fill={layer.color} />
                        <text x="12" y="15.5" fill="#ffffff" fontSize="11" fontWeight="800">
                          {layer.num}. {layer.name}
                        </text>
                      </g>
                    ))}
                  </svg>
                )}

                {sceneKind === "cables-fiber" && (
                  <svg viewBox="0 0 270 220" className="coursera-vector-svg">
                    {/* Ethernet RJ45 Jack & Cable */}
                    <g className="cv-float-main">
                      <path d="M18 85 Q80 85 118 85" stroke="#2563eb" strokeWidth="14" strokeLinecap="round" />
                      <rect x="112" y="66" width="46" height="38" rx="6" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
                      <rect x="168" y="54" width="76" height="62" rx="10" fill="#1e293b" />
                      <circle cx="186" cy="72" r="4.5" fill="#22c55e" className="cv-led-blink" />
                      <circle cx="224" cy="72" r="4.5" fill="#f59e0b" className="cv-led-blink" />
                      <text x="206" y="102" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700">PORT RJ45</text>
                    </g>
                    {/* Fiber Optic Laser Pulse */}
                    <g transform="translate(20, 145)">
                      <rect x="0" y="12" width="230" height="18" rx="9" fill="#0f172a" />
                      <line x1="12" y1="21" x2="218" y2="21" stroke="#38bdf8" strokeWidth="4" strokeDasharray="14 8" className="cv-net-line" />
                      <circle cx="40" cy="21" r="6" fill="#3efa95" className="cv-packet cv-packet--wan" />
                      <text x="115" y="48" textAnchor="middle" fill="#1e3a8a" fontSize="11" fontWeight="800">
                        FIBRE OPTIQUE · IMPULSION LUMINEUSE
                      </text>
                    </g>
                  </svg>
                )}

                {sceneKind === "cli-terminal" && (
                  <svg viewBox="0 0 280 220" className="coursera-vector-svg">
                    <g className="cv-float-main">
                      <rect x="14" y="20" width="252" height="176" rx="14" fill="#0f172a" stroke="#3b82f6" strokeWidth="3" />
                      <rect x="14" y="20" width="252" height="30" rx="12" fill="#1e293b" />
                      <circle cx="32" cy="35" r="5" fill="#ef4444" />
                      <circle cx="48" cy="35" r="5" fill="#f59e0b" />
                      <circle cx="64" cy="35" r="5" fill="#22c55e" />
                      <text x="140" y="39" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="700">
                        analyst@cyberpingo:~
                      </text>
                      <text x="28" y="76" fill="#38bdf8" fontSize="12" fontFamily="monospace" fontWeight="700">
                        $ {(chapter.terminalSteps?.[0]?.command || "ping -c 4 192.168.1.1").slice(0, 26)}
                      </text>
                      <text x="28" y="102" fill="#a7f3d0" fontSize="11" fontFamily="monospace">
                        64 bytes: icmp_seq=1 ttl=64
                      </text>
                      <text x="28" y="122" fill="#a7f3d0" fontSize="11" fontFamily="monospace">
                        0% packet loss · LINK UP ✓
                      </text>
                      <rect x="28" y="144" width="196" height="32" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                      <text x="126" y="164" textAnchor="middle" fill="#ecfdf5" fontSize="11.5" fontWeight="700">
                        ✓ Preuve technique vérifiée
                      </text>
                    </g>
                  </svg>
                )}

                {sceneKind === "threat-firewall" && (
                  <svg viewBox="0 0 280 220" className="coursera-vector-svg">
                    {/* Incoming Red Threat Arrows blocked by Blue Firewall Shield */}
                    <g className="cv-threat-arrows">
                      <path d="M18 76 L92 76" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
                      <polygon points="96,76 80,66 80,86" fill="#ef4444" />
                      <path d="M18 134 L92 134" stroke="#f97316" strokeWidth="6" strokeLinecap="round" />
                      <polygon points="96,134 80,124 80,144" fill="#f97316" />
                      <text x="54" y="56" textAnchor="middle" fill="#b91c1c" fontSize="10.5" fontWeight="800">MENACE</text>
                    </g>

                    {/* Firewall Wall */}
                    <g className="cv-float-main">
                      <rect x="112" y="34" width="38" height="148" rx="8" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" />
                      <line x1="112" y1="70" x2="150" y2="70" stroke="#93c5fd" strokeWidth="2" />
                      <line x1="112" y1="108" x2="150" y2="108" stroke="#93c5fd" strokeWidth="2" />
                      <line x1="112" y1="146" x2="150" y2="146" stroke="#93c5fd" strokeWidth="2" />
                      <text x="131" y="200" textAnchor="middle" fill="#1e3a8a" fontSize="10.5" fontWeight="800">PARE-FEU</text>
                    </g>

                    {/* Protected Green Zone */}
                    <g className="cv-node-pop" transform="translate(174, 58)">
                      <path d="M44 10 L82 26 C82 68, 66 96, 44 112 C22 96, 6 68, 6 26 Z" fill="#16a34a" />
                      <path d="M30 58 L41 69 L60 46" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </g>
                  </svg>
                )}

                {sceneKind === "server-nas-backup" && (
                  <svg viewBox="0 0 280 220" className="coursera-vector-svg">
                    <g className="cv-float-main">
                      {/* Server Rack */}
                      <rect x="36" y="28" width="96" height="156" rx="10" fill="#1e293b" stroke="#475569" strokeWidth="3" />
                      {[0, 1, 2].map((slot) => (
                        <g key={slot} transform={`translate(48, ${44 + slot * 44})`}>
                          <rect x="0" y="0" width="72" height="30" rx="5" fill="#0f172a" />
                          <circle cx="14" cy="15" r="4" fill="#22c55e" className="cv-led-blink" />
                          <circle cx="28" cy="15" r="4" fill="#38bdf8" className="cv-led-blink" />
                          <rect x="42" y="11" width="22" height="8" rx="3" fill="#334155" />
                        </g>
                      ))}
                      {/* Encrypted Backup Cloud / NAS */}
                      <path d="M138 106 L176 106" stroke="#16a34a" strokeWidth="5" strokeDasharray="6 4" className="cv-net-line" />
                      <rect x="176" y="58" width="78" height="96" rx="14" fill="#0284c7" />
                      <circle cx="215" cy="96" r="18" fill="#fef08a" />
                      <text x="215" y="101" textAnchor="middle" fill="#854d0e" fontSize="14" fontWeight="900">🔒</text>
                      <text x="215" y="136" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="800">SAUVEGARDE</text>
                    </g>
                  </svg>
                )}

                {sceneKind === "lab-investigation" && (
                  <svg viewBox="0 0 280 220" className="coursera-vector-svg">
                    <g className="cv-float-main">
                      <rect x="26" y="34" width="180" height="142" rx="12" fill="#ffffff" stroke="#3b82f6" strokeWidth="3" />
                      <rect x="44" y="54" width="90" height="12" rx="6" fill="#2563eb" />
                      <rect x="44" y="78" width="140" height="10" rx="5" fill="#93c5fd" />
                      <rect x="44" y="98" width="120" height="10" rx="5" fill="#bfdbfe" />
                      <rect x="44" y="124" width="84" height="28" rx="8" fill="#16a34a" />
                      <text x="86" y="142" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800">PREUVE ✓</text>

                      {/* Animated Magnifying Glass */}
                      <g className="cv-loupe">
                        <circle cx="182" cy="112" r="34" fill="rgba(56, 189, 248, 0.22)" stroke="#0284c7" strokeWidth="7" />
                        <line x1="206" y1="136" x2="238" y2="168" stroke="#0f172a" strokeWidth="10" strokeLinecap="round" />
                      </g>
                    </g>
                  </svg>
                )}
              </div>

              {/* Right of Cloud: Synchronized Equipment / Schema Card & Key Takeaways */}
              <div className="coursera-cloud-card">
                {chapter.figure && (chapter.kind === "diagram" || chapter.kind === "mechanism") ? (
                  <div className="coursera-cloud-figure-mini">
                    <FigureView figure={chapter.figure} />
                  </div>
                ) : (
                  activeSlide && (
                    <div className="coursera-cloud-slide-card">
                      <div className="coursera-cloud-slide-card__media">
                        <img
                          src={activeSlide.src}
                          alt={activeSlide.alt}
                          className={activeSlide.kind === "topology" ? "is-diagram" : ""}
                        />
                        <span className="coursera-cloud-slide-card__badge">{activeSlide.badge}</span>
                      </div>
                      <div className="coursera-cloud-slide-card__body">
                        <strong>{activeSlide.title}</strong>
                        <p>{activeSlide.caption}</p>
                        {(activeSlide.risk || activeSlide.habit) && (
                          <div className="coursera-cloud-slide-card__tips">
                            {activeSlide.risk && (
                              <span className="coursera-tip coursera-tip--risk">
                                <b>{isEn ? "Risk:" : "Risque :"}</b> {activeSlide.risk}
                              </span>
                            )}
                            {activeSlide.habit && (
                              <span className="coursera-tip coursera-tip--habit">
                                <b>{isEn ? "Reflex:" : "Réflexe :"}</b> {activeSlide.habit}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}

                {/* Animated Keyword Chips that pop in as the sentence is spoken */}
                {activeKeywords.length > 0 && (
                  <div className="coursera-keyword-row">
                    {activeKeywords.map((kw, idx) => (
                      <span
                        key={`${animKey}-kw-${idx}`}
                        className="coursera-keyword-pill"
                        style={{ animationDelay: `${idx * 95}ms` }}
                      >
                        <span aria-hidden="true">✦</span> {kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Active Chapter Bullet / Terminal Step Highlight */}
                {chapter.kind === "terminal" && chapter.terminalSteps?.length ? (
                  <div className="coursera-mini-cli">
                    <code>
                      $ {chapter.terminalSteps[Math.min(chapter.terminalSteps.length - 1, visibleTerminalStepCount - 1)]?.command}
                    </code>
                    <small>
                      {chapter.terminalSteps[Math.min(chapter.terminalSteps.length - 1, visibleTerminalStepCount - 1)]?.note}
                    </small>
                  </div>
                ) : (
                  chapter.bullets.length > 0 && (
                    <div className="coursera-active-bullet">
                      <span className="coursera-active-bullet__num">{activeBulletIndex + 1}</span>
                      <p>{chapter.bullets[activeBulletIndex] ?? chapter.bullets[0]}</p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Bottom Storyboard Strip inside the Stage */}
            {chapterSlides.length > 1 && (
              <div
                className="coursera-storyboard-strip"
                role="tablist"
                aria-label={isEn ? "Sentence illustrations" : "Illustrations synchronisées phrase par phrase"}
              >
                {chapterSlides.map((slide, idx) => {
                  const isCurrent = idx === activeSlideIndex;
                  const isDone = idx < activeSlideIndex;
                  return (
                    <button
                      key={`${slide.id}-${idx}`}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      className={`coursera-storyboard-chip ${isCurrent ? "is-current" : isDone ? "is-done" : ""}`}
                      onClick={() => onSelectSlide(idx)}
                      title={`${idx + 1}. ${slide.title}`}
                    >
                      <img src={slide.src} alt="" loading="lazy" />
                      <span>{slide.title}</span>
                      <small>{isCurrent && voiceActive ? "🔊" : isDone ? "✓" : idx + 1}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
