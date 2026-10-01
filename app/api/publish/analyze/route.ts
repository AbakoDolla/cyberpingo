import { NextRequest, NextResponse } from "next/server";
import { GeminiError, generateContent, isGeminiConfigured } from "@/lib/gemini";
import { normalizeCourseImport } from "@/lib/course-import";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getRequestUser } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_TEXT_LENGTH = 200_000;
const failure = (error: string, status: number) => NextResponse.json({ error }, { status });

interface AnalyzeBody { content?: unknown; fileName?: unknown }

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end >= start ? raw.slice(start, end + 1) : raw.trim();
}

function buildPrompt(content: string, fileName: string) {
  return `Tu es concepteur pédagogique senior pour CyberPingo, plateforme française de cybersécurité.
Analyse le document et transforme-le en brouillon de cours importable par Supabase.

DOCUMENT : ${fileName}
CONTENU :
${content.slice(0, 12000)}

Réponds en JSON brut uniquement. La sortie doit être un objet CourseImport :
{
  "title": "Titre clair",
  "slug": "slug-optionnel",
  "short_description": "Résumé en une phrase",
  "description": "Description pédagogique",
  "level": "debutant|intermediaire|avance",
  "category": "Catégorie courte",
  "icon": "fondamentaux",
  "modules": [
    {
      "title": "Module",
      "description": "Objectif du module",
      "lessons": [
        {
          "title": "Leçon",
          "summary": "Résumé",
          "content_type": "article",
          "duration_minutes": 10,
          "xp_reward": 50,
          "blocks": [
            {"type":"heading","content":"Titre de section"},
            {"type":"text","content":"Explication concise en français."},
            {"type":"code","language":"bash","content":"commande --exemple"},
            {"type":"callout","content":"Point d’attention."}
          ],
          "quiz": {
            "title": "Quiz — ...",
            "description": "",
            "pass_percentage": 70,
            "questions": [
              {"question_type":"single_choice","prompt":"Question ?","explanation":"Pourquoi.","difficulty":"facile","xp_reward":10,"answers":[{"label":"Bonne réponse","is_correct":true},{"label":"Distracteur","is_correct":false}]}
            ]
          }
        }
      ],
      "quiz": null
    }
  ]
}
Contraintes : français, cybersécurité éthique et défensive, 1 à 6 modules, 1 à 8 leçons par module, 2 à 5 réponses par question, au moins une bonne réponse, exactement une bonne réponse pour single_choice et true_false.`;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return failure("Le service de comptes n’est pas configuré.", 503);
  const { supabase, user, isAdmin } = await getRequestUser();
  if (!user) return failure("Connecte-toi pour analyser un document.", 401);
  const { data: rpcAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (rpcError || !isAdmin || !rpcAdmin) return failure("Accès réservé à l’équipe CyberPingo.", 403);
  if (!isGeminiConfigured()) return failure("L’analyse automatique n’est pas configurée : ajoute GEMINI_API_KEY côté serveur.", 503);

  let body: AnalyzeBody;
  try { body = await request.json() as AnalyzeBody; } catch { return failure("Corps de requête invalide.", 400); }
  const fileName = typeof body.fileName === "string" ? body.fileName.replace(/[\r\n"]/g, " ").trim().slice(0, 200) : "document";
  const content = typeof body.content === "string" ? body.content.slice(0, MAX_TEXT_LENGTH) : "";
  if (content.trim().length < 40) return failure("Le fichier ne contient pas assez de texte à analyser.", 400);

  let rawText: string;
  try {
    rawText = await generateContent({
      contents: [{ role: "user", parts: [{ text: buildPrompt(content, fileName) }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 8192, responseMimeType: "application/json" },
    }, 55_000);
  } catch (error) {
    if (error instanceof GeminiError && error.status === 429) return failure("Le service d’analyse est saturé. Réessaie dans une minute.", 429);
    console.error("Admin import analyze error", error instanceof GeminiError ? error.status : error);
    return failure("Gemini n’a pas pu analyser le fichier. Réessaie dans un instant.", 502);
  }

  try {
    const parsed = JSON.parse(extractJson(rawText)) as unknown;
    return NextResponse.json({ course: normalizeCourseImport(parsed) });
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Le contenu généré est invalide. Relance l’analyse.", 502);
  }
}