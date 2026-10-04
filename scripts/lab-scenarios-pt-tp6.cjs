"use strict";

const JOURNAL_FILE = "pt-tp6-journal-mission.log";
const RULES_FILE = "pt-tp6-regles-engagement.md";
const ARTEFACTS_FILE = "pt-tp6-artefacts-a-nettoyer.csv";
const CLOSURE_FILE = "pt-tp6-modele-cloture.md";
const GUIDE_FILE = "pt-tp6-guide.md";
const CLOSURE_SECTION = "Artefacts restants pour re-test";

const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");
const pad = (value) => String(value).padStart(2, "0");
const compact = (values) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const withAsciiFallback = (value) => {
  const normalized = String(value);
  return compact([normalized, normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "")]);
};

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let tmp = Math.imul(state ^ (state >>> 15), 1 | state);
    tmp = (tmp + Math.imul(tmp ^ (tmp >>> 7), 61 | tmp)) ^ tmp;
    return ((tmp ^ (tmp >>> 14)) >>> 0) / 4294967296;
  };
}

function isoTime(value) {
  return value.slice(11, 19);
}

function buildRulesDoc() {
  return [
    "# Règles d’engagement de la mission Harmattan x Sahel-Vert",
    "",
    "## Contexte du mandat",
    "",
    "Client : Coopérative Sahel-Vert.",
    "Prestataire : Cabinet Harmattan.",
    "Relecture demandée le 17 juin 2026 par Mariam Diallo.",
    "Périmètre nominal : www.sahel-vert.example, portail.sahel-vert.example, mail.sahel-vert.example, vpn.sahel-vert.example, paie.sahel-vert.example, stock.sahel-vert.example.",
    "Réseaux publics autorisés : 198.51.100.0/24 et 203.0.113.0/24.",
    "Réseaux internes visibles en preuve minimale : 172.31.0.0/16 et 10.50.0.0/16.",
    "",
    "## Principes de journalisation",
    "",
    "- Chaque action utile est consignée une seule fois dans le journal de mission.",
    "- Les heures sont en UTC, au format ISO 8601 terminé par Z.",
    "- Le journal peut contenir du bruit administratif normal.",
    "- Un écart aux règles d’engagement se compte une seule fois par ligne de journal, même si plusieurs commentaires décrivent le même contexte.",
    "",
    "## Clauses opérationnelles",
    "",
    "### RE-01. Périmètre explicite",
    "- Toute action doit viser un actif explicitement listé dans le mandat.",
    "- Une cible découverte en cours de mission n’entre pas automatiquement dans le périmètre.",
    "",
    "### RE-02. Fenêtre d’intervention",
    "- Fenêtre autorisée : du 15 au 17 juin 2026, chaque jour de 08:00:00Z à 18:30:00Z, bornes comprises.",
    "- Une action en dehors de cette fenêtre reste un écart aux règles d’engagement, même si la cible reste dans le périmètre.",
    "",
    "### RE-03. Preuve minimale",
    "- La preuve doit rester factuelle, horodatée et limitée au minimum suffisant.",
    "- La preuve acceptable cite l’actif observé et la méthode utilisée.",
    "",
    "### RE-04. Notification préalable",
    "- Toute action « creation-compte-test », « depot-artefact-retest » ou « lecture-config-etendue » doit porter un commentaire « notification=NOTIF-... ».",
    "- La notification doit être envoyée avant l’action ; une mention « notification=absente » vaut écart.",
    "- La notification vise Ibrahim Sanou ou son relais d’astreinte.",
    "",
    "### RE-05. Actions interdites",
    "- L’action « export-integral-donnees » est interdite.",
    "- Une copie intégrale de données métier ne peut jamais servir de preuve minimale.",
    "",
    "### RE-06. Quota de comptes de test",
    "- Au plus 2 comptes de test peuvent rester actifs en même temps.",
    "- La création d’un troisième compte actif constitue un écart, même si les comptes sont nominatifs et temporaires.",
    "",
    "### RE-07. Nettoyage attendu",
    "- Tous les comptes de test, jetons de démo, fichiers temporaires et exports locaux doivent être supprimés avant clôture.",
    "- Le journal doit permettre de relier un artefact à son retrait ou à sa restitution.",
    "",
    "### RE-08. Exception de re-test",
    "- Un artefact peut rester en place jusqu’au re-test seulement si le commentaire contient « exception=RE-08 » et « retrait-prevu=AAAA-MM-JJ ».",
    "- Cette exception doit rester limitée à un artefact clairement nommé, avec notification préalable.",
    "- Un artefact laissé pour re-test n’est pas un écart si ces éléments sont présents et documentés.",
    "",
    "## Points de contact",
    "",
    "| Rôle | Nom | Canal |",
    "|---|---|---|",
    "| Cheffe de mission | Mariam Diallo | mission@harmattan.example |",
    "| Testeur | Yao Kouassi | yao.kouassi@harmattan.example |",
    "| Contact technique client | Ibrahim Sanou | ibrahim.sanou@sahel-vert.example |",
    "| Contact juridique client | Rokia Bamba | rokia.bamba@sahel-vert.example |",
    "",
    "## Conditions d’arrêt",
    "",
    "1. Arrêt immédiat si la stabilité ou l’intégrité métier paraît menacée.",
    "2. Information immédiate du contact prévu avant toute reprise.",
    "3. Conservation de la preuve minimale déjà recueillie, sans collecte supplémentaire.",
    "",
    "## Rappel de clôture",
    "",
    "- Le prestataire remet un journal horodaté, une synthèse des écarts éventuels et une note de clôture.",
    "- La note de clôture distingue les artefacts supprimés, les artefacts restants autorisés et les preuves conservées.",
    "- Toute dérogation doit rester explicite, datée et attribuée.",
  ].join("\n");
}

function buildClosureTemplate() {
  return [
    "# Modèle de note de clôture de mission",
    "",
    "Document à publier en PDF après relecture interne.",
    "",
    "## 1. Identification de la mission",
    "- Client :",
    "- Prestataire :",
    "- Référence de mission :",
    "- Fenêtre couverte :",
    "",
    "## 2. Rappel du périmètre",
    "- Domaines et actifs relus :",
    "- Exclusions maintenues :",
    "- Contacts mobilisés :",
    "",
    "## 3. Journal synthétique",
    "- Heures clés de début et de fin :",
    "- Actions notables :",
    "- Écarts éventuels aux règles d’engagement :",
    "",
    "## 4. Preuves minimales conservées",
    "- Références de preuves :",
    "- Motif de conservation :",
    "- Responsable de garde :",
    "",
    `## 5. ${CLOSURE_SECTION}`,
    "- Nom de l’artefact :",
    "- Emplacement exact :",
    "- Justification métier ou technique :",
    "- Référence de l’exception approuvée :",
    "- Responsable du retrait :",
    "- Date prévue de retrait :",
    "",
    "## 6. Nettoyage réalisé",
    "- Comptes de test supprimés :",
    "- Jetons ou secrets de démo révoqués :",
    "- Fichiers temporaires retirés :",
    "- Vérification finale du retrait :",
    "",
    "## 7. Recommandations de suivi",
    "- Points à re-tester :",
    "- Actions correctives prioritaires :",
    "- Décisions laissées au client :",
    "",
    "## 8. Signatures et accusés",
    "- Rédacteur :",
    "- Relecteur :",
    "- Contact client informé :",
    "- Date d’envoi :",
    "",
    "## 9. Annexes autorisées",
    "- Extraits horodatés retenus :",
    "- Références croisées vers le journal :",
    "- Références des tickets internes :",
  ].join("\n");
}

function buildGuide() {
  return [
    "# Guide du TP 6 : relire un journal de mission proprement",
    "",
    "> Cadre et limites : tu analyses uniquement des fichiers fournis et fictifs ; ne teste jamais un système réel sans autorisation écrite.",
    "> Les exemples ci-dessous utilisent des valeurs inventées, pas celles du labo.",
    "",
    "## 1. Ce qu’il faut vérifier",
    "",
    "Une relecture de mission répond à trois questions : les règles d’engagement ont-elles été respectées, les preuves sont-elles suffisantes, et le nettoyage final est-il cohérent avec le journal ?",
    "Travaille toujours dans cet ordre : règles, preuves, nettoyage, puis note de clôture.",
    "",
    "## 2. Règles d’engagement : compter sans inventer",
    "",
    "Lis d’abord les clauses qui donnent une définition observable : fenêtre horaire, action interdite, quota, notification préalable.",
    "Compte un écart une seule fois par ligne de journal. Une action hors fenêtre reste un écart aux règles d’engagement, pas un hors-périmètre.",
    "",
    "## 3. Visionneuse du site",
    "",
    "Dans la visionneuse, cherche d’abord « notification= », puis « exception= », puis les actions rares comme « export- » ou « création- ».",
    "Pour une première heure, trie mentalement les lignes par horodatage UTC plutôt que de faire confiance à l’ordre d’affichage.",
    "",
    "## 4. Exemple Bash : trouver des écarts observables",
    "",
    "```bash",
    "cat > guide-journal-exemple.log <<'EOF'",
    "G01 | 2026-03-10T07:58:00Z | Awa | lecture-config-etendue | demo.example | UTC=2026-03-10T07:58:00Z ; cible=demo.example ; extrait=entete ; commande=curl -I | notification=NOTIF-1",
    "G02 | 2026-03-10T09:12:00Z | Awa | creation-compte-test | demo.example | UTC=2026-03-10T09:12:00Z ; cible=demo.example ; extrait=compte ; commande=note | notification=absente ; compte=demo-user-a",
    "G03 | 2026-03-10T09:18:00Z | Awa | export-integral-donnees | demo.example | UTC=2026-03-10T09:18:00Z ; cible=demo.example ; extrait=lot ; commande=revue | notification=NOTIF-2",
    "G04 | 2026-03-10T18:45:00Z | Awa | export-integral-donnees | demo.example | UTC=2026-03-10T18:45:00Z ; cible=demo.example ; extrait=entete ; commande=curl -I | notification=NOTIF-3",
    "EOF",
    "awk -F' \\| ' '{ print $2 \"|\" $4 \"|\" $7 }' guide-journal-exemple.log | while IFS='|' read -r horo action commentaire; do",
    "  heure=${horo#*T}",
    "  heure=${heure%Z}",
    "  if [ \"$heure\" \< \"08:00:00\" ] || [ \"$heure\" \> \"18:30:00\" ]; then echo \"fenetre:$heure\"; fi",
    "  case \"$action\" in export-integral-donnees) echo \"interdit:$action\" ;; esac",
    "  case \"$commentaire\" in *\"notification=absente\"*) echo \"notification\" ;; esac",
    "done",
    "```",
    "",
    "## 5. Exemple PowerShell : la même logique",
    "",
    "```powershell",
    "@(",
    "  'G01 | 2026-03-10T07:58:00Z | Awa | lecture-config-etendue | demo.example | UTC=2026-03-10T07:58:00Z ; cible=demo.example ; extrait=entete ; commande=curl -I | notification=NOTIF-1',",
    "  'G02 | 2026-03-10T09:12:00Z | Awa | creation-compte-test | demo.example | UTC=2026-03-10T09:12:00Z ; cible=demo.example ; extrait=compte ; commande=note | notification=absente ; compte=demo-user-a',",
    "  'G03 | 2026-03-10T09:18:00Z | Awa | export-integral-donnees | demo.example | UTC=2026-03-10T09:18:00Z ; cible=demo.example ; extrait=lot ; commande=revue | notification=NOTIF-2',",
    "  'G04 | 2026-03-10T18:45:00Z | Awa | export-integral-donnees | demo.example | UTC=2026-03-10T18:45:00Z ; cible=demo.example ; extrait=entete ; commande=curl -I | notification=NOTIF-3'",
    ") | Set-Content -Encoding UTF8 guide-journal-exemple.log",
    "$ecarts = 0",
    "Get-Content -Encoding UTF8 guide-journal-exemple.log | ForEach-Object {",
    "  $parties = $_ -split ' \\| '",
    "  $heure = $parties[1].Substring(11, 8)",
    "  $action = $parties[3]",
    "  $commentaire = $parties[6]",
    "  if ($heure -lt '08:00:00' -or $heure -gt '18:30:00') { $ecarts++ }",
    "  if ($action -eq 'export-integral-donnees') { $ecarts++ }",
    "  if ($commentaire -like '*notification=absente*') { $ecarts++ }",
    "}",
    "$ecarts",
    "```",
    "",
    "## 6. Preuves insuffisantes",
    "",
    "Classe une preuve comme insuffisante si elle ne contient pas d’horodatage « UTC=... », si elle n’indique pas la cible « cible=... », ou si elle donne une « capture=... » sans « commande=... ».",
    "Le but n’est pas d’avoir une preuve spectaculaire, mais une preuve défendable et vérifiable.",
    "",
    "```bash",
    "cat > guide-preuves-exemple.log <<'EOF'",
    "K01 | 2026-03-10T10:00:00Z | Koffi | revue-entete-http | demo.example | cible=demo.example ; extrait=entete ; commande=curl -I | ticket=1",
    "K02 | 2026-03-10T10:05:00Z | Koffi | revue-portail | demo.example | UTC=2026-03-10T10:05:00Z ; cible=demo.example ; capture=ecran-connexion | ticket=2",
    "EOF",
    "awk -F' \\| ' '{ print $1 \"|\" $6 }' guide-preuves-exemple.log | while IFS='|' read -r ident preuve; do",
    "  if [[ \"$preuve\" != *\"UTC=\"* ]] || [[ \"$preuve\" != *\"cible=\"* ]] || { [[ \"$preuve\" == *\"capture=\"* ]] && [[ \"$preuve\" != *\"commande=\"* ]]; }; then",
    "    echo \"$ident\"",
    "  fi",
    "done | wc -l",
    "```",
    "",
    "## 7. Nettoyage et exception de re-test",
    "",
    "Dans le tableau des artefacts, commence par filtrer « doit être supprimé=oui ». Ensuite distingue trois cas : supprimé, oublié, ou à révoquer.",
    "Un artefact laissé pour re-test n’est acceptable que si la règle d’exception l’autorise et si le journal nomme clairement l’artefact, la notification et la date de retrait prévue.",
    "",
    "```powershell",
    "@(",
    "  'identifiant;artefact;emplacement;doit_etre_supprime;statut;justification',",
    "  'A01;note-temporaire;/tmp/note.txt;oui;supprime;fermee',",
    "  'A02;token-demo-77;/tmp/token.txt;oui;a_revoquer;encore actif',",
    "  'A03;marqueur-retest;/tmp/retest.flag;non;laisse-pour-retest;exception documentée'",
    ") | Set-Content -Encoding UTF8 guide-artefacts-exemple.csv",
    "$restants = Import-Csv -Path guide-artefacts-exemple.csv -Delimiter ';' -Encoding UTF8 | Where-Object { $_.doit_etre_supprime -eq 'oui' }",
    "$restants.Count",
    "```",
    "",
    "## 8. Lire le modèle de clôture",
    "",
    "Le modèle de clôture sert à ordonner l’information : identité de mission, synthèse, preuves conservées, artefacts restants autorisés, nettoyage, suivi.",
    "Quand un artefact est conservé à titre d’exception, écris d’abord ce qui permet de le retirer sans ambiguïté : nom, emplacement, justification, responsable et date prévue de retrait.",
  ].join("\n");
}

function buildArtifacts() {
  return [
    ["A01", "compte-demo-user-01", "/srv/harmattan/comptes/demo-user-01.txt", "oui", "supprime", "retire en fin de revue"],
    ["A02", "compte-demo-user-02", "/srv/harmattan/comptes/demo-user-02.txt", "oui", "supprime", "retiré après le second scénario"],
    ["A03", "compte-demo-user-03", "/srv/harmattan/comptes/demo-user-03.txt", "oui", "supprime", "retiré après validation du quota"],
    ["A04", "compte-demo-user-04", "/srv/harmattan/comptes/demo-user-04.txt", "oui", "supprime", "retiré après correction de notification"],
    ["A05", "capture-portail-auth.png", "/srv/harmattan/preuves/capture-portail-auth.png", "oui", "supprime", "preuve remplacée par extrait texte"],
    ["A06", "notes-brutes-mail.txt", "/srv/harmattan/preuves/notes-brutes-mail.txt", "oui", "supprime", "notes de travail locales"],
    ["A07", "export-entetes-vpn.txt", "/srv/harmattan/preuves/export-entetes-vpn.txt", "oui", "supprime", "export de revue ponctuelle"],
    ["A08", "journal-temp-stock.txt", "/srv/harmattan/tmp/journal-temp-stock.txt", "oui", "supprime", "tampon de comparaison"],
    ["A09", "archive-note-cloture.txt", "/srv/harmattan/tmp/archive-note-cloture.txt", "oui", "oublie", "copie locale restée après relecture"],
    ["A10", "preuve-certificat-mail.txt", "/srv/harmattan/preuves/preuve-certificat-mail.txt", "oui", "supprime", "preuve recopiée dans le rapport"],
    ["A11", "inventaire-cibles.csv", "/srv/harmattan/tmp/inventaire-cibles.csv", "oui", "supprime", "export de travail interne"],
    ["A12", "cache-requetes-portail.txt", "/srv/harmattan/tmp/cache-requetes-portail.txt", "oui", "supprime", "cache local non nécessaire"],
    ["A13", "trace-retest-auth.log", "/srv/harmattan/tmp/trace-retest-auth.log", "oui", "supprime", "journal temporaire de contrôle"],
    ["A14", "token-demo-0012", "/srv/harmattan/tokens/token-demo-0012.txt", "oui", "a_revoquer", "jeton encore actif après création de test"],
    ["A15", "jeton-partage-mail.txt", "/srv/harmattan/tokens/jeton-partage-mail.txt", "oui", "supprime", "jeton de démonstration déjà retiré"],
    ["A16", "compte-vpn-demo.txt", "/srv/harmattan/vpn/compte-vpn-demo.txt", "oui", "supprime", "compte de test ferme"],
    ["A17", "token-demo-0007", "/srv/harmattan/retest/token-demo-0007.txt", "non", "laisse-pour-retest", "exception RE-08 documentée jusqu’au retrait prévu"],
    ["A18", "memo-lecture-roe.md", "/srv/harmattan/docs/memo-lecture-roe.md", "non", "conserve", "document interne de méthode"],
    ["A19", "tableau-suivi-retest.csv", "/srv/harmattan/docs/tableau-suivi-retest.csv", "non", "conserve", "suivi du re-test client"],
    ["A20", "preuve-hash-portail.txt", "/srv/harmattan/preuves/preuve-hash-portail.txt", "non", "conserve", "preuve minimale à archiver"],
    ["A21", "preuve-http-mail.txt", "/srv/harmattan/preuves/preuve-http-mail.txt", "non", "conserve", "preuve minimale à archiver"],
    ["A22", "matrice-constats.ods", "/srv/harmattan/docs/matrice-constats.ods", "non", "conserve", "support de rapport"],
    ["A23", "ordre-de-mission.pdf", "/srv/harmattan/docs/ordre-de-mission.pdf", "non", "conserve", "document contractuel"],
    ["A24", "liste-contacts-astreinte.txt", "/srv/harmattan/docs/liste-contacts-astreinte.txt", "non", "conserve", "coordonnées contractuelles"],
  ].map(([identifiant, artefact, emplacement, doitEtreSupprime, statut, justification]) => ({
    identifiant, artefact, emplacement, doitEtreSupprime, statut, justification,
  }));
}

function buildJournalEntries() {
  const rng = mulberry32(0x6a726e6c);
  const targets = [
    "www.sahel-vert.example",
    "portail.sahel-vert.example",
    "mail.sahel-vert.example",
    "vpn.sahel-vert.example",
    "stock.sahel-vert.example",
    "paie.sahel-vert.example",
  ];
  const actions = [
    "lecture-entete-http",
    "revue-certificat",
    "controle-version-service",
    "verification-redirect",
    "revue-formulaire-contact",
    "lecture-journal-applicatif",
    "controle-reponse-403",
    "revue-indexation",
  ];
  const comments = [
    "phase=triage ; ticket=PM-201 ; observation=bruit-normal",
    "phase=preuve ; ticket=PM-204 ; observation=point-de-controle",
    "phase=revue ; ticket=PM-207 ; observation=constat-a-confirmer",
    "phase=journal ; ticket=PM-210 ; observation=note-administrative",
  ];
  const entries = [];
  const sufficientProof = (time, target, index) => `UTC=${time} ; cible=${target} ; extrait=preuve-${pad(index)} ; commande=controle-demo-${(index % 4) + 1}`;
  for (const [dayIndex, day] of [15, 16, 17].entries()) {
    const base = Date.parse(`2026-06-${day}T08:05:00Z`);
    for (let slot = 0; slot < 48; slot += 1) {
      const jitter = Math.floor(rng() * 240000) - 120000;
      const time = new Date(base + slot * 12 * 60000 + jitter).toISOString().replace(".000Z", "Z");
      const target = targets[(slot + dayIndex * 2) % targets.length];
      entries.push({
        time,
        author: "Yao Kouassi",
        action: actions[(slot + dayIndex) % actions.length],
        target,
        proof: sufficientProof(time, target, slot + 1),
        comment: comments[(slot + dayIndex) % comments.length],
      });
    }
  }
  const signals = [
    ["2026-06-15T07:58:41Z", "inventaire-manuel-cibles", "vpn.sahel-vert.example", "UTC=2026-06-15T07:58:41Z ; cible=vpn.sahel-vert.example ; extrait=entete-vpn ; commande=lecture-head", "notification=NOTIF-200 ; phase=ouverture"],
    ["2026-06-15T09:12:22Z", "revue-entete-http", "www.sahel-vert.example", "cible=www.sahel-vert.example ; extrait=entête-200 ; commande=lecture-head", "ticket=PM-214 ; observation=preuve-a-completer"],
    ["2026-06-15T10:44:13Z", "creation-compte-test", "portail.sahel-vert.example", "UTC=2026-06-15T10:44:13Z ; cible=portail.sahel-vert.example ; extrait=compte-demo-01 ; commande=creation-documentee", "notification=NOTIF-210 ; compte=demo-user-01 ; lot=retest-auth-1"],
    ["2026-06-15T14:18:05Z", "creation-compte-test", "portail.sahel-vert.example", "UTC=2026-06-15T14:18:05Z ; cible=portail.sahel-vert.example ; extrait=compte-demo-02 ; commande=creation-documentee", "notification=NOTIF-212 ; compte=demo-user-02 ; lot=retest-auth-2"],
    ["2026-06-15T16:03:48Z", "revue-portail-auth", "portail.sahel-vert.example", "UTC=2026-06-15T16:03:48Z ; cible=portail.sahel-vert.example ; capture=ecran-auth", "ticket=PM-221 ; observation=preuve-a-completer"],
    ["2026-06-16T11:24:18Z", "creation-compte-test", "portail.sahel-vert.example", "UTC=2026-06-16T11:24:18Z ; cible=portail.sahel-vert.example ; extrait=compte-demo-03 ; commande=creation-documentee", "notification=NOTIF-216 ; compte=demo-user-03 ; lot=retest-auth-3"],
    ["2026-06-16T12:10:33Z", "suppression-compte-test", "portail.sahel-vert.example", "UTC=2026-06-16T12:10:33Z ; cible=portail.sahel-vert.example ; extrait=suppression-demo-02 ; commande=fermeture-documentee", "notification=NOTIF-217 ; compte=demo-user-02 ; statut=retire"],
    ["2026-06-16T14:50:11Z", "suppression-compte-test", "portail.sahel-vert.example", "UTC=2026-06-16T14:50:11Z ; cible=portail.sahel-vert.example ; extrait=suppression-demo-03 ; commande=fermeture-documentee", "notification=NOTIF-219 ; compte=demo-user-03 ; statut=retire"],
    ["2026-06-16T15:16:22Z", "creation-compte-test", "mail.sahel-vert.example", "UTC=2026-06-16T15:16:22Z ; cible=mail.sahel-vert.example ; extrait=compte-demo-04 ; commande=creation-documentee", "notification=absente ; compte=demo-user-04 ; jeton=token-demo-0012"],
    ["2026-06-16T17:02:11Z", "revue-jeton-mail", "mail.sahel-vert.example", "UTC=2026-06-16T17:02:11Z ; extrait=jeton-mail ; commande=lecture-note", "ticket=PM-228 ; observation=preuve-a-completer"],
    ["2026-06-17T09:47:55Z", "export-integral-donnees", "paie.sahel-vert.example", "UTC=2026-06-17T09:47:55Z ; cible=paie.sahel-vert.example ; extrait=lot-40-lignes ; commande=revue-export", "notification=NOTIF-311 ; justification=collecte-complete-non-autorisee"],
    ["2026-06-17T11:22:42Z", "revue-stock-exemple", "stock.sahel-vert.example", "cible=stock.sahel-vert.example ; extrait=liste-exemple ; commande=lecture-note", "ticket=PM-233 ; observation=preuve-a-completer"],
    ["2026-06-17T14:07:09Z", "depot-artefact-retest", "portail.sahel-vert.example", "UTC=2026-06-17T14:07:09Z ; cible=portail.sahel-vert.example ; extrait=token-demo-0007 ; commande=depot-documente", "notification=NOTIF-304 ; artefact=token-demo-0007 ; exception=RE-08 ; retrait-prevu=2026-06-19"],
    ["2026-06-17T16:28:37Z", "revue-auth-vpn", "vpn.sahel-vert.example", "UTC=2026-06-17T16:28:37Z ; cible=vpn.sahel-vert.example ; capture=ecran-vpn", "ticket=PM-239 ; observation=preuve-a-completer"],
    ["2026-06-17T17:51:03Z", "revue-mail-headers", "mail.sahel-vert.example", "UTC=2026-06-17T17:51:03Z ; extrait=headers-mail ; commande=lecture-entetes", "ticket=PM-244 ; observation=preuve-a-completer"],
  ];
  for (const [time, action, target, proof, comment] of signals) entries.push({ time, author: "Yao Kouassi", action, target, proof, comment });
  entries.sort((a, b) => a.time.localeCompare(b.time) || a.action.localeCompare(b.action));
  [[31, 32], [88, 89], [121, 122]].forEach(([left, right]) => {
    const tmp = entries[left];
    entries[left] = entries[right];
    entries[right] = tmp;
  });
  return entries.map((entry, index) => ({ id: `J${pad(index + 1)}`, ...entry }));
}

function parseCommentValue(comment, key) {
  const match = new RegExp(`${key}=([^ ;]+)`, "u").exec(comment);
  return match ? match[1] : null;
}

function isInsufficientProof(proof) {
  return !proof.includes("UTC=") || !proof.includes("cible=") || (proof.includes("capture=") && !proof.includes("commande="));
}

function summarize(entries, artefacts) {
  const active = new Set();
  const breaches = [];
  const ordered = entries.slice().sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
  for (const entry of ordered) {
    const time = isoTime(entry.time);
    let breach = false;
    if (time < "08:00:00" || time > "18:30:00") breach = true;
    if (entry.action === "export-integral-donnees") breach = true;
    if (["creation-compte-test", "depot-artefact-retest", "lecture-config-etendue"].includes(entry.action)) {
      const notification = parseCommentValue(entry.comment, "notification");
      if (!notification || notification === "absente") breach = true;
    }
    if (entry.action === "creation-compte-test") {
      const account = parseCommentValue(entry.comment, "compte");
      if (account) active.add(account);
      if (active.size > 2) breach = true;
    }
    if (entry.action === "suppression-compte-test") {
      const account = parseCommentValue(entry.comment, "compte");
      if (account) active.delete(account);
    }
    if (breach) breaches.push(entry);
  }
  const insufficient = ordered.filter((entry) => isInsufficientProof(entry.proof));
  const deleteBeforeClose = artefacts.filter((entry) => entry.doitEtreSupprime === "oui");
  const minDate = ordered[0].time.slice(0, 10);
  const maxDate = ordered[ordered.length - 1].time.slice(0, 10);
  const days = Math.round((Date.parse(`${maxDate}T00:00:00Z`) - Date.parse(`${minDate}T00:00:00Z`)) / 86400000) + 1;
  return {
    roeCount: breaches.length,
    firstRoeTime: isoTime(breaches[0].time),
    missingNotificationId: breaches.find((entry) => entry.comment.includes("notification=absente")).id,
    outsideWindowId: breaches.find((entry) => {
      const time = isoTime(entry.time);
      return time < "08:00:00" || time > "18:30:00";
    }).id,
    insufficientCount: insufficient.length,
    firstInsufficientId: insufficient[0].id,
    deleteBeforeCloseCount: deleteBeforeClose.length,
    forgottenArtifactId: artefacts.find((entry) => entry.statut === "oublie").identifiant,
    revokeLocation: artefacts.find((entry) => entry.artefact === "token-demo-0012").emplacement,
    retainActionId: ordered.find((entry) => entry.comment.includes("exception=RE-08")).id,
    coveredDays: String(days),
  };
}

function buildPtAssetsTp6() {
  const rulesDoc = buildRulesDoc();
  const closureTemplate = buildClosureTemplate();
  const guide = buildGuide();
  const artefacts = buildArtifacts();
  const entries = buildJournalEntries();
  const summary = summarize(entries, artefacts);
  const files = [
    { name: JOURNAL_FILE, data: text(entries.map((entry) => `${entry.id} | ${entry.time} | ${entry.author} | ${entry.action} | ${entry.target} | ${entry.proof} | ${entry.comment}`).join("\n")) },
    { name: RULES_FILE, data: text(rulesDoc) },
    { name: ARTEFACTS_FILE, data: text(["identifiant;artefact;emplacement;doit_etre_supprime;statut;justification", ...artefacts.map((entry) => [entry.identifiant, entry.artefact, entry.emplacement, entry.doitEtreSupprime, entry.statut, entry.justification].join(";"))].join("\n")) },
    { name: CLOSURE_FILE, data: text(closureTemplate) },
    { name: GUIDE_FILE, data: text(guide) },
  ];
  return {
    files,
    facts: {
      ptTp6: {
        assetNames: { journal: JOURNAL_FILE, rules: RULES_FILE, artefacts: ARTEFACTS_FILE, closure: CLOSURE_FILE, guide: GUIDE_FILE },
        rulesTitle: "Règles d’engagement de la mission Harmattan x Sahel-Vert",
        closureTitle: "Modèle de note de clôture de mission",
        closureSection: CLOSURE_SECTION,
        ...summary,
        defensibleLetter: "c",
        retainedLetter: "b",
        closurePriorityLetter: "d",
      },
    },
  };
}

module.exports = { buildPtAssetsTp6, compact };
