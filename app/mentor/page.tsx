"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ChatMessage from "@/components/mentor/ChatMessage";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { sendMessageToMentor } from "@/services/mentor";
import { useUser } from "@/context/UserContext";
import { MentorMessage } from "@/types";
import { IconAI, IconSend, IconTrash } from "@/components/ui/Icon";

/** Suggestions contextuelles selon la progression de l'utilisateur */
function useSuggestions(completedLessons: string[]) {
  const base = [
    "Explique-moi le DNS",
    "Comment fonctionnent les ports réseau ?",
    "Quelle est ma prochaine étape ?",
  ];

  const advanced = completedLessons.length >= 3
    ? ["Comment détecter une injection SQL ?", "Explique-moi les permissions Linux"]
    : [];

  const expert = completedLessons.length >= 6
    ? ["Qu'est-ce qu'un pentest ?", "Comment utiliser nmap ?"]
    : [];

  // Retourne 4 suggestions au plus, selon le niveau atteint
  return [...base, ...advanced, ...expert].slice(0, 4);
}

const WELCOME_MESSAGE: MentorMessage = {
  id: "welcome",
  role: "mentor",
  content:
    "Salut ! Je suis ton Mentor Cyberpingo, propulsé par Gemini IA 🤖\n\nPose-moi n'importe quelle question sur la cybersécurité : réseaux, Linux, sécurité web, cryptographie, pentest éthique… Je garde le contexte de notre conversation pour des réponses plus précises.\n\nChoisis une suggestion ou écris directement ta question :",
  createdAt: new Date().toISOString(),
};

export default function MentorPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<MentorMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useSuggestions(user.completedLessons);

  // Scroll automatique vers le dernier message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Focus sur l'input au chargement
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    const userMessage: MentorMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setThinking(true);

    // Construit l'historique à envoyer (sans le message de bienvenue)
    const historyToSend = [...messages.slice(1), userMessage].map((m) => ({
      role: m.role as "user" | "mentor",
      content: m.content,
    }));

    try {
      const response = await sendMessageToMentor(trimmed, historyToSend);
      setMessages((prev) => [...prev, response]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "mentor",
          content:
            "Désolé, je n'arrive pas à répondre pour le moment. Vérifie ta connexion et réessaie.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setThinking(false);
      // Refocus input après réponse
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  function handleClear() {
    setMessages([WELCOME_MESSAGE]);
    inputRef.current?.focus();
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 md:px-6 flex flex-col h-[calc(100vh-64px)] md:h-screen">

        {/* Header */}
        <div className="flex items-center justify-between py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center">
              <IconAI size={20} strokeWidth={1.5} className="text-neon-purple" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm">Mentor Cyberpingo</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
                <p className="text-xs text-cyber-green">
                  {thinking ? "En train de réfléchir…" : "En ligne · Gemini IA"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded"
            title="Nouvelle conversation"
          >
            <IconTrash size={13} />
            Effacer
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 scroll-smooth">
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}

          {/* Indicateur de frappe animé */}
          {thinking && (
            <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center text-sm shrink-0 mt-1">
              <IconAI size={15} strokeWidth={1.5} className="text-neon-purple" />
            </div>
              <div className="bg-white/5 border border-white/8 rounded-xl rounded-tl-none px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 2 && !thinking && (
          <div className="flex gap-2 flex-wrap pb-3 shrink-0">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                disabled={thinking}
                className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:border-cyber-blue/40 hover:text-white hover:bg-cyber-blue/5 transition-colors disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Zone de saisie */}
        <form onSubmit={handleSubmit} className="flex gap-2 pb-4 shrink-0">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              placeholder={thinking ? "Le mentor réfléchit…" : "Pose ta question…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={thinking}
              aria-label="Message pour le mentor"
              className="pr-10"
            />
            {input.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/20">
                {input.length}
              </span>
            )}
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!input.trim() || thinking}
            className="shrink-0"
          >
            {thinking ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              "Envoyer"
            )}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
