"use strict";
// Pilote minimal de Chrome (ou Edge) en mode headless via le protocole DevTools, pour imprimer des pages en PDF.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  const found = CANDIDATES.find((candidate) => candidate && fs.existsSync(candidate));
  if (!found) throw new Error("Chrome ou Edge est introuvable. Définis la variable CHROME_PATH.");
  return found;
}

async function launchBrowser() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cyberpingo-pdf-"));
  const child = spawn(findChrome(), [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--hide-scrollbars", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  const portFile = path.join(profile, "DevToolsActivePort");
  const deadline = Date.now() + 30000;
  let endpoint = null;
  while (!endpoint) {
    if (Date.now() > deadline) { child.kill(); throw new Error("Le navigateur n’a pas ouvert son port de contrôle."); }
    if (fs.existsSync(portFile)) {
      const [port, pathname] = fs.readFileSync(portFile, "utf8").trim().split(/\r?\n/);
      if (port && pathname) endpoint = `ws://127.0.0.1:${port}${pathname}`;
    }
    if (!endpoint) await sleep(100);
  }

  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(new Error("Connexion DevTools impossible.")); });

  let counter = 0;
  const pending = new Map();
  const listeners = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id !== undefined) {
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(`${entry.method} : ${message.error.message}`));
      else entry.resolve(message.result);
    } else if (message.method) {
      const key = `${message.sessionId ?? ""}:${message.method}`;
      for (const callback of listeners.get(key) ?? []) callback(message.params);
    }
  };

  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    counter += 1;
    pending.set(counter, { resolve, reject, method });
    socket.send(JSON.stringify({ id: counter, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  async function newPage() {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    return {
      send: (method, params) => send(method, params, sessionId),
      waitFor(method, timeout = 30000) {
        return new Promise((resolve, reject) => {
          const key = `${sessionId}:${method}`;
          const timer = setTimeout(() => reject(new Error(`Délai dépassé : ${method}`)), timeout);
          const callback = (params) => {
            clearTimeout(timer);
            listeners.set(key, (listeners.get(key) ?? []).filter((entry) => entry !== callback));
            resolve(params);
          };
          listeners.set(key, [...(listeners.get(key) ?? []), callback]);
        });
      },
      close: () => send("Target.closeTarget", { targetId }).catch(() => undefined),
    };
  }

  async function close() {
    try { await send("Browser.close"); } catch { /* le navigateur se ferme avant de répondre */ }
    try { socket.close(); } catch { /* déjà fermé */ }
    await sleep(300);
    child.kill();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* le profil sera nettoyé par le système */ }
  }

  return { newPage, close };
}

/** Imprime une page locale en PDF : A4 défini par le CSS, fonds imprimés, PDF balisé avec signets. */
async function printToPdf(browser, fileUrl, outFile) {
  const page = await browser.newPage();
  try {
    await page.send("Page.enable");
    const loaded = page.waitFor("Page.loadEventFired");
    await page.send("Page.navigate", { url: fileUrl });
    await loaded;
    await page.send("Runtime.evaluate", {
      expression: "document.fonts.ready.then(() => (window.__prepare ? window.__prepare() : true))",
      awaitPromise: true,
    });
    const { data } = await page.send("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      generateTaggedPDF: true,
      generateDocumentOutline: true,
    });
    fs.writeFileSync(outFile, Buffer.from(data, "base64"));
  } finally {
    await page.close();
  }
}

module.exports = { launchBrowser, printToPdf, findChrome };
