import {
  code,
  example,
  figure,
  goals,
  mistakes,
  practice,
  prerequisites,
  questions,
  reference,
  safety,
  scenario,
  takeaway,
  text,
  videoSlot,
  schema,
  type NewLesson,
  type PathModuleEntry,
} from "./path-kit";

const sourcesFormatsLesson: NewLesson = {
  key: "logs-sources-formats",
  title: "D’où viennent les journaux : sources, formats et niveaux de gravité",
  summary: "Comprends ce qu’est un journal, d’où il vient, sous quelles formes il arrive, et pourquoi le niveau de gravité change tout pour l’analyse comme pour le stockage.",
  minutes: 22,
  xp: 30,
  blocks: [
    goals("définir un journal, repérer une source, reconnaître plusieurs formats, décoder un niveau de gravité, puis expliquer pourquoi un journal reste une preuve fragile."),
    prerequisites("aucun, sauf la curiosité et l’envie de lire des traces avec méthode."),
    scenario("Awa rejoint l’équipe de support de Baobab Tech. Un matin, elle reçoit un fichier de journal Linux, un export CSV, deux lignes JSON et une alerte du pare-feu. Tout le monde lui demande ce qu’il faut regarder d’abord. Avant de parler d’attaque ou de panne, elle doit reconnaître ce qu’elle a sous les yeux et ce que chaque format peut réellement raconter."),
    videoSlot("Reconnaître les sources et formats de journaux sans se perdre"),
    text("Un journal, ou log, est un enregistrement horodaté d’un événement. Un événement dit qu’une chose s’est produite : une connexion réussie, un échec, un redémarrage, une requête web, un refus du pare-feu, un changement de mot de passe. Pour l’analyser, tu cherches toujours les mêmes repères : quand, qui, quoi, où, d’où, avec quel résultat. Le journal n’est pas réservé à la sécurité : il sert aussi au diagnostic, à l’exploitation, à l’audit et parfois à la conformité."),
    figure({
      kind: "cards",
      title: "Petite organisation : sources courantes de journaux",
      columns: 2,
      items: [
        { term: "Poste Windows", text: "connexions, processus, erreurs", icon: "pc", tone: "blue" },
        { term: "Serveur Linux", text: "ssh, sudo, services, noyau", icon: "server", tone: "green" },
        { term: "Site web", text: "accès, erreurs, comptes applicatifs", icon: "globe", tone: "cyan" },
        { term: "Pare-feu", text: "ALLOW, DENY, ports, adresses", icon: "firewall", tone: "red" },
        { term: "Routeur ou proxy", text: "navigation, DNS, volumes", icon: "router", tone: "violet" },
        { term: "Service en ligne", text: "audit, connexions, changements sensibles", icon: "cloud", tone: "amber" },
      ],
    }),
    text("Les sources se multiplient vite : systèmes, applications, équipements réseau, services en ligne. Le premier piège est de croire qu’elles parlent toutes la même langue. En pratique, tu rencontres du texte libre, du syslog, du JSON lignes, du CSV, du XML et des formats binaires. Un bon analyste commence donc par reconnaître la forme avant d’inventer une interprétation. Cette discipline t’évite de confondre un champ, un fuseau horaire ou même une simple colonne."),
    figure({
      kind: "table",
      title: "Formats fréquents et difficulté d’analyse",
      columns: ["Format", "Atout principal", "Point de vigilance"],
      rows: [
        ["Texte libre", "facile à lire", "variable selon le logiciel"],
        ["Syslog", "très courant", "gravité et source visibles"],
        ["JSON lignes", "champs explicites", "pratique à filtrer"],
        ["CSV", "simple à exporter", "dépend de l’ordre des colonnes"],
        ["XML", "structuré", "parfois verbeux"],
        ["Binaire", "compact et fidèle", "illisible sans l’outil prévu"],
      ],
    }),
    text("Le syslog traditionnel montre souvent, dans les fichiers texte, une date courte, une machine, un programme et un message. Le syslog RFC 5424 normalise au contraire un en-tête avec « PRI », une version et un horodatage complet RFC 3339. Le JSON lignes stocke un objet par ligne, pratique pour filtrer un champ comme « level » ou « ip ». Le CSV fonctionne bien pour des exports d’événements ou d’inventaire, mais tu dois connaître l’ordre des colonnes. Le XML sert beaucoup dans l’univers Windows. Les formats binaires, comme journald, wtmp ou les fichiers EVTX, imposent un outil spécialisé : « cat » ne suffit pas."),
    text("Démonstration guidée : prends six lignes mélangées, puis classe-les sans encore parler de compromission. Tu peux refaire cet exercice dans Git Bash, PowerShell, WSL, une machine virtuelle ou Termux. Si tu n’as qu’un poste Windows, Git Bash et PowerShell suffisent déjà pour apprendre à reconnaître les formats sans disposer d’un serveur."),
    code(`# Classer six lignes selon leur forme
awk '
/^<[0-9]+>1 / { kind="syslog-rfc5424"; print NR ":" kind " => " $0; next }
/^[A-Z][a-z][a-z] [ 0-9][0-9] / { kind="syslog-rfc3164"; print NR ":" kind " => " $0; next }
/^\\{/ { kind="jsonl"; print NR ":" kind " => " $0; next }
/^[0-9]{4}-[0-9]{2}-[0-9]{2},/ { kind="csv"; print NR ":" kind " => " $0; next }
/^<Event>/ { kind="xml"; print NR ":" kind " => " $0; next }
/^binary:/ { kind="binaire"; print NR ":" kind " => " $0; next }
{ print NR ":inconnu => " $0 }
' formats-mixes.log
# exemple de sortie (valeurs fictives)
# 1:syslog-rfc5424 => <34>1 2026-03-10T08:15:00Z web01 sshd 1201 ID47 - Failed password for invalid user admin from 192.0.2.10 port 51234 ssh2
# 2:syslog-rfc3164 => Mar 10 08:15:04 web01 sshd[1201]: Failed password for awa from 192.0.2.10 port 51235 ssh2
# 3:jsonl => {"ts":"2026-03-10T08:15:08Z","service":"api","level":"error","ip":"192.0.2.44","message":"login failed"}
# 4:csv => 2026-03-10,08:15:12,pc-awa,4625,awa,192.0.2.10
# 5:xml => <Event><System><EventID>4625</EventID><TimeCreated SystemTime="2026-03-10T08:15:12.0000000Z"/></System></Event>
# 6:binaire => binary:wtmp`, "bash"),
    code(`# Lire le même principe côté Windows sur deux formats simples
Get-Content .\\events.jsonl | ForEach-Object { $_ | ConvertFrom-Json } |
  Format-Table ts, service, level, ip -AutoSize
# exemple de sortie (valeurs fictives)
# ts                   service level ip
# --                   ------- ----- --
# 2026-03-10T08:15:08Z api     error 192.0.2.44
# 2026-03-10T08:15:10Z api     info  192.0.2.44

Import-Csv .\\events.csv | Format-Table date, time, host, event, user, ip -AutoSize
# exemple de sortie (valeurs fictives)
# date       time     host   event user ip
# ----       ----     ----   ----- ---- --
# 2026-03-10 08:15:12 pc-awa 4625  awa  192.0.2.10
# 2026-03-10 08:16:04 pc-awa 4624  awa  192.0.2.10`, "powershell"),
    text("Les niveaux de gravité servent à hiérarchiser le bruit. En syslog, la gravité va de 0 à 7 : 0 Emergency, 1 Alert, 2 Critical, 3 Error, 4 Warning, 5 Notice, 6 Informational, 7 Debug. Plus le chiffre est bas, plus la situation est critique. Un « DEBUG » partout peut noyer l’essentiel et coûter du disque. Un niveau trop haut, au contraire, peut faire disparaître les événements utiles. Il faut donc journaliser assez pour enquêter, sans fabriquer un océan de lignes inutiles."),
    example("Exemple corrigé : « <34> » se décode en facilité 4 et gravité 2, car 34 = 4 × 8 + 2. La facilité 4 correspond aux messages de sécurité ou d’autorisation, et la gravité 2 à « Critical ». Le message n’est pas automatiquement une compromission : le code t’indique la famille et l’importance annoncée par la source, pas la vérité finale. Rappelle-toi aussi qu’un journal reste une preuve fragile : incomplet, falsifiable par un attaquant root, trompeur si l’horloge est fausse, et sensible car il contient souvent des adresses, des comptes ou des courriels."),
    mistakes("confondre la forme et le fond, par exemple croire qu’un JSON est forcément plus fiable qu’un texte libre ; oublier que les formats binaires demandent leur outil de lecture ; traiter le niveau « error » comme une preuve d’incident ; publier des extraits réels contenant des données personnelles sans nécessité."),
    safety("analyse seulement les journaux de ton organisation ou d’un système pour lequel tu as un mandat écrit. Les journaux réels contiennent des données à protéger : n’envoie pas des extraits sensibles à un service tiers sans nécessité, et masque les identifiants avant un partage pédagogique ou un rapport large."),
    takeaway("commence toujours par reconnaître la source et le format. Cherche ensuite les champs utiles : temps, source, action, résultat, identifiants. Le niveau de gravité aide à trier, mais il ne remplace jamais l’analyse. Un journal absent n’est pas une preuve d’absence d’événement."),
    practice("Travaille dans « TP 1 : lire, normaliser et dater des journaux de formats différents » : refais la partie où tu reconnais le format, identifies les champs et compares ce que chaque source permet ou non de conclure. Termine par le quiz de la leçon."),
    reference("anssiJournalisation"),
    reference("nistLogMgmt"),
    reference("rfc5424"),
  ],
  quiz: {
    title: "Quiz : sources, formats et gravité",
    questions: [
      questions.choice("Pourquoi dit-on qu’un journal est une preuve fragile ?", ["Parce qu’il n’a jamais d’horodatage", "Parce qu’il peut être incomplet, modifié ou mal interprété", "Parce qu’il est forcément faux après 24 heures", "Parce qu’un fichier texte ne sert jamais à l’enquête"], 1, "Un journal aide beaucoup, mais il peut manquer des lignes, être altéré par un compte très privilégié, ou devenir trompeur si l’horloge est fausse. Le piège est de croire qu’une ligne existe donc qu’elle suffit : une preuve n’est solide que replacée dans son contexte et, si possible, recoupée.", "facile"),
      questions.choice("Que signifie le plus sûrement le préfixe « <34> » dans une ligne syslog RFC 5424 ?", ["Un identifiant de session de l’utilisateur", "Une taille maximale de 34 octets", "Un PRI qui combine facilité et gravité", "Le numéro du port réseau utilisé"], 2, "Le champ « PRI » combine la facilité et la gravité dans un seul nombre. La mauvaise réponse tentante est le port réseau, car le nombre arrive au début de la ligne, mais ici il décrit la nature du message, pas le transport réseau.", "moyen"),
      questions.multi("Quels formats demandent en général un outil de lecture dédié plutôt qu’un simple « cat » ? (plusieurs réponses)", ["journald binaire", "wtmp ou btmp", "EVTX", "CSV"], [0, 1, 2], "Les formats binaires comme journald, wtmp, btmp ou EVTX ne se lisent pas proprement comme du texte. Le CSV, lui, reste un texte structuré : il peut être lu avec un éditeur ou des outils de tri, même si l’ordre des colonnes doit être connu.", "difficile"),
      questions.tf("Un niveau « Debug » trop abondant peut gêner l’analyse au lieu de l’aider.", true, "Vrai : trop de détails noient le signal, ralentissent la recherche et augmentent le coût de stockage. L’erreur tentante est de croire qu’« avoir plus de données » suffit toujours. En réalité, il faut assez de traces pour enquêter, mais pas un volume incontrôlé qui masque l’utile.", "moyen"),
    ],
  },
};

const lireLesson: NewLesson = {
  key: "logs-lire",
  title: "Lire un événement dans un journal",
  summary: "Lis une ligne de journal comme un fait structuré, sépare l’observation de l’interprétation, et repère le contexte minimum avant de parler d’incident.",
  minutes: 24,
  xp: 55,
  upgrade: true,
  blocks: [
    goals("repérer les champs utiles d’un événement, distinguer fait et interprétation, annoter plusieurs lignes de formats différents, puis formuler ce qu’il faut encore vérifier avant de conclure."),
    prerequisites("avoir identifié les formats de base des journaux et compris qu’un même événement peut être décrit différemment selon la source."),
    scenario("Nadia doit expliquer à une collègue pourquoi trois lignes semblent inquiétantes sans promettre trop vite une attaque. L’une vient d’un journal SSH, l’autre d’un serveur web, la troisième d’un pare-feu. Si elle mélange observation, hypothèse et intuition, elle risque de déclencher une alerte inutile ou, pire, de manquer la vraie question."),
    videoSlot("Lire une ligne de journal sans raconter trop vite une histoire"),
    text("Lire un événement, ce n’est pas seulement lire un message. C’est repérer qui agit, quoi se produit, quand cela arrive, où l’événement a été observé, d’où vient l’action et quel est le résultat annoncé. Selon la source, certains champs manquent ou changent de place. C’est normal. Ton travail consiste à relever ce qui est présent, puis à noter explicitement ce qui manque. Un bon analyste préfère une case vide à une supposition cachée."),
    figure({
      kind: "cards",
      title: "Questions simples à poser à chaque ligne",
      columns: 2,
      items: [
        { term: "Quand ?", text: "horodatage, fuseau, ordre relatif", tone: "blue" },
        { term: "Où ?", text: "machine, application, équipement", tone: "green" },
        { term: "Qui ?", text: "compte, service, adresse source", tone: "violet" },
        { term: "Quoi ?", text: "action observée", tone: "cyan" },
        { term: "Résultat ?", text: "succès, échec, refus, erreur, code", tone: "amber" },
        { term: "Preuve ?", text: "champ exact qui permet de le dire", tone: "red" },
      ],
    }),
    text("La différence entre fait et interprétation est centrale. « Failed password » est un fait : le journal annonce un échec. « Quelqu’un attaque » est une interprétation : elle peut être juste, mais elle demande encore du contexte. Un seul échec peut venir d’une faute de frappe, d’un mot de passe oublié, d’un robot opportuniste ou d’un test légitime. De la même manière, une ligne absente ne prouve pas qu’aucune action n’a eu lieu : peut-être que le niveau de journalisation était insuffisant, que la rotation a déjà déplacé le fichier, ou qu’une autre source doit être consultée."),
    code(`# Lire trois événements bruts
sed -n '1p' auth-line.log
sed -n '1p' web-line.log
sed -n '1p' fw-line.log
# exemple de sortie (valeurs fictives)
# Mar 10 08:15:04 web01 sshd[1201]: Failed password for awa from 192.0.2.10 port 51235 ssh2
# 192.0.2.44 - - [10/Mar/2026:08:15:09 +0000] "POST /login HTTP/1.1" 401 728 "https://portail.example/login" "Mozilla/5.0"
# 2026-03-10T08:15:11Z pare-feu01 action=DENY src=192.0.2.10 dst=10.1.4.20 proto=TCP dpt=22 rule=wan-to-ssh`, "bash"),
    text("Démonstration guidée : annote maintenant ces trois lignes sans inventer ce qu’elles ne disent pas. La première dit : à 08:15:04, sur « web01 », le service « sshd » rapporte un échec de mot de passe pour le compte « awa » depuis l’adresse « 192.0.2.10 ». La deuxième dit : l’adresse « 192.0.2.44 » a envoyé une requête « POST » vers « /login », et le serveur a répondu 401, donc refusé l’accès. La troisième dit : le pare-feu « pare-feu01 » a refusé une tentative TCP vers le port 22 de « 10.1.4.20 ». Aucune de ces trois lignes, seule, ne prouve une compromission. Chacune décrit un fait utile."),
    figure({
      kind: "compare",
      title: "Une annotation prudente",
      sides: [
        {
          title: "Ce que disent les lignes",
          tone: "blue",
          mark: "dot",
          items: [
            "Ligne SSH : échec de connexion, compte connu, source externe",
            "Ligne web : tentative de connexion refusée, navigateur déclaré",
            "Ligne pare-feu : accès SSH bloqué, règle réseau appliquée",
          ],
        },
        {
          title: "Ce qu’il manque",
          tone: "amber",
          mark: "dot",
          items: [
            "fréquence et historique",
            "propriétaire de l’adresse",
            "rôle habituel du compte",
            "autres sources",
          ],
        },
      ],
      verdict: "Une ligne décrit un fait ; le contexte décide du sens.",
    }),
    text("Les données personnelles apparaissent vite : adresses IP, noms de comptes, URL parfois sensibles, références internes. C’est pourquoi un extrait de journal n’est pas un texte anodin. Tu peux l’utiliser pour apprendre, enquêter ou documenter, mais pas le diffuser sans précaution. Dans un rapport large, tu désarmes les indicateurs si besoin et tu gardes les détails complets dans le dossier de preuve réservé aux personnes autorisées."),
    example("Exemple corrigé : classe ces six affirmations. « code 401 sur /login » est un fait. « le mot de passe a été volé » est une interprétation. « l’adresse 192.0.2.10 appartient-elle à un prestataire connu ? » est à vérifier. « le pare-feu a refusé le port 22 » est un fait. « aucun pirate n’est passé aujourd’hui » est une interprétation trop large. « le compte awa se connecte-t-il d’habitude à cette heure ? » est à vérifier. Cette discipline t’empêche de présenter une intuition comme une preuve."),
    mistakes("prendre un mot comme « error » ou « denied » pour une conclusion finale ; oublier de noter les champs absents ; confondre l’adresse source avec une personne unique ; recopier des extraits réels sans penser à la confidentialité."),
    safety("travaille sur des journaux autorisés et traite-les comme des données sensibles. Si tu analyses des traces de salariés ou d’usagers, reste dans le cadre prévu par ton organisation : information préalable, proportionnalité, accès limité et finalité claire."),
    takeaway("une ligne de journal décrit d’abord un fait. Tu l’annotes champ par champ, puis tu notes ce qu’il reste à vérifier. Un événement isolé suffit rarement à conclure. Le contexte, la fréquence et le recoupement donnent leur vrai sens aux traces."),
    practice("Reviens dans « TP 1 : lire, normaliser et dater des journaux de formats différents » et refais la partie où tu dois annoter plusieurs lignes, distinguer fait et hypothèse, puis rédiger ce qu’il manque avant de conclure. Termine par le quiz de la leçon."),
    reference("nistLogMgmt"),
    reference("cnilTracer"),
    reference("anssiJournalisation"),
  ],
  quizExtension: {
    improve: [
      "L’horodatage aide à ordonner les événements parce qu’il donne un repère temporel comparable entre plusieurs lignes, à condition de vérifier le fuseau et la synchronisation des horloges. Une couleur d’écran ou un fond d’écran n’apportent aucun élément exploitable pour bâtir une chronologie défendable.",
      "Un seul échec de connexion ne prouve pas une attaque, car il peut venir d’une faute de frappe, d’un compte désactivé, d’un script légitime ou d’un robot opportuniste sans succès. Le contexte, la fréquence et les autres sources servent justement à éviter de transformer un fait ambigu en certitude prématurée.",
    ],
    add: [
      questions.choice("Dans la ligne « 192.0.2.44 - - [10/Mar/2026:08:15:09 +0000] \"POST /login HTTP/1.1\" 401 728 ... », quel fait peux-tu affirmer sans hypothèse supplémentaire ?", ["L’utilisateur a forcément oublié son mot de passe", "Le site a été compromis", "Le serveur a refusé une tentative de connexion sur « /login »", "Le navigateur est malveillant"], 2, "Le code 401 prouve que le serveur a refusé la requête d’authentification. Le piège tentant est d’inventer la cause du refus, par exemple un mot de passe oublié ou une compromission, alors que la ligne ne donne pas ce niveau de certitude à elle seule.", "moyen"),
      questions.multi("Lis l’extrait « Mar 10 08:15:04 web01 sshd[1201]: Failed password for awa from 192.0.2.10 port 51235 ssh2 ». Quelles affirmations restent au niveau du fait ? (plusieurs réponses)", ["Le service « sshd » a enregistré un échec de mot de passe", "L’adresse 192.0.2.10 correspond sûrement à l’attaquant", "Le compte visé s’appelle « awa »", "La machine « web01 » a été compromise"], [0, 2], "Le journal permet d’affirmer l’échec et le compte visé, car ces éléments sont écrits noir sur blanc. En revanche, attribuer l’adresse à une personne unique ou conclure à une compromission dépasse ce que la ligne prouve réellement sans recoupement.", "difficile"),
    ],
  },
};

const tempsLesson: NewLesson = {
  key: "logs-temps",
  title: "Le temps dans les journaux : horodatage, fuseaux horaires et horloges",
  summary: "Apprends à convertir les horodatages, à repérer les décalages de fuseau ou d’horloge, et à remettre plusieurs sources dans une seule chronologie UTC.",
  minutes: 22,
  xp: 30,
  blocks: [
    goals("lire plusieurs formats d’horodatage, convertir une heure en UTC, distinguer heure locale et heure de réception, mesurer une dérive d’horloge, puis expliquer pourquoi une chronologie se construit sur un fuseau commun."),
    prerequisites("savoir repérer les champs principaux d’un événement et accepter de ne pas comparer des heures avant de les avoir normalisées."),
    scenario("Moussa reçoit trois traces d’un même incident apparent : un accès web à 09:15 +01:00, un refus de pare-feu à 08:15Z et un extrait syslog sans fuseau. Au premier regard, tout semble se contredire. S’il compare ces heures brutes, il peut raconter une cause qui vient après sa conséquence. Il doit d’abord remettre tout le monde sur la même montre."),
    videoSlot("Reconstituer une chronologie sans se faire piéger par les fuseaux"),
    text("Le temps est la colonne vertébrale d’une analyse. Sans horodatage fiable, tu peux difficilement dire ce qui s’est passé avant, pendant ou après. Le problème est que toutes les sources n’écrivent pas le temps de la même manière. Certaines donnent un RFC 3339 complet, comme « 2026-03-10T09:15:00+01:00 ». D’autres écrivent une heure locale dans une interface et gardent l’UTC dans le fichier brut. Le syslog traditionnel, lui, n’indique ni l’année ni le fuseau. Si tu oublies ces différences, ta chronologie devient fausse avant même d’avoir commencé."),
    figure({
      kind: "table",
      title: "Formats fréquents de temps",
      columns: ["Format", "Exemple", "Repère utile"],
      rows: [
        ["RFC 3339", "2026-03-10T08:15:00Z", "UTC explicite avec Z"],
        ["ISO 8601", "2026-03-10T09:15:00+01:00", "décalage horaire explicite"],
        ["syslog BSD", "Mar 10 08:15:00", "sans année ni fuseau"],
        ["accès web", "[10/Mar/2026:08:15:00 +0000]", "fuseau dans les crochets"],
        ["epoch Unix", "1700000000", "secondes depuis l’epoch"],
        ["auditd", "audit(1700000000.123:456)", "epoch avec millisecondes"],
        ["journald JSON", "__REALTIME_TIMESTAMP=1773130805123456", "microsecondes UTC"],
      ],
      mono: [1],
    }),
    text("L’UTC, temps universel coordonné, sert de référence commune. Le suffixe « Z » signifie UTC. Un décalage comme « +01:00 » signifie « une heure en avance sur UTC ». Ainsi, « 2026-03-10T09:15:00+01:00 » et « 2026-03-10T08:15:00Z » désignent le même instant. Le but n’est pas de préférer un format à un autre, mais de les traduire dans une échelle unique avant toute comparaison. Cette règle vaut aussi pour l’heure d’un événement et l’heure de réception dans un collecteur : ce sont parfois deux moments différents, tous deux utiles. Avec « journalctl -o json », journald expose aussi « __REALTIME_TIMESTAMP », c’est-à-dire l’heure de réception par le journal en microsecondes depuis l’epoch UTC : c’est précis, mais il faut le convertir proprement."),
    code(`# Conversions rapides dans Git Bash
date -u -d '2026-03-10 09:15:00 +0100' '+%Y-%m-%dT%H:%M:%SZ'
date -u -d '10 Mar 2026 08:15:00 +0000' '+%Y-%m-%dT%H:%M:%SZ'
date -u -d '10 Mar 2026 08:15:00 +0100' '+%Y-%m-%dT%H:%M:%SZ'
date -u -d @1700000000 '+%Y-%m-%dT%H:%M:%SZ'
# exemple de sortie (valeurs fictives)
# 2026-03-10T08:15:00Z
# 2026-03-10T08:15:00Z
# 2026-03-10T07:15:00Z
# 2023-11-14T22:13:20Z`, "bash"),
    code(`# Même idée dans PowerShell 5.1
[DateTimeOffset]::Parse('2026-03-10T09:15:00+01:00').ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
[DateTimeOffset]::ParseExact('10/Mar/2026:08:15:00 +0000', 'dd/MMM/yyyy:HH:mm:ss zzz', [System.Globalization.CultureInfo]::InvariantCulture).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
[DateTimeOffset]::Parse('2026-03-10T08:15:12.0000000Z').ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
[DateTimeOffset]::FromUnixTimeMilliseconds([long](1773130805123456 / 1000)).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
# exemple de sortie (valeurs fictives)
# 2026-03-10T08:15:00Z
# 2026-03-10T08:15:00Z
# 2026-03-10T08:15:12Z
# 2026-03-10T08:20:05.123Z`, "powershell"),
    text("Démonstration guidée : convertis toujours d’abord, interprète ensuite. Si deux lignes disent « 09:15 +01:00 » et « 08:15Z », tu ne les ranges pas l’une après l’autre : tu notes qu’elles parlent du même instant. Si une machine dérive de quatre minutes, tu l’écris comme un problème de qualité de preuve. Une dérive n’invalide pas tout le journal, mais elle interdit les conclusions trop fines tant que tu n’as pas corrigé ou estimé l’écart."),
    figure({
      kind: "steps",
      title: "Chronologie saine",
      numbered: true,
      items: [
        { title: "Noter la source", text: "format et fuseau de chaque source", tone: "blue" },
        { title: "Convertir en UTC", text: "passer tout le monde sur la même montre", tone: "green" },
        { title: "Distinguer les temps", text: "heure de l’événement et heure de réception", tone: "violet" },
        { title: "Signaler l’écart", text: "toute dérive connue de l’horloge", tone: "amber" },
        { title: "Trier seulement après", text: "ordonner les lignes une fois normalisées", tone: "cyan" },
      ],
    }),
    text("Le syslog traditionnel demande une prudence supplémentaire : sans année ni fuseau, « Mar 10 08:15:00 » doit être replacé dans le contexte de la machine qui l’a produit et de la période d’enquête. Tu n’inventes donc pas une conversion RFC 3164 sans écrire l’hypothèse retenue, par exemple « serveur en UTC+01, enquête sur mars 2026 ». Les journaux Windows affichés dans l’Observateur d’événements utilisent souvent l’heure locale, alors que le XML contient « SystemTime » en UTC. Les journaux web incluent souvent un décalage explicite dans les crochets. auditd écrit une époque Unix avec millisecondes, et journald JSON une époque en microsecondes. Dans tous les cas, la bonne méthode reste la même : noter, convertir, comparer."),
    example("Exemple corrigé : un portail écrit « 2026-03-10T09:15:00+01:00 ». Le pare-feu distant écrit « 2026-03-10T08:15:04Z ». Quatre secondes séparent donc les deux événements, pas une heure et quatre secondes. Autre cas : une ligne RFC 3164 « Mar 10 08:15:00 » venant d’un serveur réglé en UTC+01 correspond à « 2026-03-10T07:15:00Z », mais seulement si tu notes explicitement cette hypothèse de fuseau et d’année. Enfin, si une machine A annonce 08:21Z alors qu’une autre annonce 08:17Z pour le même échange, une dérive connue de quatre minutes peut rétablir une chronologie plausible, à condition de documenter cette correction."),
    mistakes("mélanger heure locale et UTC dans le même tableau ; oublier que le syslog traditionnel ne donne pas l’année ni le fuseau ; comparer un temps d’événement à un temps de réception sans le dire ; corriger une dérive d’horloge sans la documenter."),
    safety("ne manipule pas les horodatages pour « faire tenir » une hypothèse. Toute conversion ou correction d’écart doit être reproductible. Si tu partages une chronologie, garde les traces originales et note clairement quel outil ou quelle commande a servi à normaliser les heures."),
    takeaway("avant de comparer deux heures, convertis-les dans un même fuseau, idéalement l’UTC. Note la différence entre l’heure de l’événement et l’heure de réception. Une petite dérive d’horloge peut suffire à casser toute une chronologie si tu ne la détectes pas."),
    practice("Dans « TP 1 : lire, normaliser et dater des journaux de formats différents », refais toute la partie conversion vers l’UTC, puis vérifie quels événements sont réellement simultanés et lesquels ne le sont qu’en apparence. Termine par le quiz."),
    reference("rfc3339"),
    reference("chrony"),
    reference("wikiUtc"),
  ],
  quiz: {
    title: "Quiz : horodatage, fuseaux et chronologie",
    questions: [
      questions.choice("Les deux horodatages « 2026-03-10T09:15:00+01:00 » et « 2026-03-10T08:15:00Z » signifient-ils le même instant ?", ["Non, le premier est une heure plus tard", "Oui, ils décrivent le même instant avec deux écritures", "Impossible à savoir sans l’adresse IP", "Seulement si la machine est sous Linux"], 1, "Oui : « +01:00 » indique une heure d’avance sur l’UTC. En retranchant ce décalage, on retrouve 08:15Z. Le piège courant consiste à comparer les chiffres bruts sans lire le fuseau qui les accompagne.", "facile"),
      questions.choice("Quel est le risque principal si tu compares des journaux sans harmoniser les fuseaux ?", ["Tu perds automatiquement toutes les lignes de niveau debug", "Tu peux placer une conséquence avant sa cause", "Le fichier devient illisible par PowerShell", "Les adresses IP changent de valeur"], 1, "Comparer des heures non normalisées peut inverser l’ordre des événements et fabriquer une fausse histoire. Le faux ami tentant est de croire que le problème n’est qu’un détail d’affichage, alors qu’il modifie directement l’interprétation de la chronologie.", "moyen"),
      questions.multi("Quelles sources de temps demandent une prudence particulière avant tri ? (plusieurs réponses)", ["Une ligne syslog traditionnelle « Mar 10 08:15:00 »", "Un champ auditd « audit(1700000000.123:456) »", "Une date RFC 3339 avec « Z »", "Une heure affichée localement dans une interface alors que le fichier brut est en UTC"], [0, 1, 3], "Le syslog BSD manque d’année et de fuseau, auditd demande une conversion depuis l’epoch, et une interface locale peut masquer un stockage UTC. Une date RFC 3339 avec « Z » est justement le cas le plus clair, car elle indique déjà un instant UTC complet.", "difficile"),
      questions.tf("Avant d’assembler plusieurs sources, la règle d’or est de noter le fuseau et de convertir en UTC.", true, "Vrai : cette étape rend la chronologie défendable et reproductible. L’erreur fréquente est de vouloir d’abord raconter l’incident, puis de revenir plus tard sur les fuseaux. Il faut faire l’inverse : normaliser le temps avant l’interprétation.", "moyen"),
    ],
  },
};

const correlerLesson: NewLesson = {
  key: "logs-correler",
  title: "Relier les événements sans conclure trop vite",
  summary: "Corrèle plusieurs événements par une clé commune, cherche ce qui confirme ou contredit ton hypothèse, et évite d’identifier trop vite une personne derrière une trace.",
  minutes: 24,
  xp: 55,
  upgrade: true,
  blocks: [
    goals("choisir une clé de corrélation, rapprocher plusieurs sources, comparer plusieurs hypothèses, repérer une contradiction utile, puis expliquer pourquoi deux sources valent mieux qu’une seule."),
    prerequisites("savoir lire un événement isolé, normaliser le temps, et accepter qu’une même adresse ou un même compte peuvent raconter plusieurs histoires concurrentes."),
    scenario("Fatou reçoit une alerte courte : trois échecs SSH, une réussite, puis l’ouverture d’une session dans un portail interne. Sa cheffe lui demande si le compte a été compromis. Fatou pourrait répondre trop vite. Elle choisit plutôt de relier les traces, de lister plusieurs explications possibles, puis de chercher ce qui confirme ou non chacune d’elles."),
    videoSlot("Corréler plusieurs journaux sans confondre coïncidence et preuve"),
    text("Corréler, c’est relier des événements à l’aide d’une clé commune : adresse IP, nom d’utilisateur, identifiant de session, machine, empreinte ou plage de temps. Cette opération est puissante, mais elle attire les raccourcis. Une adresse IP peut être partagée par un VPN, un NAT ou un opérateur mobile. Un nom d’utilisateur peut exister sur plusieurs systèmes différents. Une plage horaire peut contenir à la fois une action légitime et une action malveillante. La corrélation ne remplace donc jamais le jugement : elle organise l’enquête."),
    figure({
      kind: "cards",
      title: "Clés de corrélation fréquentes",
      items: [
        { term: "Adresse IP", text: "utile, mais parfois partagée ou changeante", icon: "network", tone: "amber" },
        { term: "Compte", text: "utile, mais peut être usurpé ou réutilisé", icon: "user", tone: "amber" },
        { term: "Session", text: "très fort si l’application le journalise", icon: "key", tone: "green" },
        { term: "Machine", text: "fort pour suivre un poste ou un serveur", icon: "pc", tone: "blue" },
        { term: "Temps", text: "utile pour relier des séquences proches", icon: "clock", tone: "violet" },
      ],
      columns: 2,
    }),
    text("La bonne méthode commence par une hypothèse modeste. Par exemple : « les échecs SSH et la session portail semblent liés par l’adresse 192.0.2.10 ». Ensuite, tu cherches ce qui la renforce et ce qui pourrait la contredire. Y a-t-il la même heure ? le même compte ? une ouverture de session applicative juste après la réussite ? une activité habituelle connue depuis cette adresse ? Chercher ce qui contredit ton idée te protège contre le biais qui consiste à ne voir que ce qui t’arrange."),
    code(`# Pivoter sur une même adresse dans deux sources
grep '192\\.0\\.2\\.10' corr-auth.log
grep '"ip":"192.0.2.10"' corr-portail.jsonl
# exemple de sortie (valeurs fictives)
# Mar 10 08:16:02 web01 sshd[2201]: Failed password for awa from 192.0.2.10 port 51235 ssh2
# Mar 10 08:16:11 web01 sshd[2201]: Failed password for awa from 192.0.2.10 port 51236 ssh2
# Mar 10 08:16:44 web01 sshd[2201]: Accepted password for awa from 192.0.2.10 port 51240 ssh2
# {"ts":"2026-03-10T08:15:50Z","app":"portail","ip":"192.0.2.10","user":"awa","result":"login_failed"}
# {"ts":"2026-03-10T08:16:48Z","app":"portail","ip":"192.0.2.10","user":"awa","result":"session_opened","session":"sess-7842"}
# {"ts":"2026-03-10T08:17:12Z","app":"portail","ip":"192.0.2.10","user":"awa","result":"mfa_changed","session":"sess-7842"}`, "bash"),
    text("Démonstration guidée : ici, la même adresse vise le même compte « awa » dans deux sources proches dans le temps. Cela renforce l’hypothèse d’un lien. Pourtant, tu n’écris pas encore « compromission certaine ». Tu notes plutôt trois lectures possibles : faute de frappe suivie d’une connexion légitime ; tentative malveillante suivie d’une réussite ; automatisme interne utilisant la même sortie Internet. Pour départager, tu regardes l’habitude du compte, le poste utilisé, l’éventuel changement de facteur MFA, ou encore la présence d’une autre source comme un proxy."),
    figure({
      kind: "steps",
      title: "Méthode prudente",
      items: [
        { title: "Observation", text: "même adresse, même compte et proximité temporelle", tone: "blue" },
        { title: "Hypothèses", text: "erreur humaine, automatisme, attaque réussie", tone: "violet" },
        { title: "Vérification", text: "source habituelle ? appareil connu ? autre journal ?", tone: "amber" },
        { title: "Conclusion", text: "seulement après recoupement suffisant", tone: "green" },
      ],
    }),
    text("La règle d’or reste la même : deux sources indépendantes valent mieux qu’une seule. Si le journal SSH dit « succès » et que le portail ouvre une session dans la même minute, l’histoire gagne en solidité. Si, au contraire, un proxy montre que l’adresse appartient à un prestataire interne connu qui renouvelle un jeton à cette heure chaque mardi, l’hypothèse d’attaque recule. Corréler, ce n’est donc pas faire grossir une intuition : c’est mesurer ce qui résiste à la contradiction."),
    example("Exemple corrigé : même séquence, trois lectures possibles. 1. Faute de frappe : quelques échecs, puis succès, puis activité normale. 2. Attaque : échecs serrés, réussite inhabituelle, puis changement MFA et accès depuis un appareil jamais vu. 3. Service automatique : même adresse partagée, compte technique connu, horaires réguliers. La vérification qui tranche n’est pas « j’ai un doute », mais un fait nouveau : appareil reconnu ou non, contexte métier, troisième source indépendante."),
    mistakes("prendre une adresse IP pour une personne ; oublier qu’un DHCP ou un VPN peut brouiller l’attribution ; chercher seulement les éléments qui confirment ton idée ; conclure à partir d’une seule source parce que la séquence paraît convaincante."),
    safety("la corrélation peut révéler des habitudes de connexion de personnes réelles. Fais-la seulement dans le cadre autorisé par ton organisation, avec proportionnalité et accès limité. Si tu enrichis une adresse IP par un service en ligne, n’y envoie pas d’autres données internes sensibles."),
    takeaway("corréler, c’est relier sans fusionner aveuglément. Choisis une clé, cherche ce qui confirme et ce qui contredit, puis attends au moins une seconde source solide avant d’annoncer une conclusion. Une même adresse n’est pas une identité certaine."),
    practice("Passe à « TP 4 : corréler trois sources et dresser la chronologie » : pivote sur une adresse, puis sur un compte ou une session, et rédige trois hypothèses concurrentes avant de retenir la plus solide. Termine par le quiz."),
    reference("nistForensics"),
    reference("nistLogMgmt"),
    reference("mitreDataSources"),
  ],
  quizExtension: {
    improve: [
      "Consulter plusieurs sources sert à confirmer ou nuancer une hypothèse, parce qu’une seule trace peut être ambiguë, incomplète ou trompeuse. Le piège fréquent est de croire qu’une belle séquence dans un seul fichier suffit. En réalité, le recoupement fait justement la différence entre intuition convaincante et conclusion défendable.",
      "Une même adresse IP ne signifie pas forcément une même personne, car un NAT, un VPN, un opérateur mobile ou un bail DHCP peuvent faire partager ou changer l’adresse observée. C’est une clé utile pour pivoter, mais jamais une identité certaine à elle seule.",
    ],
    add: [
      questions.choice("Après plusieurs échecs SSH depuis « 192.0.2.10 », quel élément renforce le plus l’hypothèse d’un lien avec une session portail ?", ["La présence du mot « error » dans un fichier non lié", "Le fait que l’adresse apparaisse aussi dans une alerte ancienne", "Une ouverture de session portail pour le même compte, à la même minute, depuis la même adresse", "Le nom sympathique du navigateur déclaré"], 2, "Une même adresse, le même compte et une proximité temporelle forte dans une autre source indépendante renforcent réellement l’hypothèse. Le faux ami le plus tentant est l’alerte ancienne : elle peut être sans rapport et ne prouve pas le lien avec la séquence du jour.", "moyen"),
      questions.multi("Lis cette séquence : « 08:16 échec SSH ; 08:16 réussite SSH ; 08:16 session portail ouverte ; 08:17 changement MFA ». Quelles actions d’analyse sont prudentes ? (plusieurs réponses)", ["Chercher si l’adresse est habituelle pour ce compte", "Conclure immédiatement à une compromission certaine sans autre vérification", "Rechercher une troisième source qui confirme l’enchaînement", "Noter aussi l’hypothèse d’une action légitime ou d’un automatisme"], [0, 2, 3], "Les bonnes pratiques sont de vérifier l’habitude, de chercher une autre source et de garder des hypothèses concurrentes ouvertes. Le piège est la certitude immédiate : la séquence est inquiétante, mais la corrélation sérieuse consiste justement à tester ce qui pourrait encore l’expliquer autrement.", "difficile"),
    ],
  },
};

const linuxSyslogLesson: NewLesson = {
  key: "logs-linux-syslog",
  title: "Les journaux Linux : syslog, journald et /var/log",
  summary: "Repère où Linux écrit ses traces, quand utiliser les fichiers ou journald, et comment retrouver une activité de service dans une plage de temps ou une archive tournée.",
  minutes: 24,
  xp: 30,
  blocks: [
    goals("distinguer syslog et journald, choisir le bon emplacement de journal, filtrer un service sur une plage de temps, lire une archive tournée, puis expliquer pourquoi une copie distante protège mieux la preuve."),
    prerequisites("savoir reconnaître un format syslog et comprendre que le temps doit être normalisé avant toute comparaison sérieuse."),
    scenario("Yacine doit répondre à trois questions simples sur un serveur Debian : qui s’est connecté, quel service a échoué et qu’est-ce qui s’est passé avant le redémarrage du matin. Le collègue précédent lui dit seulement « regarde dans /var/log ». Pour aller vite sans se tromper, Yacine doit savoir où chercher et quand passer de fichiers texte à « journalctl »."),
    videoSlot("Trouver le bon journal Linux avant de filtrer"),
    text("Sous Linux, les journaux viennent surtout de deux mondes qui cohabitent souvent : les fichiers texte gérés par syslog ou rsyslog, et le journal binaire géré par journald. Un fichier syslog traditionnel ressemble à « Mar 10 08:15:00 web01 sshd[1201]: ... ». En RFC 5424, tu vois au contraire un « <PRI> », une version, puis un horodatage complet RFC 3339. journald stocke ces événements sous forme structurée et peut les ressortir au format court, détaillé ou JSON. Sur Debian ou Ubuntu avec rsyslog, tu rencontres souvent « /var/log/syslog », « /var/log/auth.log », « /var/log/kern.log », « /var/log/dpkg.log » et les dossiers de services comme « /var/log/nginx/ ». Sur RHEL ou Fedora, tu vois plutôt « /var/log/messages », « /var/log/secure », « /var/log/audit/audit.log » et « /var/log/httpd/ ». Sur certaines installations récentes de Debian, rsyslog n’est pas installé par défaut : il faut alors lire journald avec « journalctl »."),
    figure({
      kind: "table",
      title: "Où chercher selon la question",
      columns: ["Question", "Première source à lire"],
      rows: [
        ["authentification", "`/var/log/auth.log` ou `/var/log/secure`"],
        ["activité générale", "`/var/log/syslog` ou `/var/log/messages`"],
        ["noyau", "`/var/log/kern.log` ou `journalctl -k`"],
        ["paquets et mises à jour", "`/var/log/dpkg.log`, `/var/log/apt/`"],
        ["service web", "`/var/log/nginx/` ou `/var/log/apache2/`"],
        ["journal binaire", "`journalctl`, pas `cat`"],
      ],
      mono: [1],
    }),
    text("Le champ « PRI » du syslog combine facilité et gravité, mais le plus utile au quotidien est souvent l’emplacement. Si tu cherches une connexion SSH, commence par le journal d’authentification. Si tu veux suivre un service systemd, « journalctl -u service » est souvent plus pratique qu’un « grep » large dans « /var/log/syslog ». journald sait filtrer par unité, par gravité, par démarrage, par plage de temps et même sortir du JSON. Les fichiers texte restent très pratiques pour des pipelines simples et pour les archives tournées."),
    figure({
      kind: "cards",
      title: "Repères journald utiles",
      columns: 2,
      items: [
        { term: "`-u ssh.service`", text: "ou `sshd.service` : une unité précise", tone: "blue" },
        { term: "`-b`", text: "démarrage courant", tone: "green" },
        { term: "`--since` / `--until`", text: "plage de temps", tone: "violet" },
        { term: "`-p err`", text: "erreurs et niveaux plus urgents", tone: "red" },
        { term: "`-o json`", text: "champs structurés exportables", tone: "cyan" },
        { term: "`--no-pager`, `-f`", text: "sans pager, puis suivre en direct", tone: "amber" },
      ],
    }),
    text("Démonstration guidée : commence par le fichier texte, puis pense à l’archive tournée. Beaucoup d’analyses ratent une information simplement parce qu’elle a déjà quitté « auth.log » pour « auth.log.1 » ou « auth.log.2.gz ». La rotation protège le disque, mais elle oblige l’analyste à regarder aussi les anciennes copies. Sur un vrai serveur, « journalctl -u ssh.service --since \"2026-03-10 08:00\" --no-pager » ou « journalctl -o json » font gagner du temps, car tu récupères à la fois l’heure, l’unité systemd et l’identifiant du programme. Ici, sur un simple extrait, tu peux déjà travailler la méthode."),
    code(`# Chercher l’activité SSH d’une plage courte dans un fichier syslog
grep 'sshd' syslog-demo.log | awk '$3 >= "08:16:00" && $3 <= "08:17:00"'
# exemple de sortie (valeurs fictives)
# Mar 10 08:16:04 web01 sshd[1201]: Failed password for awa from 192.0.2.10 port 51235 ssh2
# Mar 10 08:16:41 web01 sshd[1201]: Accepted password for awa from 192.0.2.10 port 51240 ssh2

# Ne pas oublier les archives tournées
gzip -dc syslog-demo.log.1.gz | grep 'CRON'
# exemple de sortie (valeurs fictives)
# Mar 10 08:18:11 web01 CRON[1300]: pam_unix(cron:session): session opened for user root(uid=0) by root(uid=0)`, "bash"),
    text("Les fichiers « wtmp », « btmp » et « lastlog » méritent un rappel spécial : ils sont binaires. On les lit avec « last », « lastb » et « lastlog », pas avec « cat ». « last » s’appuie sur « wtmp » pour les connexions réussies, « lastb » sur « btmp » pour les échecs, et « lastlog » résume la dernière connexion par compte. De la même manière, les droits d’accès comptent : tout le monde ne doit pas lire les journaux d’authentification, car ils révèlent des comptes, des adresses et des habitudes. Enfin, un attaquant root peut falsifier ou effacer des traces locales. C’est l’une des raisons majeures pour lesquelles une copie distante et quasi immédiate est plus robuste qu’un stockage uniquement local."),
    example("Exemple corrigé : si l’on te demande « qui s’est connecté ? », tu commences par « auth.log » ou « secure », puis éventuellement « last » pour les connexions réussies. Pour « quel service a planté ? », tu regardes « syslog », « messages » ou « journalctl -u service ». Pour « quel paquet a été installé ? », tu vas vers « dpkg.log », « /var/log/apt/ » ou l’outil équivalent de la distribution. La bonne réponse dépend moins du mot “incident” que de la source qui raconte le mieux le fait recherché."),
    mistakes("chercher partout en même temps au lieu de choisir d’abord la source la plus probable ; oublier les fichiers tournés et compressés ; essayer de lire « wtmp » ou « btmp » comme du texte ; croire qu’un journal local intact suffit toujours comme preuve."),
    safety("ne change pas la configuration de journalisation d’un serveur de production sans autorisation. Les journaux contiennent des données personnelles et parfois des secrets applicatifs. Limite les droits de lecture, évite les copies inutiles et privilégie une collecte distante sécurisée quand ton organisation la permet."),
    takeaway("sur Linux, la question « où chercher ? » précède souvent la question « que chercher ? ». Syslog, journald et « /var/log » se complètent. Pense à la rotation, aux formats binaires et à la nécessité d’une copie distante pour mieux protéger la preuve."),
    practice("Travaille d’abord « TP 1 : lire, normaliser et dater des journaux de formats différents » pour les formats, puis « Force brute SSH : de l’échec à la prise de contrôle » pour voir comment le choix du bon journal change l’enquête. Termine par le quiz."),
    reference("debJournalctl"),
    reference("man7Logrotate"),
    reference("anssiLinux"),
  ],
  quiz: {
    title: "Quiz : syslog, journald et /var/log",
    questions: [
      questions.choice("Sur une Debian récente sans rsyslog installé par défaut, quel outil devient central pour lire les journaux système ?", ["lastlog", "journalctl", "chmod", "scp"], 1, "Sans rsyslog, beaucoup de traces ne sont plus dupliquées dans des fichiers texte classiques. « journalctl » devient alors l’outil principal pour explorer journald. Le piège est de continuer à chercher partout dans « /var/log » comme si tous les messages y étaient forcément présents.", "facile"),
      questions.choice("Si tu cherches l’activité SSH entre 08:16 et 08:17, quelle première source est la plus logique ?", ["Le journal web du service nginx", "Le journal d’authentification comme « auth.log » ou « secure »", "Le cache DNS local", "Le fichier « /etc/passwd »"], 1, "Les événements SSH d’authentification apparaissent d’abord dans les journaux dédiés à l’authentification. Le faux ami est le journal web : il peut raconter autre chose sur la même machine, mais ce n’est pas la source la plus directe pour une connexion SSH.", "moyen"),
      questions.multi("Quelles affirmations sont correctes ? (plusieurs réponses)", ["« wtmp » et « btmp » sont binaires", "Les archives tournées comme « auth.log.1.gz » peuvent contenir des preuves utiles", "Un attaquant root ne peut jamais altérer un journal local", "Une copie distante renforce la préservation des traces"], [0, 1, 3], "Les fichiers de connexions sont binaires, les archives tournées comptent dans l’enquête, et une collecte distante protège mieux contre l’effacement local. L’idée qu’un compte root ne puisse pas altérer les traces est précisément ce qu’il faut éviter : un journal local seul reste fragile face à un attaquant très privilégié.", "difficile"),
      questions.tf("Lire « wtmp » avec « cat » est une bonne pratique pour compter les connexions.", false, "Faux : « wtmp » est un format binaire. Tu dois passer par « last » ou un outil équivalent, sinon tu obtiens un contenu illisible et surtout tu risques de mal interpréter ce qui est affiché. Le format d’origine impose toujours l’outil de lecture adapté.", "moyen"),
    ],
  },
};

const authSudoLesson: NewLesson = {
  key: "logs-auth-sudo",
  title: "Authentification, sudo et sessions : lire auth.log, secure et last",
  summary: "Interprète les lignes SSH, PAM, sudo et useradd, compte les échecs avec méthode, puis distingue un bruit opportuniste d’une séquence plus inquiétante.",
  minutes: 24,
  xp: 30,
  blocks: [
    goals("reconnaître les lignes d’authentification usuelles, compter les échecs par source et par compte, distinguer succès et refus, repérer une élévation de droits, puis formuler une conclusion prudente."),
    prerequisites("savoir où se trouvent les journaux Linux et comprendre qu’un seul événement n’autorise pas une conclusion définitive."),
    scenario("Amina ouvre « auth.log » d’un serveur exposé à Internet et voit une rafale de tentatives. Le responsable lui demande si c’est juste le bruit habituel ou le début d’un incident. Pour répondre utilement, elle doit lire les messages de « sshd », de PAM et de « sudo », puis résumer ce qui mérite vraiment une suite."),
    videoSlot("Lire auth.log et repérer le moment qui change tout"),
    text("Les journaux d’authentification Linux racontent l’accès au système. Dans « auth.log » ou « secure », tu rencontres des lignes « Failed password for invalid user admin » quand le compte n’existe pas, et « Failed password for awa » quand le compte existe. Cette nuance importe : dans le second cas, la source a déjà deviné ou découvert un compte valide. Tu vois aussi « Accepted password », « Accepted publickey », « Invalid user », « Connection closed ... [preauth] », ainsi que les messages PAM qui détaillent un refus ou l’ouverture d’une session."),
    figure({
      kind: "table",
      title: "Indices fréquents dans auth.log",
      columns: ["Ligne ou motif", "Lecture prudente"],
      rows: [
        ["Failed password for invalid user admin", "compte inexistant"],
        ["Failed password for awa", "compte existant"],
        ["Accepted password for awa", "réussite par mot de passe"],
        ["Accepted publickey for awa", "réussite par clé"],
        ["pam_unix(... authentication failure ...)", "échec vu par PAM"],
        ["sudo: awa ... USER=root ... COMMAND=...", "élévation ou action privilégiée"],
      ],
      mono: [0],
    }),
    text("La force d’« auth.log » tient à la séquence. Beaucoup d’échecs rapprochés depuis une même source, sur plusieurs comptes, font penser à une force brute ou à un arrosage de mots de passe. Une réussite juste après plusieurs échecs sur un compte réel est plus inquiétante qu’un simple bruit opportuniste. En revanche, le journal ne montre pas le mot de passe essayé, ni ce que l’attaquant pense faire ensuite. Il te faut donc une conclusion prudente : ce que la ligne prouve, et ce qu’elle ne prouve pas."),
    code(`# Compter les échecs par adresse source
grep 'Failed password' auth-demo.log | awk '{for (i=1;i<=NF;i++) if ($i=="from") print $(i+1)}' | sort | uniq -c | sort -rn
# exemple de sortie (valeurs fictives)
#       7 192.0.2.10
#       3 192.0.2.55
#       1 192.0.2.15

# Compter les échecs par compte visé
grep 'Failed password' auth-demo.log | awk '{for (i=1;i<=NF;i++) if ($i=="for") { if ($(i+1)=="invalid") print $(i+3); else print $(i+1) }}' | sort | uniq -c | sort -rn
# exemple de sortie (valeurs fictives)
#       4 admin
#       3 awa
#       1 test
#       1 support
#       1 moussa
#       1 backup`, "bash"),
    text("Démonstration guidée : dans cet extrait, « 192.0.2.10 » vise plusieurs fois « awa », puis réussit, et le même journal montre aussitôt une commande « sudo » et l’ouverture de session root par PAM. Tu peux donc écrire : « une réussite depuis 192.0.2.10 sur le compte awa est suivie d’une action privilégiée ». Tu n’écris pas encore : « l’attaquant a tout compromis ». Peut-être s’agit-il d’un administrateur légitime qui s’est trompé deux fois, ou d’un test interne. La différence se fera avec le contexte habituel du compte, de la source et de l’horaire."),
    figure({
      kind: "flow",
      title: "Lire le contexte après la réussite",
      nodes: [
        { label: "Succès SSH", text: "`Accepted password` ou `publickey`", icon: "key", tone: "green" },
        { label: "Puis sudo", text: "commande sensible ou session root", icon: "shield", tone: "amber" },
        { label: "Puis useradd", text: "création de compte", icon: "user-plus", tone: "red" },
        { label: "Puis `last` / `lastb`", text: "historique synthétique des succès ou échecs", icon: "clock", tone: "blue" },
      ],
    }),
    text("Les commandes « last -F », « lastb » et « lastlog » complètent cette lecture. « last -F » montre les connexions réussies avec les dates et heures complètes d’ouverture et de fermeture quand elles sont connues. « lastb » lit « btmp » pour les échecs enregistrés, souvent avec des droits root selon la distribution. « lastlog » résume la dernière connexion connue par compte et aide à repérer un « Never logged in ». Eux aussi ont des limites : un historique synthétique n’explique pas tout. Enfin, attention aux réactions trop rapides. Bannir une adresse partagée ou couper un compte sans vérifier peut gêner une personne légitime. Le journal te pousse à enquêter, pas à punir avant d’avoir compris."),
    example("Exemple corrigé : si une même adresse produit 7 échecs, puis « Accepted password for awa », puis « sudo: awa ... USER=root ... COMMAND=/usr/bin/apt update », la conclusion prudente est : « réussite suspecte suivie d’une action privilégiée, à confirmer avec le contexte du compte et des accès habituels ». Si, en revanche, tu ne vois que trois échecs sur « admin » sans succès, tu parleras plutôt de bruit opportuniste courant sur un serveur exposé."),
    mistakes("oublier la différence entre compte inexistant et compte réel ; compter les échecs sans regarder s’il existe aussi un succès ; prendre « sudo » pour une preuve d’attaque alors qu’il peut s’agir d’une maintenance légitime ; bannir une adresse sans réfléchir au partage d’IP."),
    safety("sur un système réel, ne diffuse pas les journaux d’authentification plus largement que nécessaire. Ils révèlent des comptes, des habitudes de connexion et parfois des actions d’administration. Toute mesure de blocage doit suivre la procédure de ton organisation et un mandat clair."),
    takeaway("dans les journaux d’authentification, la séquence compte plus qu’une ligne isolée. Compte les échecs, regarde les comptes visés, cherche le premier succès, puis lis ce qui se passe après. Garde une conclusion prudente tant que tu n’as pas recoupé le contexte."),
    practice("Travaille dans « Force brute SSH : de l’échec à la prise de contrôle » : compte les échecs, repère la réussite et relie les lignes « sudo » ou « useradd » qui suivent. Termine par le quiz."),
    reference("openbsdSshd"),
    reference("man7Last"),
    reference("anssiLinux"),
  ],
  quiz: {
    title: "Quiz : auth.log, sudo et sessions",
    questions: [
      questions.choice("Que signifie la ligne « Failed password for invalid user admin ... » ?", ["Le compte « admin » existe mais son mot de passe est faux", "Le compte visé n’existe pas sur la machine", "Le serveur a accepté la clé publique", "La session root est ouverte"], 1, "L’expression « invalid user » indique que le compte n’existe pas localement au moment de la tentative. Le piège courant est de traiter cette ligne comme un simple mauvais mot de passe sur un compte valide, alors qu’elle raconte plutôt une devinette ou un balayage de noms de comptes.", "facile"),
      questions.choice("Quel signe rend une séquence plus inquiétante qu’un simple bruit opportuniste ?", ["Des échecs dispersés sur plusieurs jours, sans succès", "Un succès juste après des échecs, puis une action « sudo »", "La présence d’un seul code 404 dans un journal web", "Un redémarrage normal du service SSH"], 1, "Une réussite suivie d’une action privilégiée change la nature de la séquence : on ne parle plus seulement de tentatives, mais d’un accès qui a abouti. Le faux ami est l’échec répété sans succès, courant sur Internet et souvent moins prioritaire tant qu’il reste sans suite.", "moyen"),
      questions.multi("Lis l’extrait « Accepted password for awa ... » puis « sudo: awa : ... USER=root ; COMMAND=/usr/bin/apt update ». Quelles conclusions sont prudentes ? (plusieurs réponses)", ["Le compte « awa » a ouvert une session réussie", "Une action privilégiée a suivi cette connexion", "Le mot de passe utilisé était forcément faible", "Il faut vérifier si cette séquence est habituelle pour ce compte"], [0, 1, 3], "La réussite SSH et l’usage de « sudo » sont prouvés par les lignes. En revanche, le journal ne révèle pas la qualité du mot de passe utilisé. Il faut donc vérifier si cette séquence correspond à une maintenance normale ou à un comportement anormal avant toute accusation.", "difficile"),
      questions.tf("« lastb » lit les échecs de connexion depuis un fichier binaire dédié plutôt que depuis « auth.log » texte.", true, "Vrai : « lastb » s’appuie sur « btmp », un format binaire. Le piège est de croire que toute l’histoire des échecs vit uniquement dans « auth.log ». En pratique, ces sources se complètent et tu dois savoir laquelle résume quoi.", "moyen"),
    ],
  },
};

const auditExecutionLesson: NewLesson = {
  key: "logs-audit-execution",
  title: "Traces d’exécution : auditd, historique des commandes et processus",
  summary: "Croise auditd, l’historique des commandes et les processus pour répondre à la vraie question : qui a lancé quoi, quand, et avec quelle force de preuve.",
  minutes: 24,
  xp: 30,
  blocks: [
    goals("lire un enregistrement auditd, convertir son epoch, distinguer « auid » et « uid », juger la valeur probante d’un historique shell, puis relier une exécution à une session plus large."),
    prerequisites("avoir compris les journaux d’authentification Linux et savoir qu’une réussite SSH ne dit pas tout de ce qu’une personne ou un intrus a ensuite exécuté."),
    scenario("Koffi sait déjà qu’un compte s’est connecté en SSH. Ce qu’il doit maintenant établir, c’est l’action précise qui a suivi : simple maintenance, curiosité maladroite ou lecture d’un fichier sensible. Pour le démontrer proprement, il ne peut pas s’appuyer uniquement sur « auth.log ». Il doit croiser l’audit, l’historique du shell et les processus observés."),
    videoSlot("Relier une session SSH à une commande exécutée"),
    text("Les journaux d’authentification disent qu’une session existe. Ils ne suffisent pas à dire tout ce qui a été lancé ensuite. C’est le rôle de sources comme auditd, de l’historique du shell et des processus actifs. auditd est la source la plus solide des trois quand il est correctement configuré : il enregistre des appels système et associe une action à un identifiant de connexion d’origine, « auid ». Cet identifiant survit à « sudo », ce qui aide à relier une action root à la personne initialement connectée."),
    figure({
      kind: "cards",
      title: "Auditd : champs à connaître",
      columns: 2,
      items: [
        { term: "`type=SYSCALL`", text: "appel système et identité du contexte", tone: "blue" },
        { term: "`type=EXECVE`", text: "arguments, comme `a0=` et `a1=`", tone: "violet" },
        { term: "`type=PATH`", text: "chemin touché, par exemple `name=\"/etc/shadow\"`", tone: "cyan" },
        { term: "`msg=audit(epoch:seq)`", text: "temps et numéro de séquence de l’événement", tone: "green" },
        { term: "`auid`", text: "identité d’origine de la session", tone: "amber" },
        { term: "`uid`", text: "identité effective au moment de l’action", tone: "amber" },
        { term: "`comm` / `exe`", text: "nom court et chemin du binaire", tone: "neutral" },
        { term: "`key`", text: "règle d’audit qui a produit l’événement", tone: "red" },
      ],
    }),
    text("L’historique « ~/.bash_history » a une valeur plus faible. Il s’écrit souvent à la fermeture du shell, il peut être modifié, désactivé ou incomplet. Avec « HISTTIMEFORMAT », tu récupères parfois une ligne « #epoch » avant chaque commande. C’est utile, mais pas suffisant pour accuser ou innocenter seul. Les processus du moment, lus avec « ps » ou « ss », sont encore plus volatils : ils montrent l’instant présent, pas toute l’histoire. La bonne pratique consiste donc à croiser ces sources, en notant leur force probante respective. Sur un vrai hôte Linux, « ausearch -k exec -ts today » regroupe justement les enregistrements d’un même événement partageant le même numéro de séquence."),
    code(`# Relier une réussite SSH à une exécution auditée
grep 'Accepted password for awa' auth-demo.log
grep 'msg=audit(1773130805.123:456)' audit-demo.log
date -u -d @1773130805 '+%Y-%m-%dT%H:%M:%SZ'
# exemple de sortie (valeurs fictives)
# Mar 10 08:16:31 web01 sshd[2201]: Accepted password for awa from 192.0.2.10 port 51240 ssh2
# type=SYSCALL msg=audit(1773130805.123:456): arch=c000003e syscall=59 success=yes exit=0 auid=1001 uid=0 gid=0 tty=pts0 ses=17 comm="cat" exe="/usr/bin/cat" key="exec"
# type=EXECVE msg=audit(1773130805.123:456): argc=2 a0="cat" a1="/etc/shadow"
# type=PATH msg=audit(1773130805.123:456): item=0 name="/etc/shadow"
# 2026-03-10T08:20:05Z`, "bash"),
    text("Démonstration guidée : la lecture prudente est la suivante. Le compte « awa » s’est connecté avec succès. Quelques minutes plus tard, auditd émet trois enregistrements portant le même « msg=audit(...:456) ». Le premier, « type=SYSCALL », donne le contexte d’exécution, dont « auid=1001 » et « uid=0 ». Le deuxième, « type=EXECVE », montre les arguments « a0=\"cat\" » et « a1=\"/etc/shadow\" ». Le troisième, « type=PATH », confirme le chemin touché. Tu peux donc écrire : « une session ouverte par awa a exécuté cat sur /etc/shadow avec des privilèges root à 08:20:05Z ». Tu ne dis pas encore pourquoi, ni si cette lecture était autorisée. Le journal ne donne pas l’intention."),
    code(`# Montrer pourquoi l’historique seul reste une preuve faible
cat history-demo.txt
grep 'cat /etc/shadow' ps-demo.txt
# exemple de sortie (valeurs fictives)
# #1773130798
# sudo -i
# #1773130805
# cat /etc/shadow
# #1773130820
# exit
# root     1012  0.0  0.0   3076  1048 pts/0    S+   08:20   0:00 cat /etc/shadow`, "bash"),
    text("auditd demande cependant de la prudence de configuration. Une règle trop large génère beaucoup de volume et peut saturer le disque. Certains arguments capturés peuvent aussi révéler des secrets. Il faut donc choisir les points d’audit avec discernement : fichiers sensibles, exécutions critiques, changements d’identité. Quand l’audit manque, tu reviens aux autres traces : journal d’authentification, historique du shell, processus, connexions réseau et journaux applicatifs éventuels. Sur un serveur réel, « ausearch -k exec » sert à relire proprement les événements, et « aureport --auth » à résumer l’authentification."),
    example("Exemple corrigé : trois lignes d’historique qui montrent « sudo -i », « cat /etc/shadow », « exit » ne prouvent pas, seules, que la commande a vraiment été exécutée au moment affiché. Elles peuvent avoir été écrites après coup ou incomplètement. Si auditd confirme la même séquence avec « type=SYSCALL », « type=EXECVE », « auid=1001 », « uid=0 » et l’epoch convertie, ta reconstruction devient beaucoup plus solide. Le bon réflexe est donc : historique pour l’indice, auditd pour la preuve plus forte, processus pour le contexte immédiat."),
    mistakes("prendre « bash_history » pour une preuve aussi forte qu’un audit ; oublier que « uid » et « auid » répondent à deux questions différentes ; lire un epoch sans le convertir proprement ; activer des règles d’audit trop larges au point de noyer ou de saturer le système."),
    safety("les journaux d’audit peuvent contenir des chemins sensibles, des noms de fichiers confidentiels et parfois des fragments de secrets. Analyse-les dans un cadre autorisé, sur une copie de travail si possible, et ne modifie pas la machine examinée plus que nécessaire tant que la collecte n’est pas stabilisée."),
    takeaway("pour savoir qui a lancé quoi, croise les sources. auditd donne une trace solide si la règle existe. L’historique du shell est utile mais faible. Les processus montrent l’instant présent. La vraie qualité d’enquête vient du recoupement et de la conversion propre des temps."),
    practice("Travaille dans « Investigation SOC : reconstituer une intrusion complète » : suis une session depuis l’accès initial jusqu’aux exécutions sensibles, puis note ce que chaque source prouve vraiment. Termine par le quiz."),
    reference("man7Auditd"),
    reference("man7Auditctl"),
    reference("man7Ausearch"),
  ],
  quiz: {
    title: "Quiz : auditd, historique et processus",
    questions: [
      questions.choice("Quel champ d’auditd aide le mieux à relier une action root à l’identité de connexion d’origine ?", ["gid", "auid", "mode", "exit"], 1, "Le champ « auid » conserve l’identité de la session d’origine, même après un « sudo ». Le piège consiste à ne regarder que « uid », qui dit sous quelle identité la commande a tourné au moment précis, pas forcément qui s’était connecté au départ.", "facile"),
      questions.choice("Pourquoi « ~/.bash_history » est-il une preuve plus faible qu’un enregistrement auditd ?", ["Parce qu’il n’a jamais d’horodatage", "Parce qu’il peut être absent, modifié ou écrit seulement à la fermeture du shell", "Parce qu’il ne contient que des commandes réseau", "Parce qu’il n’existe que sur Fedora"], 1, "L’historique du shell peut être incomplet, désactivé ou retouché, et son écriture dépend souvent de la fin de session. Le faux ami tentant est de croire qu’une commande vue dans l’historique équivaut automatiquement à une exécution horodatée et attribuée aussi solidement qu’un audit système.", "moyen"),
      questions.multi("Lis l’extrait « msg=audit(1773130805.123:456) ... auid=1001 uid=0 ... comm=\"cat\" exe=\"/usr/bin/cat\" ». Quelles affirmations sont prudentes ? (plusieurs réponses)", ["La commande courte observée est « cat »", "L’action s’exécute avec des privilèges root", "Le compte d’origine de la session est différent de root", "L’intention de l’utilisateur est connue avec certitude"], [0, 1, 2], "Le nom de commande, le « uid=0 » et le « auid=1001 » sont explicitement présents. En revanche, l’intention n’est jamais visible directement dans ce type de ligne. Le piège fréquent est de passer d’une action technique prouvée à un mobile supposé sans autre contexte.", "difficile"),
      questions.tf("Des règles d’audit trop larges peuvent produire trop de volume et dégrader l’utilité du journal.", true, "Vrai : plus de traces ne signifie pas automatiquement meilleure enquête. Un audit mal ciblé peut saturer le disque, noyer les événements utiles et exposer des données sensibles en masse. La qualité vient d’un choix raisonné des règles, pas d’une collecte sans limite.", "moyen"),
    ],
  },
};

export const modules: PathModuleEntry[] = [
  {
    key: "c6:1",
    position: 1,
    existing: { fromTitle: "Lire les journaux" },
    title: "Lire les journaux",
    description: "Ce module pose la méthode de base avant toute enquête : reconnaître une source, lire un événement sans surinterpréter, remettre les heures dans le bon ordre, puis relier des traces par une clé commune sans confondre indice et preuve. Critères de réussite : identifier le format et les champs utiles d’un extrait ; convertir des horodatages vers une chronologie UTC ; formuler une hypothèse prudente et la tester avec au moins une seconde source.",
    lessons: [sourcesFormatsLesson, lireLesson, tempsLesson, correlerLesson],
  },
  {
    key: "c6:4",
    position: 2,
    title: "Journaux Linux et serveurs",
    description: "Tu entres ici dans les traces les plus courantes d’un serveur Linux : syslog, journald, authentification, sudo et audit d’exécution. L’objectif n’est pas de mémoriser des fichiers, mais de savoir où chercher, quoi compter et comment mesurer la force probante de chaque source. Critères de réussite : choisir le bon journal pour une question précise ; repérer une séquence de connexion ou d’élévation de droits significative ; relier une exécution sensible à sa session d’origine avec prudence.",
    lessons: [linuxSyslogLesson, authSudoLesson, auditExecutionLesson],
  },
];
