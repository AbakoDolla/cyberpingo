import { NextRequest, NextResponse } from "next/server";
import type { PublishType } from "@/types";
import { getRequestUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { GeminiError, generateContent, isGeminiConfigured } from "@/lib/gemini";
import { normalizePublishedChallenge, normalizePublishedCourse } from "@/lib/publishing";

export const maxDuration = 60;

// ─── Prompts ─────────────────────────────────────────────────────────────────

function buildCoursePrompt(content: string, fileName: string): string {
  return `Tu es un expert en ingénierie pédagogique pour une plateforme de cybersécurité (Cyberpingo).
Analyse le document suivant et génère un cours structuré complet en JSON.

DOCUMENT : "${fileName}"
CONTENU :
${content.slice(0, 12000)}

INSTRUCTIONS :
- Génère un objet JSON VALIDE (sans markdown, sans commentaires, juste le JSON brut)
- Extrais ou crée un titre percutant, une description claire, un niveau (debutant/intermediaire/avance)
- Crée 2 à 4 leçons structurées avec des blocs pédagogiques variés (text, code, schema, example)
- Génère 1 quiz par leçon avec 3 questions QCM/vrai_faux avec explications
- Génère 1 challenge pratique lié au contenu
- Tous les champs doivent être en FRANÇAIS
- Les blocs de type "code" doivent avoir un champ "language" (bash, python, etc.)
- Les réponses des quiz doivent être précises et éducatives

FORMAT JSON EXACT :
{
  "course": {
    "id": "pub-<timestamp_placeholder>",
    "slug": "slug-du-cours",
    "title": "Titre du cours",
    "description": "Description courte",
    "level": "debutant",
    "category": "Catégorie",
    "durationMinutes": 45,
    "icon": "slug-du-cours",
    "locked": false,
    "aiAnalysis": "Résumé de l'analyse du document en 2-3 phrases",
    "lessons": [
      {
        "id": "lesson-pub-1",
        "courseId": "pub-<timestamp_placeholder>",
        "title": "Titre de la leçon",
        "order": 1,
        "durationMinutes": 12,
        "xpReward": 50,
        "completed": false,
        "quizId": "quiz-pub-1",
        "blocks": [
          {"type": "text", "content": "Contenu pédagogique..."},
          {"type": "code", "language": "bash", "content": "exemple de commande"},
          {"type": "example", "content": "Exemple concret..."}
        ]
      }
    ],
    "quizzes": [
      {
        "id": "quiz-pub-1",
        "lessonId": "lesson-pub-1",
        "title": "Quiz — Titre",
        "xpReward": 80,
        "questions": [
          {
            "id": "q-pub-1-1",
            "type": "qcm",
            "prompt": "Question ?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "Option A",
            "explanation": "Explication détaillée..."
          }
        ]
      }
    ]
  },
  "challenge": {
    "id": "ch-pub-<timestamp_placeholder>",
    "slug": "slug-challenge",
    "title": "Titre du challenge",
    "description": "Description du challenge pratique",
    "category": "reseau",
    "difficulty": "debutant",
    "xpReward": 100,
    "status": "disponible",
    "objectives": ["Objectif 1", "Objectif 2"],
    "hints": ["Indice 1", "Indice 2"],
    "terminalLines": ["$ commande exemple", "Résultat simulé"],
    "flagPlaceholder": "Ta réponse ici",
    "expectedAnswer": "la réponse attendue"
  }
}`;
}

function buildChallengePrompt(content: string, fileName: string): string {
  return `Tu es un expert en cybersécurité pour la plateforme Cyberpingo.
Analyse le document suivant et génère un challenge pratique structuré en JSON.

DOCUMENT : "${fileName}"
CONTENU :
${content.slice(0, 12000)}

INSTRUCTIONS :
- Génère un objet JSON VALIDE (sans markdown, sans commentaires, juste le JSON brut)
- Crée un challenge pratique et réaliste basé sur le contenu du document
- Le challenge doit être éducatif et éthique (environnement simulé uniquement)
- Category doit être une de : reseau, linux, web, cryptographie, osint, securite
- Difficulty : debutant, intermediaire, ou avance
- Les terminalLines simulent un vrai terminal avec des sorties réalistes
- La expectedAnswer doit être vérifiable (une commande, un mot, une phrase courte)
- Tout en FRANÇAIS sauf les commandes terminal

FORMAT JSON EXACT :
{
  "challenge": {
    "id": "ch-pub-<timestamp_placeholder>",
    "slug": "slug-challenge",
    "title": "Titre du challenge",
    "description": "Description détaillée du scénario",
    "category": "reseau",
    "difficulty": "debutant",
    "xpReward": 120,
    "status": "disponible",
    "objectives": ["Objectif 1", "Objectif 2", "Objectif 3"],
    "hints": ["Indice 1 précis", "Indice 2 si bloqué"],
    "terminalLines": [
      "$ commande_exemple",
      "Sortie simulée ligne 1",
      "Sortie simulée ligne 2"
    ],
    "flagPlaceholder": "Décrit ce que l'apprenant doit soumettre",
    "expectedAnswer": "réponse attendue"
  }
}`;
}

// ─── Nettoyage de la réponse Gemini ──────────────────────────────────────────

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1);
  return raw.trim();
}

const MAX_TEXT_LENGTH = 200_000;
const MAX_PDF_BASE64_LENGTH = 4_000_000; // ≈ 3 Mo, sous la limite de corps des fonctions Vercel.

interface AnalyzeBody {
  content?: unknown;
  fileName?: unknown;
  type?: unknown;
  fileData?: unknown;
  mimeType?: unknown;
}

const failure = (error: string, status: number) => NextResponse.json({ error }, { status });

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return failure("Le service de comptes n’est pas configuré.", 503);
  const { user, isAdmin } = await getRequestUser();
  if (!user) return failure("Connecte-toi pour publier du contenu.", 401);
  if (!isAdmin) return failure("Seuls les administrateurs peuvent publier du contenu.", 403);
  if (!isGeminiConfigured()) return failure("L’analyse automatique n’est pas configurée : ajoute GEMINI_API_KEY côté serveur.", 503);

  let body: AnalyzeBody;
  try {
    body = await request.json();
  } catch {
    return failure("Corps de requête invalide.", 400);
  }

  const type: PublishType | null = body.type === "course" || body.type === "challenge" ? body.type : null;
  const fileName = typeof body.fileName === "string" ? body.fileName.replace(/[\r\n"]/g, " ").trim().slice(0, 200) : "";
  const isPdf = body.mimeType === "application/pdf" && typeof body.fileData === "string";
  const content = typeof body.content === "string" ? body.content.slice(0, MAX_TEXT_LENGTH) : "";
  if (!type || !fileName) return failure("Indique le type de contenu et le nom du fichier.", 400);
  if (isPdf && (body.fileData as string).length > MAX_PDF_BASE64_LENGTH) return failure("PDF trop volumineux : 3 Mo maximum.", 413);
  if (isPdf && !/^[A-Za-z0-9+/=]+$/.test(body.fileData as string)) return failure("Le PDF transmis est illisible.", 400);
  if (!isPdf && content.trim().length < 40) return failure("Le fichier ne contient pas assez de texte à analyser.", 400);

  const documentText = isPdf ? "(Le contenu complet est fourni dans le document PDF joint.)" : content;
  const prompt = type === "course" ? buildCoursePrompt(documentText, fileName) : buildChallengePrompt(documentText, fileName);
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (isPdf) parts.unshift({ inline_data: { mime_type: "application/pdf", data: body.fileData } });

  let rawText: string;
  try {
    rawText = await generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192, responseMimeType: "application/json" },
    }, 55_000);
  } catch (error) {
    if (error instanceof GeminiError && error.status === 429) return failure("Le service d’analyse est saturé. Réessaie dans une minute.", 429);
    console.error("Publish analyze error", error instanceof GeminiError ? error.status : error);
    return failure("Gemini n’a pas pu analyser le fichier. Réessaie dans un instant.", 502);
  }

  let parsed: { course?: unknown; challenge?: unknown };
  try {
    parsed = JSON.parse(extractJson(rawText));
  } catch {
    return failure("La réponse générée était incomplète. Relance l’analyse.", 502);
  }

  const now = new Date();
  const meta = { publishedAt: now.toISOString(), sourceFileName: fileName };
  // Fresh identifiers are generated here; the AI-provided ones are never trusted.
  const withoutId = (value: unknown) => ({ ...(value && typeof value === "object" ? value as Record<string, unknown> : {}), id: undefined, ...meta });
  try {
    const course = type === "course" && parsed.course ? normalizePublishedCourse(withoutId(parsed.course), { now }) : null;
    const challenge = parsed.challenge ? normalizePublishedChallenge(withoutId(parsed.challenge), { now }) : null;
    if (type === "course" && !course) return failure("Aucun cours exploitable n’a été généré. Relance l’analyse.", 502);
    if (type === "challenge" && !challenge) return failure("Aucun challenge exploitable n’a été généré. Relance l’analyse.", 502);
    return NextResponse.json({ course, challenge });
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Le contenu généré est invalide. Relance l’analyse.", 502);
  }
}
