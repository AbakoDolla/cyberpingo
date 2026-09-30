import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { GeminiError, generateContent, isGeminiConfigured } from "@/lib/gemini";

const SYSTEM_PROMPT = `Tu es le Mentor Cyberpingo, un expert en cybersécurité qui accompagne des apprenants francophones.

CONTEXTE : La plateforme Cyberpingo propose des cours sur : Fondamentaux de la cybersécurité, Réseaux informatiques (DNS, ports, OSI), Administration Linux (terminal, permissions, SUID), Sécurité Web (OWASP Top 10, XSS, SQLi), Introduction au Pentest. Les apprenants font aussi des challenges pratiques (OSINT, cryptographie, Linux, réseaux, sécurité web).

COMPORTEMENT :
- Réponds TOUJOURS en français, de manière pédagogique et encourageante
- Adapte la complexité au niveau apparent de l'apprenant
- Donne systématiquement des exemples concrets, des commandes ou du code quand c'est pertinent
- Structure tes réponses avec des titres, listes ou blocs de code en Markdown quand c'est utile
- Sois concis mais complet : vise 80-250 mots
- Relie tes réponses au cursus Cyberpingo quand c'est pertinent ("Dans le module Réseaux, tu verras que...")
- Pour les erreurs ou bugs : demande le message exact et le contexte avant de répondre

LIMITES ÉTHIQUES (non négociables) :
- Refuse toute aide pour attaquer des systèmes réels sans autorisation explicite
- Refuse la création de malwares, ransomwares, outils de surveillance non autorisée
- Si hors sujet cybersécurité : recentre poliment sur la formation`;

interface ConversationTurn {
  role: "user" | "model";
  parts: { text: string }[];
}

interface RequestBody {
  message?: unknown;
  history?: unknown;
}

const MAX_MESSAGE_LENGTH = 2000;
const failure = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return failure("Le service de comptes n’est pas configuré.", 503);
  const { supabase, user } = await getRequestUser();
  if (!user) return failure("Connecte-toi pour discuter avec le mentor.", 401);
  if (!isGeminiConfigured()) return failure("Le mentor IA n’est pas configuré sur ce serveur.", 503);

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return failure("Corps de requête invalide.", 400);
  }

  const userMessage = typeof body.message === "string" ? body.message.trim() : "";
  if (!userMessage) return failure("Message manquant.", 400);
  if (userMessage.length > MAX_MESSAGE_LENGTH) return failure(`Ton message est trop long (${MAX_MESSAGE_LENGTH} caractères maximum).`, 400);

  const { data: quota, error: quotaError } = await supabase.rpc("consume_mentor_quota");
  if (quotaError) {
    console.error("Mentor quota error", quotaError.code);
    return failure("Le mentor est momentanément indisponible. Réessaie dans un instant.", 503);
  }
  const allowance = quota as { allowed: boolean; remaining: number; limit: number } | null;
  if (!allowance?.allowed) {
    return NextResponse.json(
      { error: `Tu as utilisé tes ${allowance?.limit ?? 40} questions du jour. Le mentor sera de nouveau disponible demain.`, remaining: 0 },
      { status: 429 },
    );
  }

  // Keep the last 10 exchanges and only well-formed turns.
  const history = (Array.isArray(body.history) ? body.history : []).slice(-20).flatMap((entry): ConversationTurn[] => {
    const turn = entry as { role?: unknown; content?: unknown };
    if ((turn.role !== "user" && turn.role !== "mentor") || typeof turn.content !== "string" || !turn.content.trim()) return [];
    return [{ role: turn.role === "mentor" ? "model" : "user", parts: [{ text: turn.content.slice(0, 4000) }] }];
  });
  history.push({ role: "user", parts: [{ text: userMessage }] });

  try {
    const text = await generateContent({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: history,
      generationConfig: { temperature: 0.65, maxOutputTokens: 1024, topP: 0.9 },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    }, 30_000);
    return NextResponse.json({
      content: text || "Je n’ai pas pu formuler de réponse à cette question. Essaie de la reformuler.",
      remaining: allowance.remaining,
    });
  } catch (error) {
    if (error instanceof GeminiError && error.status === 429) return failure("Le mentor reçoit beaucoup de questions. Réessaie dans une minute.", 503);
    console.error("Mentor route error", error instanceof GeminiError ? error.status : error);
    return failure("Le mentor n’a pas pu répondre. Réessaie dans un instant.", 502);
  }
}
