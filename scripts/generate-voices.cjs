/**
 * Generates the spoken library of the mascot using the custom "cyberpingo" ElevenLabs voice
 * (voice_id: IUovyCa9veb0Bu5IUFy9) with ElevenLabs v3 automatic expressive audio tags ([warmly],
 * [enthusiastic], [proud], [curious], etc.) for a natural, human delivery:
 * - public/audio/pingo-intro.mp3
 * - public/audio/professeur-pingo-intro.wav
 * - public/audio/mascot/<id>.mp3 (all 30 mascot_lines)
 * - supabase/seed/04_mascot_voices.sql
 *
 *   ELEVENLABS_API_KEY=sk_... node scripts/generate-voices.cjs            # only missing files
 *   ELEVENLABS_API_KEY=sk_... node scripts/generate-voices.cjs --force    # regenerate everything
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "audio");
const SEEDS = ["02_reseaux_path.sql", "03_soc_path.sql"].map((name) => path.join(ROOT, "supabase", "seed", name));
const SQL_FILE = path.join(ROOT, "supabase", "seed", "04_mascot_voices.sql");

// Load .env.local if ELEVENLABS_API_KEY is not already in process.env
const envLocalPath = path.join(ROOT, ".env.local");
if (!process.env.ELEVENLABS_API_KEY && fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "IUovyCa9veb0Bu5IUFy9"; // cyberpingo
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_v3";
const CREDIT = "Voix de synthèse neuronale CyberPingo (ElevenLabs)";
const force = process.argv.includes("--force");

/**
 * Automatic expressive audio tags & voice settings per mascot expression for ElevenLabs v3.
 */
const EXPRESSION_TAGS = {
  celebration: { opening: "[excited]", followUp: "[proud]", stability: 0.4, similarity_boost: 0.8, style: 0.45 },
  proud: { opening: "[proud]", followUp: "[warmly]", stability: 0.45, similarity_boost: 0.8, style: 0.35 },
  happy: { opening: "[cheerfully]", followUp: "[warmly]", stability: 0.45, similarity_boost: 0.8, style: 0.35 },
  surprised: { opening: "[surprised]", followUp: "[chuckles softly]", stability: 0.4, similarity_boost: 0.8, style: 0.4 },
  encouraging: { opening: "[warmly]", followUp: "[encouraging]", stability: 0.48, similarity_boost: 0.8, style: 0.3 },
  mission: { opening: "[confident]", followUp: "[focused]", stability: 0.5, similarity_boost: 0.82, style: 0.3 },
  focused: { opening: "[focused]", followUp: "[calm]", stability: 0.52, similarity_boost: 0.82, style: 0.25 },
  thinking: { opening: "[thoughtful]", followUp: "[curious]", stability: 0.48, similarity_boost: 0.8, style: 0.3 },
  disappointed: { opening: "[sighs softly] [gentle]", followUp: "[encouraging]", stability: 0.48, similarity_boost: 0.8, style: 0.3 },
  expert: { opening: "[confident]", followUp: "[warmly]", stability: 0.52, similarity_boost: 0.82, style: 0.28 },
  explanation: { opening: "[calm]", followUp: "[warmly]", stability: 0.52, similarity_boost: 0.82, style: 0.25 },
};

const CURATED_TAGGED_LINES = {
  intro:
    "[warmly] Salut, moi c’est Pingo ! [cheerfully] Je suis la mascotte de CyberPingo. [calm] Ici, on apprend la cybersécurité pas à pas, avec des leçons courtes, des laboratoires sans risque et des badges pour garder la motivation. [encouraging] Pas besoin de tout savoir pour commencer... je t’accompagne à chaque étape. [enthusiastic] Prêt à prendre le premier réflexe ?",
  "da285d27-f5dc-9470-288b-5239d3b4d73b":
    "[warmly] Salut, moi c’est Pingo ! [cheerfully] Je t’accompagne dans chaque leçon... On commence quand tu veux.",
  "d87276bc-32ac-b61e-b061-c611b495e6e5":
    "[warmly] Content de te revoir ! [encouraging] Une leçon, un exercice, et tu avances déjà.",
  "199c8897-2797-aff0-de28-71ca23bad1e1":
    "[focused] On se concentre : [calm] lis les objectifs, ils te disent ce que tu sauras faire à la fin.",
  "8a6d2c0b-c6af-5861-5ecb-a3e7b19d9457":
    "[calm] Si un schéma te semble obscur, relis-le calmement. [warmly] Un bon schéma vaut dix paragraphes.",
  "f81109a2-298b-3425-fd9a-8900724b9882":
    "[enthusiastic] Bonne réponse ! [proud] Tu viens de prouver que tu as compris, pas seulement retenu.",
  "ff1f8c62-0c3e-8b51-17fb-1aa2e1e0e778":
    "[cheerfully] Exact ! [encouraging] Continue sur cette lancée.",
  "d20265aa-6f59-18a3-fa9c-7efd94751304":
    "[gentle] Pas tout à fait... [encouraging] Relis l’énoncé, regarde l’indice et retente : se tromper fait partie de l’entraînement.",
  "fdbce325-8d11-86ed-0c3f-4711db554265":
    "[thoughtful] Hmm... [curious] Ouvre la capture ou le journal, et cherche la ligne qui prouve ta réponse.",
  "4e16390a-9efb-7a07-e19d-c240cab0e2e5":
    "[proud] Leçon terminée ! [warmly] Prends une seconde pour résumer ce que tu viens d’apprendre avec tes mots.",
  "5ebb2053-f07e-6ea3-bef4-de8e81774703":
    "[cheerfully] Une de plus de validée ! [warmly] La régularité bat l’intensité.",
  "c92bb8fc-2df0-6989-781c-0b77358c1f0b":
    "[excited] Niveau supérieur ! [proud] Chaque niveau est le résultat de vrais efforts. Bravo !",
  "ef264b05-6e2e-1a7e-0c7d-a43b1bd16255":
    "[excited] Un nouveau badge pour ta collection ! [proud] Va voir sa condition : tu l’as gagné pour de bon.",
  "72a62b06-091f-21d3-b2d5-d8de43eaafe2":
    "[surprised] Oh, un badge ! [chuckles softly] Tu ne l’avais pas vu venir ?",
  "65b23789-9944-a131-fe16-66c717af20fa":
    "[confident] Nouvelle mission : [focused] lis le briefing, repère les contraintes et lance-toi.",
  "1c741aeb-ee97-8044-13ea-300e4588d990":
    "[focused] En situation réelle, personne ne te donne la réponse. [confident] Fie-toi aux preuves.",
  "a8fd2f99-7338-2c44-a64e-efee18234cd9":
    "[warmly] Te revoilà ! [cheerfully] Pas de souci pour la pause : on reprend doucement là où tu étais.",
  "cb170032-3907-6241-cf05-f3a6ced1c2c5":
    "[warmly] Un petit rappel pour se remettre en route : [encouraging] refais le dernier quiz, c’est rapide.",
  "5a82bf3c-f089-d148-7238-39f21025814a":
    "[proud] Compétence validée par une vraie mise en pratique. [confident] C’est ce qui compte face à un employeur.",
  "7782fcb9-e6b4-bfd0-b152-fbca1c58b83b":
    "[excited] Nouveau rang ! [proud] Ton parcours se voit maintenant. [encouraging] Continue, la suite t’attend.",
  "60a3491a-3849-6fb4-4ab7-710bc689838d":
    "[excited] Parcours terminé ! [proud] De la théorie à la pratique, tu as bouclé la boucle... Fier de toi.",
  "f7ca590c-213a-a310-4c5c-b43ab4568a82":
    "[proud] Laboratoire réussi ! [warmly] Tu as fait un vrai travail d’analyste : preuve par preuve.",
  "77509e8f-4f43-9818-e577-3a9ff2771018":
    "[confident] Mission accomplie. [calm] Retiens la méthode : observer, formuler une hypothèse, vérifier.",
  "df374134-0736-2213-df0c-1178db413ca5":
    "[focused] Dans un journal, chaque ligne est un témoin. [curious] Cherche d’abord l’adresse qui revient trop souvent.",
  "e282253a-f4a3-9fea-3a65-ec50330cb473":
    "[confident] Mission d’analyste : [focused] trouve ce qui s’est passé, et prouve-le avec une ligne du fichier.",
  "463bd6b8-2caf-cfab-21d0-b8d528ce2889":
    "[thoughtful] Vérifie l’heure : les journaux sont en UTC. [calm] Une heure de décalage change toute l’histoire.",
  "1ed50ce2-fb13-a77e-4713-1a5b3edd1458":
    "[gentle] Un faux positif t’a peut-être piégé. [encouraging] Cherche si l’adresse a réussi à se connecter, pas seulement essayé.",
  "6fd7b129-3f65-3b43-f76e-1dffb8b3add4":
    "[enthusiastic] Bien vu ! [confident] Une bonne réponse d’analyste s’appuie toujours sur une ligne de preuve.",
  "c141e802-ba05-10df-5c4c-e2fcd9e97d18":
    "[proud] Enquête bouclée. [warmly] Pense à écrire ta chronologie : c’est la base d’un vrai rapport d’incident.",
  "31c4b118-21b2-c0ba-c32a-49c0db3e1470":
    "[proud] Compétence d’investigation validée. [confident] Les équipes de sécurité cherchent exactement ce réflexe.",
  "179f965c-0df7-6c74-4565-18949dfb36ad":
    "[calm] Un journal se lit comme une histoire : qui, quoi, quand, d’où. [warmly] Garde ces quatre questions en tête.",
};

function autoTagForElevenLabs(rawText, expression = "encouraging", lineId) {
  if (lineId && CURATED_TAGGED_LINES[lineId]) {
    return CURATED_TAGGED_LINES[lineId];
  }
  const trimmed = String(rawText || "").trim();
  if (!trimmed) return trimmed;
  if (/^\[[a-z\s]+\]/i.test(trimmed)) return trimmed;

  const preset = EXPRESSION_TAGS[expression] || EXPRESSION_TAGS.encouraging;
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 1) {
    return `${preset.opening} ${trimmed}`;
  }
  return sentences
    .map((sentence, idx) => {
      if (idx === 0) return `${preset.opening} ${sentence}`;
      if (idx === 1) return /\?$/.test(sentence) ? `[curious] ${sentence}` : `${preset.followUp} ${sentence}`;
      return /\?$/.test(sentence) ? `[encouraging] ${sentence}` : `[calm] ${sentence}`;
    })
    .join(" ");
}

function readLines() {
  const rows = [];
  const pattern = /\(\s*'([0-9a-f-]{36})',\s*'([a-z_]+)',\s*'([a-z]+)',\s*'((?:[^']|'')*)',\s*\d+,\s*\d+\s*\)/g;
  for (const file of SEEDS) {
    const sql = fs.readFileSync(file, "utf8");
    const start = sql.indexOf("insert into public.mascot_lines");
    if (start < 0) continue;
    const block = sql.slice(start, sql.indexOf("on conflict", start));
    for (const match of block.matchAll(pattern)) {
      rows.push({ id: match[1], event: match[2], expression: match[3], text: match[4].replace(/''/g, "'") });
    }
  }
  return rows;
}

function pcmToWavBuffer(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

async function synthesizeElevenLabs({ apiKey, text, expression, file, format = "mp3_44100_128" }) {
  const preset = EXPRESSION_TAGS[expression] || EXPRESSION_TAGS.encouraging;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(VOICE_ID)}?output_format=${encodeURIComponent(format)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: format.startsWith("pcm_") ? "audio/pcm" : "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      language_code: "fr",
      voice_settings: {
        stability: preset.stability,
        similarity_boost: preset.similarity_boost,
        style: preset.style,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`ElevenLabs HTTP ${response.status} for ${path.basename(file)}: ${errBody}`);
  }

  const rawBuffer = Buffer.from(await response.arrayBuffer());
  const bytes = format === "pcm_24000" ? pcmToWavBuffer(rawBuffer, 24000, 1, 16) : rawBuffer;
  if (bytes.length < 3000) {
    throw new Error(`Audio trop court (${bytes.length} octets) pour ${path.basename(file)}`);
  }
  fs.writeFileSync(file, bytes);
  return bytes.length;
}

async function withRetry(task, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await task();
    } catch (error) {
      last = error;
      await new Promise((r) => setTimeout(r, 900 * (i + 1)));
    }
  }
  throw last;
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY manquant. Définissez ELEVENLABS_API_KEY dans .env.local ou l'environnement.");
  }

  fs.mkdirSync(path.join(OUT, "mascot"), { recursive: true });

  const lines = readLines();
  if (lines.length === 0) throw new Error("aucune réplique trouvée dans les seeds");
  const intro = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "pingo-intro.json"), "utf8"));

  const jobs = [
    {
      file: path.join(OUT, "pingo-intro.mp3"),
      text: autoTagForElevenLabs(intro.text, "happy", "intro"),
      expression: "happy",
      format: "mp3_44100_128",
    },
    {
      file: path.join(OUT, "professeur-pingo-intro.wav"),
      text: autoTagForElevenLabs(intro.text, "happy", "intro"),
      expression: "happy",
      format: "pcm_24000",
    },
    ...lines.map((line) => ({
      file: path.join(OUT, "mascot", `${line.id}.mp3`),
      text: autoTagForElevenLabs(line.text, line.expression, line.id),
      expression: line.expression,
      format: "mp3_44100_128",
    })),
  ];

  let made = 0;
  for (const job of jobs) {
    if (!force && fs.existsSync(job.file) && fs.statSync(job.file).size > 3000) continue;
    const size = await withRetry(() =>
      synthesizeElevenLabs({
        apiKey,
        text: job.text,
        expression: job.expression,
        file: job.file,
        format: job.format,
      })
    );
    made += 1;
    console.log(`  [${job.expression}] ${path.relative(ROOT, job.file)}  ${(size / 1024).toFixed(1)} KB`);
  }

  const values = lines.map((line) => `  ('${line.id}', '/audio/mascot/${line.id}.mp3')`).join(",\n");
  const sql = `-- Spoken library of the mascot, generated by scripts/generate-voices.cjs (ElevenLabs cyberpingo ${VOICE_ID} / ${MODEL_ID}).
-- Idempotent: only lines without audio are touched, so a human recording uploaded from the admin
-- "Mascotte et voix" page is never overwritten.

begin;

update public.mascot_lines as m
set audio_url = v.audio_url,
    voice_credit = '${CREDIT}'
from (values
${values}
) as v (id, audio_url)
where m.id = v.id::uuid and m.audio_url is null;

commit;
`;
  fs.writeFileSync(SQL_FILE, sql, "utf8");
  console.log(`${made} fichier(s) générés avec la voix cyberpingo (${VOICE_ID}), ${lines.length} répliques liées dans ${path.relative(ROOT, SQL_FILE)}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
