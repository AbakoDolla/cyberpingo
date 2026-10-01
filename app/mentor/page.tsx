"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ChatMessage from "@/components/mentor/ChatMessage";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { sendMessageToMentor, type MentorResponse } from "@/services/mentor";
import { useLearner } from "@/context/UserContext";
import { MentorMessage } from "@/types";
import { IconAI, IconTrash } from "@/components/ui/Icon";

function suggestionsFor(skillLevel: string) {
  const base = ["Explique-moi le DNS", "Comment fonctionnent les ports réseau ?", "Quelle est ma prochaine étape ?"];
  const intermediate = skillLevel !== "debutant" ? ["Comment détecter une injection SQL ?", "Explique-moi les permissions Linux"] : [];
  const advanced = skillLevel === "avance" ? ["Qu’est-ce qu’un pentest ?", "Comment utiliser nmap légalement ?"] : [];
  return [...base, ...intermediate, ...advanced].slice(0, 4);
}

const WELCOME_MESSAGE: MentorMessage = {
  id: "welcome",
  role: "mentor",
  content: "Salut ! Je suis ton Mentor CyberPingo, propulsé par Gemini IA 🤖\n\nPose-moi une question sur la cybersécurité : réseaux, Linux, sécurité web, cryptographie, pentest éthique… Je garde le contexte de notre conversation pour des réponses plus précises.\n\nChoisis une suggestion ou écris directement ta question :",
  createdAt: new Date().toISOString(),
};

function MentorView() {
  const { profile } = useLearner();
  const [messages, setMessages] = useState<MentorMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [quota, setQuota] = useState<{ remaining?: number; limit?: number; rateLimited?: boolean }>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = suggestionsFor(profile.skill_level);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking || quota.rateLimited) return;
    const userMessage: MentorMessage = { id: `u-${Date.now()}`, role: "user", content: trimmed, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setThinking(true);
    const historyToSend = [...messages.slice(1), userMessage].map((m) => ({ role: m.role as "user" | "mentor", content: m.content }));
    try {
      const response: MentorResponse = await sendMessageToMentor(trimmed, historyToSend);
      setQuota({ remaining: response.remaining, limit: response.limit, rateLimited: response.rateLimited });
      setMessages((prev) => [...prev, response]);
    } catch {
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "mentor", content: "Désolé, je n’arrive pas à répondre pour le moment. Vérifie ta connexion et réessaie.", createdAt: new Date().toISOString() }]);
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleSubmit(e: FormEvent) { e.preventDefault(); void handleSend(input); }
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(input); } }
  function handleClear() { setMessages([WELCOME_MESSAGE]); setQuota({}); inputRef.current?.focus(); }

  return <div className="max-w-3xl mx-auto px-4 md:px-6 flex flex-col h-[calc(100vh-64px)] md:h-screen">
    <div className="flex items-center justify-between py-4 border-b border-white/5 shrink-0">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center"><IconAI size={20} strokeWidth={1.5} className="text-neon-purple" /></div><div><p className="font-display font-semibold text-sm">Mentor CyberPingo</p><div className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${thinking ? "bg-cyber-yellow animate-pulse" : quota.rateLimited ? "bg-cyber-red" : "bg-cyber-green animate-pulse"}`} /><p className={`text-xs ${quota.rateLimited ? "text-cyber-red" : thinking ? "text-cyber-yellow" : "text-cyber-green"}`}>{thinking ? "En train de réfléchir…" : quota.rateLimited ? "Quota atteint" : "En ligne · Gemini IA"}</p></div></div></div>
      <button onClick={handleClear} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded" title="Nouvelle conversation"><IconTrash size={13} />Effacer</button>
    </div>

    {quota.remaining !== undefined && <p className={`mt-3 rounded-xl border px-4 py-3 text-sm ${quota.rateLimited ? "border-cyber-red/30 bg-cyber-red/10 text-red-100" : "border-cyber-blue/20 bg-cyber-blue/10 text-blue-100"}`} role={quota.rateLimited ? "alert" : "status"}>{quota.rateLimited ? "Tu as atteint ton quota quotidien. Le mentor sera de nouveau disponible demain." : `Questions restantes aujourd’hui : ${quota.remaining}${quota.limit ? ` / ${quota.limit}` : ""}.`}</p>}

    <div className="flex-1 overflow-y-auto py-4 space-y-4 scroll-smooth">{messages.map((m) => <ChatMessage key={m.id} message={m} />)}{thinking && <div className="flex gap-3 justify-start"><div className="w-8 h-8 rounded-xl bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center text-sm shrink-0 mt-1"><IconAI size={15} strokeWidth={1.5} className="text-neon-purple" /></div><div className="bg-white/5 border border-white/8 rounded-xl rounded-tl-none px-4 py-3"><div className="flex gap-1 items-center h-4"><span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" /><span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" /><span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" /></div></div></div>}<div ref={bottomRef} /></div>

    {messages.length <= 2 && !thinking && !quota.rateLimited && <div className="flex gap-2 flex-wrap pb-3 shrink-0">{suggestions.map((s) => <button key={s} onClick={() => void handleSend(s)} disabled={thinking} className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:border-cyber-blue/40 hover:text-white hover:bg-cyber-blue/5 transition-colors disabled:opacity-40">{s}</button>)}</div>}

    <form onSubmit={handleSubmit} className="flex gap-2 pb-4 shrink-0"><div className="flex-1 relative"><Input ref={inputRef} placeholder={quota.rateLimited ? "Quota quotidien atteint" : thinking ? "Le mentor réfléchit…" : "Pose ta question…"} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={thinking || quota.rateLimited} aria-label="Message pour le mentor" className="pr-10" maxLength={2000} />{input.length > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/20">{input.length}</span>}</div><Button type="submit" variant="primary" disabled={!input.trim() || thinking || quota.rateLimited} className="shrink-0">{thinking ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : "Envoyer"}</Button></form>
  </div>;
}

/** AppShell gates rendering on a loaded profile, so the view can call useLearner() safely. */
export default function MentorPage() {
  return <AppShell><MentorView /></AppShell>;
}
