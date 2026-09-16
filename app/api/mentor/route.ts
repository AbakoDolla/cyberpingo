import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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
  message?: string;
  history?: { role: "user" | "mentor"; content: string }[];
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Clé API Gemini non configurée côté serveur." },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const userMessage = body.message?.trim();
  if (!userMessage) {
    return NextResponse.json({ error: "Message manquant." }, { status: 400 });
  }

  // Convertit l'historique frontend (role: "mentor") vers le format Gemini (role: "model")
  // On limite à 10 derniers échanges pour éviter de dépasser le contexte
  const rawHistory = body.history ?? [];
  const trimmedHistory = rawHistory.slice(-20); // 20 messages = 10 échanges
  const conversationHistory: ConversationTurn[] = trimmedHistory
    .filter((m) => m.role !== "mentor" || m.content) // exclure les messages vides
    .map((m) => ({
      role: m.role === "mentor" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  // Ajout du message courant
  conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: conversationHistory,
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 768,
          topP: 0.9,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", response.status, errorData);
      return NextResponse.json(
        { error: "L'API Gemini a retourné une erreur.", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Je n'ai pas pu générer de réponse. Réessaie dans un instant.";

    return NextResponse.json({ content: text });
  } catch (err) {
    console.error("Mentor route error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
