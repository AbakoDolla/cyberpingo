const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildSwbAssetsTp1 } = require("../scripts/lab-scenarios-swb-tp1.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);
const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR
  ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

function scenario() {
  const generated = buildSwbAssetsTp1();
  const { buildSwbLabTp1 } = load("supabase/seed/content/swb-lab-tp1");
  const labs = buildSwbLabTp1(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function assetName(url) {
  return path.posix.basename(url);
}

function parseExchanges(raw) {
  return raw
    .trim()
    .split(/===== Échange \d+ =====\n/gu)
    .slice(1)
    .map((section) => {
      const lines = section.trim().split("\n");
      const url = lines[0].slice("URL: ".length);
      const responseStart = lines.findIndex((line, index) => index > 0 && /^HTTP\/1\.1 /u.test(line));
      assert.ok(responseStart > 0, `reponse introuvable dans ${url}`);
      const requestLines = lines.slice(1, responseStart).filter(Boolean);
      const responseLines = lines.slice(responseStart).filter(Boolean);
      const host = requestLines.find((line) => line.startsWith("Host: ")).slice("Host: ".length);
      return {
        url,
        requestLines,
        responseLines,
        host,
        requestLine: requestLines[0],
        statusLine: responseLines[0],
      };
    });
}

function parseCookies(raw) {
  return raw.trim().split("\n").map((line) => {
    assert.ok(line.startsWith("Set-Cookie: "), `ligne cookie inattendue: ${line}`);
    const body = line.slice("Set-Cookie: ".length);
    const [nameValue, ...attrs] = body.split("; ").filter(Boolean);
    const [name, value] = nameValue.split("=");
    return { line, name, value, attrs };
  });
}

function parseCerts(raw) {
  return raw.trim().split(/\n\n+/u).map((block) => {
    const lines = block.split("\n");
    const requestedHost = lines.find((line) => line.startsWith("Requested host: ")).slice("Requested host: ".length);
    const notAfter = lines.find((line) => line.startsWith("notAfter=")).slice("notAfter=".length);
    const sanLine = lines.find((line) => line.startsWith("X509v3 Subject Alternative Name: "));
    const sans = sanLine
      .slice("X509v3 Subject Alternative Name: ".length)
      .split(",")
      .map((item) => item.trim().replace(/^DNS:/u, ""));
    return { requestedHost, notAfter, sans };
  });
}

function parseHeaders(raw) {
  return raw
    .trim()
    .split(/===== Page \d+ =====\n/gu)
    .slice(1)
    .map((section) => {
      const lines = section.trim().split("\n");
      return {
        page: lines[0].slice("Page: ".length),
        headers: lines.slice(1),
      };
    });
}

function counts(entries, getter) {
  return entries.reduce((map, entry) => {
    const key = getter(entry);
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map());
}

function uniqueTop(map, label) {
  const ordered = [...map.entries()].sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])));
  assert.ok(ordered.length > 0, `${label}: aucun element`);
  if (ordered.length > 1) assert.notEqual(ordered[0][1], ordered[1][1], `${label}: ex aequo interdit`);
  return ordered[0][0];
}

function daysBetween(startDate, endDate) {
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000);
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
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "u").test(text);
}

function extractCodeBlocks(markdown) {
  return [...markdown.matchAll(/```(bash|powershell)\n([\s\S]*?)```/gu)].map((match) => ({ language: match[1], code: match[2].trim() }));
}

function prepareLabTempDir(lab, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `swb-tp1-${lab.slug}-`));
  for (const asset of lab.assets) fs.writeFileSync(path.join(dir, asset.url.replace("/labs/", "")), files.get(asset.url.replace("/labs/", "")));
  return dir;
}

function runPowerShellBlock(dir, code) {
  const scriptPath = path.join(dir, "guide-block.ps1");
  fs.writeFileSync(scriptPath, `Set-StrictMode -Version Latest\n$ErrorActionPreference = "Stop"\nSet-Location "${dir.replace(/\\/gu, "\\\\")}"\n${code}\n`);
  return spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], { cwd: dir, encoding: "utf8", timeout: 60000 });
}

function runBashBlock(dir, code) {
  const scriptPath = path.join(dir, "guide-block.sh");
  fs.writeFileSync(scriptPath, `set -euo pipefail\ncd "${dir.replace(/\\/gu, "/")}"\n${code}\n`);
  return spawnSync(bashPath, [scriptPath], { cwd: dir, encoding: "utf8", timeout: 60000 });
}

function deriveAnswers(current) {
  const exchanges = parseExchanges(current.text("swb-tp1-echanges.http"));
  const cookies = parseCookies(current.text("swb-tp1-cookies.txt"));
  const certs = parseCerts(current.text("swb-tp1-certificat.txt"));
  const headers = parseHeaders(current.text("swb-tp1-en-tetes.txt"));

  const redirectCount = exchanges.filter((entry) => /^HTTP\/1\.1 3/u.test(entry.statusLine)).length;
  const loginExchange = exchanges.find((entry) => entry.requestLine === "POST /connexion HTTP/1.1");
  assert.ok(loginExchange, "echange de connexion introuvable");
  const loginLocation = loginExchange.responseLines.find((line) => line.startsWith("Location: ")).slice("Location: ".length);
  const clearRequests = exchanges.filter((entry) => entry.url.startsWith("http://")).length;

  const cookiesWithoutHttpOnly = cookies.filter((entry) => !entry.attrs.includes("HttpOnly"));
  assert.equal(cookiesWithoutHttpOnly.length, 6, "controle du bruit des cookies");
  const maxAgeOf = (entry) => Number(entry.attrs.find((item) => item.startsWith("Max-Age=")).slice("Max-Age=".length));
  const longestMaxAge = Math.max(...cookiesWithoutHttpOnly.map(maxAgeOf));
  const longestCookies = cookiesWithoutHttpOnly.filter((entry) => maxAgeOf(entry) === longestMaxAge);
  assert.equal(longestCookies.length, 1, "pas d'ex aequo pour le plus grand Max-Age parmi les cookies sans HttpOnly");
  const cookieWithoutHttpOnly = longestCookies[0].name;
  const insecureCookieCount = cookies.filter((entry) => !entry.attrs.includes("Secure")).length;
  const invalidSameSiteCookie = cookies.find((entry) => entry.attrs.includes("SameSite=None") && !entry.attrs.includes("Secure")).name;
  const sessionCookieMinutes = Number(cookies.find((entry) => entry.name === "resa_session").attrs.find((item) => item.startsWith("Max-Age=")).slice("Max-Age=".length)) / 60;

  const principal = certs[0];
  const certificateDaysLeft = daysBetween("2026-05-04", "2026-07-03");
  const usedHosts = [...new Set(exchanges.map((entry) => entry.host))];
  const hostnameMissingSan = usedHosts.find((host) => !principal.sans.includes(host));

  const hstsLine = headers.flatMap((entry) => entry.headers).find((line) => line.startsWith("Strict-Transport-Security: "));
  const hstsDays = Number(/max-age=(\d+)/u.exec(hstsLine)[1]) / 86400;
  const hstsIncludesSubdomains = hstsLine.includes("includeSubDomains") ? "oui" : "non";
  const pagesWithoutCspCount = headers.filter((entry) => !entry.headers.some((line) => line.startsWith("Content-Security-Policy:"))).length;
  const serverVersionPage = headers.find((entry) => entry.headers.some((line) => /^Server: .*\/\d/u.test(line))).page;

  return [
    String(redirectCount),
    loginLocation,
    String(clearRequests),
    cookieWithoutHttpOnly,
    String(insecureCookieCount),
    invalidSameSiteCookie,
    String(sessionCookieMinutes),
    String(certificateDaysLeft),
    hostnameMissingSan,
    String(hstsDays),
    hstsIncludesSubdomains,
    String(pagesWithoutCspCount),
    serverVersionPage,
    "c",
    "b",
  ];
}

test("le labo TP 1 est deterministe, propre et declare exactement ses fichiers", () => {
  const first = buildSwbAssetsTp1();
  const second = buildSwbAssetsTp1();
  assert.deepEqual(first.facts, second.facts);
  assert.equal(first.files.length, second.files.length);
  first.files.forEach((file, index) => {
    assert.equal(file.name, second.files[index].name);
    assert.equal(Buffer.compare(file.data, second.files[index].data), 0, `${file.name} doit etre identique`);
    assert.equal(file.data.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false, `${file.name} ne doit pas avoir de BOM`);
    assert.equal(file.data.includes(Buffer.from("\r\n")), false, `${file.name} doit rester en LF`);
  });

  const { labs, generated } = scenario();
  assert.equal(labs.length, 1);
  assert.equal(labs[0].slug, "tp-web-http");
  assert.equal(labs[0].tasks.length, 15);
  assert.deepEqual(labIssues(labs[0]), [], "le lab doit passer labIssues");
  assert.deepEqual(
    labs[0].assets.map((entry) => assetName(entry.url)).sort(),
    generated.files.map((entry) => entry.name).sort(),
  );
});

test("les reponses des quinze taches se recalculent depuis les fichiers", () => {
  const current = scenario();
  const answers = deriveAnswers(current);
  assert.equal(answers.length, current.labs[0].tasks.length);
  answers.forEach((answer, index) => {
    assert.ok(current.labs[0].tasks[index].accepted.includes(normalize(answer)), `tache ${index + 1}`);
  });
});

test("les guides et le support ne divulguent aucune reponse significative", () => {
  const { labs, files } = scenario();
  const lab = labs[0];
  const guideText = normalize(files.get("swb-tp1-guide.md").toString("utf8"));
  const supportText = normalize([lab.briefing, ...lab.constraints, ...lab.objectives, ...lab.hints].join("\n"));

  for (let taskIndex = 0; taskIndex < lab.tasks.length; taskIndex += 1) {
    const task = lab.tasks[taskIndex];
    for (const answer of significantAnswers(task)) {
      assert.equal(containsAnswer(guideText, answer), false, `fuite guide tache ${taskIndex + 1}`);
      assert.equal(containsAnswer(normalize(`${task.prompt}\n${task.hint}`), answer), false, `fuite tache ${taskIndex + 1}`);
      assert.equal(containsAnswer(supportText, answer), false, `fuite support tache ${taskIndex + 1}`);
      for (let otherIndex = 0; otherIndex < lab.tasks.length; otherIndex += 1) {
        if (otherIndex === taskIndex) continue;
        assert.equal(
          containsAnswer(normalize(`${lab.tasks[otherIndex].prompt}\n${lab.tasks[otherIndex].hint}`), answer),
          false,
          `fuite de la tache ${taskIndex + 1} dans la tache ${otherIndex + 1}`,
        );
      }
    }
  }
});

test("aucun fichier source ou genere ne contient six astérisques", () => {
  const current = scenario();
  const sourceFiles = [
    path.join(__dirname, "..", "scripts", "lab-scenarios-swb-tp1.cjs"),
    path.join(__dirname, "..", "supabase", "seed", "content", "swb-lab-tp1.ts"),
    path.join(__dirname, "swb-lab-tp1.test.cjs"),
  ];
  for (const filePath of sourceFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    assert.equal((content.match(/\*{6}/gu) || []).length, 0, `${path.basename(filePath)} ne doit pas contenir six etoiles consecutives`);
  }
  for (const file of current.generated.files) {
    assert.equal((String(file.data).match(/\*{6}/gu) || []).length, 0, `${file.name} ne doit pas contenir six etoiles consecutives`);
  }
});

test("les blocs bash du guide s’executent dans Git Bash", {
  skip: process.platform !== "win32" ? "test reserve a Windows" : !fs.existsSync(bashPath) ? "Git Bash absent" : false,
}, () => {
  const current = scenario();
  const lab = current.labs[0];
  const dir = prepareLabTempDir(lab, current.files);
  try {
    const markdown = current.files.get("swb-tp1-guide.md").toString("utf8");
    for (const block of extractCodeBlocks(markdown).filter((entry) => entry.language === "bash")) {
      const result = runBashBlock(dir, block.code);
      assert.equal(result.status, 0, result.stderr);
      assert.notEqual((result.stdout ?? "").trim(), "", "sortie bash vide");
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("les blocs powershell du guide s’executent dans powershell.exe", {
  skip: process.platform !== "win32" ? "test reserve a Windows" : !fs.existsSync(powershellPath) ? "PowerShell absent" : false,
}, () => {
  const current = scenario();
  const lab = current.labs[0];
  const dir = prepareLabTempDir(lab, current.files);
  try {
    const markdown = current.files.get("swb-tp1-guide.md").toString("utf8");
    for (const block of extractCodeBlocks(markdown).filter((entry) => entry.language === "powershell")) {
      const result = runPowerShellBlock(dir, block.code);
      assert.equal(result.status, 0, result.stderr);
      assert.notEqual((result.stdout ?? "").trim(), "", "sortie powershell vide");
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("les donnees ont bien les singularites attendues pour les taches a reponse unique", () => {
  const current = scenario();
  const exchanges = parseExchanges(current.text("swb-tp1-echanges.http"));
  const headers = parseHeaders(current.text("swb-tp1-en-tetes.txt"));

  const statusFamilies = counts(exchanges.filter((entry) => /^HTTP\/1\.1 3/u.test(entry.statusLine)), () => "3xx");
  assert.equal(statusFamilies.get("3xx"), 4);
  const hostCounts = counts(exchanges, (entry) => entry.host);
  assert.equal(uniqueTop(hostCounts, "hotes"), "reservation.palmier-or.example");
  assert.equal(headers.filter((entry) => !entry.headers.some((line) => line.startsWith("Content-Security-Policy:"))).length, 3);
  assert.equal(headers.filter((entry) => entry.headers.some((line) => /^Server: .*\/\d/u.test(line))).length, 1);
});
