const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildSecuriteAssetsA } = require("../scripts/lab-scenarios-securite-a.cjs");
const { buildSecuriteAssetsB } = require("../scripts/lab-scenarios-securite-b.cjs");
const { load } = require("../scripts/ts-loader.cjs");

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);
const commandLine = /^(Select-String|Get-FileHash|Get-MpComputerStatus|Get-HotFix|Get-Content|manage-bde|Import-Csv|grep\b|printf\b|while IFS=|sha256sum\b|openssl\b|awk\b|date_text=|expiry=|echo\b|\$[a-z]|base64\b)/;
const leakExceptions = {
  "tp-audit-mots-de-passe": new Map([
    ["fond-tp2-dictionnaire-fictif.txt", "Le dictionnaire est une pièce d’entrée du labo : il doit contenir les candidats à hacher, y compris ceux que l’apprenant retrouvera par comparaison d’empreintes."],
  ]),
};
const allowedDerivedGuideFiles = {
  "tp-audit-mots-de-passe": new Set(["fond-tp2-dictionnaire-hache.txt"]),
};

function loadLabs() {
  const bundleA = buildSecuriteAssetsA();
  const bundleB = buildSecuriteAssetsB();
  const { buildLabsA } = load("supabase/seed/content/fondamentaux-labs-a");
  const { buildLabsB } = load("supabase/seed/content/fondamentaux-labs-b");
  const labs = [...buildLabsA(bundleA.facts), ...buildLabsB(bundleB.facts)];
  const files = new Map([...bundleA.files, ...bundleB.files].map((file) => [file.name, file.data]));
  return { labs, files, bundleA, bundleB };
}

function significantAnswers(task) {
  return task.accepted.filter((answer) => {
    const normalized = normalize(answer);
    if (normalized.length < 3) return false;
    if (ignoredAnswers.has(normalized)) return false;
    if (/^[a-z]$/.test(normalized)) return false;
    return true;
  });
}

function containsAnswer(text, answer) {
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "u");
  return matcher.test(text);
}

function extractCodeBlocks(markdown) {
  const blocks = [];
  const regex = /```(powershell|bash)\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({ language: match[1], code: match[2].trim() });
  }
  return blocks;
}

function prepareLabTempDir(lab, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `fond-guide-${lab.slug}-`));
  for (const asset of lab.assets) {
    const name = asset.url.replace("/labs/", "");
    fs.writeFileSync(path.join(dir, name), files.get(name));
  }
  return dir;
}

function runPowerShellBlock(dir, code) {
  const scriptPath = path.join(dir, "guide-block.ps1");
  fs.writeFileSync(scriptPath, `Set-StrictMode -Version Latest\n$ErrorActionPreference = "Stop"\nSet-Location "${dir.replace(/\\/g, "\\\\")}"\n${code}\n`);
  return spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
    cwd: dir,
    encoding: "utf8",
  });
}

function runBashBlock(dir, code) {
  const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
  const scriptPath = path.join(dir, "guide-block.sh");
  fs.writeFileSync(scriptPath, `set -euo pipefail\ncd "${dir.replace(/\\/g, "/")}"\n${code}\n`);
  return spawnSync(bashPath, [scriptPath], { cwd: dir, encoding: "utf8" });
}

function assertUsefulOutput(labSlug, language, code, stdout) {
  const trimmed = stdout.trim();
  assert.notEqual(trimmed, "", `${labSlug} ${language} : sortie vide pour un bloc testé`);

  if (code.includes("message_base64")) {
    assert.equal(trimmed, "change le mot de passe ce soir", `${labSlug} ${language} : décodage Base64 inattendu`);
  }
  if (code.includes("message_hex")) {
    assert.equal(trimmed, "sauvegarde hors ligne ok", `${labSlug} ${language} : décodage hexadécimal inattendu`);
  }
  if (code.includes("message_cesar")) {
    assert.equal(trimmed, "verifie le hash avant installation", `${labSlug} ${language} : décodage César inattendu`);
  }
  if (code.includes("fond-tp4-outil-*.txt")) {
    const hashes = trimmed.match(/[a-f0-9]{64}/giu) ?? [];
    assert.ok(hashes.length >= 3, `${labSlug} ${language} : le hachage doit couvrir les trois fichiers du labo`);
  }
  if (code.includes("spf=|dkim=|dmarc=")) {
    assert.match(trimmed, /spf=fail/u, `${labSlug} ${language} : SPF absent de la sortie`);
    assert.match(trimmed, /dkim=none/u, `${labSlug} ${language} : DKIM absent de la sortie`);
    assert.match(trimmed, /dmarc=fail/u, `${labSlug} ${language} : DMARC absent de la sortie`);
  }
}

test("les guides et modèles ne divulguent pas les réponses des labs", () => {
  const { labs, files } = loadLabs();

  for (const [name, buffer] of files.entries()) {
    const text = buffer.toString("utf8");
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      if (code < 32 && code !== 10) {
        if (code === 9 && name.endsWith(".tsv")) continue; // Les exports tabulaires de type .tsv utilisent la tabulation comme séparateur structuré.
        assert.fail(`${name} contient un caractère de contrôle interdit U+${code.toString(16).padStart(4, "0")}`);
      }
    }
  }

  for (const lab of labs) {
    const guideAndTemplates = lab.assets
      .filter((asset) => asset.kind === "guide" || asset.kind === "report_template")
      .map((asset) => ({
        kind: asset.kind,
        name: asset.url.replace("/labs/", ""),
        text: files.get(asset.url.replace("/labs/", "")).toString("utf8"),
      }));

    for (const file of guideAndTemplates.filter((item) => item.kind === "guide")) {
      assert.equal(/node -e\b/u.test(file.text), false, `${lab.slug} : les guides ne doivent plus utiliser node -e`);
      assert.equal(/\.\\fond-/u.test(file.text), false, `${lab.slug} : les guides ne doivent pas utiliser .\\fond-`);
      const lines = file.text.split("\n");
      let inCode = false;
      let fenceCount = 0;
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.startsWith("```")) {
          inCode = !inCode;
          fenceCount += 1;
          continue;
        }
        if (!inCode && commandLine.test(line)) {
          assert.fail(`${lab.slug} : commande hors bloc de code dans ${file.name} -> ${line}`);
        }
      }
      assert.equal(inCode, false, `${lab.slug} : bloc de code non fermé dans ${file.name}`);
      assert.equal(fenceCount % 2, 0, `${lab.slug} : nombre impair de délimiteurs de code dans ${file.name}`);
      const referencedFiles = file.text.match(/fond-[a-z0-9.-]+\.(?:log|tsv|txt|md|eml)/giu) ?? [];
      for (const referenced of referencedFiles) {
        const isDerived = allowedDerivedGuideFiles[lab.slug] && allowedDerivedGuideFiles[lab.slug].has(referenced);
        assert.ok(files.has(referenced) || isDerived, `${lab.slug} : référence de fichier inconnue dans ${file.name} -> ${referenced}`);
      }
    }

    const labSupportText = normalize([
      lab.briefing,
      ...lab.objectives,
      ...lab.constraints,
      ...lab.hints,
    ].join("\n"));
    const guideText = normalize(guideAndTemplates
      .filter((item) => !(leakExceptions[lab.slug] && leakExceptions[lab.slug].has(item.name)))
      .map((item) => item.text)
      .join("\n"));

    for (let taskIndex = 0; taskIndex < lab.tasks.length; taskIndex += 1) {
      const task = lab.tasks[taskIndex];
      const answers = significantAnswers(task);
      for (const answer of answers) {
        assert.equal(containsAnswer(guideText, answer), false, `${lab.slug} tâche ${taskIndex + 1} : réponse divulguée dans un guide ou modèle`);
        assert.equal(containsAnswer(labSupportText, answer), false, `${lab.slug} tâche ${taskIndex + 1} : réponse divulguée dans le briefing, les objectifs, les contraintes ou les indices généraux`);
        for (let otherIndex = 0; otherIndex < lab.tasks.length; otherIndex += 1) {
          if (otherIndex === taskIndex) continue;
          const otherText = normalize(`${lab.tasks[otherIndex].prompt}\n${lab.tasks[otherIndex].hint}`);
          assert.equal(containsAnswer(otherText, answer), false, `${lab.slug} tâche ${taskIndex + 1} : réponse divulguée par la tâche ${otherIndex + 1}`);
        }
      }
    }
  }
});

const isWindows = process.platform === "win32";
const powershellPath = process.env.WINDIR ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";

test("les blocs powershell des guides s’exécutent sous Windows", {
  skip: !isWindows ? "test réservé à Windows" : !fs.existsSync(powershellPath) ? "powershell.exe absent" : false,
}, () => {
  const { labs, files } = loadLabs();
  for (const lab of labs) {
    const guideMarkdownAssets = lab.assets.filter((asset) => asset.kind === "guide" && asset.url.endsWith(".md"));
    const dir = prepareLabTempDir(lab, files);
    try {
      for (const asset of guideMarkdownAssets) {
        const markdown = files.get(asset.url.replace("/labs/", "")).toString("utf8");
        for (const block of extractCodeBlocks(markdown).filter((item) => item.language === "powershell" && !item.code.includes("hors-test"))) {
          const result = runPowerShellBlock(dir, block.code);
          assert.equal(result.status, 0, `${lab.slug} powershell : code de sortie ${result.status}\n${result.stderr}`);
          assert.equal((result.stderr ?? "").trim(), "", `${lab.slug} powershell : stderr non vide\n${result.stderr}`);
          assertUsefulOutput(lab.slug, "powershell", block.code, result.stdout ?? "");
        }
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("les blocs bash des guides s’exécutent dans Git Bash sous Windows", {
  skip: !isWindows ? "test réservé à Windows" : !fs.existsSync(bashPath) ? "Git Bash absent" : false,
}, () => {
  const { labs, files } = loadLabs();
  for (const lab of labs) {
    const guideMarkdownAssets = lab.assets.filter((asset) => asset.kind === "guide" && asset.url.endsWith(".md"));
    const dir = prepareLabTempDir(lab, files);
    try {
      for (const asset of guideMarkdownAssets) {
        const markdown = files.get(asset.url.replace("/labs/", "")).toString("utf8");
        for (const block of extractCodeBlocks(markdown).filter((item) => item.language === "bash" && !item.code.includes("hors-test"))) {
          const result = runBashBlock(dir, block.code);
          assert.equal(result.status, 0, `${lab.slug} bash : code de sortie ${result.status}\n${result.stderr}`);
          assert.equal((result.stderr ?? "").trim(), "", `${lab.slug} bash : stderr non vide\n${result.stderr}`);
          assertUsefulOutput(lab.slug, "bash", block.code, result.stdout ?? "");
        }
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});
