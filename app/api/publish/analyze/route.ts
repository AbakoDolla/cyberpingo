import { NextRequest, NextResponse } from "next/server";
import { PublishedCourse, PublishedChallenge, PublishType } from "@/types";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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
  // Retire les balises markdown ```json ... ```
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Cherche le premier { et le dernier }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1);
  return raw.trim();
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Clé API Gemini non configurée." }, { status: 500 });
  }

  let body: { content?: string; fileName?: string; type?: PublishType };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { content, fileName, type } = body;
  if (!content || !fileName || !type) {
    return NextResponse.json({ error: "Champs manquants : content, fileName, type." }, { status: 400 });
  }

  const prompt = type === "course"
    ? buildCoursePrompt(content, fileName)
    : buildChallengePrompt(content, fileName);

  try {
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      console.error("Gemini error:", geminiRes.status, err);
      return NextResponse.json(
        { error: "Gemini n'a pas pu analyser le fichier.", details: err },
        { status: geminiRes.status }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: { course?: PublishedCourse; challenge?: PublishedChallenge };
    try {
      parsed = JSON.parse(extractJson(rawText));
    } catch {
      console.error("JSON parse error, raw:", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "La réponse de Gemini n'est pas un JSON valide.", raw: rawText.slice(0, 800) },
        { status: 502 }
      );
    }

    // Injecter timestamp réel pour unicité des IDs
    const ts = Date.now().toString();
    const replacer = (obj: unknown): unknown => {
      if (typeof obj === "string") return obj.replace(/<timestamp_placeholder>/g, ts);
      if (Array.isArray(obj)) return obj.map(replacer);
      if (obj && typeof obj === "object") {
        return Object.fromEntries(
          Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, replacer(v)])
        );
      }
      return obj;
    };

    const result = replacer(parsed) as { course?: PublishedCourse; challenge?: PublishedChallenge };

    // Ajouter métadonnées
    const publishedAt = new Date().toISOString();
    if (result.course) {
      result.course.publishedAt = publishedAt;
      result.course.sourceFileName = fileName;
    }
    if (result.challenge) {
      (result.challenge as PublishedChallenge & { publishedAt: string; sourceFileName: string }).publishedAt = publishedAt;
      (result.challenge as PublishedChallenge & { sourceFileName: string }).sourceFileName = fileName;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Publish analyze error:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
