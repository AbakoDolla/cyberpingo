"use client";

import { useEffect, useState, useRef } from "react";
import { IconCheck, IconCopy, IconVolume, IconVolumeOff, IconBolt } from "@/components/ui/Icon";
import { speakRealisticVoice, stopRealisticVoice } from "@/lib/mascot/sound-effects";
import ChatMessage from "@/components/mentor/ChatMessage";
import type { MentorMessage } from "@/types";

interface PacedAgentResponseProps {
  message: MentorMessage;
  isPaced?: boolean;
  onFinishPacing?: () => void;
  showVoiceControls?: boolean;
}

/**
 * Affiche la réponse de l'Agent IA avec un tempo mesuré et pédagogique
 * pour éviter les interactions trop rapides ou brutales.
 */
export default function PacedAgentResponse({
  message,
  isPaced = true,
  onFinishPacing,
  showVoiceControls = true,
}: PacedAgentResponseProps) {
  const fullContent = message.content;
  const [displayedLength, setDisplayedLength] = useState(isPaced ? 0 : fullContent.length);
  const [isTyping, setIsTyping] = useState(isPaced && fullContent.length > 0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isCompleted = displayedLength >= fullContent.length;

  useEffect(() => {
    if (!isPaced) {
      setDisplayedLength(fullContent.length);
      setIsTyping(false);
      return;
    }

    setDisplayedLength(0);
    setIsTyping(true);

    let current = 0;
    // Pacing : avance par petits groupes de caractères (2 à 5) toutes les 22ms pour un tempo naturel
    typingTimerRef.current = setInterval(() => {
      current += Math.floor(Math.random() * 3) + 2;
      if (current >= fullContent.length) {
        current = fullContent.length;
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        setIsTyping(false);
        onFinishPacing?.();
      }
      setDisplayedLength(current);
    }, 22);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [fullContent, isPaced, onFinishPacing]);

  function handleSkipPacing() {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setDisplayedLength(fullContent.length);
    setIsTyping(false);
    onFinishPacing?.();
  }

  function handleToggleVoice() {
    if (isSpeaking) {
      stopRealisticVoice();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      // Supprime le balisage markdown pour une élocution naturelle
      const cleanText = fullContent
        .replace(/###/g, "")
        .replace(/[*_`]/g, "")
        .replace(/\[.*?\]\(.*?\)/g, "")
        .trim();
      speakRealisticVoice(cleanText, {
        onEnd: () => setIsSpeaking(false),
      });
    }
  }

  function handleCopy() {
    void navigator.clipboard.writeText(fullContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const renderedMessage: MentorMessage = {
    ...message,
    content: fullContent.slice(0, displayedLength),
  };

  return (
    <div className="paced-agent-wrap">
      <div className="paced-agent-body">
        <ChatMessage message={renderedMessage} />
        {isTyping && <span className="paced-cursor" aria-hidden="true">▍</span>}
      </div>

      <div className="paced-agent-actions">
        {isTyping && (
          <button
            type="button"
            className="paced-action-btn paced-action-btn--skip"
            onClick={handleSkipPacing}
            title="Afficher tout le contenu immédiatement"
          >
            <IconBolt size={13} />
            <span>Afficher tout</span>
          </button>
        )}

        {isCompleted && showVoiceControls && (
          <button
            type="button"
            className={`paced-action-btn ${isSpeaking ? "is-speaking" : ""}`}
            onClick={handleToggleVoice}
            title={isSpeaking ? "Arrêter la voix" : "Écouter la voix du Professeur Pingo"}
          >
            {isSpeaking ? <IconVolumeOff size={14} /> : <IconVolume size={14} />}
            <span>{isSpeaking ? "Arrêter la voix" : "Écouter le retour"}</span>
          </button>
        )}

        {isCompleted && (
          <button
            type="button"
            className="paced-action-btn"
            onClick={handleCopy}
            title="Copier la réponse"
          >
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            <span>{copied ? "Copié !" : "Copier"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
