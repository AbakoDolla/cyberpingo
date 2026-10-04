// Guides, grids and templates of the pentest labs teach the method and never hand over an answer. This checks, for the seven labs of the
// "Introduction au Pentest" programme, that no accepted answer appears in a guide, in the briefing, in the general hints or in the
// statement of another task, that no control character slipped into a file, that every command of a guide sits in a code block, and
// that every file a guide mentions exists. (Running the commands of each guide is done by tests/pt-lab-<id>.test.cjs.)
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildPtAssetsTp1 } = require("../scripts/lab-scenarios-pt-tp1.cjs");
const { buildPtAssetsTp2 } = require("../scripts/lab-scenarios-pt-tp2.cjs");
const { buildPtAssetsTp3 } = require("../scripts/lab-scenarios-pt-tp3.cjs");
const { buildPtAssetsTp4 } = require("../scripts/lab-scenarios-pt-tp4.cjs");
const { buildPtAssetsTp5 } = require("../scripts/lab-scenarios-pt-tp5.cjs");
const { buildPtAssetsTp6 } = require("../scripts/lab-scenarios-pt-tp6.cjs");
const { buildPtAssetsProj } = require("../scripts/lab-scenarios-pt-proj.cjs");
const { load } = require("../scripts/ts-loader.cjs");

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);
const commandLine = /^(Select-String|Get-Content|Get-ChildItem|Import-Csv|Group-Object|Sort-Object|Measure-Object|ForEach-Object|grep\b|egrep\b|awk\b|sed\b|sort\b|cut\b|uniq\b|wc\b|find\b|head\b|tail\b|cat\b|ls\b|printf\b|bash\b|sha256sum\b|diff\b|tar\b|\$[A-Za-z_])/;
// Files that are working material rather than a guide: they may hold the very values a learner has to find.
// The mission letter and the rules of engagement of TP 1 carry the authorised scope, the hours and the contacts the questions ask for;
// the OWASP memo of TP 5 lists the ten categories, which are the possible answers of its classification questions; the closure template
// of TP 6 carries the titles of the sections a question asks for; the cadre summary and the risk grid of the final project carry
// the services expected, the rules and the categories the questions refer to.
const leakExceptions = {
  "tp-pt-cadrage/pt-tp1-lettre-mission.md": true,
  "tp-pt-cadrage/pt-tp1-regles-engagement.md": true,
  "tp-pt-web/pt-tp5-owasp-top10-2025.md": true,
  "tp-pt-mission/pt-tp6-modele-cloture.md": true,
  "projet-pt-rapport/pt-proj-cadrage.md": true,
  "projet-pt-rapport/pt-proj-grille-risque.md": true,
};
// Tasks whose answer is one label of a table the guide must give: TP 4 question 6 asks which CVSS qualification a computed score falls in,
// and the guide lists every qualification band without saying which score a task has; question 19 of the final project asks which of the
// two status words applies to an element, and the guide must define every status word (`constat`, `hypothese`, `faux_positif`).
const guideTaskExceptions = { "tp-pt-vulns": [6], "projet-pt-rapport": [19] };

const LAB_IDS = ["Tp1", "Tp2", "Tp3", "Tp4", "Tp5", "Tp6", "Proj"];

function loadLabs() {
  const bundles = [buildPtAssetsTp1(), buildPtAssetsTp2(), buildPtAssetsTp3(), buildPtAssetsTp4(), buildPtAssetsTp5(), buildPtAssetsTp6(), buildPtAssetsProj()];
  const facts = Object.assign({}, ...bundles.map((bundle) => bundle.facts));
  const labs = LAB_IDS.flatMap((id) => load(`supabase/seed/content/pt-lab-${id.toLowerCase()}`)[`buildPtLab${id}`](facts));
  const files = new Map(bundles.flatMap((bundle) => bundle.files).map((file) => [file.name, file.data]));
  return { labs, files };
}

function significantAnswers(task) {
  return task.accepted.filter((answer) => {
    const normalized = normalize(answer);
    if (normalized.length < 3) return false;
    if (ignoredAnswers.has(normalized)) return false;
    if (/^[a-z]$/.test(normalized)) return false;
    // An alert identifier is the subject of the other tasks: naming it never says which alert wins.
    if (/^alt-\d{2}$/.test(normalized)) return false;
    return true;
  });
}

function containsAnswer(text, answer) {
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "u").test(text);
}

test("the pentest labs are the seven of the programme, each with a guide", () => {
  const { labs } = loadLabs();
  assert.deepEqual(labs.map((lab) => lab.slug).sort(), [
    "projet-pt-rapport", "tp-pt-cadrage", "tp-pt-mission", "tp-pt-nmap", "tp-pt-osint", "tp-pt-vulns", "tp-pt-web",
  ]);
  for (const lab of labs) assert.ok(lab.assets.some((asset) => asset.kind === "guide" && asset.url.endsWith(".md")), `${lab.slug} : un guide`);
});

test("the files of the pentest labs hold no control character, no byte order mark and no carriage return", () => {
  const { files } = loadLabs();
  for (const [name, buffer] of files) {
    if (!name.startsWith("pt-")) continue;
    const text = buffer.toString("utf8");
    assert.notEqual(text.charCodeAt(0), 0xfeff, `${name} : pas de BOM`);
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      if (code === 9 && !name.endsWith(".md")) continue; // a tab separates the columns of a table export; it never belongs in a guide
      if (code < 32 && code !== 10) assert.fail(`${name} contient un caractère de contrôle interdit U+${code.toString(16).padStart(4, "0")}`);
    }
  }
});

test("the guides and templates of the pentest labs give the method and never the answers", () => {
  const { labs, files } = loadLabs();

  for (const lab of labs) {
    const documents = lab.assets
      .filter((asset) => asset.kind === "guide" || asset.kind === "report_template")
      .map((asset) => ({ kind: asset.kind, name: asset.url.replace("/labs/", ""), text: files.get(asset.url.replace("/labs/", "")).toString("utf8") }));

    for (const file of documents.filter((item) => item.name.endsWith(".md"))) {
      assert.equal(/node -e\b/u.test(file.text), false, `${lab.slug} : ${file.name} n’utilise pas node -e`);
      assert.equal(/\.\\pt-/u.test(file.text), false, `${lab.slug} : ${file.name} n’utilise pas .\\pt-`);
      let inCode = false;
      let fences = 0;
      for (const rawLine of file.text.split("\n")) {
        const line = rawLine.trim();
        if (line.startsWith("```")) { inCode = !inCode; fences += 1; continue; }
        if (!inCode && file.kind === "guide" && commandLine.test(line)) assert.fail(`${lab.slug} : commande hors bloc de code dans ${file.name} -> ${line}`);
      }
      assert.equal(inCode, false, `${lab.slug} : bloc de code non fermé dans ${file.name}`);
      assert.equal(fences % 2, 0, `${lab.slug} : délimiteurs de code en nombre impair dans ${file.name}`);
      for (const referenced of file.text.match(/pt-[a-z0-9._-]+\.(?:log|txt|csv|jsonl|tsv|md|json|conf|js|http)/giu) ?? []) {
        assert.ok(files.has(referenced), `${lab.slug} : référence de fichier inconnue dans ${file.name} -> ${referenced}`);
      }
    }

    const support = normalize([lab.briefing, ...lab.objectives, ...lab.constraints, ...lab.hints].join("\n"));
    const guideText = normalize(documents.filter((item) => !leakExceptions[`${lab.slug}/${item.name}`]).map((item) => item.text).join("\n"));

    lab.tasks.forEach((task, taskIndex) => {
      for (const answer of significantAnswers(task)) {
        const where = `${lab.slug} tâche ${taskIndex + 1}`;
        assert.equal((guideTaskExceptions[lab.slug] ?? []).includes(taskIndex + 1) ? false : containsAnswer(guideText, answer), false, `${where} : réponse « ${answer} » divulguée dans un guide ou un modèle`);
        assert.equal(containsAnswer(support, answer), false, `${where} : réponse « ${answer} » divulguée par le briefing, les objectifs, les contraintes ou les indices généraux`);
        lab.tasks.forEach((other, otherIndex) => {
          if (otherIndex === taskIndex) return;
          assert.equal(containsAnswer(normalize(`${other.prompt}\n${other.hint}`), answer), false, `${where} : réponse « ${answer} » divulguée par la tâche ${otherIndex + 1}`);
        });
      }
    });
  }
});

test("the accented French of the pentest labs is complete: no word that has lost its accent", () => {
  const { labs } = loadLabs();
  // Words that are always written with an accent in French, found without it in the text of a lab, mean the accents were stripped.
  const stripped = /\b(?:deja|reponse|reponses|reussi|reussir|reussie|reussis|eleve|elevee|executer|execute|remediation|verifie|verifier|generee|evenement|apres|prochaine?s? execution|a\s+\d{1,2}:\d{2}\s+UTC|donnee|donnees|probleme|problemes|systeme|systemes|numero|resultat|resultats|different|differente|derniere|premiere|periode|securite|configuration securisee|ecart|ecrit|ecris|ecrire|meme|memes|etape|etapes|interet|interessant|a la place|ete|etre|serie|series)\b/iu;
  for (const lab of labs) {
    const prose = [lab.title, lab.description, lab.briefing, ...lab.constraints, ...lab.tools, ...lab.objectives, ...lab.hints,
      ...lab.tasks.flatMap((task) => [task.prompt, task.hint, task.answerFormat, task.explanation])];
    for (const value of prose) {
      const match = stripped.exec(value.replace(/pt-[A-Za-z0-9._-]+/g, " ").replace(/\/[A-Za-z0-9._/-]+/g, " "));
      assert.equal(match, null, `${lab.slug} : « ${match?.[0]} » sans accent dans « ${value.slice(0, 80)}… »`);
    }
  }
});

// --- What a guide prints and names -------------------------------------------------------------------------------------

const isWindows = process.platform === "win32";
const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

function codeBlocks(markdown) {
  return [...markdown.matchAll(/```(powershell|bash)\n([\s\S]*?)```/g)].map((match) => ({ language: match[1], code: match[2].trim() }));
}

function runBlock(directory, block) {
  const posix = directory.replace(/\\/g, "/");
  if (block.language === "bash") {
    const script = path.join(directory, "guide-block.sh");
    fs.writeFileSync(script, `cd "${posix}"\n${block.code}\n`);
    return spawnSync(bashPath, [script], { cwd: directory, encoding: "utf8", timeout: 60000 });
  }
  const script = path.join(directory, "guide-block.ps1");
  fs.writeFileSync(script, `Set-Location "${directory.replace(/\\/g, "\\\\")}"\n${block.code}\n`);
  return spawnSync(powershellPath, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], { cwd: directory, encoding: "utf8", timeout: 60000 });
}

/** Does a line of output hand over this answer? Whole tokens for words, paths and long numbers; a bare « name=value » or value line for short numbers. */
function printsAnswer(output, answer) {
  const normalized = normalize(answer);
  if (!normalized || ignoredAnswers.has(normalized) || /^[a-z]$/.test(normalized)) return false;
  const text = normalize(output);
  if (normalized.length >= 3) return containsAnswer(text, normalized);
  return output.split("\n").some((line) => new RegExp(`^\\s*(?:[A-Za-z_][\\w ]*[=:]\\s*)?${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "u").test(line));
}

test("the commands of a guide never print an answer of their lab", {
  skip: !isWindows ? "test réservé à Windows" : !fs.existsSync(bashPath) || !fs.existsSync(powershellPath) ? "Git Bash ou PowerShell absent" : false,
}, () => {
  const { labs, files } = loadLabs();
  const leaks = [];
  for (const lab of labs) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), `pt-guide-${lab.slug}-`));
    try {
      for (const asset of lab.assets) fs.writeFileSync(path.join(directory, asset.url.replace("/labs/", "")), files.get(asset.url.replace("/labs/", "")));
      const guides = lab.assets.filter((asset) => asset.kind === "guide" && asset.url.endsWith(".md"));
      for (const guide of guides) {
        const markdown = files.get(guide.url.replace("/labs/", "")).toString("utf8");
        for (const block of codeBlocks(markdown).filter((entry) => !entry.code.includes("hors-test"))) {
          const result = runBlock(directory, block);
          const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
          lab.tasks.forEach((task, index) => {
            for (const answer of task.accepted) {
              if (printsAnswer(output, answer)) leaks.push(`${lab.slug} tâche ${index + 1} : « ${answer} » est affichée par un bloc ${block.language} de ${guide.url.replace("/labs/", "")} (${block.code.split("\n")[0].slice(0, 70)}…)`);
            }
          });
        }
      }
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
  assert.deepEqual([...new Set(leaks)], [], "un guide montre la méthode sur des données inventées ou sur un autre critère, jamais la réponse d’une tâche");
});