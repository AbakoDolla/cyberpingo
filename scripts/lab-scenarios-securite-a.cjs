const crypto = require("node:crypto");

const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");
const sha256Hex = (value) => crypto.createHash("sha256").update(value).digest("hex");
const md5Hex = (value) => crypto.createHash("md5").update(value).digest("hex");

function registrableDomain(host) {
  const labels = host.toLowerCase().split(".").filter(Boolean);
  if (labels.length <= 2) return host.toLowerCase();
  return labels.slice(-2).join(".");
}

function daysBetweenIso(fromIso, toIso) {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86400000);
}

function entropyBits(words, listSize) {
  return Math.round(words * Math.log2(listSize));
}

function bruteForceHours(charsetSize, length, triesPerSecond) {
  return Math.round((charsetSize ** length) / triesPerSecond / 3600);
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPasswordDictionary() {
  const reserved = new Set(["123456", "azerty", "motdepasse", "qwerty", "password", "abc123", "admin", "iloveyou"]);
  const required = ["routeur-soleil-2026", "journal-cns-09", "atelier-salle-03"];
  const left = [
    "atelier", "batterie", "baobab", "bureau", "cahier", "campus", "canari", "carte", "carnet", "classe",
    "compta", "cours", "danse", "don", "equipe", "fibre", "fiche", "journal", "lampe", "lagune",
    "marche", "piste", "poste", "radio", "reseau", "routeur", "sahel", "soleil", "studio", "tableau",
    "ticket", "village", "wifi", "zenith",
  ];
  const right = [
    "adhesion", "agora", "atelier", "baobab", "bureau", "cns", "compta", "cour", "don", "ecole",
    "fibre", "formation", "lagune", "marche", "panneau", "poste", "reseau", "rive", "salle", "sahel",
    "soleil", "studio", "sud", "support", "zenith",
  ];
  const suffixes = [
    "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12",
    "2024", "2025", "2026", "2027",
  ];
  const rng = mulberry32(0xc0ffee);
  const words = new Set(required);
  while (words.size < 120) {
    const first = left[Math.floor(rng() * left.length)];
    const second = right[Math.floor(rng() * right.length)];
    const suffix = suffixes[Math.floor(rng() * suffixes.length)];
    const candidate = `${first}-${second}-${suffix}`;
    if (reserved.has(candidate)) continue;
    words.add(candidate);
  }
  return Array.from(words).sort((a, b) => a.localeCompare(b));
}

function buildPhishing() {
  const fromAddress = "service.securite@banque-horzion.example";
  const returnPath = "rebond@paiement-horizon.test";
  const replyTo = "conseiller@dossiers-horizon.example.net";
  const originIp = "198.51.100.77";
  const linkHost = "banque-horizon.example.verification-mobile.horizon-securite.test";
  const linkDomain = registrableDomain(linkHost);
  const attachmentName = "Facture_Mars.pdf.exe";
  const attachmentBytes = 48213;

  const emailLines = [
    "Return-Path: <rebond@paiement-horizon.test>",
    "Received: from inbox.soleil.example (inbox.soleil.example [192.168.77.18])",
    "  by mail.soleil.example with ESMTPS id CNS-20260303-1730",
    "  for <aissatou.ndiaye@soleil.example>; Tue, 03 Mar 2026 10:17:33 +0000",
    "Received: from mx-relai.example.net (mx-relai.example.net [203.0.113.58])",
    "  by inbox.soleil.example with ESMTPS id CNS-20260303-1729",
    "  for <aissatou.ndiaye@soleil.example>; Tue, 03 Mar 2026 10:17:29 +0000",
    `Received: from webmail.horizon-securite.test (unknown [${originIp}])`,
    "  by mx-relai.example.net with ESMTP id MX-4421",
    "  for <aissatou.ndiaye@soleil.example>; Tue, 03 Mar 2026 10:17:24 +0000",
    "Authentication-Results: inbox.soleil.example;",
    "  spf=fail smtp.mailfrom=paiement-horizon.test;",
    "  dkim=none header.d=none;",
    "  dmarc=fail action=quarantine header.from=banque-horzion.example",
    `From: "Banque Horizon, Service Sécurité" <${fromAddress}>`,
    `Reply-To: "Conseiller prioritaire" <${replyTo}>`,
    "To: aissatou.ndiaye@soleil.example",
    "Subject: Suspension du compte association sous 24 heures",
    "Date: Tue, 03 Mar 2026 10:17:20 +0000",
    "Message-ID: <20260303.101720.7842@horizon-securite.test>",
    "MIME-Version: 1.0",
    "Content-Type: multipart/mixed; boundary=\"CNS-PHISH-BOUNDARY\"",
    "",
    "--CNS-PHISH-BOUNDARY",
    "Content-Type: multipart/alternative; boundary=\"CNS-PHISH-ALT\"",
    "",
    "--CNS-PHISH-ALT",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "Bonjour,",
    "",
    "Notre service sécurité a détecté un blocage temporaire du compte de l’association.",
    "Vous devez confirmer l’identité du titulaire sous 24 heures pour éviter une suspension des paiements.",
    `Confirmez votre identité ici : https://${linkHost}/session/confirm?id=7842`,
    "La facture jointe reprend l’opération signalée.",
    "",
    "Cordialement,",
    "Service Sécurité Banque Horizon",
    "",
    "--CNS-PHISH-ALT",
    "Content-Type: text/html; charset=utf-8",
    "",
    "<html><body>",
    "<p>Bonjour,</p>",
    "<p>Notre service sécurité a détecté un blocage temporaire du compte de l’association.</p>",
    "<p>Vous devez confirmer l’identité du titulaire sous 24 heures pour éviter une suspension des paiements.</p>",
    `<p><a href="https://${linkHost}/session/confirm?id=7842">https://www.banque-horizon.example/securite</a></p>`,
    `<p>Pièce jointe : ${attachmentName}</p>`,
    "</body></html>",
    "",
    "--CNS-PHISH-ALT--",
    "",
    "--CNS-PHISH-BOUNDARY",
    `Content-Type: application/octet-stream; name="${attachmentName}"`,
    `Content-Disposition: attachment; filename="${attachmentName}"`,
    "Content-Transfer-Encoding: base64",
    `X-Attachment-Size: ${attachmentBytes}`,
    "",
    "VGhpcyBpcyBhIGZha2UgYmluYXJ5IHBheWxvYWQgZm9yIHRoZSBsYWIu",
    "",
    "--CNS-PHISH-BOUNDARY--",
    "",
  ];

  const mobileLines = [
    "2026-03-03 15:21 SMS reçu",
    "Expéditeur affiché : Livraison Zéphyr Mobile",
    "Message : Votre colis est bloqué. Reprogrammez la livraison ici : https://zp-sm.test/84K2",
    "",
    "2026-03-03 15:27 Journal de conversation",
    "Agent : Bonjour, je suis du service de paiement mobile. Une vérification rapide est nécessaire.",
    "Aïssatou : Que dois-je faire ?",
    "Agent : Vous allez recevoir un SMS automatique.",
    "Agent : Donnez-moi ensuite le code de validation reçu pour débloquer l’opération.",
    "Aïssatou : Je n’ai encore rien transmis.",
  ];

  const guideLines = [
    "# Guide du TP 1 : disséquer un courriel d’hameçonnage",
    "",
    "> Cadre et limites",
    ">",
    "> Toutes les données de ce laboratoire sont fictives.",
    "> N’ouvre rien sur un vrai système et ne visite aucun vrai site.",
    "> Ne colle jamais un vrai mot de passe, un vrai code temporaire ou une vraie pièce jointe dans un outil externe.",
    "",
    "## Méthode",
    "",
    "1. Lis d’abord les en-têtes : expéditeur réel, adresses de retour, résultats SPF, DKIM et DMARC.",
    "2. Compare ensuite le texte affiché du lien et sa vraie destination.",
    "3. Termine par les pièces jointes, le délai imposé et les demandes inhabituelles.",
    "",
    "## Commandes utiles",
    "",
    "### Windows PowerShell",
    "",
    "```powershell",
    "Select-String -Path \"fond-tp1-courriel.log\" -Pattern '^From:','^Reply-To:','^Return-Path:','spf=|dkim=|dmarc='",
    "Select-String -Path \"fond-tp1-courriel.log\" -Pattern 'https://','filename='",
    "```",
    "",
    "### Git Bash ou Linux",
    "",
    "```bash",
    "grep -Ein '^(from:|reply-to:|return-path:)|spf=|dkim=|dmarc=' fond-tp1-courriel.log",
    "grep -Ein 'https://|filename=' fond-tp1-courriel.log",
    "```",
    "",
    "### Variante téléphone ou navigateur",
    "",
    "Sur téléphone, appuie longuement sur le lien sans l’ouvrir pour afficher sa vraie destination. Vérifie ensuite le domaine de droite à gauche.",
    "",
    "## Grille de 10 signaux à vérifier",
    "",
    "1. Le domaine de l’adresse affichée imite un domaine attendu.",
    "2. Reply-To ou Return-Path pointent vers d’autres domaines techniques.",
    "3. SPF échoue ou ne valide pas l’expéditeur observé.",
    "4. DKIM est absent ou invalide.",
    "5. DMARC échoue ou demande une mise en quarantaine.",
    "6. Le texte visible du lien et la destination réelle ne correspondent pas.",
    "7. La pièce jointe cache une extension exécutable derrière un nom rassurant.",
    "8. Le message impose un délai court avant une conséquence négative.",
    "9. L’adresse d’expéditeur utilise un grand service grand public.",
    "10. Le message demande d’envoyer des coordonnées bancaires complètes par retour de mail.",
  ];

  return {
    files: [
      { name: "fond-tp1-courriel.log", data: text(emailLines.join("\n")) },
      { name: "fond-tp1-mobile.log", data: text(mobileLines.join("\n")) },
      { name: "fond-tp1-guide.md", data: text(guideLines.join("\n")) },
    ],
    facts: {
      emailFile: "fond-tp1-courriel.log",
      mobileFile: "fond-tp1-mobile.log",
      guideFile: "fond-tp1-guide.md",
      senderDomain: fromAddress.split("@")[1],
      returnPathDomain: returnPath.split("@")[1],
      replyToDomain: replyTo.split("@")[1],
      originIp,
      spfResult: "fail",
      dkimResult: "none",
      dmarcResult: "fail",
      linkHost,
      linkDomain,
      attachmentName,
      attachmentExtension: attachmentName.split(".").pop().toLowerCase(),
      attachmentBytes,
      threatenedDelayHours: 24,
      lever: "peur",
      neverShare: "code de validation",
      firstAction: "lettre b",
      redFlagCount: 8,
    },
  };
}

function buildPasswords() {
  const auditDate = "2026-03-09";
  const inventory = [
    ["mariam.sow", "direction", "administrateur", "2026-02-14", "oui", "2026-03-09T07:12:11Z"],
    ["yao.kouassi", "comptabilité", "standard", "2025-11-18", "oui", "2026-03-09T06:54:03Z"],
    ["aissatou.ndiaye", "secrétariat", "standard", "2026-01-30", "non", "2026-03-08T16:42:10Z"],
    ["idriss.camara", "formation", "standard", "2026-02-25", "oui", "2026-03-09T07:20:18Z"],
    ["fatima.bello", "animation", "standard", "2025-12-20", "non", "2026-03-07T09:14:50Z"],
    ["jm.tchoumi", "support bénévole", "administrateur", "2025-10-02", "non", "2026-03-09T05:47:36Z"],
    ["salle-01", "salle de formation", "standard", "2026-02-01", "oui", "2026-03-08T18:03:21Z"],
    ["salle-02", "salle de formation", "standard", "2026-02-01", "oui", "2026-03-08T18:05:09Z"],
    ["salle-03", "salle de formation", "standard", "2025-12-15", "non", "2026-03-08T18:05:30Z"],
    ["salle-04", "salle de formation", "standard", "2026-02-01", "oui", "2026-03-08T18:05:44Z"],
    ["inscriptions", "boîte partagée", "standard", "2026-01-12", "oui", "2026-03-09T07:05:00Z"],
    ["dons-mobile", "service finances", "standard", "2025-09-18", "non", "2026-03-08T22:10:48Z"],
    ["archives-bot", "service automatisé", "standard", "2026-02-20", "oui", "2026-03-09T03:00:00Z"],
    ["pc-direction-local", "compte local", "standard", "2025-05-18", "non", "2026-02-27T11:15:42Z"],
  ];

  const clearPasswords = {
    "jm.tchoumi": "routeur-soleil-2026",
    "yao.kouassi": "journal-cns-09",
    "aissatou.ndiaye": "atelier-salle-03",
    "salle-03": "atelier-salle-03",
  };

  const hiddenPasswords = {
    "mariam.sow": "cinq-mots-uniques-pour-soleil",
    "archives-bot": "sync-archives-soleil-2026",
    "dons-mobile": "transfert-zephyr-2026",
    "pc-direction-local": "poste-direction-hors-dico",
  };

  const hashAccounts = [
    "mariam.sow",
    "jm.tchoumi",
    "yao.kouassi",
    "aissatou.ndiaye",
    "salle-03",
    "archives-bot",
    "dons-mobile",
    "pc-direction-local",
  ];

  const hashes = hashAccounts.map((account) => {
    const password = clearPasswords[account] ?? hiddenPasswords[account];
    return [account, sha256Hex(password)];
  });

  const dictionary = buildPasswordDictionary();

  const inventoryLines = [
    "Audit messagerie CNS du lundi 9 mars 2026",
    "identifiant | role | privilege | dernier_changement_mdp | double_authentification | derniere_connexion_utc",
    ...inventory.map((row) => row.join(" | ")),
  ];

  const hashesLines = [
    "Extrait de l’ancien outil interne",
    "algorithme | commentaire",
    "sha-256 sans sel | comparer chaque mot du dictionnaire au condensat exact",
    "",
    "identifiant | sha256",
    ...hashes.map(([account, digest]) => `${account} | ${digest}`),
  ];

  const guideLines = [
    "# Guide du TP 2 : auditer des mots de passe et des comptes",
    "",
    "> Cadre et limites",
    ">",
    "> Toutes les données de ce laboratoire sont fictives.",
    "> N’essaie rien sur un vrai service et ne teste jamais de vrais mots de passe sur Internet.",
    "> Le dictionnaire fourni ne sert qu’à hacher des mots fictifs du labo.",
    "",
    "## Démarche",
    "",
    "1. Lis l’inventaire des comptes : privilèges, double authentification, ancienneté du mot de passe.",
    "2. Hache ensuite les entrées du dictionnaire avec SHA-256.",
    "3. Compare les empreintes en hexadécimal, caractère pour caractère.",
    "4. Priorise enfin les comptes critiques selon la règle : administrateur sans double authentification et mot de passe retrouvé.",
    "",
    "## Commandes utiles",
    "",
    "### PowerShell 5.1 ou 7",
    "",
    "```powershell",
    "$sha = [Security.Cryptography.SHA256]::Create()",
    "Get-Content \"fond-tp2-dictionnaire-fictif.txt\" | ForEach-Object {",
    "  $mot = $_.Trim()",
    "  if ($mot) {",
    "    $bytes = [Text.Encoding]::UTF8.GetBytes($mot)",
    "    $empreinte = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLower()",
    "    \"{0}  {1}\" -f $empreinte, $mot",
    "  }",
    "} | Set-Content \"fond-tp2-dictionnaire-hache.txt\"",
    "Select-String -Path \"fond-tp2-dictionnaire-hache.txt\" -Pattern '^[0-9a-f]{64}\\s{2}.+$'",
    "```",
    "",
    "### Git Bash ou Linux avec sha256sum",
    "",
    "```bash",
    "while IFS= read -r mot; do",
    "  [ -n \"$mot\" ] || continue",
    "  empreinte=$(printf '%s' \"$mot\" | sha256sum | cut -d' ' -f1)",
    "  printf '%s  %s\\n' \"$empreinte\" \"$mot\"",
    "done < fond-tp2-dictionnaire-fictif.txt > fond-tp2-dictionnaire-hache.txt",
    "grep -E '^[0-9a-f]{64}  .+$' fond-tp2-dictionnaire-hache.txt | head -n 3",
    "```",
    "",
    "### OpenSSL, utile si sha256sum n’est pas disponible",
    "",
    "```bash",
    "while IFS= read -r mot; do",
    "  [ -n \"$mot\" ] || continue",
    "  empreinte=$(printf '%s' \"$mot\" | openssl dgst -sha256 -r | awk '{print $1}')",
    "  printf '%s  %s\\n' \"$empreinte\" \"$mot\"",
    "done < fond-tp2-dictionnaire-fictif.txt > fond-tp2-dictionnaire-hache.txt",
    "head -n 3 fond-tp2-dictionnaire-hache.txt",
    "```",
    "",
    "### Variante téléphone ou navigateur",
    "",
    "Si tu n’as qu’un téléphone, tu peux utiliser un outil de hachage en ligne uniquement avec les mots fictifs du labo, jamais avec un vrai mot de passe.",
    "",
    "## Rechercher ensuite une empreinte",
    "",
    "Une fois le fichier `fond-tp2-dictionnaire-hache.txt` créé, relève une empreinte dans l’extrait puis cherche la même suite hexadécimale au début d’une ligne. Le mot placé après les deux espaces est le candidat associé.",
    "",
    "## Repères utiles",
    "",
    "- Pour une phrase de passe de plusieurs mots, utilise la formule : nombre_de_mots × log2(taille_de_la_liste).",
    "- Pour un essai exhaustif théorique, pars de charset^longueur puis divise par la vitesse d’essais par seconde et par 3600 pour obtenir des heures.",
    "- Une empreinte hexadécimale se compare caractère par caractère, sans espace ajouté ni supprimé.",
  ];

  const mfaEnabled = inventory.filter((row) => row[4] === "oui").length;
  const oldestChange = inventory.reduce((oldest, row) => (row[3] < oldest ? row[3] : oldest), inventory[0][3]);

  return {
    files: [
      { name: "fond-tp2-inventaire-comptes.log", data: text(inventoryLines.join("\n")) },
      { name: "fond-tp2-empreintes-sha256.log", data: text(hashesLines.join("\n")) },
      { name: "fond-tp2-dictionnaire-fictif.txt", data: text(dictionary.join("\n")) },
      { name: "fond-tp2-guide.md", data: text(guideLines.join("\n")) },
    ],
    facts: {
      auditDate,
      inventoryFile: "fond-tp2-inventaire-comptes.log",
      hashesFile: "fond-tp2-empreintes-sha256.log",
      dictionaryFile: "fond-tp2-dictionnaire-fictif.txt",
      guideFile: "fond-tp2-guide.md",
      crackedAccounts: {
        "jm.tchoumi": clearPasswords["jm.tchoumi"],
        "yao.kouassi": clearPasswords["yao.kouassi"],
        "salle-03": clearPasswords["salle-03"],
      },
      sharedHashCount: 2,
      strongHumanAccount: "mariam.sow",
      adminWithoutMfaCount: inventory.filter((row) => row[2] === "administrateur" && row[4] === "non").length,
      oldestPasswordAgeDays: daysBetweenIso(oldestChange, auditDate),
      mfaRoundedPercent: Math.round((mfaEnabled / inventory.length) * 100),
      entropyWords: 5,
      entropyBitsRounded: entropyBits(5, 7776),
      bruteForceHoursRounded: bruteForceHours(62, 8, 1000000),
      sha256HexLength: 64,
      oldestNoMfaLastLoginTime: "11:15:42",
      disableFirstAccount: "jm.tchoumi",
    },
  };
}

function caesarEncrypt(input, shift) {
  return input.replace(/[a-z]/g, (char) => String.fromCharCode(((char.charCodeAt(0) - 97 + shift) % 26) + 97));
}

function buildIntegrity() {
  const publishedFiles = {
    A: text([
      "mode=lecture",
      "journal=atelier",
      "niveau=info",
      "rotation=hebdomadaire",
    ].join("\n")),
    B: text([
      "nom=controle-integrite",
      "mode=verification",
      "cible=poste-formation",
      "signature=sha256",
    ].join("\n")),
    C: text([
      "service;etat;derniere_verification",
      "sauvegarde;ok;2026-03-15",
      "inventaire;ok;2026-03-15",
      "alarme;ok;2026-03-16",
    ].join("\n")),
  };

  const alteredB = Buffer.from(publishedFiles.B);
  alteredB[alteredB.indexOf("i")] = "l".charCodeAt(0);
  const distributedFiles = { A: publishedFiles.A, B: alteredB, C: publishedFiles.C };

  const manifestLines = [
    "Manifeste publié par l’éditeur",
    "fichier | sha256",
    `fond-tp4-outil-a.txt | ${sha256Hex(publishedFiles.A)}`,
    `fond-tp4-outil-b.txt | ${sha256Hex(publishedFiles.B)}`,
    `fond-tp4-outil-c.txt | ${sha256Hex(publishedFiles.C)}`,
  ];

  const base64Plain = "change le mot de passe ce soir";
  const hexPlain = "sauvegarde hors ligne ok";
  const caesarPlain = "verifie le hash avant installation";
  const caesarShift = 7;
  const base64Encoded = Buffer.from(base64Plain, "utf8").toString("base64");
  const hexEncoded = Buffer.from(hexPlain, "utf8").toString("hex");
  const caesarEncoded = caesarEncrypt(caesarPlain, caesarShift);
  const md5Sample = md5Hex("integrite");
  const sha256Sample = sha256Hex("certificat");

  const messagesLines = [
    "Carnet de décodage du 16 mars 2026",
    `message_base64 = ${base64Encoded}`,
    `message_hex = ${hexEncoded}`,
    `message_cesar_decalage_${caesarShift} = ${caesarEncoded}`,
    `empreinte_32 = ${md5Sample}`,
    `empreinte_64 = ${sha256Sample}`,
  ];

  const certEndDate = "2026-08-12";
  const expiredEndDate = "2026-02-28";
  const certLines = [
    "Certificate:",
    "    Data:",
    "        Version: 3 (0x2)",
    "        Serial Number: 41:77:20:26:08:12",
    "    Signature Algorithm: sha256WithRSAEncryption",
    "        Issuer: CN = Autorité de Confiance Fictive, O = PKI Exemple",
    "        Validity",
    "            Not Before: Mar 10 00:00:00 2026 GMT",
    "            Not After : Aug 12 23:59:59 2026 GMT",
    "        Subject: CN = www.soleil.example, O = Centre Numérique Soleil",
    "        Subject Public Key Info:",
    "            Public Key Algorithm: rsaEncryption",
    "                Public-Key: (2048 bit)",
    "        X509v3 Subject Alternative Name:",
    "            DNS:www.soleil.example, DNS:cdn.soleil.example",
    "",
    "Certificate:",
    "    Data:",
    "        Version: 3 (0x2)",
    "        Serial Number: 41:77:20:26:02:28",
    "    Signature Algorithm: sha256WithRSAEncryption",
    "        Issuer: CN = Autorité de Confiance Fictive, O = PKI Exemple",
    "        Validity",
    "            Not Before: Feb 28 00:00:00 2025 GMT",
    "            Not After : Feb 28 23:59:59 2026 GMT",
    "        Subject: CN = intranet.soleil.example, O = Centre Numérique Soleil",
    "        Subject Public Key Info:",
    "            Public Key Algorithm: rsaEncryption",
    "                Public-Key: (2048 bit)",
    "        X509v3 Subject Alternative Name:",
    "            DNS:intranet.soleil.example",
  ];

  const guideLines = [
    "# Guide du TP 4 : intégrité, chiffrement et certificats",
    "",
    "> Cadre et limites",
    ">",
    "> Tous les fichiers et certificats de ce laboratoire sont fictifs.",
    "> Vérifie uniquement les fichiers fournis ici et ne remplace jamais une vraie vérification de sécurité par un exemple de labo.",
    "> Si tu utilises un service web de décodage, n’y colle jamais une vraie donnée sensible.",
    "",
    "## Vérifier une empreinte SHA-256",
    "",
    "### Windows PowerShell",
    "",
    "```powershell",
    "Get-FileHash -Algorithm SHA256 fond-tp4-outil-*.txt",
    "```",
    "",
    "### Git Bash ou Linux avec sha256sum",
    "",
    "```bash",
    "sha256sum fond-tp4-outil-*.txt",
    "```",
    "",
    "### OpenSSL, utile si sha256sum n’est pas disponible",
    "",
    "```bash",
    "for fichier in fond-tp4-outil-*.txt; do openssl dgst -sha256 -r \"$fichier\"; done",
    "```",
    "",
    "## Décoder un message",
    "",
    "### Base64 depuis le carnet du labo avec PowerShell",
    "",
    "```powershell",
    "$b64 = ((Select-String -Path \"fond-tp4-messages-a-decoder.log\" -Pattern '^message_base64 = ').Line -split ' = ')[1]",
    "[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64))",
    "```",
    "",
    "### Base64 depuis le carnet du labo avec Git Bash ou Linux",
    "",
    "```bash",
    "awk -F' = ' '/^message_base64 = / {print $2}' fond-tp4-messages-a-decoder.log | base64 -d",
    "```",
    "",
    "### Hexadécimal depuis le carnet du labo avec PowerShell",
    "",
    "```powershell",
    "$hex = ((Select-String -Path \"fond-tp4-messages-a-decoder.log\" -Pattern '^message_hex = ').Line -split ' = ')[1]",
    "$bytes = New-Object byte[] ($hex.Length / 2)",
    "for ($i = 0; $i -lt $hex.Length; $i += 2) { $bytes[$i / 2] = [Convert]::ToByte($hex.Substring($i, 2), 16) }",
    "[Text.Encoding]::UTF8.GetString($bytes)",
    "```",
    "",
    "### Hexadécimal depuis le carnet du labo avec Git Bash ou Linux",
    "",
    "```bash",
    "awk -F' = ' '/^message_hex = / {print $2}' fond-tp4-messages-a-decoder.log | xxd -r -p",
    "```",
    "",
    "### César depuis le carnet du labo avec PowerShell",
    "",
    "```powershell",
    "$line = (Select-String -Path \"fond-tp4-messages-a-decoder.log\" -Pattern '^message_cesar_decalage_').Line",
    "$shift = [int]([regex]::Match($line, 'decalage_(\\d+)').Groups[1].Value)",
    "$cipher = ($line -split ' = ')[1]",
    "$out = -join ($cipher.ToCharArray() | ForEach-Object {",
    "  if ($_ -ge 'a' -and $_ -le 'z') { [char]((((([int][char]$_) - 97 - $shift + 26) % 26) + 97)) } else { $_ }",
    "})",
    "$out",
    "```",
    "",
    "### César depuis le carnet du labo avec Git Bash ou Linux",
    "",
    "```bash",
    "awk -F' = ' '/^message_cesar_decalage_7 = / {print $2}' fond-tp4-messages-a-decoder.log | tr 'a-z' 't-zabcdefghijklmnopqrs'",
    "```",
    "",
    "### Dates et jours restants depuis le certificat du labo avec PowerShell",
    "",
    "```powershell",
    "$line = (Select-String -Path \"fond-tp4-certificats.log\" -Pattern 'Not After :').Line | Select-Object -First 1",
    "$dateText = ($line -replace '.*Not After : ', '').Trim()",
    "$expiry = [datetime]::ParseExact($dateText, 'MMM dd HH:mm:ss yyyy ''GMT''', [System.Globalization.CultureInfo]::InvariantCulture)",
    "$reference = [datetime]'2026-03-16T00:00:00Z'",
    "(New-TimeSpan -Start $reference -End $expiry).Days",
    "```",
    "",
    "### Dates et jours restants depuis le certificat du labo avec Git Bash ou Linux",
    "",
    "```bash",
    "date_text=$(awk '/Not After :/ {sub(/^.*Not After : /, \"\"); print; exit}' fond-tp4-certificats.log)",
    "expiry=$(date -u -d \"$date_text\" +%F)",
    "echo \"$expiry\"",
    "echo $(( ($(date -u -d \"$expiry\" +%s) - $(date -u -d '2026-03-16' +%s)) / 86400 ))",
    "```",
    "",
    "## Mémo",
    "",
    "- Une empreinte hexadécimale a une longueur fixe qui aide à reconnaître sa famille.",
    "- Pour un certificat, vérifie séparément la date de fin, les SAN, l’algorithme de signature et la taille de clé.",
    "- Un manifeste d’intégrité doit être comparé aux octets réellement téléchargés, pas à une copie supposée saine.",
  ];

  return {
    files: [
      { name: "fond-tp4-outil-a.txt", data: distributedFiles.A },
      { name: "fond-tp4-outil-b.txt", data: distributedFiles.B },
      { name: "fond-tp4-outil-c.txt", data: distributedFiles.C },
      { name: "fond-tp4-manifeste-sha256.log", data: text(manifestLines.join("\n")) },
      { name: "fond-tp4-messages-a-decoder.log", data: text(messagesLines.join("\n")) },
      { name: "fond-tp4-certificats.log", data: text(certLines.join("\n")) },
      { name: "fond-tp4-guide.md", data: text(guideLines.join("\n")) },
    ],
    facts: {
      toolFiles: {
        a: "fond-tp4-outil-a.txt",
        b: "fond-tp4-outil-b.txt",
        c: "fond-tp4-outil-c.txt",
      },
      manifestFile: "fond-tp4-manifeste-sha256.log",
      messagesFile: "fond-tp4-messages-a-decoder.log",
      certificatesFile: "fond-tp4-certificats.log",
      guideFile: "fond-tp4-guide.md",
      alteredLetter: "lettre b",
      alteredHashPrefix12: sha256Hex(distributedFiles.B).slice(0, 12),
      alteredBytes: distributedFiles.B.length,
      base64Text: base64Plain,
      hexText: hexPlain,
      caesarShift,
      caesarText: caesarPlain,
      shortHashAlgorithm: "md5",
      sha256HexLength: 64,
      sha256ReferenceText: "certificat",
      sha256MatchesReference: true,
      certificateEndDate: certEndDate,
      certificateDaysRemaining: daysBetweenIso("2026-03-16", certEndDate),
      coversApex: false,
      keySizeBits: 2048,
      secondCertificateValid: false,
      signatureAlgorithm: "sha256withrsaencryption",
      md5Sample,
      sha256Sample,
    },
  };
}

function buildSecuriteAssetsA() {
  const phishing = buildPhishing();
  const passwords = buildPasswords();
  const integrity = buildIntegrity();
  return {
    files: [...phishing.files, ...passwords.files, ...integrity.files],
    facts: {
      phishing: phishing.facts,
      passwords: passwords.facts,
      integrity: integrity.facts,
    },
  };
}

module.exports = { buildSecuriteAssetsA };
