"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import AppShell from "@/components/layout/AppShell";
import ChatMessage from "@/components/mentor/ChatMessage";
import Button from "@/components/ui/Button";
import { sendMessageToMentor, type MentorResponse } from "@/services/mentor";
import { useLearner } from "@/context/UserContext";
import { errorMessage } from "@/lib/errors";
import { MentorMessage } from "@/types";
import { IconAI, IconBolt, IconCheck, IconSend, IconTrash } from "@/components/ui/Icon";

function suggestionsFor(skillLevel: string) {
  const base = ["Explique-moi le DNS", "Comment fonctionnent les ports réseau ?", "Quelle est ma prochaine étape ?"];
  const intermediate = skillLevel !== "debutant" ? ["Comment détecter une injection SQL ?", "Explique-moi les permissions Linux"] : [];
  const advanced = skillLevel === "avance" ? ["Qu’est-ce qu’un pentest ?", "Comment utiliser nmap légalement ?"] : [];
  return [...base, ...intermediate, ...advanced].slice(0, 4);
}

const WELCOME_MESSAGE: MentorMessage = {
  id: "welcome",
  role: "mentor",
  content:
    "Salut ! Je suis ton Mentor CyberPingo, propulsé par Gemini IA.\n\nPose-moi une question sur la cybersécurité : réseaux, Linux, sécurité web, cryptographie, pentest éthique… Je garde le contexte de notre conversation pour des réponses plus précises.\n\nChoisis une suggestion ou écris directement ta question :",
  createdAt: new Date().toISOString(),
};

type QuotaState = { remaining?: number; limit?: number; rateLimited?: boolean };

function MentorView() {
  const { profile } = useLearner();
  const [messages, setMessages] = useState<MentorMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [quota, setQuota] = useState<QuotaState>({});
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shouldStickToBottom = useRef(true);
  const suggestions = useMemo(() => suggestionsFor(profile.skill_level), [profile.skill_level]);
  const quotaExhausted = Boolean(quota.rateLimited || quota.remaining === 0);

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
      const response: MentorResponse = await sendMessageToMentor(trimmed, historyToSend);
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
    setMessages([WELCOME_MESSAGE]);
    setQuota({});
    setSendError(null);
    setLastFailedPrompt(null);
    inputRef.current?.focus();
  }

  return (
    <div className="mentor-page">
      <section className="mentor-shell" aria-labelledby="mentor-title">
        <header className="mentor-header">
          <div className="mentor-title-block">
            <span className="mentor-orb"><IconAI size={24} strokeWidth={1.5} /></span>
            <div>
              <h1 id="mentor-title">Mentor CyberPingo</h1>
              <p>Un copilote pédagogique pour débloquer une notion, vérifier une intuition ou préparer ta prochaine leçon.</p>
            </div>
          </div>
          <div className="mentor-header-actions">
            <div className={`mentor-status ${thinking ? "is-thinking" : quotaExhausted ? "is-limited" : "is-ready"}`} aria-live="polite">
              <span />
              {thinking ? "Réflexion en cours" : quotaExhausted ? "Quota atteint" : "Disponible"}
            </div>
            <button type="button" onClick={handleClear} className="mentor-clear">
              <IconTrash size={14} /> Nouvelle conversation
            </button>
          </div>
        </header>

        <div className="mentor-quota-card" role={quotaExhausted ? "alert" : "status"} aria-live="polite">
          <IconBolt size={18} />
          <div>
            <strong>{quota.limit ? `${quota.remaining ?? 0} / ${quota.limit} questions restantes` : "Quota quotidien protégé"}</strong>
            <p>
              {quotaExhausted
                ? "Tu as atteint ton quota quotidien. Le mentor sera de nouveau disponible demain."
                : "Chaque question est comptée côté serveur pour garder le service rapide et équitable."}
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
          {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
          {thinking && (
            <div className="mentor-message is-mentor mentor-thinking">
              <div className="mentor-message-avatar" aria-hidden="true"><IconAI size={15} strokeWidth={1.5} /></div>
              <div className="mentor-message-bubble">
                <span className="mentor-dot" />
                <span className="mentor-dot" />
                <span className="mentor-dot" />
                <span className="sr-only">Le mentor rédige une réponse.</span>
              </div>
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
          <div className="mentor-suggestions" aria-label="Suggestions de questions">
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => void handleSend(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mentor-composer">
          <label htmlFor="mentor-message">Message pour le mentor</label>
          <div className="mentor-composer-row">
            <div className="mentor-input-wrap">
              <textarea
                ref={inputRef}
                id="mentor-message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={thinking || quotaExhausted}
                placeholder={quotaExhausted ? "Quota quotidien atteint" : thinking ? "Le mentor réfléchit…" : "Pose ta question…"}
                maxLength={2000}
                rows={2}
              />
              <span>{input.length} / 2000</span>
            </div>
            <Button
              type="submit"
              variant="primary"
              loading={thinking}
              disabled={!input.trim() || quotaExhausted}
              icon={thinking ? undefined : <IconSend size={16} />}
            >
              Envoyer
            </Button>
          </div>
          <p className="mentor-composer-hint">
            Entrée envoie · Maj + Entrée ajoute une ligne · le contexte récent est transmis à l’API Mentor.
          </p>
        </form>

        <footer className="mentor-footer">
          <IconCheck size={15} />
          Réponses en français, pédagogiques et limitées à un cadre légal et éthique.
        </footer>
      </section>
    </div>
  );
}

/** AppShell gates rendering on a loaded profile, so the view can call useLearner() safely. */
export default function MentorPage() {
  return <AppShell><MentorView /></AppShell>;
}
