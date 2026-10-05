"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import AppShell from "@/components/layout/AppShell";
import ChatMessage from "@/components/mentor/ChatMessage";
import Pingo from "@/components/mascot/Pingo";
import { Pingo3D } from "@/components/mascot/Pingo3D";
import type { Pingo3DPose } from "@/components/mascot/Pingo3DScene";
import Button from "@/components/ui/Button";
import { sendMessageToMentor, type MentorResponse } from "@/services/mentor";
import { useLearner } from "@/context/UserContext";
import { errorMessage } from "@/lib/errors";
import { MentorMessage } from "@/types";
import {
  IconAI,
  IconBolt,
  IconCheck,
  IconSend,
  IconTrash,
  IconTerminal,
  IconShield,
  IconTarget,
  IconVolume,
  IconVolumeOff,
  IconSparkles,
  IconClock,
} from "@/components/ui/Icon";
import {
  type AgentMode,
  type AgentDomain,
  getThinkingStepsForMode,
} from "@/lib/ai-agent/engine";
import ThinkingStepsIndicator from "@/components/ai-agent/ThinkingStepsIndicator";
import PacedAgentResponse from "@/components/ai-agent/PacedAgentResponse";

const AGENT_MODES: {
  id: AgentMode;
  label: string;
  badge: string;
  description: string;
  icon: typeof IconAI;
}[] = [
  {
    id: "mentor",
    label: "Tuteur Socratique",
    badge: "Accompagnement",
    description: "Guidage pas à pas, maïeutique et explications théoriques sans donner les réponses brutes.",
    icon: IconAI,
  },
  {
    id: "tp_grader",
    label: "Correcteur de TP & Audit",
    badge: "Notation /20",
    description: "Audite tes commandes, scripts et livrables de TP avec barème détaillé et référentiels ANSSI/OWASP.",
    icon: IconTerminal,
  },
  {
    id: "log_analyzer",
    label: "Analyseur de Logs SOC",
    badge: "Forensics",
    description: "Colle des logs bruts : détection d'attaques, extraction d'IOCs, chronologie et règles de blocage.",
    icon: IconShield,
  },
  {
    id: "quiz_gen",
    label: "Défis Flash & Quiz",
    badge: "Entraînement",
    description: "Génère des cas pratiques interactifs et des scénarios de cyberdéfense ciblés sur tes points d'étape.",
    icon: IconTarget,
  },
];

const AGENT_DOMAINS: { id: AgentDomain; label: string }[] = [
  { id: "general", label: "Tous domaines" },
  { id: "reseau", label: "Réseau & Ports" },
  { id: "linux", label: "Linux & Sysadmin" },
  { id: "web", label: "Sécurité Web & OWASP" },
  { id: "pentest", label: "Pentest Éthique" },
  { id: "crypto", label: "Crypto & Hachage" },
  { id: "soc", label: "SOC & SIEM" },
];

const MODE_SUGGESTIONS: Record<AgentMode, string[]> = {
  mentor: [
    "Explique-moi le 3-way handshake TCP et l'attaque SYN Flood",
    "Quelle est la différence entre chiffrement symétrique et asymétrique ?",
    "Comment configurer un pare-feu Linux UFW en toute sécurité ?",
    "Qu’est-ce qu’une attaque par injection SQL et comment s'en prémunir ?",
  ],
  tp_grader: [
    "Audite ma commande nmap : nmap -sS -p 1-1000 -T4 10.0.0.15",
    "Corrige mon script de permissions : chmod -R 777 /var/www/uploads",
    "Évalue ma règle iptables : iptables -A INPUT -p tcp --dport 22 -j DROP",
    "Note ma tentative de test SQLi en lab : ' OR '1'='1' --",
  ],
  log_analyzer: [
    "Analyse ce log Apache : 192.168.1.100 - - [10/May/2025:12:00:00] \"GET /login.php?user=' OR 1=1-- HTTP/1.1\" 200",
    "Corrélation SSH : Failed password for invalid user root from 203.0.113.19 port 49210 ssh2",
    "Trace XSS : GET /search?q=<script>alert('pwn')</script> HTTP/1.1 200",
    "Évalue ces requêtes répétées vers /admin en quelques millisecondes",
  ],
  quiz_gen: [
    "Génère un défi flash sur les attaques Man-in-the-Middle (ARP)",
    "Crée une énigme de sécurité web sur les failles IDOR",
    "Propose un scénario d'investigation après infection par ransomware",
    "Donne-moi un quiz rapide sur les codes de réponse HTTP et la sécurité",
  ],
};

function getWelcomeForMode(mode: AgentMode): string {
  switch (mode) {
    case "tp_grader":
      return "Bienvenue dans l'espace **Correcteur de TP & Auditeur** !\n\nColle tes commandes saisies (ex: `nmap`, `chmod`, `iptables`), tes scripts ou les sorties de ton terminal. J'analyserai ta méthodologie, vérifierai la conformité aux référentiels ANSSI/OWASP et t'attribuerai une note sur 20 avec axes d'amélioration.";
    case "log_analyzer":
      return "Bienvenue dans l'**Analyseur de Traces & Logs SOC** !\n\nColle des extraits de journaux système, serveurs web (Apache, Nginx), pare-feux ou SSH. J'extrairai les IOCs (adresses IP, chemins sensibles), déterminerai le niveau de sévérité et te générerai des règles de remédiation iptables/snort.";
    case "quiz_gen":
      return "Bienvenue dans le **Générateur de Défis Flash** !\n\nDis-moi sur quelle thématique tu souhaites t'entraîner (réseaux, web, Linux, cryptographie). Je vais te concevoir un cas pratique contextualisé avec questions à choix multiples et debriefing pédagogique.";
    case "mentor":
    default:
      return "Salut ! Je suis ton **Mentor CyberPingo**, propulsé par l’IA pédagogique.\n\nPose-moi une question sur la cybersécurité : réseaux, Linux, sécurité web, cryptographie, pentest éthique… Je te guide avec une approche socratique, pas à pas et sans précipitation.";
  }
}

type QuotaState = { remaining?: number; limit?: number; rateLimited?: boolean };

function MentorView() {
  const { profile } = useLearner();
  const [currentMode, setCurrentMode] = useState<AgentMode>("mentor");
  const [currentDomain, setCurrentDomain] = useState<AgentDomain>("general");
  const [isPaced, setIsPaced] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const initialWelcome = useMemo<MentorMessage>(() => ({
    id: `welcome-${currentMode}`,
    role: "mentor",
    content: getWelcomeForMode(currentMode),
    createdAt: new Date().toISOString(),
  }), [currentMode]);

  const [messages, setMessages] = useState<MentorMessage[]>([initialWelcome]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [quota, setQuota] = useState<QuotaState>({});
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shouldStickToBottom = useRef(true);

  const suggestions = useMemo(() => MODE_SUGGESTIONS[currentMode] || [], [currentMode]);
  const thinkingSteps = useMemo(() => getThinkingStepsForMode(currentMode), [currentMode]);
  const quotaExhausted = Boolean(quota.rateLimited || quota.remaining === 0);

  // Mise à jour du message d'accueil si la conversation n'a pas encore démarré
  useEffect(() => {
    if (messages.length <= 1 && messages[0]?.id?.startsWith("welcome-")) {
      setMessages([initialWelcome]);
    }
  }, [initialWelcome, messages]);

  useEffect(() => {
    if (!shouldStickToBottom.current) return;
    window.requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }, [messages, thinking]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function updateScrollIntent() {
    const element = transcriptRef.current;
    if (!element) return;
    shouldStickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
  }

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking || quotaExhausted) return;

    shouldStickToBottom.current = true;
    setSendError(null);
    setLastFailedPrompt(null);

    const userMessage: MentorMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setThinking(true);

    const historyToSend = [...messages.slice(1), userMessage].map((message) => ({
      role: message.role as "user" | "mentor",
      content: message.content,
    }));

    try {
      const response: MentorResponse = await sendMessageToMentor(trimmed, historyToSend, {
        mode: currentMode,
        domain: currentDomain,
      });
      setQuota({ remaining: response.remaining, limit: response.limit, rateLimited: response.rateLimited });
      setMessages((prev) => [...prev, response]);
    } catch (cause) {
      setLastFailedPrompt(trimmed);
      setSendError(errorMessage(cause, "Le mentor n’a pas pu répondre. Réessaie dans un instant."));
    } finally {
      setThinking(false);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void handleSend(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend(input);
    }
  }

  function handleClear() {
    shouldStickToBottom.current = true;
    setMessages([initialWelcome]);
    setQuota({});
    setSendError(null);
    setLastFailedPrompt(null);
    inputRef.current?.focus();
  }

  const mascotPose: Pingo3DPose = thinking
    ? "think"
    : currentMode === "quiz_gen"
    ? "celebrate"
    : currentMode === "tp_grader"
    ? "wave"
    : "idle";

  return (
    <div className="mentor-page">
      <section className="mentor-shell" aria-labelledby="mentor-title">
        <header className="mentor-header">
          <div className="mentor-title-block">
            <div className="mentor-pingo">
              <Pingo3D
                pose={mascotPose}
                label="Professeur Pingo"
                fallback={<Pingo state={thinking ? "thinking" : "explain"} size={84} />}
              />
            </div>
            <div>
              <div className="mentor-badge-row">
                <span className="mentor-agent-badge">
                  <IconSparkles size={13} /> Agent IA CyberPingo
                </span>
                <span className="mentor-agent-role">
                  {AGENT_MODES.find((m) => m.id === currentMode)?.badge}
                </span>
              </div>
              <h1 id="mentor-title">Professeur Pingo & Assistant IA</h1>
              <p>
                {AGENT_MODES.find((m) => m.id === currentMode)?.description}
              </p>
            </div>
          </div>
          <div className="mentor-header-actions">
            <div className={`mentor-status ${thinking ? "is-thinking" : quotaExhausted ? "is-limited" : "is-ready"}`} aria-live="polite">
              <span />
              {thinking ? "Analyse en cours…" : quotaExhausted ? "Quota atteint" : "Agent Actif"}
            </div>

            <button
              type="button"
              className={`mentor-tempo-toggle ${isPaced ? "is-active" : ""}`}
              onClick={() => setIsPaced((prev) => !prev)}
              title={isPaced ? "Tempo Réfléchi actif (vitesse mesurée)" : "Tempo Direct actif"}
            >
              <IconClock size={14} />
              <span>{isPaced ? "Tempo Réfléchi" : "Tempo Direct"}</span>
            </button>

            <button
              type="button"
              className={`mentor-voice-toggle ${voiceEnabled ? "is-active" : ""}`}
              onClick={() => setVoiceEnabled((prev) => !prev)}
              title={voiceEnabled ? "Voix du Professeur activée" : "Voix désactivée"}
            >
              {voiceEnabled ? <IconVolume size={14} /> : <IconVolumeOff size={14} />}
              <span>{voiceEnabled ? "Voix On" : "Voix Off"}</span>
            </button>

            <button type="button" onClick={handleClear} className="mentor-clear">
              <IconTrash size={14} /> Réinitialiser
            </button>
          </div>
        </header>

        {/* Barre des 4 rôles spécialisés de l'Agent IA */}
        <div className="mentor-modes-bar" role="tablist" aria-label="Rôles de l'Agent IA">
          {AGENT_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`mentor-mode-btn ${isSelected ? "is-selected" : ""}`}
                onClick={() => setCurrentMode(mode.id)}
              >
                <Icon size={16} />
                <span className="mentor-mode-title">{mode.label}</span>
                <span className="mentor-mode-tag">{mode.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Barre des domaines de spécialisation */}
        <div className="mentor-domains-bar" aria-label="Domaines de spécialisation">
          <span className="mentor-domains-label">Thématique :</span>
          <div className="mentor-domains-list">
            {AGENT_DOMAINS.map((domain) => (
              <button
                key={domain.id}
                type="button"
                className={`mentor-domain-pill ${currentDomain === domain.id ? "is-active" : ""}`}
                onClick={() => setCurrentDomain(domain.id)}
              >
                {domain.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mentor-quota-card" role={quotaExhausted ? "alert" : "status"} aria-live="polite">
          <IconBolt size={18} />
          <div>
            <strong>
              {quota.limit ? `${quota.remaining ?? 0} / ${quota.limit} crédits d'analyse restants` : "Agent IA Pédagogique Illimité & Local"}
            </strong>
            <p>
              {quotaExhausted
                ? "Quota atteint pour l'instant. Le moteur local continue de fonctionner avec précision."
                : "Audits de TP, analyses de logs et tutorat socratique orchestrés par Professeur Pingo sans précipitation."}
            </p>
          </div>
        </div>

        <div
          ref={transcriptRef}
          className="mentor-transcript"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          onScroll={updateScrollIntent}
        >
          {messages.map((message, index) => {
            const isLatestMentorMessage =
              message.role === "mentor" && index === messages.length - 1;

            if (isLatestMentorMessage) {
              return (
                <PacedAgentResponse
                  key={message.id}
                  message={message}
                  isPaced={isPaced}
                  showVoiceControls={voiceEnabled}
                />
              );
            }

            return <ChatMessage key={message.id} message={message} />;
          })}

          {thinking && (
            <div className="mentor-thinking-wrap">
              <ThinkingStepsIndicator steps={thinkingSteps} active={thinking} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {sendError && (
          <div className="mentor-error" role="alert">
            <p>{sendError}</p>
            {lastFailedPrompt && (
              <Button type="button" size="sm" variant="secondary" onClick={() => void handleSend(lastFailedPrompt)}>
                Réessayer
              </Button>
            )}
          </div>
        )}

        {messages.length <= 2 && !thinking && !quotaExhausted && (
          <div className="mentor-suggestions" aria-label="Suggestions d'exercices et questions">
            <div className="mentor-suggestions-head">
              <IconSparkles size={14} />
              <span>Exemples rapides pour ce mode :</span>
            </div>
            <div className="mentor-suggestions-list">
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => void handleSend(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mentor-composer">
          <label htmlFor="mentor-message">
            {currentMode === "tp_grader"
              ? "Colle tes commandes, scripts ou livrables de TP à auditer"
              : currentMode === "log_analyzer"
              ? "Colle tes lignes de logs bruts à investiguer"
              : currentMode === "quiz_gen"
              ? "Indique le thème du défi ou réponds à la question posée"
              : "Pose ta question ou décris ton intuition cyber"}
          </label>
          <div className="mentor-composer-row">
            <div className="mentor-input-wrap">
              <textarea
                ref={inputRef}
                id="mentor-message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={thinking || quotaExhausted}
                placeholder={
                  quotaExhausted
                    ? "Quota quotidien atteint"
                    : thinking
                    ? "Le Professeur Pingo examine ta demande…"
                    : currentMode === "tp_grader"
                    ? "Ex: nmap -sS -p 1-1000 -T4 10.0.0.15 puis iptables..."
                    : currentMode === "log_analyzer"
                    ? "Ex: 192.168.1.10 - - [10/May/2025:12:00:00] 'GET /admin' 401..."
                    : "Écris ici ton message…"
                }
                maxLength={4000}
                rows={3}
              />
              <span>{input.length} / 4000</span>
            </div>
            <Button
              type="submit"
              variant="primary"
              loading={thinking}
              disabled={!input.trim() || quotaExhausted}
              icon={thinking ? undefined : <IconSend size={16} />}
            >
              Analyser
            </Button>
          </div>
          <p className="mentor-composer-hint">
            Entrée pour envoyer · Maj + Entrée pour un saut de ligne · Mode : {AGENT_MODES.find((m) => m.id === currentMode)?.label} · Tempo {isPaced ? "Réfléchi" : "Direct"}.
          </p>
        </form>

        <footer className="mentor-footer">
          <IconCheck size={15} />
          Analyses cyberéthiques, barèmes académiques /20 et alignement référentiels ANSSI/OWASP.
        </footer>
      </section>
    </div>
  );
}

/** AppShell gates rendering on a loaded profile, so the view can call useLearner() safely. */
export default function MentorPage() {
  return <AppShell><MentorView /></AppShell>;
}
