"use strict";
// Coloration très légère des commandes (PowerShell, bash, Cisco IOS) : assez pour guider l’œil, sans analyseur complet.
const { esc } = require("./markdown.cjs");

const CISCO_HINT = /^(enable|configure terminal|conf t|hostname|interface|ip address|ip route|ip nat|ip dhcp|access-list|router|show |no shutdown|switchport|vlan|crypto|line )/m;

const TOKEN = new RegExp([
  "(?<comment>(?:^|\\s)#.*$|^!.*$)",
  "(?<string>\"[^\"\\n]*\"|'[^'\\n]*')",
  "(?<variable>\\$\\{?[A-Za-z_][\\w:]*\\}?)",
  "(?<cmdlet>\\b[A-Z][a-z]+-[A-Z][A-Za-z]+\\b)",
  "(?<option>(?<=\\s)--?[A-Za-z][\\w-]*)",
  "(?<address>\\b\\d{1,3}(?:\\.\\d{1,3}){3}(?:/\\d{1,2})?\\b)",
].join("|"), "gm");

function detectLanguage(lang, text) {
  if (lang === "powershell" || lang === "ps1" || lang === "pwsh") return "powershell";
  if (lang === "bash" || lang === "sh" || lang === "shell" || lang === "zsh") return "bash";
  if (lang === "cisco" || lang === "ios") return "cisco";
  if (CISCO_HINT.test(text)) return "cisco";
  return lang || "terminal";
}

const LABELS = { powershell: "PowerShell", bash: "Bash", cisco: "Cisco IOS", terminal: "Terminal", text: "Texte", json: "JSON", sql: "SQL" };

function highlight(text) {
  let html = "";
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const kind = Object.entries(match.groups).find(([, value]) => value !== undefined)?.[0];
    if (!kind) continue;
    let start = match.index;
    let token = match[0];
    if (kind === "comment" && /^\s/.test(token)) { start += 1; token = token.slice(1); }
    html += esc(text.slice(last, start)) + `<span class="tk-${kind}">${esc(token)}</span>`;
    last = start + token.length;
  }
  return html + esc(text.slice(last));
}

module.exports = { highlight, detectLanguage, LABELS };
