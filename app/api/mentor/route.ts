import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { GeminiError, generateContent, isGeminiConfigured } from "@/lib/gemini";
import {
  getSystemPromptForMode,
  analyzeTPLocally,
  analyzeLogsLocally,
  generateQuizFlashLocally,
  type AgentMode,
  type AgentDomain,
} from "@/lib/ai-agent/engine";

interface ConversationTurn {
  role: "user" | "model";
  parts: { text: string }[];
}

interface RequestBody {
  message?: unknown;
  history?: unknown;
  mode?: unknown;
  domain?: unknown;
  context?: unknown;
}

const MAX_MESSAGE_LENGTH = 4000;
const failure = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return failure("Le service de comptes est indisponible pour le moment.", 503);
  const { supabase, user } = await getRequestUser();
  if (!user) return failure("Connecte-toi pour échanger avec le mentor ou faire corriger ton TP.", 401);

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return failure("Corps de requête invalide.", 400);
  }

  const userMessage = typeof body.message === "string" ? body.message.trim() : "";
  const rawMode = typeof body.mode === "string" ? body.mode : "mentor";
  const mode: AgentMode = ["mentor", "tp_grader", "log_analyzer", "quiz_gen"].includes(rawMode)
    ? (rawMode as AgentMode)
    : "mentor";
  const domain: AgentDomain = typeof body.domain === "string" ? (body.domain as AgentDomain) : "general";
  const extraContext = typeof body.context === "string" ? body.context.trim() : undefined;

  if (!userMessage && mode !== "quiz_gen") return failure("Message ou contenu manquant.", 400);
  if (userMessage.length > MAX_MESSAGE_LENGTH) return failure(`Ton message est trop long (${MAX_MESSAGE_LENGTH} caractères maximum).`, 400);

  const { data: quota, error: quotaError } = await supabase.rpc("consume_mentor_quota");
  if (quotaError) {
    console.error("Mentor quota error", quotaError.code);
    return failure("Le mentor est momentanément indisponible. Réessaie dans un instant.", 503);
  }
  const allowance = quota as { allowed: boolean; remaining: number; limit: number } | null;
  if (!allowance?.allowed) {
    return NextResponse.json(
      { error: `Tu as utilisé tes ${allowance?.limit ?? 40} interactions du jour. L'agent sera de nouveau disponible demain.`, remaining: 0 },
      { status: 429 },
    );
  }

  // Si Gemini n'est pas configuré, utiliser le moteur local haute fidélité
  if (!isGeminiConfigured()) {
    if (mode === "tp_grader") {
      const tpReport = analyzeTPLocally(userMessage, domain, extraContext);
      return NextResponse.json({
        content: `### 📊 1. Évaluation Globale & Note : **${tpReport.score}/20** (${tpReport.gradeLabel})
${tpReport.summary}

### ✅ 2. Points Forts & Notions Maîtrisées
${tpReport.strengths.map((s) => `- ${s}`).join("\n")}

### ⚠️ 3. Faiblesses & Erreurs Constatées
${tpReport.weaknesses.map((w) => `- ${w}`).join("\n")}

### 🛡️ 4. Conformité aux Référentiels (ANSSI / OWASP)
${tpReport.standardsCompliance.map((sc) => `- **${sc.standard}** [${sc.status.toUpperCase()}] : ${sc.notes}`).join("\n")}

### 🎯 5. Recommandations Pas-à-Pas
${tpReport.remediationSteps.map((r) => `1. ${r}`).join("\n")}

> 💬 **Le conseil du Professeur Pingo** : ${tpReport.pingoAdvice}`,
        tpData: tpReport,
        remaining: allowance.remaining,
        limit: allowance.limit,
      });
    }

    if (mode === "log_analyzer") {
      const logReport = analyzeLogsLocally(userMessage);
      return NextResponse.json({
        content: `### 🚨 1. Diagnostic de Menace : **${logReport.attackType}** (Criticité : **${logReport.severity.toUpperCase()}**)
${logReport.summary}

### 🔍 2. Indicateurs de Compromission (IOCs) Extraits
${logReport.iocs.map((ioc) => `- **[${ioc.type.toUpperCase()}]** \`${ioc.value}\` : ${ioc.description}`).join("\n")}

### ⏱️ 3. Chronologie des Événements
${logReport.timeline.map((t) => `${t.step}. ${t.isAnomaly ? "⚠️" : "ℹ️"} ${t.event}`).join("\n")}

### 🛡️ 4. Règle de Détection & Blocage Immédiat
\`\`\`${logReport.detectionRules[0]?.type || "bash"}
${logReport.detectionRules[0]?.rule || "# Aucune règle générée"}
\`\`\`

### 💡 5. Recommandations Pédagogiques & Démarche SOC
${logReport.recommendations.map((r) => `- ${r}`).join("\n")}`,
        logData: logReport,
        remaining: allowance.remaining,
        limit: allowance.limit,
      });
    }

    if (mode === "quiz_gen") {
      const quiz = generateQuizFlashLocally(domain);
      return NextResponse.json({
        content: `### ⚡ Défi Flash : ${quiz.title} (Niveau : ${quiz.difficulty.toUpperCase()})

**Mise en situation :**
${quiz.scenario}

**Question :**
**${quiz.question}**

${quiz.options.map((opt) => `- **${opt.id.toUpperCase()}**) ${opt.text}`).join("\n")}

---
*Réponds avec la lettre de ton choix (A, B, C ou D) pour valider ton intuition avec le Professeur Pingo.*`,
        quizData: quiz,
        remaining: allowance.remaining,
        limit: allowance.limit,
      });
    }
  }

  // Keep recent exchanges and add the system prompt
  const systemPrompt = getSystemPromptForMode(mode, domain, extraContext);
  const history = (Array.isArray(body.history) ? body.history : []).slice(-16).flatMap((entry): ConversationTurn[] => {
    const turn = entry as { role?: unknown; content?: unknown };
    if ((turn.role !== "user" && turn.role !== "mentor") || typeof turn.content !== "string" || !turn.content.trim()) return [];
    return [{ role: turn.role === "mentor" ? "model" : "user", parts: [{ text: turn.content.slice(0, 4000) }] }];
  });
  history.push({ role: "user", parts: [{ text: userMessage || "Génère un défi flash d'entraînement." }] });

  try {
    const text = await generateContent({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: history,
      generationConfig: { temperature: 0.65, maxOutputTokens: 1500, topP: 0.9 },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    }, 35_000);

    return NextResponse.json({
      content: text || "Je n’ai pas pu formuler de réponse à cette question. Essaie de la reformuler.",
      remaining: allowance.remaining,
      limit: allowance.limit,
    });
  } catch (error) {
    if (error instanceof GeminiError && error.status === 429) return failure("L'agent reçoit un volume élevé de requêtes. Réessaie dans une minute.", 503);
    console.error("Agent route error", error instanceof GeminiError ? error.status : error);

    // En cas d'erreur de réseau avec Gemini, on fournit un repli local intelligent au lieu de renvoyer une erreur brute
    if (mode === "tp_grader") {
      const tpReport = analyzeTPLocally(userMessage, domain, extraContext);
      return NextResponse.json({
        content: `### 📊 Évaluation Globale & Note : **${tpReport.score}/20** (${tpReport.gradeLabel})
${tpReport.summary}

### ✅ Points Forts
${tpReport.strengths.map((s) => `- ${s}`).join("\n")}

### ⚠️ Axes d'Amélioration
${tpReport.weaknesses.map((w) => `- ${w}`).join("\n")}

### 🎯 Recommandations
${tpReport.remediationSteps.map((r) => `1. ${r}`).join("\n")}

> 💬 **Pingo** : ${tpReport.pingoAdvice}`,
        tpData: tpReport,
        remaining: allowance.remaining,
        limit: allowance.limit,
      });
    }

    return failure("Le professeur Pingo n’a pas pu répondre. Réessaie dans un instant.", 502);
  }
}

