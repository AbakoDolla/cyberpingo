"use client";

import React, { useState } from "react";
import FigureView from "@/components/figures/Figure";
import { FigureGlyph } from "@/components/figures/icons";
import Pingo, { type PingoState } from "@/components/mascot/Pingo";
import type {
  AcademyVideoChapter,
  AcademyVideoVisualSlide,
  VideoDomain,
} from "@/lib/academy-video";

export type CharacterPose =
  | "thinking"
  | "explaining"
  | "pointing"
  | "warning"
  | "celebrating";

export type CloudSceneKind =
  | "shield-lock"
  | "lan-wan-network"
  | "osi-stack"
  | "cables-fiber"
  | "cli-terminal"
  | "threat-firewall"
  | "server-nas-backup"
  | "lab-investigation";

const SCENE_TONE_RGB: Record<CloudSceneKind, string> = {
  "shield-lock": "0 213 255",
  "lan-wan-network": "86 150 255",
  "osi-stack": "172 126 255",
  "cables-fiber": "255 184 107",
  "cli-terminal": "62 250 149",
  "threat-firewall": "255 107 125",
  "server-nas-backup": "0 213 255",
  "lab-investigation": "172 126 255",
};

const EQUALIZER_BARS = [34, 68, 52, 88, 60, 96, 72, 46, 84, 58, 92, 64, 48, 78, 54, 40];

export function detectCharacterPose(
  sentence: string,
  chapterKind: AcademyVideoChapter["kind"],
  sentenceIndex: number
): CharacterPose {
  const lower = sentence.toLowerCase();
  if (
    /erreur|piège|attention|risque|danger|attaque|jamais|interdit|mistake|pitfall|risk/iu.test(
      lower
    )
  ) {
    return "warning";
  }
  if (
    /bravo|prêt|valider|retenir|synthèse|félicitations|mission accomplie|ready|summary/iu.test(
      lower
    )
  ) {
    return "celebrating";
  }
  if (
    /commande|terminal|observons|schéma|figure|voici|étape|exemple|inspect/iu.test(
      lower
    )
  ) {
    return "pointing";
  }
  if (chapterKind === "pitfalls") return "warning";
  if (chapterKind === "summary") return "celebrating";
  if (chapterKind === "terminal") return "pointing";
  return sentenceIndex % 2 === 0 ? "explaining" : "thinking";
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
    /câble|cable|rj45|fibre|optique|wi-fi|wifi|radio|brassage|baie|port|led|physique/iu.test(
      corpus
    )
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
  if (
    /serveur|nas|sauvegarde|3-2-1|raid|stockage|chiffrement|sha-256|hash|tls|certificat/iu.test(
      corpus
    )
  ) {
    return "server-nas-backup";
  }
  if (
    /laboratoire|packet tracer|mission|investigation|indice|étape|flag|scénario|enquête/iu.test(
      corpus
    ) &&
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
  if (
    /authentification|mfa|mot de passe|fido|yubikey|sécurité|confidentialité|intégrité|disponibilité|cid|accès/iu.test(
      corpus
    )
  ) {
    return "shield-lock";
  }

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

function mapPoseToPingoState(
  pose: CharacterPose,
  sceneKind: CloudSceneKind,
  voiceActive: boolean
): PingoState {
  if (sceneKind === "cli-terminal" && voiceActive) return "typing";
  if (pose === "celebrating") return "celebrate";
  if (pose === "warning") return "sad";
  if (pose === "thinking") return "thinking";
  if (pose === "pointing") return "explain";
  return voiceActive ? "explain" : "welcome";
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
  const [showFullFigure, setShowFullFigure] = useState(false);

  const pose = detectCharacterPose(activeCaption, chapter.kind, safeCaptionIndex);
  const sceneKind = detectCloudSceneKind(
    activeCaption,
    domain,
    chapter.kind,
    activeSlide,
    safeCaptionIndex
  );
  const pingoState = mapPoseToPingoState(pose, sceneKind, voiceActive);
  const stageRgb = SCENE_TONE_RGB[sceneKind] ?? "0 213 255";
  const animKey = `${chapter.id}-s${safeCaptionIndex}-${sceneKind}`;

  const activeTermStep =
    chapter.terminalSteps?.[
      Math.min(
        Math.max(0, (chapter.terminalSteps?.length ?? 1) - 1),
        Math.max(0, visibleTerminalStepCount - 1)
      )
    ];

  return (
    <div
      className="coursera-stage-canvas"
      data-playing={isPlaying ? "true" : "false"}
      data-speaking={voiceActive ? "true" : "false"}
      data-pose={pose}
      data-scene={sceneKind}
      style={{ ["--stage-rgb" as string]: stageRgb }}
    >
      {/* Ambient Aurora Spotlights & Blueprint Perspective Grid (Stripe / Vercel / Apple Keynote style) */}
      <div className="tg-stage-backdrop" aria-hidden="true">
        <div className="tg-stage-aurora tg-stage-aurora--1" />
        <div className="tg-stage-aurora tg-stage-aurora--2" />
        <div className="tg-stage-grid" />
        <div className="tg-stage-scanline" />
      </div>

      {/* TOP KEYNOTE HUD BAR */}
      <div className="tg-stage-hud">
        <div className="tg-stage-hud__left">
          <span className="tg-hud-step">
            {chapter.badge} · {safeCaptionIndex + 1}/{Math.max(1, totalCaptions)}
          </span>
          <span className="tg-hud-concept" key={`concept-${animKey}`}>
            <span className="tg-hud-concept__dot" />
            <strong>{activeConceptTag}</strong>
          </span>
        </div>

        <div className="tg-stage-hud__right">
          {chapter.figure && (
            <button
              type="button"
              className={`tg-hud-toggle ${showFullFigure ? "is-active" : ""}`}
              onClick={() => setShowFullFigure((v) => !v)}
            >
              <FigureGlyph name={showFullFigure ? "play" : "layers"} size={14} />
              <span>
                {showFullFigure
                  ? isEn
                    ? "Animated Motion Stage"
                    : "Scène Motion Animée"
                  : isEn
                    ? "Interactive Course Schema"
                    : "Schéma Interactif du Cours"}
              </span>
            </button>
          )}

          {/* Live Audio Spectrum Waveform */}
          <div
            className={`tg-hud-wave ${voiceActive ? "is-speaking" : ""}`}
            aria-hidden="true"
            title={voiceActive ? "Audio actif" : "Audio en veille"}
          >
            {EQUALIZER_BARS.map((h, i) => (
              <span
                key={i}
                style={{
                  height: `${voiceActive ? h : 22}%`,
                  animationDelay: `${(i % 6) * 75}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* MAIN STUDIO WORKSPACE: Left Presenter Pod + Right Motion Graphics Canvas */}
      <div className="tg-stage-body">
        {/* LEFT COLUMN: Holographic Studio Presenter Pod with Animated CyberPingo Rig */}
        <aside className="tg-presenter-pod" data-speaking={voiceActive ? "true" : "false"}>
          <div className="tg-presenter-pod__stage">
            {/* Concentric Sonic Ripples when speaking */}
            <div className="tg-presenter-halo tg-presenter-halo--1" aria-hidden="true" />
            <div className="tg-presenter-halo tg-presenter-halo--2" aria-hidden="true" />
            <div className="tg-presenter-halo tg-presenter-halo--3" aria-hidden="true" />

            {/* Flagship Animated Vector Mascot with Lip-Sync Beak, Glasses & Bowtie */}
            <div className="tg-presenter-avatar-rig">
              <Pingo
                state={pingoState}
                rank={5}
                size={136}
                speaking={voiceActive}
                title={isEn ? "Professor Pingo Animated Instructor" : "Professeur Pingo Instructeur Animé"}
              />
            </div>

            {/* Holographic Data Particles streaming from Presenter to Stage */}
            <div className="tg-presenter-stream" aria-hidden="true">
              <i className="tg-stream-dot tg-stream-dot--1" />
              <i className="tg-stream-dot tg-stream-dot--2" />
              <i className="tg-stream-dot tg-stream-dot--3" />
            </div>
          </div>

          {/* Presenter Studio Badge */}
          <div className="tg-presenter-card">
            <img
              src="/images/mascot/professeur-pingo-face.png"
              alt="Professeur Pingo"
              className="tg-presenter-card__img"
            />
            <div className="tg-presenter-card__meta">
              <strong>Prof. Pingo</strong>
              <small>
                {voiceActive
                  ? isEn
                    ? "Live voice narration"
                    : "Narration vocale active"
                  : isEn
                    ? "CyberPingo Studio"
                    : "Studio CyberPingo"}
              </small>
            </div>
          </div>

          {/* Active Chapter Bullet Highlight inside Presenter Column */}
          {chapter.bullets.length > 0 && (
            <div className="tg-presenter-insight" key={`bullet-${chapter.id}-${activeBulletIndex}`}>
              <span className="tg-presenter-insight__num">0{activeBulletIndex + 1}</span>
              <p>{chapter.bullets[activeBulletIndex] ?? chapter.bullets[0]}</p>
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: Tech-Giant Motion Graphics Stage */}
        <div className="tg-motion-viewport" key={animKey}>
          {showFullFigure && chapter.figure ? (
            <div className="tg-motion-figure-full">
              <FigureView figure={chapter.figure} />
            </div>
          ) : (
            <div className="tg-motion-split">
              {/* PRIMARY ANIMATED ARCHITECTURE & PACKET STAGE */}
              <div className="tg-motion-scene" data-scene={sceneKind}>
                {/* SCENE 1: ZERO-TRUST & CIA TRIAD ENGINE */}
                {sceneKind === "shield-lock" && (
                  <div className="tg-scene-canvas tg-scene--shield">
                    {/* SVG Animated Laser Conduits & Moving Packets */}
                    <svg
                      viewBox="0 0 620 260"
                      className="tg-scene-wires"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id="tgWireCyan" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#00d5ff" stopOpacity="0.2" />
                          <stop offset="50%" stopColor="#00d5ff" stopOpacity="0.95" />
                          <stop offset="100%" stopColor="#3efa95" stopOpacity="0.85" />
                        </linearGradient>
                        <path id="tgPathAuthIn" d="M 135 130 C 190 130, 215 130, 265 130" />
                        <path id="tgPathCia1" d="M 355 110 C 405 100, 425 56, 468 56" />
                        <path id="tgPathCia2" d="M 360 130 C 410 130, 430 130, 468 130" />
                        <path id="tgPathCia3" d="M 355 150 C 405 160, 425 204, 468 204" />
                      </defs>

                      {/* Glowing Conduit Paths */}
                      <use href="#tgPathAuthIn" className="tg-wire-base" />
                      <use href="#tgPathAuthIn" className="tg-wire-flow" />
                      <use href="#tgPathCia1" className="tg-wire-base" />
                      <use href="#tgPathCia1" className="tg-wire-flow" />
                      <use href="#tgPathCia2" className="tg-wire-base" />
                      <use href="#tgPathCia2" className="tg-wire-flow" />
                      <use href="#tgPathCia3" className="tg-wire-base" />
                      <use href="#tgPathCia3" className="tg-wire-flow" />

                      {/* Orbiting Zero-Trust Rings around Central Core */}
                      <circle
                        cx="310"
                        cy="130"
                        r="68"
                        className="tg-orbit-ring tg-orbit-ring--cw"
                      />
                      <circle
                        cx="310"
                        cy="130"
                        r="52"
                        className="tg-orbit-ring tg-orbit-ring--ccw"
                      />

                      {/* Moving Data Packets */}
                      <circle r="5" fill="#00d5ff" className="tg-packet-glow">
                        <animateMotion dur="1.8s" repeatCount="indefinite" path="M 135 130 C 190 130, 215 130, 265 130" />
                      </circle>
                      <circle r="4.5" fill="#3efa95" className="tg-packet-glow">
                        <animateMotion dur="1.6s" begin="0.2s" repeatCount="indefinite" path="M 355 110 C 405 100, 425 56, 468 56" />
                      </circle>
                      <circle r="4.5" fill="#00d5ff" className="tg-packet-glow">
                        <animateMotion dur="1.6s" begin="0.5s" repeatCount="indefinite" path="M 360 130 C 410 130, 430 130, 468 130" />
                      </circle>
                      <circle r="4.5" fill="#ac7eff" className="tg-packet-glow">
                        <animateMotion dur="1.6s" begin="0.8s" repeatCount="indefinite" path="M 355 150 C 405 160, 425 204, 468 204" />
                      </circle>
                    </svg>

                    {/* HTML Glass Nodes Positioned Over the SVG Conduits */}
                    <div className="tg-shield-layout">
                      {/* Left Source Node */}
                      <div className="tg-node tg-node--cyan">
                        <span className="tg-node__icon">
                          <FigureGlyph name="user-check" size={20} />
                        </span>
                        <div className="tg-node__copy">
                          <strong>{isEn ? "Identity & MFA" : "Identité & MFA"}</strong>
                          <code>FIDO2 · Clé 2FA</code>
                        </div>
                      </div>

                      {/* Center Holographic Core */}
                      <div className="tg-core-hub tg-core-hub--cyan">
                        <div className="tg-core-hub__emblem">
                          <FigureGlyph name="shield-check" size={32} />
                        </div>
                        <strong>Zero-Trust Core</strong>
                        <span>TLS 1.3 · AES-256</span>
                      </div>

                      {/* Right 3 CIA Pillars */}
                      <div className="tg-cia-stack">
                        <div className="tg-node tg-node--sm tg-node--cyan">
                          <span className="tg-node__icon">
                            <FigureGlyph name="lock" size={16} />
                          </span>
                          <div className="tg-node__copy">
                            <strong>{isEn ? "Confidentiality" : "Confidentialité"}</strong>
                            <small>{isEn ? "Authorized access only" : "Accès chiffré strict"}</small>
                          </div>
                        </div>
                        <div className="tg-node tg-node--sm tg-node--green">
                          <span className="tg-node__icon">
                            <FigureGlyph name="fingerprint" size={16} />
                          </span>
                          <div className="tg-node__copy">
                            <strong>{isEn ? "Integrity" : "Intégrité"}</strong>
                            <small>{isEn ? "Tamper-proof SHA-256" : "Empreinte intacte"}</small>
                          </div>
                        </div>
                        <div className="tg-node tg-node--sm tg-node--violet">
                          <span className="tg-node__icon">
                            <FigureGlyph name="activity" size={16} />
                          </span>
                          <div className="tg-node__copy">
                            <strong>{isEn ? "Availability" : "Disponibilité"}</strong>
                            <small>{isEn ? "99.99% Uptime SLA" : "Service continu 24/7"}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 2: LIVE NETWORK PACKET ROUTING & SWITCHING (Cisco ThousandEyes / Cloudflare style) */}
                {sceneKind === "lan-wan-network" && (
                  <div className="tg-scene-canvas tg-scene--network">
                    <svg viewBox="0 0 620 260" className="tg-scene-wires" aria-hidden="true">
                      <path
                        id="tgNetLan1"
                        d="M 130 74 C 185 74, 200 130, 250 130"
                        className="tg-wire-base"
                      />
                      <path
                        d="M 130 74 C 185 74, 200 130, 250 130"
                        className="tg-wire-flow"
                      />
                      <path
                        id="tgNetLan2"
                        d="M 130 186 C 185 186, 200 130, 250 130"
                        className="tg-wire-base"
                      />
                      <path
                        d="M 130 186 C 185 186, 200 130, 250 130"
                        className="tg-wire-flow"
                      />
                      <path
                        id="tgNetWan"
                        d="M 365 130 L 475 130"
                        className="tg-wire-base"
                      />
                      <path
                        d="M 365 130 L 475 130"
                        className="tg-wire-flow tg-wire-flow--green"
                      />

                      {/* Animated Packets with Protocol Labels */}
                      <g>
                        <circle r="5.5" fill="#00d5ff" className="tg-packet-glow" />
                        <animateMotion
                          dur="1.7s"
                          repeatCount="indefinite"
                          path="M 130 74 C 185 74, 200 130, 250 130"
                        />
                      </g>
                      <g>
                        <circle r="5" fill="#ac7eff" className="tg-packet-glow" />
                        <animateMotion
                          dur="2.1s"
                          begin="0.4s"
                          repeatCount="indefinite"
                          path="M 130 186 C 185 186, 200 130, 250 130"
                        />
                      </g>
                      <g>
                        <circle r="6" fill="#3efa95" className="tg-packet-glow" />
                        <animateMotion
                          dur="1.4s"
                          begin="0.2s"
                          repeatCount="indefinite"
                          path="M 365 130 L 475 130"
                        />
                      </g>
                    </svg>

                    <div className="tg-net-layout">
                      {/* Left LAN Endpoints */}
                      <div className="tg-net-endpoints">
                        <div className="tg-node tg-node--sm tg-node--cyan">
                          <span className="tg-node__icon">
                            <FigureGlyph name="laptop" size={18} />
                          </span>
                          <div className="tg-node__copy">
                            <strong>Poste LAN</strong>
                            <code>192.168.1.10/24</code>
                          </div>
                        </div>
                        <div className="tg-node tg-node--sm tg-node--violet">
                          <span className="tg-node__icon">
                            <FigureGlyph name="printer" size={18} />
                          </span>
                          <div className="tg-node__copy">
                            <strong>Hôte Local</strong>
                            <code>192.168.1.25/24</code>
                          </div>
                        </div>
                      </div>

                      {/* Center L2 Switch with Blinking Port Matrix */}
                      <div className="tg-switch-hub">
                        <div className="tg-switch-hub__top">
                          <FigureGlyph name="switch" size={22} />
                          <span>SWITCH L2 · TABLE MAC</span>
                        </div>
                        <div className="tg-switch-ports" aria-hidden="true">
                          {[0, 1, 2, 3, 4, 5].map((p) => (
                            <i
                              key={p}
                              className={`tg-port-led ${p % 3 === 2 ? "is-amber" : "is-green"}`}
                              style={{ animationDelay: `${p * 130}ms` }}
                            />
                          ))}
                        </div>
                        <code>VLAN 10 · 1 Gbps Full-Duplex</code>
                      </div>

                      {/* Right WAN Router Gateway */}
                      <div className="tg-node tg-node--green">
                        <span className="tg-node__icon">
                          <FigureGlyph name="router" size={20} />
                        </span>
                        <div className="tg-node__copy">
                          <strong>Passerelle WAN</strong>
                          <code>192.168.1.1 · NAT</code>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Live Network Telemetry Strip */}
                    <div className="tg-telemetry-strip">
                      <span>
                        <b>PROTOCOLE</b> ARP / ICMP / TCP
                      </span>
                      <span>
                        <b>LATENCE</b> 1.2 ms
                      </span>
                      <span>
                        <b>ÉTAT LIEN</b> <em className="is-up">UP · 0% PERTE</em>
                      </span>
                    </div>
                  </div>
                )}

                {/* SCENE 3: 7-LAYER OSI STACK & PDU ENCAPSULATION ENGINE */}
                {sceneKind === "osi-stack" && (
                  <div className="tg-scene-canvas tg-scene--osi">
                    <div className="tg-osi-grid">
                      <ol className="tg-osi-layers">
                        {[
                          { n: 7, name: "Application", proto: "HTTPS · DNS · SSH", tone: "cyan" },
                          { n: 6, name: "Présentation", proto: "TLS 1.3 · UTF-8", tone: "blue" },
                          { n: 5, name: "Session", proto: "Sockets · RPC", tone: "violet" },
                          { n: 4, name: "Transport", proto: "Segment TCP / UDP", tone: "green" },
                          { n: 3, name: "Réseau", proto: "Paquet IP · Routeur", tone: "amber" },
                          { n: 2, name: "Liaison", proto: "Trame MAC · Switch", tone: "cyan" },
                          { n: 1, name: "Physique", proto: "Bits · Fibre / RJ45", tone: "red" },
                        ].map((layer, idx) => (
                          <li
                            key={layer.n}
                            className={`tg-osi-row tg-osi-row--${layer.tone}`}
                            style={{ animationDelay: `${idx * 65}ms` }}
                          >
                            <span className="tg-osi-row__num">L{layer.n}</span>
                            <strong>{layer.name}</strong>
                            <code>{layer.proto}</code>
                          </li>
                        ))}
                      </ol>

                      {/* Animated PDU Encapsulation X-Ray Capsule */}
                      <div className="tg-pdu-inspector">
                        <div className="tg-pdu-inspector__head">
                          <FigureGlyph name="package" size={16} />
                          <span>ENCAPSULATION PDU EN DIRECT</span>
                        </div>
                        <div className="tg-pdu-bars">
                          <span className="tg-pdu-seg tg-pdu-seg--mac">ETH MAC</span>
                          <span className="tg-pdu-seg tg-pdu-seg--ip">IPv4 SRC/DST</span>
                          <span className="tg-pdu-seg tg-pdu-seg--tcp">TCP :443</span>
                          <span className="tg-pdu-seg tg-pdu-seg--data">PAYLOAD TLS</span>
                          <span className="tg-pdu-seg tg-pdu-seg--fcs">FCS</span>
                        </div>
                        <p className="tg-pdu-inspector__note">
                          {isEn
                            ? "Each layer wraps the payload with its own control header before transmission."
                            : "Chaque couche ajoute son en-tête (MAC, IP, Port TCP) avant l’émission sur le câble."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 4: PHYSICAL LAYER & OPTICAL / COPPER OSCILLOSCOPE */}
                {sceneKind === "cables-fiber" && (
                  <div className="tg-scene-canvas tg-scene--cables">
                    <div className="tg-media-lanes">
                      <div className="tg-media-lane tg-media-lane--cyan">
                        <div className="tg-media-lane__meta">
                          <FigureGlyph name="cable" size={18} />
                          <div>
                            <strong>Cuivre RJ45 Cat6A</strong>
                            <code>Signal électrique · 1–10 Gbps</code>
                          </div>
                        </div>
                        <svg viewBox="0 0 220 36" className="tg-wave-svg" aria-hidden="true">
                          <path
                            d="M 4 26 L 28 26 L 28 8 L 54 8 L 54 26 L 82 26 L 82 8 L 112 8 L 112 26 L 140 26 L 140 8 L 172 8 L 172 26 L 216 26"
                            className="tg-wave-path tg-wave-path--cyan"
                          />
                        </svg>
                      </div>

                      <div className="tg-media-lane tg-media-lane--green">
                        <div className="tg-media-lane__meta">
                          <FigureGlyph name="zap" size={18} />
                          <div>
                            <strong>Fibre Optique SFP+</strong>
                            <code>Impulsion laser · Longue distance</code>
                          </div>
                        </div>
                        <svg viewBox="0 0 220 36" className="tg-wave-svg" aria-hidden="true">
                          <path
                            d="M 4 18 Q 22 2, 40 18 T 76 18 T 112 18 T 148 18 T 184 18 T 216 18"
                            className="tg-wave-path tg-wave-path--green"
                          />
                        </svg>
                      </div>

                      <div className="tg-media-lane tg-media-lane--violet">
                        <div className="tg-media-lane__meta">
                          <FigureGlyph name="wifi" size={18} />
                          <div>
                            <strong>Wi-Fi 6E · WPA3</strong>
                            <code>Ondes radio chiffrées · Sans-fil</code>
                          </div>
                        </div>
                        <svg viewBox="0 0 220 36" className="tg-wave-svg" aria-hidden="true">
                          <path
                            d="M 4 18 C 30 0, 50 36, 76 18 C 102 0, 122 36, 148 18 C 174 0, 194 36, 216 18"
                            className="tg-wave-path tg-wave-path--violet"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="tg-telemetry-strip">
                      <span>
                        <b>COUCHE 1</b> PHYSIQUE
                      </span>
                      <span>
                        <b>LEDS PORT</b> <em className="is-up">LINK VERT · ACT CLIGNOTANT</em>
                      </span>
                    </div>
                  </div>
                )}

                {/* SCENE 5: LIVE SOC TERMINAL & COMMAND PARSER */}
                {sceneKind === "cli-terminal" && (
                  <div className="tg-scene-canvas tg-scene--terminal">
                    <div className="tg-term-window">
                      <div className="tg-term-window__bar">
                        <span className="tg-term-dots" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                        <code>analyst@cyberpingo-soc:~</code>
                        <span className="tg-term-status">BASH · SSH</span>
                      </div>
                      <div className="tg-term-window__body">
                        <div className="tg-term-cmd">
                          <span className="tg-term-prompt">$</span>
                          <code>
                            {activeTermStep?.command ||
                              "ping -c 4 192.168.1.1 && ip -br addr"}
                          </code>
                          <span className="tg-term-cursor" aria-hidden="true" />
                        </div>
                        <pre className="tg-term-output">
                          {activeTermStep?.output ||
                            "64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=1.18 ms\neth0  UP  192.168.1.10/24  fe80::1a2b/64\n--- 0% packet loss · passerelle joignable ---"}
                        </pre>
                        <div className="tg-term-verdict">
                          <FigureGlyph name="shield-check" size={16} />
                          <span>
                            {activeTermStep?.note ||
                              (isEn
                                ? "Technical proof verified in real time."
                                : "Preuve technique vérifiée dans la console.")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 6: ACTIVE THREAT INTERCEPTION & FIREWALL SHIELD */}
                {sceneKind === "threat-firewall" && (
                  <div className="tg-scene-canvas tg-scene--threat">
                    <svg viewBox="0 0 620 260" className="tg-scene-wires" aria-hidden="true">
                      {/* Red Attack Vectors Blocked at X=305 */}
                      <path
                        d="M 140 72 C 205 72, 235 110, 290 122"
                        className="tg-wire-base tg-wire-base--red"
                      />
                      <path
                        d="M 140 72 C 205 72, 235 110, 290 122"
                        className="tg-wire-flow tg-wire-flow--red"
                      />
                      <path
                        d="M 140 188 C 205 188, 235 150, 290 138"
                        className="tg-wire-base tg-wire-base--red"
                      />
                      <path
                        d="M 140 188 C 205 188, 235 150, 290 138"
                        className="tg-wire-flow tg-wire-flow--red"
                      />
                      {/* Clean Verified Traffic Passing Right */}
                      <path d="M 355 130 L 470 130" className="tg-wire-base" />
                      <path
                        d="M 355 130 L 470 130"
                        className="tg-wire-flow tg-wire-flow--green"
                      />

                      {/* Impact Shockwave at Firewall */}
                      <circle cx="292" cy="130" r="18" className="tg-impact-ring" />

                      {/* Attack Projectiles stopping at Firewall */}
                      <circle r="5.5" fill="#ff6b7d" className="tg-packet-glow">
                        <animateMotion
                          dur="1.3s"
                          repeatCount="indefinite"
                          path="M 140 72 C 205 72, 235 110, 290 122"
                        />
                      </circle>
                      <circle r="5.5" fill="#ffb86b" className="tg-packet-glow">
                        <animateMotion
                          dur="1.5s"
                          begin="0.4s"
                          repeatCount="indefinite"
                          path="M 140 188 C 205 188, 235 150, 290 138"
                        />
                      </circle>
                      {/* Clean Traffic Projectile */}
                      <circle r="5.5" fill="#3efa95" className="tg-packet-glow">
                        <animateMotion
                          dur="1.4s"
                          repeatCount="indefinite"
                          path="M 355 130 L 470 130"
                        />
                      </circle>
                    </svg>

                    <div className="tg-net-layout">
                      <div className="tg-net-endpoints">
                        <div className="tg-node tg-node--sm tg-node--red">
                          <span className="tg-node__icon">
                            <FigureGlyph name="skull" size={18} />
                          </span>
                          <div className="tg-node__copy">
                            <strong>Vecteur Menace</strong>
                            <code>Spoofing / Phishing</code>
                          </div>
                        </div>
                        <div className="tg-node tg-node--sm tg-node--amber">
                          <span className="tg-node__icon">
                            <FigureGlyph name="bug" size={18} />
                          </span>
                          <div className="tg-node__copy">
                            <strong>Intrusion / Scan</strong>
                            <code>DROP · ACL #403</code>
                          </div>
                        </div>
                      </div>

                      <div className="tg-core-hub tg-core-hub--cyan">
                        <div className="tg-core-hub__emblem">
                          <FigureGlyph name="firewall" size={28} />
                        </div>
                        <strong>Pare-feu & MFA</strong>
                        <span>Filtrage Actif ✓</span>
                      </div>

                      <div className="tg-node tg-node--green">
                        <span className="tg-node__icon">
                          <FigureGlyph name="server" size={20} />
                        </span>
                        <div className="tg-node__copy">
                          <strong>Zone Protégée</strong>
                          <code>Flux légitime isolé</code>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 7: CRYPTOGRAPHIC VAULT & 3-2-1 BACKUP ARCHITECTURE */}
                {sceneKind === "server-nas-backup" && (
                  <div className="tg-scene-canvas tg-scene--backup">
                    <svg viewBox="0 0 620 260" className="tg-scene-wires" aria-hidden="true">
                      <path d="M 140 130 L 260 130" className="tg-wire-base" />
                      <path d="M 140 130 L 260 130" className="tg-wire-flow" />
                      <path d="M 360 112 C 410 100, 430 56, 470 56" className="tg-wire-base" />
                      <path
                        d="M 360 112 C 410 100, 430 56, 470 56"
                        className="tg-wire-flow tg-wire-flow--green"
                      />
                      <path d="M 360 130 L 470 130" className="tg-wire-base" />
                      <path
                        d="M 360 130 L 470 130"
                        className="tg-wire-flow tg-wire-flow--green"
                      />
                      <path d="M 360 148 C 410 160, 430 204, 470 204" className="tg-wire-base" />
                      <path
                        d="M 360 148 C 410 160, 430 204, 470 204"
                        className="tg-wire-flow tg-wire-flow--green"
                      />
                      <circle cx="310" cy="130" r="62" className="tg-orbit-ring tg-orbit-ring--cw" />
                    </svg>

                    <div className="tg-shield-layout">
                      <div className="tg-node tg-node--cyan">
                        <span className="tg-node__icon">
                          <FigureGlyph name="database" size={20} />
                        </span>
                        <div className="tg-node__copy">
                          <strong>Données Source</strong>
                          <code>Production Critique</code>
                        </div>
                      </div>

                      <div className="tg-core-hub tg-core-hub--cyan">
                        <div className="tg-core-hub__emblem">
                          <FigureGlyph name="file-lock" size={28} />
                        </div>
                        <strong>AES-256 + SHA</strong>
                        <span>a94f...8c2e ✓</span>
                      </div>

                      <div className="tg-cia-stack">
                        <div className="tg-node tg-node--sm tg-node--cyan">
                          <span className="tg-node__icon">
                            <FigureGlyph name="server" size={16} />
                          </span>
                          <div className="tg-node__copy">
                            <strong>1 · Baie Locale</strong>
                            <small>RAID redondant</small>
                          </div>
                        </div>
                        <div className="tg-node tg-node--sm tg-node--green">
                          <span className="tg-node__icon">
                            <FigureGlyph name="nas" size={16} />
                          </span>
                          <div className="tg-node__copy">
                            <strong>2 · NAS Réseau</strong>
                            <small>Support distinct</small>
                          </div>
                        </div>
                        <div className="tg-node tg-node--sm tg-node--violet">
                          <span className="tg-node__icon">
                            <FigureGlyph name="cloud" size={16} />
                          </span>
                          <div className="tg-node__copy">
                            <strong>3 · Hors-site</strong>
                            <small>Copie isolée (3-2-1)</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 8: FORENSIC INVESTIGATION & CORRELATION GRAPH */}
                {sceneKind === "lab-investigation" && (
                  <div className="tg-scene-canvas tg-scene--forensic">
                    <div className="tg-forensic-steps">
                      {[
                        { icon: "radar" as const, title: "1. Détection", sub: "Alerte / Symptôme", tone: "cyan" },
                        { icon: "file-search" as const, title: "2. Collecte", sub: "Logs & Trames PCAP", tone: "blue" },
                        { icon: "microscope" as const, title: "3. Corrélation", sub: "Cause racine isolée", tone: "violet" },
                        { icon: "flag" as const, title: "4. Validation", sub: "Preuve & Remédiation", tone: "green" },
                      ].map((item, idx) => (
                        <div
                          key={item.title}
                          className={`tg-forensic-card tg-forensic-card--${item.tone}`}
                          style={{ animationDelay: `${idx * 90}ms` }}
                        >
                          <span className="tg-node__icon">
                            <FigureGlyph name={item.icon} size={18} />
                          </span>
                          <strong>{item.title}</strong>
                          <small>{item.sub}</small>
                        </div>
                      ))}
                    </div>

                    <div className="tg-pdu-inspector">
                      <div className="tg-pdu-inspector__head">
                        <FigureGlyph name="scan" size={16} />
                        <span>INSPECTION D’INDICE SYNCHRONISÉE</span>
                      </div>
                      <div className="tg-pdu-bars">
                        <span className="tg-pdu-seg tg-pdu-seg--mac">HORODATAGE UTC</span>
                        <span className="tg-pdu-seg tg-pdu-seg--ip">SRC 10.0.0.42</span>
                        <span className="tg-pdu-seg tg-pdu-seg--tcp">PROTOCOLE VÉRIFIÉ</span>
                        <span className="tg-pdu-seg tg-pdu-seg--data">PREUVE VALIDÉE ✓</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT SPOTLIGHT CARD: Real Equipment Photo + Active Concept Insights + Keywords */}
              <div className="tg-spotlight-panel">
                {activeSlide && (
                  <div className="tg-equip-card">
                    <div className="tg-equip-card__media">
                      <img
                        src={activeSlide.src}
                        alt={activeSlide.alt}
                        className={activeSlide.kind === "topology" ? "is-diagram" : ""}
                      />
                      <span className="tg-equip-card__badge">{activeSlide.badge}</span>
                    </div>
                    <div className="tg-equip-card__body">
                      <strong>{activeSlide.title}</strong>
                      <p>{activeSlide.caption}</p>
                      {(activeSlide.risk || activeSlide.habit) && (
                        <div className="tg-equip-card__tips">
                          {activeSlide.risk && (
                            <span className="tg-tip tg-tip--risk">
                              <FigureGlyph name="alert" size={13} />
                              <span>{activeSlide.risk}</span>
                            </span>
                          )}
                          {activeSlide.habit && (
                            <span className="tg-tip tg-tip--habit">
                              <FigureGlyph name="check" size={13} />
                              <span>{activeSlide.habit}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Animated Keyword Chips that pop in as the sentence is spoken */}
                {activeKeywords.length > 0 && (
                  <div className="tg-keywords">
                    {activeKeywords.map((kw, idx) => (
                      <span
                        key={`${animKey}-kw-${idx}`}
                        className="tg-keyword-chip"
                        style={{ animationDelay: `${idx * 85}ms` }}
                      >
                        <i aria-hidden="true">✦</i> {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM INTERACTIVE STORYBOARD DOCK (Sentence-by-Sentence Visual Selector) */}
      {chapterSlides.length > 1 && (
        <div
          className="tg-storyboard-dock"
          role="tablist"
          aria-label={
            isEn
              ? "Sentence illustrations"
              : "Illustrations synchronisées phrase par phrase"
          }
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
                className={`tg-storyboard-pill ${isCurrent ? "is-current" : isDone ? "is-done" : ""}`}
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
  );
}

