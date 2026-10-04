const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const { buildSwbAssetsTp3 } = require("../scripts/lab-scenarios-swb-tp3.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);

function scenario() {
  const generated = buildSwbAssetsTp3();
  const { buildSwbLabTp3 } = load("supabase/seed/content/swb-lab-tp3");
  const labs = buildSwbLabTp3(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function splitSemicolonCsv(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      quoted = !quoted;
    } else if (char === ";" && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function parseTemplates(raw) {
  return raw.trim().split("\n").map((line) => {
    const [id, context, snippet] = line.split(" | ");
    return { id, context, snippet };
  });
}

function parsePolicies(raw) {
  return raw.trim().split("\n").map((line) => {
    const [id, policy] = line.split(" | ");
    return { id, policy };
  });
}

function parseReports(raw) {
  return raw.trim().split("\n").map((line) => JSON.parse(line)["csp-report"]);
}

function parseHeaders(raw) {
  const lines = raw.trim().split("\n");
  const headers = splitSemicolonCsv(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitSemicolonCsv(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function uniqueTop(entries, label) {
  const ordered = [...entries].sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])));
  assert.ok(ordered.length > 0, `${label}: vide`);
  if (ordered.length > 1) assert.notEqual(ordered[0][1], ordered[1][1], `${label}: ex aequo interdit`);
  return ordered[0][0];
}

function counts(values, getter) {
  return values.reduce((map, value) => {
    const key = getter(value);
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map());
}

function headerScore(row) {
  let score = 0;
  if (row.csp) score += 2;
  if (/max-age=(\d+)/u.test(row.hsts) && Number(/max-age=(\d+)/u.exec(row.hsts)[1]) >= 31536000 && row.hsts.includes("includeSubDomains")) score += 2;
  if (row.x_content_type_options === "nosniff") score += 1;
  if (["strict-origin", "strict-origin-when-cross-origin", "no-referrer"].includes(row.referrer_policy)) score += 1;
  if (["DENY", "SAMEORIGIN"].includes(row.x_frame_options)) score += 1;
  if (row.permissions_policy) score += 1;
  return score;
}

function significantAnswers(task) {
  return task.accepted.filter((answer) => {
    const normalized = normalize(answer);
    if (normalized.length < 3) return false;
    if (ignoredAnswers.has(normalized)) return false;
    if (/^[a-z]$/u.test(normalized)) return false;
    return true;
  });
}

function containsAnswer(text, answer) {
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "u").test(text);
}

function extractCodeBlocks(markdown) {
  return [...markdown.matchAll(/```(bash|powershell)\n([\s\S]*?)```/gu)].map((match) => ({ language: match[1], code: match[2].trim() }));
}

function prepareTempDir(lab, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `swb-tp3-${lab.slug}-`));
  for (const asset of lab.assets) fs.writeFileSync(path.join(dir, asset.url.replace("/labs/", "")), files.get(asset.url.replace("/labs/", "")));
  return dir;
}

function runBashBlock(dir, code) {
  const script = path.join(dir, "guide-block.sh");
  fs.writeFileSync(script, `set -euo pipefail\ncd "${dir.replace(/\\/gu, "/")}"\n${code}\n`);
  return spawnSync(bashPath, [script], { cwd: dir, encoding: "utf8", timeout: 60000 });
}

function runPowerShellBlock(dir, code) {
  const script = path.join(dir, "guide-block.ps1");
  fs.writeFileSync(script, `Set-StrictMode -Version Latest\n$ErrorActionPreference = "Stop"\nSet-Location "${dir.replace(/\\/gu, "\\\\")}"\n${code}\n`);
  return spawnSync(powershellPath, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], { cwd: dir, encoding: "utf8", timeout: 60000 });
}

function deriveAnswers(current) {
  const templates = parseTemplates(current.text("swb-tp3-gabarits.txt"));
  const policies = parsePolicies(current.text("swb-tp3-politiques.txt"));
  const reports = parseReports(current.text("swb-tp3-rapports.jsonl"));
  const headers = parseHeaders(current.text("swb-tp3-en-tetes.csv"));
  const inlineScript = current.text("swb-tp3-script-en-ligne.txt");

  const rawOutputCount = templates.filter((item) => item.snippet.includes("<%-")).length;
  const unquotedAttributeTemplate = templates.find((item) => /value=<%-/u.test(item.snippet)).id;
  const scriptBlockTemplate = templates.find((item) => /<script>.*<%-/u.test(item.snippet)).id;
  const unsafeInlinePolicy = policies.find((item) => (item.policy.includes("script-src") && item.policy.includes("'unsafe-inline'")) || (!item.policy.includes("script-src") && /default-src [^;]*'unsafe-inline'/u.test(item.policy))).id;
  const noncePolicy = policies.find((item) => /script-src [^;]*'nonce-/u.test(item.policy)).id;
  const missingObjectAndBasePolicy = policies.find((item) => !item.policy.includes("object-src") && !item.policy.includes("base-uri")).id;
  const topViolatedDirective = uniqueTop(counts(reports, (item) => item["violated-directive"]), "directive");
  const topBlockedOrigin = uniqueTop(counts(reports, (item) => item["blocked-uri"]), "blocked-uri");
  const distinctInlineSourceFiles = new Set(reports.filter((item) => item["blocked-uri"] === "inline" && String(item["violated-directive"]).startsWith("script-src")).map((item) => item["source-file"])).size;
  const totalScore = headers.reduce((sum, row) => sum + headerScore(row), 0);
  const weakestPage = [...headers.map((row) => [row.page, headerScore(row)])].sort((left, right) => left[1] - right[1] || String(left[0]).localeCompare(String(right[0])))[0][0];
  const pagesWithoutNosniff = headers.filter((row) => row.x_content_type_options !== "nosniff").length;
  const scriptHash = crypto.createHash("sha256").update(inlineScript, "utf8").digest("base64");
  const policyP4 = policies.find((item) => item.id === "P4").policy;
  assert.ok(policyP4.includes("https://widgets.partenaires.example"));
  assert.ok(policyP4.includes("https://api.palmier-or.example"));
  assert.ok(policyP4.includes("'nonce-"));
  assert.ok(!policyP4.includes("'unsafe-inline'"));
  // Question 14: among P2, P3, P4 and P6, the only policy that lets the inline script run without "unsafe-inline" and keeps the three directives.
  const optionLetters = { a: "P2", b: "P3", c: "P4", d: "P6" };
  const adoptable = Object.entries(optionLetters).filter(([, id]) => {
    const text = policies.find((item) => item.id === id).policy;
    const allowsInline = /script-src [^;]*'(?:nonce-|sha256-)/u.test(text);
    return allowsInline && !text.includes("'unsafe-inline'") && ["object-src", "base-uri", "frame-ancestors"].every((directive) => text.includes(directive));
  }).map(([letter]) => letter);
  assert.deepEqual(adoptable, ["c"], "exactly one option answers question 14");
  // The decoy hash of P5 is never the hash of the script of question 13.
  assert.ok(!policies.find((item) => item.id === "P5").policy.includes(crypto.createHash("sha256").update(inlineScript, "utf8").digest("base64")));

  return [
    String(rawOutputCount),
    unquotedAttributeTemplate,
    scriptBlockTemplate,
    unsafeInlinePolicy,
    noncePolicy,
    missingObjectAndBasePolicy,
    topViolatedDirective,
    topBlockedOrigin,
    String(distinctInlineSourceFiles),
    String(totalScore),
    weakestPage,
    String(pagesWithoutNosniff),
    scriptHash,
    adoptable[0],
    "b",
  ];
}

test("tp-web-xss-csp is deterministic and file clean", () => {
  const first = buildSwbAssetsTp3();
  const second = buildSwbAssetsTp3();
  assert.deepEqual(first.facts, second.facts);
  assert.equal(first.files.length, 6);
  first.files.forEach((file, index) => {
    assert.equal(file.name, second.files[index].name);
    assert.equal(Buffer.compare(file.data, second.files[index].data), 0, `${file.name} must be deterministic`);
    assert.equal(file.data.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false, `${file.name} sans BOM`);
    assert.equal(file.data.includes(Buffer.from("\r\n")), false, `${file.name} en LF`);
    assert.equal((file.data.toString("utf8").match(/\*{6}/g) || []).length, 0, `${file.name} sans masque secret`);
  });
  ["scripts\\lab-scenarios-swb-tp3.cjs", "supabase\\seed\\content\\swb-lab-tp3.ts", "tests\\swb-lab-tp3.test.cjs"].forEach((relative) => {
    const count = (fs.readFileSync(path.join(process.cwd(), relative), "utf8").match(/\*{6}/g) || []).length;
    assert.equal(count, 0, `${relative} sans masque secret`);
  });
});

test("tp-web-xss-csp declares one lab with matching assets", () => {
  const { generated, labs } = scenario();
  assert.equal(labs.length, 1);
  const [lab] = labs;
  assert.equal(lab.slug, "tp-web-xss-csp");
  assert.equal(lab.tasks.length, 15);
  assert.deepEqual(labIssues(lab), []);
  const assetNames = new Set(lab.assets.map((asset) => path.posix.basename(asset.url)));
  const fileNames = new Set(generated.files.map((file) => file.name));
  assert.deepEqual([...assetNames].sort(), [...fileNames].sort());
  assert.ok(lab.assets.some((asset) => asset.kind === "log"));
  assert.ok(lab.assets.some((asset) => asset.kind === "guide"));
});

test("tp-web-xss-csp answers derive from files", () => {
  const current = scenario();
  const [lab] = current.labs;
  const answers = deriveAnswers(current);
  answers.forEach((answer, index) => assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `task ${index + 1}`));
  assert.ok(lab.tasks[13].prompt.includes("a) P2 b) P3 c) P4 d) P6"));
  assert.ok(lab.tasks[14].prompt.includes("Report-Only"));
});

test("tp-web-xss-csp guide and support do not leak answers", () => {
  const { labs, files } = scenario();
  const [lab] = labs;
  const guides = lab.assets.filter((asset) => asset.kind === "guide").map((asset) => files.get(asset.url.replace("/labs/", "")).toString("utf8"));
  const guideText = normalize(guides.join("\n"));
  const supportText = normalize([lab.briefing, ...lab.constraints, ...lab.objectives, ...lab.hints].join("\n"));
  for (const markdown of guides) {
    let open = false;
    for (const line of markdown.split("\n")) if (line.trim().startsWith("```")) open = !open;
    assert.equal(open, false, "code fences must close");
  }
  for (let taskIndex = 0; taskIndex < lab.tasks.length; taskIndex += 1) {
    const task = lab.tasks[taskIndex];
    for (const answer of significantAnswers(task)) {
      assert.equal(containsAnswer(guideText, answer), false, `guide leak task ${taskIndex + 1}`);
      assert.equal(containsAnswer(supportText, answer), false, `support leak task ${taskIndex + 1}`);
      assert.equal(containsAnswer(normalize(`${task.prompt}\n${task.hint}`), answer), false, `self leak task ${taskIndex + 1}`);
      for (let otherIndex = 0; otherIndex < lab.tasks.length; otherIndex += 1) {
        if (otherIndex === taskIndex) continue;
        assert.equal(containsAnswer(normalize(`${lab.tasks[otherIndex].prompt}\n${lab.tasks[otherIndex].hint}`), answer), false, `cross leak ${taskIndex + 1} -> ${otherIndex + 1}`);
      }
    }
  }
});

test("tp-web-xss-csp guide blocks execute on Windows", {
  skip: process.platform !== "win32" ? "windows only" : !fs.existsSync(bashPath) || !fs.existsSync(powershellPath) ? "shell missing" : false,
}, () => {
  const current = scenario();
  const [lab] = current.labs;
  const dir = prepareTempDir(lab, current.files);
  try {
    const guide = current.files.get(lab.assets.find((asset) => asset.kind === "guide").url.replace("/labs/", "")).toString("utf8");
    for (const block of extractCodeBlocks(guide)) {
      const result = block.language === "bash" ? runBashBlock(dir, block.code) : runPowerShellBlock(dir, block.code);
      assert.equal(result.status, 0, `${block.language} failed: ${result.stderr}`);
      assert.notEqual((result.stdout || "").trim(), "", `${block.language} empty output`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
