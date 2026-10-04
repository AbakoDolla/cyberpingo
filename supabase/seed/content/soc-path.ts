// Authoring content of the "Linux et investigation SOC" path: two new modules (Linux audit, incident
// investigation), five lessons with quizzes, four log-based labs with auto-checked tasks, five skills,
// four badges and the mascot's lines. It is read by scripts/generate-soc-seed.cjs, which turns it into
// supabase/seed/03_soc_path.sql. The expected lab answers come from `facts`, computed by
// scripts/lab-scenarios-soc.cjs from the very files learners download, so they cannot drift.

import { figure } from "./path-kit";

export interface SocFacts {
  audit: {
    worldWritableScript: string; worldWritableMode: string; scriptOwner: string; cronSchedule: string; cronUser: string;
    suidCount: number; suidUnexpected: string; sudoUser: string; sudoRule: string; uidZeroAccounts: number; extraRootAccount: string; lineCount: number;
  };
  ssh: {
    attackerIp: string; attackerFailures: number; invalidUserCount: number; targetedUser: string; targetedAttempts: number; firstAttackTime: string;
    successTime: string; authMethod: string; attackDurationSeconds: number; newUser: string; newUserGroup: string; scannerIp: string; scannerFailures: number; lineCount: number;
  };
  web: {
    attackerIp: string; firstTool: string; requestsFromAttacker: number; notFoundFromAttacker: number; vulnerablePage: string; injectionRequests: number;
    unionRequests: number; firstInjectionTime: string; loginTime: string; webshellPath: string; webshellRequests: number; firstCommandTime: string; decoyIp: string; lineCount: number;
  };
  incident: {
    attackerIp: string; webHost: string; failedLogins: number; compromisedWebAccount: string; firstAttackTime: string; loginTime: string; uploadTime: string;
    webshellPath: string; stolenFile: string; pivotAccount: string; pivotTime: string; pivotProtocol: string; persistenceMethod: string; persistenceFile: string;
    exfilPort: number; exfilConnections: number; firstExfilTime: string; lineCount: number;
  };
}

export interface PathBlock { type: "text" | "schema" | "code" | "example" | "callout"; content: string; language?: string }
export interface PathQuestion { type: "single_choice" | "true_false"; prompt: string; options: string[]; correct: number; explanation: string; difficulty: "facile" | "moyen" | "difficile" }
export interface PathLesson { key: string; title: string; summary: string; minutes: number; xp: number; blocks: PathBlock[]; quiz?: { title: string; questions: PathQuestion[] } }
export interface PathModule { key: string; title: string; description: string; lessons: PathLesson[] }
export interface PathTask { prompt: string; hint: string; answerFormat: string; accepted: string[]; explanation: string }
export interface PathAsset { kind: "log" | "pcap" | "pkt" | "guide" | "image" | "topology" | "report_template"; title: string; description: string; url: string }
export interface PathLab {
  slug: string; title: string; description: string; difficulty: "debutant" | "intermediaire" | "avance"; xp: number;
  format: "pcap" | "logs" | "packet_tracer"; minutes: number; requiresComputer: boolean; isAssessment: boolean; category: string; course: string;
  briefing: string; constraints: string[]; tools: string[]; objectives: string[]; hints: string[]; tasks: PathTask[]; assets: PathAsset[];
}
export interface PathSkill { slug: string; name: string; description: string; domain: string; lessonKey: string; practiceLab: string; validationLab: string }
export interface PathBadge { slug: string; name: string; description: string; icon: string; rarity: "common" | "rare" | "epic" | "legendary"; xp: number; position: number; lab?: string; skill?: string }
export interface MascotSeed { key: string; event: string; expression: string; text: string; priority: number }

const callout = (content: string): PathBlock => ({ type: "callout", content });
const text = (content: string): PathBlock => ({ type: "text", content });
const videoSlot = (title: string): PathBlock => callout(`Vidéo à venir : ${title}`);

const lower = (value: string) => value.toLowerCase();
const compact = (values: string[]) => Array.from(new Set(values.map(lower)));
const times = (value: string) => compact([value, `${value}z`]);

const questions = {
  tf: (prompt: string, truth: boolean, explanation: string, difficulty: PathQuestion["difficulty"] = "facile"): PathQuestion => ({
    type: "true_false", prompt, options: ["Vrai", "Faux"], correct: truth ? 0 : 1, explanation, difficulty,
  }),
  choice: (prompt: string, options: string[], correct: number, explanation: string, difficulty: PathQuestion["difficulty"] = "facile"): PathQuestion => ({
    type: "single_choice", prompt, options, correct, explanation, difficulty,
  }),
};

export function buildSocPath(facts: SocFacts) {
  const { audit, ssh, web, incident } = facts;

  const modules: PathModule[] = [
    {
      key: "c3:3",
      title: "Auditer un système Linux",
      description: "Lire les journaux d’un serveur Linux et repérer les droits, les comptes et les tâches planifiées dangereux.",
      lessons: [
        {
          key: "linux-journaux",
          title: "Les journaux d’un serveur Linux",
          summary: "Savoir où Linux écrit ses journaux, lire une ligne syslog et filtrer avec grep et journalctl.",
          minutes: 18,
          xp: 25,
          blocks: [
            callout("Objectifs : localiser les journaux d’un serveur Linux, décomposer une ligne syslog, filtrer un fichier avec grep et interroger journald."),
            text("Un serveur Linux raconte tout ce qui lui arrive : connexions, commandes administrateur, démarrages de services, erreurs. Ce récit s’écrit dans des journaux. Pour un analyste, ce sont les premières preuves en cas d’incident : sans eux, impossible de savoir qui est entré, quand et ce qu’il a fait."),
            videoSlot("Où sont les journaux sous Linux et comment les lire"),
            text("Les fichiers de journaux sont rangés dans /var/log. Leur nom varie un peu d’une distribution à l’autre, mais les rôles sont toujours les mêmes : un fichier pour les connexions et l’authentification, un pour les messages généraux, un par service important (serveur web, base de données)."),
            { type: "schema", content: figure({
              kind: "cards",
              title: "Les journaux clés sous `/var/log`",
              columns: 3,
              items: [
                { term: "auth.log", text: "connexions SSH, sudo, changements de compte. Debian, Ubuntu", icon: "lock", tone: "blue" },
                { term: "secure", text: "même rôle sur Red Hat, CentOS, Fedora", icon: "lock", tone: "blue" },
                { term: "syslog", text: "messages généraux du système", icon: "document" },
                { term: "kern.log", text: "noyau et matériel", icon: "chip" },
                { term: "nginx/", text: "`access.log` et `error.log` du serveur web", icon: "globe", tone: "green" },
                { term: "apache2/", text: "`access.log` et `error.log` d’Apache", icon: "globe", tone: "green" },
                { term: "wtmp, btmp", text: "connexions réussies et échouées. Binaires : `lastb`, `last`", icon: "history", tone: "amber" },
              ],
            }).content },
            text("Une ligne syslog a toujours la même forme : la date, le nom de la machine, le programme qui parle (avec son numéro de processus entre crochets), puis le message. Apprendre à découper une ligne en quatre morceaux vous permet de lire un journal inconnu en quelques secondes."),
            { type: "code", language: "text", content: "Mar 14 09:12:44 srv-app01 sshd[2210]: Failed password for invalid user guest from 198.51.100.7 port 52310 ssh2\n|______________| |________| |_______| |________________________________________________________|\n    date          machine    programme                       message" },
            text("Deux outils font l’essentiel du travail. grep filtre les lignes qui contiennent un motif. journalctl interroge le journal de systemd, qui centralise les messages sur les systèmes récents : on peut y filtrer par service, par priorité ou par période. Les heures des journaux sont souvent en UTC : vérifiez-le toujours avant de comparer deux sources."),
            { type: "code", language: "bash", content: "# Les 20 dernières lignes d'authentification\ntail -n 20 /var/log/auth.log\n# Les échecs de connexion SSH\ngrep \"Failed password\" /var/log/auth.log\n# Compter les échecs par adresse IP\ngrep \"Failed password\" /var/log/auth.log | grep -o \"from [0-9.]*\" | sort | uniq -c | sort -rn\n# journald : un service sur une période\njournalctl -u ssh --since \"2 hours ago\"\n# journald : seulement les erreurs\njournalctl -p err -b" },
            { type: "example", content: "Exemple : une ligne sudo « COMMAND=/bin/bash » signifie qu’un utilisateur a ouvert un terminal administrateur. Ce n’est pas forcément une attaque, mais c’est une ligne à replacer dans la chronologie : qui, quand et juste après quoi ?" },
            callout("À retenir : un journal est une suite de preuves datées. Savoir où chercher (/var/log, journalctl) et filtrer (grep, tri, comptage) vaut mieux que tout lire ligne à ligne."),
          ],
          quiz: {
            title: "Quiz : les journaux d’un serveur Linux",
            questions: [
              questions.choice("Quel fichier enregistre les connexions SSH et les commandes sudo sur Debian et Ubuntu ?", ["/var/log/kern.log", "/var/log/auth.log", "/etc/passwd", "/var/log/dmesg"], 1, "auth.log centralise l’authentification : connexions SSH, sudo, changements de compte. Sur Red Hat, le fichier équivalent s’appelle secure."),
              questions.choice("Quelle commande affiche seulement les lignes contenant « Failed password » ?", ["tail Failed password auth.log", "grep \"Failed password\" /var/log/auth.log", "journalctl Failed password", "ls /var/log/auth.log"], 1, "grep filtre les lignes d’un fichier selon un motif : c’est l’outil de base de l’analyse de journaux."),
              questions.tf("Les heures d’un journal sont toujours exprimées dans le fuseau horaire de l’analyste.", false, "Les serveurs journalisent souvent en UTC. Il faut vérifier le fuseau avant de comparer plusieurs sources.", "moyen"),
            ],
          },
        },
        {
          key: "linux-audit-droits",
          title: "Auditer droits, comptes et tâches planifiées",
          summary: "Repérer fichiers SUID, règles sudo, comptes UID 0 et scripts cron modifiables : les portes dérobées classiques.",
          minutes: 22,
          xp: 30,
          blocks: [
            callout("Objectifs : lire les droits d’un fichier, repérer un fichier modifiable par tous, expliquer le risque des fichiers SUID, des règles sudo et des tâches cron, et reconnaître un compte administrateur caché."),
            text("Un système Linux est surtout une affaire de droits. Un attaquant qui entre avec un compte limité cherche une faille de configuration pour devenir root. L’audit consiste à passer en revue ces points faibles avant lui : fichiers trop permissifs, programmes qui s’exécutent avec les droits de leur propriétaire, règles sudo trop larges, comptes en trop."),
            videoSlot("Les 5 vérifications d’un audit Linux express"),
            text("Les droits d’un fichier se lisent avec ls -l. Ils se composent de trois triplets lecture (r), écriture (w), exécution (x) : propriétaire, groupe, autres. Le mode numérique correspondant s’écrit en octal : 755 signifie rwxr-xr-x. Le mode 777 donne tous les droits à tout le monde : un fichier ainsi ouvert peut être modifié par n’importe quel compte du système."),
            { type: "schema", content: figure({
              kind: "table",
              title: "Lire deux permissions de scripts",
              columns: ["Script", "Propriétaire", "Taille", "Date", "Mode", "Verdict"],
              rows: [
                ["/usr/local/bin/sauvegarde.sh", "root:root", "1204", "14 mars 09:00", "755 = rwx r-x r-x", "sain"],
                ["/opt/scripts/nettoyage.sh", "root:root", "412", "14 mars 09:00", "777 = rwx rwx rwx", "DANGER"],
              ],
              mono: [0, 1, 2, 4],
              caption: "L’ordre du mode est toujours propriétaire, groupe, autres. Le `-` initial indique ici un fichier ordinaire.",
            }).content },
            text("Le bit SUID (affiché s à la place du x du propriétaire) fait s’exécuter un programme avec les droits de son propriétaire, souvent root. Quelques programmes légitimes l’utilisent (passwd, sudo). Un éditeur ou un outil de recherche avec le bit SUID, en revanche, permet souvent d’obtenir un terminal root : des listes publiques (GTFOBins) recensent ces détournements."),
            text("Troisième point : sudo. Le dossier /etc/sudoers.d contient les règles qui autorisent des comptes à lancer des commandes en administrateur. Une règle précise (« redémarrer ce service ») est saine. Une règle « NOPASSWD: ALL » donne à son bénéficiaire un accès root sans mot de passe sur tout le système."),
            text("Quatrième et cinquième points : les tâches planifiées et les comptes. Une tâche cron exécutée par root qui lance un script modifiable par tous est une porte ouverte : il suffit de modifier le script pour que root exécute vos commandes. Côté comptes, un seul compte doit avoir l’UID 0 (root). Tout autre compte à UID 0 est un administrateur déguisé, souvent créé pour garder un accès."),
            { type: "code", language: "bash", content: "# Fichiers modifiables par tous (hors liens et /proc)\nfind / -xdev -type f -perm -0002 2>/dev/null\n# Fichiers avec le bit SUID\nfind / -perm -4000 -type f 2>/dev/null\n# Règles sudo\ncat /etc/sudoers.d/*\n# Tâches planifiées de root\ncrontab -l -u root\n# Comptes dont l'UID vaut 0\nawk -F: '$3 == 0 {print $1}' /etc/passwd" },
            { type: "example", content: "Exemple : un cron de root lance toutes les 15 minutes /srv/maintenance/purge.sh, et ce script est en mode 777. Un compte compromis y ajoute une ligne qui crée un compte administrateur : au prochain passage, root l’exécute. Le défaut n’est pas dans cron, il est dans les droits du script." },
            callout("À retenir : cinq vérifications, cinq commandes. Fichiers ouverts à tous, SUID inattendus, règles sudo trop larges, scripts cron modifiables, comptes UID 0 en trop."),
          ],
          quiz: {
            title: "Quiz : auditer droits, comptes et tâches planifiées",
            questions: [
              questions.choice("Que signifie le mode 777 sur un script ?", ["Seul root peut le modifier", "Tout le monde peut le lire, le modifier et l’exécuter", "Il ne peut être ni lu ni exécuté", "Il est protégé par le bit SUID"], 1, "7 correspond à rwx : lecture, écriture et exécution pour le propriétaire, le groupe et les autres.", "facile"),
              questions.choice("Pourquoi un script en mode 777 lancé par le cron de root est-il dangereux ?", ["Il consomme trop de mémoire", "N’importe quel compte peut le modifier, et root exécutera ces modifications", "Cron refuse de l’exécuter", "Il est automatiquement effacé"], 1, "Root exécute le script avec tous les droits : celui qui peut le modifier peut donc faire exécuter ce qu’il veut à root.", "moyen"),
              questions.tf("Un compte autre que root dont l’UID vaut 0 est un signe d’alerte.", true, "L’UID 0 donne tous les droits. Un compte supplémentaire à UID 0 est un administrateur caché, souvent créé pour garder un accès.", "moyen"),
            ],
          },
        },
      ],
    },
    {
      key: "c6:3",
      title: "Investiguer un incident",
      description: "Reconnaître une attaque dans les journaux, la relier aux autres sources et rédiger la chronologie.",
      lessons: [
        {
          key: "soc-ssh-bruteforce",
          title: "Reconnaître une attaque SSH par force brute",
          summary: "Lire les échecs de connexion, repérer le moment où l’attaquant réussit et les gestes qui suivent.",
          minutes: 20,
          xp: 30,
          blocks: [
            callout("Objectifs : reconnaître une attaque par force brute dans auth.log, distinguer un échec d’un succès, mesurer la durée d’une attaque et repérer ce que l’attaquant fait après sa connexion."),
            text("Un serveur exposé à Internet reçoit des tentatives de connexion SSH en permanence : ce bruit de fond est normal. Une attaque par force brute se reconnaît à son volume et à sa régularité : des dizaines d’essais en quelques minutes, depuis une même adresse, sur des comptes souvent inventés (admin, test, oracle) ou sur un compte réel."),
            videoSlot("Lire auth.log : de l’échec à la prise de contrôle"),
            text("Dans auth.log, chaque essai laisse une ligne. « Failed password for invalid user » signifie que le compte n’existe pas. « Failed password for backup » signifie que le compte existe, ce qui est plus inquiétant : l’attaquant a trouvé un nom valide. « Accepted password » ou « Accepted publickey » signale une connexion réussie."),
            { type: "schema", content: figure({
              kind: "timeline",
              title: "Force brute SSH : du bruit au succès critique",
              events: [
                { at: "03:31:14", title: "Invalid user admin from 192.0.2.150", text: "compte inventé", icon: "user", tone: "amber" },
                { at: "03:31:15", title: "Failed password for invalid user admin", text: "échec", icon: "lock", tone: "amber" },
                { at: "03:31-03:33", title: "Rafale d’échecs", text: "quelques secondes d’écart", icon: "alert", tone: "amber" },
                { at: "03:33:41", title: "Failed password for backup", text: "compte réel visé", icon: "user", tone: "amber" },
                { at: "03:33:47", title: "Accepted password for backup", text: "SUCCÈS, le moment critique", icon: "key", tone: "red" },
                { at: "03:34:20", title: "sudo: backup : COMMAND=/bin/bash", text: "il devient root", icon: "shield", tone: "red" },
              ],
            }).content },
            text("Le moment critique est le premier « Accepted » qui suit une rafale d’échecs depuis la même adresse : c’est la compromission. Tout ce qui vient après compte : nouvelle session, passage root avec sudo, création d’un compte, ajout à un groupe privilégié, modification du mot de passe. Chaque geste laisse sa propre ligne dans le journal."),
            { type: "code", language: "bash", content: "# Qui échoue le plus ?\ngrep \"Failed password\" auth.log | grep -o \"from [0-9.]*\" | sort | uniq -c | sort -rn | head\n# Un succès venant de cette adresse ?\ngrep \"Accepted\" auth.log | grep \"192.0.2.150\"\n# Création de compte et changements de groupe\ngrep -E \"useradd|usermod|passwd\" auth.log" },
            text("Attention aux leurres. Un scanner qui tente trois fois le compte root puis abandonne n’est pas l’attaquant : il n’a rien obtenu. Il faut toujours vérifier si une adresse a réussi à entrer, pas seulement si elle a essayé. Et une connexion par clé depuis une adresse interne connue est le comportement normal des administrateurs."),
            { type: "example", content: "Exemple : 40 échecs sur trois comptes inventés, puis 4 échecs sur le compte « backup », puis « Accepted password for backup » : l’attaquant a deviné le mot de passe. Trente secondes plus tard, sudo ouvre un terminal root et un compte « maintenance » est créé : c’est une persistance." },
            callout("À retenir : volume + régularité = force brute. Cherchez le premier succès après les échecs, puis lisez tout ce qui suit : c’est là que l’impact se mesure."),
          ],
          quiz: {
            title: "Quiz : attaque SSH par force brute",
            questions: [
              questions.choice("Quelle ligne marque le moment où l’attaquant entre ?", ["La première ligne « Invalid user »", "Le premier « Accepted password » après la rafale d’échecs", "La dernière ligne « Failed password »", "La ligne « Connection closed »"], 1, "Les échecs montrent l’attaque. Le premier succès depuis la même adresse montre qu’elle a réussi.", "facile"),
              questions.choice("Une adresse tente trois fois root, échoue et disparaît. Que conclure ?", ["Le serveur est compromis", "C’est probablement un scanner sans succès : à noter, mais ce n’est pas l’intrusion", "Il faut supprimer le compte root", "Elle est forcément liée à l’attaque principale"], 1, "Sans aucun « Accepted » pour cette adresse, rien ne prouve qu’elle est entrée. Ne confondez pas bruit et attaque.", "moyen"),
              questions.tf("« Failed password for invalid user » prouve que le compte visé existe.", false, "« invalid user » signifie au contraire que le compte n’existe pas : l’attaquant devine des noms.", "moyen"),
            ],
          },
        },
        {
          key: "soc-web-logs",
          title: "Lire les journaux d’un serveur web",
          summary: "Repérer un scan, une injection SQL et une porte dérobée web dans un journal d’accès.",
          minutes: 22,
          xp: 30,
          blocks: [
            callout("Objectifs : décomposer une ligne de journal d’accès, reconnaître un scanner, une injection SQL et un webshell, et suivre les requêtes d’une même adresse."),
            text("Un journal d’accès web contient une ligne par requête reçue. Le format le plus courant (combined) donne l’adresse du visiteur, l’heure, la requête (méthode et adresse demandée), le code de réponse, la taille de la réponse et le navigateur déclaré (User-Agent). Chaque ligne se lit comme une petite phrase."),
            videoSlot("Reconnaître un scan, une injection et un webshell dans un journal"),
            { type: "code", language: "text", content: "198.51.100.30 - - [15/Mar/2026:10:21:07 +0000] \"GET /catalogue.php?id=7 HTTP/1.1\" 200 5120 \"-\" \"Mozilla/5.0 (X11; Linux x86_64) Firefox/115.0\"\n|____________|     |____________________________|  |_____________________________|  |_|  |__|          |______________________|\n  adresse                     heure                      requête                  code taille              navigateur" },
            text("Les codes de réponse racontent beaucoup. 200 : la page existe et a été servie. 301 et 302 : redirection (un 302 après un POST sur une page de connexion signale souvent une connexion réussie). 404 : la page n’existe pas. 403 : accès refusé. 500 : erreur du serveur. Une longue suite de 404 depuis une même adresse indique un scanner qui essaie des chemins connus."),
            text("Les scanners de vulnérabilités, comme Nikto, se déclarent parfois dans le User-Agent. Un attaquant discret change cette valeur : c’est pourquoi on regarde aussi le comportement (rythme, chemins demandés) plutôt que la seule étiquette."),
            text("L’injection SQL se voit dans l’adresse demandée : apostrophe encodée (%27), tests logiques (OR 1=1), tri de colonnes (ORDER BY) puis UNION SELECT pour extraire les données d’une autre table. Les requêtes se suivent à un rythme trop régulier pour un humain : c’est un outil automatique comme sqlmap."),
            { type: "schema", content: figure({
              kind: "steps",
              title: "Séquence typique d’une injection SQL",
              items: [
                { title: "Apostrophe", text: "`GET /catalogue.php?id=7%27` : l’apostrophe casse la requête" },
                { title: "Test logique", text: "`GET /catalogue.php?id=7%20OR%201=1` : le filtre est contourné" },
                { title: "Colonnes", text: "`GET /catalogue.php?id=7%20ORDER%20BY%205` : l’outil compte les colonnes" },
                { title: "Extraction", text: "`GET /catalogue.php?id=-1%20UNION%20SELECT%201,2,3,4` : des données sont visées" },
              ],
            }).content },
            text("Enfin, le webshell : un petit fichier déposé sur le serveur (souvent après un envoi de fichier détourné) qui exécute les commandes passées dans l’adresse. On le reconnaît à une requête POST d’envoi de fichier, puis à des requêtes GET répétées vers un fichier .php situé dans un dossier d’envois, avec un paramètre comme cmd=whoami."),
            { type: "code", language: "bash", content: "# Requêtes d'une adresse\ngrep \"^198.51.100.30 \" access.log\n# Codes 404 par adresse\nawk '$9 == 404 {print $1}' access.log | sort | uniq -c | sort -rn\n# Signes d'injection SQL\ngrep -iE \"union|%27|or%201=1|order%20by\" access.log\n# Fichiers php appelés dans le dossier d'envois\ngrep \"/uploads/\" access.log | grep \".php\"" },
            { type: "example", content: "Exemple : un POST sur /admin/upload.php suivi de GET /uploads/x.php?cmd=id, puis cmd=whoami : la dernière étape de la chaîne est un webshell. Le premier appel de commande donne l’heure de la prise de contrôle." },
            callout("À retenir : suivez une adresse du début à la fin. Scan (404 en rafale), injection (apostrophes, UNION), dépôt d’un fichier, puis commandes par un webshell : chaque étape a sa signature."),
          ],
          quiz: {
            title: "Quiz : journaux d’un serveur web",
            questions: [
              questions.choice("Une adresse reçoit des dizaines de 404 en quelques secondes. Que suggère ce motif ?", ["Un utilisateur qui se trompe d’adresse", "Un scanner qui teste des chemins connus", "Une panne du serveur", "Une mise à jour automatique"], 1, "Un humain ne demande pas des dizaines de pages inexistantes à la suite : c’est le comportement d’un scanner.", "facile"),
              questions.choice("Que révèle une requête avec « UNION SELECT » dans l’adresse ?", ["Un test de performance", "Une tentative d’injection SQL pour extraire des données", "Une redirection légitime", "Un robot d’indexation"], 1, "UNION SELECT sert à greffer une seconde requête SQL pour lire d’autres tables : c’est une injection.", "moyen"),
              questions.choice("Quelle séquence signale un webshell ?", ["GET /index.html puis GET /contact.html", "Un POST d’envoi de fichier, puis des GET répétés sur un .php du dossier d’envois avec ?cmd=", "Un POST sur /login suivi d’un 401", "Une rafale de 404"], 1, "Le fichier déposé s’exécute ensuite par des requêtes GET qui transportent les commandes à lancer.", "moyen"),
            ],
          },
        },
        {
          key: "soc-chronologie",
          title: "Reconstituer la chronologie d’un incident",
          summary: "Relier plusieurs journaux, ordonner les événements et rédiger un rapport d’incident clair.",
          minutes: 22,
          xp: 30,
          blocks: [
            callout("Objectifs : corréler plusieurs sources de journaux, écarter les faux positifs, construire une chronologie ordonnée et rédiger un rapport d’incident utile."),
            text("Une attaque réelle ne laisse pas toutes ses traces au même endroit. Le journal web montre l’entrée, le journal d’authentification montre les rebonds, le journal de tâches planifiées montre la persistance et celui du pare-feu montre les données qui sortent. Le travail d’un analyste SOC consiste à relier ces sources pour raconter une histoire cohérente."),
            videoSlot("Du journal à la chronologie : méthode d’un analyste SOC"),
            text("La corrélation commence par un fil conducteur : une adresse IP, un compte, un nom de fichier. On cherche ce fil dans chaque source et on note chaque occurrence avec son heure. Mettre toutes les heures dans le même fuseau (UTC) est indispensable, sinon l’ordre des événements est faux."),
            { type: "schema", content: figure({
              kind: "timeline",
              title: "Chronologie minimale d’un incident corrélé",
              events: [
                { at: "01:03:12", title: "web : premiers échecs de connexion à l’administration", icon: "globe", tone: "amber" },
                { at: "01:04:05", title: "web : connexion réussie", text: "accès initial", icon: "key", tone: "red" },
                { at: "01:06:40", title: "web : fichier déposé", text: "webshell", icon: "bug", tone: "red" },
                { at: "01:08:10", title: "web : lecture d’un fichier de configuration", icon: "document", tone: "amber" },
                { at: "01:15:22", title: "ssh : connexion avec un compte de base de données", text: "rebond", icon: "route", tone: "red" },
                { at: "01:18:50", title: "cron : tâche planifiée créée", text: "persistance", icon: "clock", tone: "red" },
                { at: "01:27:31", title: "pare-feu : connexion sortante vers l’attaquant", text: "exfiltration", icon: "internet", tone: "red" },
              ],
            }).content },
            text("Les faux positifs encombrent tous les journaux : une administratrice qui se connecte depuis le bureau, un scanner qui échoue, un script de sauvegarde. Pour les écarter, posez-vous trois questions : l’adresse est-elle connue ? Y a-t-il eu un succès ? L’action est-elle cohérente avec le reste de l’attaque ? Un événement qui répond « oui, non, non » n’appartient pas à l’histoire."),
            text("Une chronologie utile suit le cycle d’une intrusion : accès initial (comment il est entré), exécution (ce qu’il a lancé), rebond (autres comptes ou machines touchés), persistance (comment il compte revenir), exfiltration (ce qui est sorti). Pour chaque étape, notez l’heure, la preuve (la ligne du journal) et l’impact."),
            { type: "code", language: "bash", content: "# Toutes les occurrences d'une adresse, toutes sources confondues, triées par heure\ngrep -h \"192.0.2.60\" web.log ssh.log fw.log | sort\n# Fichiers déposés\ngrep -h \"upload\" web.log\n# Tâches planifiées créées ou modifiées\ngrep -h \"crontab\" auth.log" },
            text("Le rapport se lit par des gens pressés. Commencez par un résumé de trois lignes : ce qui s’est passé, depuis quand, quel impact. Puis donnez la chronologie avec les preuves, les comptes et machines touchés, et enfin les actions de remédiation : changer les mots de passe, supprimer la persistance, fermer l’accès initial, bloquer l’adresse, surveiller la sortie de données."),
            { type: "example", content: "Exemple : « Le 2 avril à 01:04 UTC, l’adresse 192.0.2.60 s’est connectée à l’administration du site après 9 échecs. Elle a déposé un webshell puis s’est connectée en SSH avec un compte de base de données. Une tâche planifiée assure son retour. Un transfert sortant a été observé à 01:27. » Voilà le résumé d’un rapport." },
            callout("À retenir : un fil conducteur, une seule échelle de temps, des preuves citées, et un rapport qui commence par l’essentiel. Écartez les faux positifs, sans les oublier : citez-les comme éliminés."),
          ],
          quiz: {
            title: "Quiz : chronologie d’un incident",
            questions: [
              questions.choice("Quelle première précaution avant de comparer les événements de plusieurs journaux ?", ["Les trier par taille de fichier", "Mettre toutes les heures dans le même fuseau", "Supprimer les lignes de moins de 20 caractères", "Ne garder que les lignes contenant « ERROR »"], 1, "Si une source est en UTC et une autre en heure locale, l’ordre des événements est faux.", "facile"),
              questions.choice("Dans quelle étape range-t-on la création d’une tâche cron qui relance un script chaque heure ?", ["Accès initial", "Persistance", "Exfiltration", "Reconnaissance"], 1, "La tâche planifiée garantit que l’attaquant garde un accès même après un redémarrage ou un changement de mot de passe.", "moyen"),
              questions.tf("Un rapport d’incident doit commencer par la liste complète des lignes de journal.", false, "Un rapport commence par un résumé court : ce qui s’est passé, depuis quand, quel impact. Les preuves détaillées viennent ensuite.", "facile"),
            ],
          },
        },
      ],
    },
  ];

  const cronMinutes = Number(audit.cronSchedule.split(" ")[0].replace("*/", ""));
  const bare = (path: string) => path.replace(/^\//, "");
  const base = (path: string) => path.split("/").pop() ?? path;

  const guideLecture: PathAsset = { kind: "guide", title: "Guide : lire un journal d’incident", description: "Les formats de journaux, les filtres grep utiles et la méthode pour relier plusieurs sources.", url: "/labs/guide-lecture-journaux.md" };

  const labs: PathLab[] = [
    {
      slug: "audit-linux-droits",
      title: "Audit Linux : droits, sudo et cron",
      description: "Un serveur de comptabilité vient d’être repris par ton équipe. Passe en revue les droits, les règles sudo, les tâches cron et les comptes pour trouver ce qui ne va pas.",
      difficulty: "debutant",
      xp: 120,
      format: "logs",
      minutes: 25,
      requiresComputer: false,
      isAssessment: false,
      category: "linux",
      course: "c3",
      briefing: "Le serveur srv-compta01 héberge la comptabilité de l’atelier Kora. L’ancien administrateur est parti sans documentation. Avant d’ouvrir le serveur au reste du réseau, ton responsable te demande un audit express. Tu disposes de la sortie des cinq commandes d’audit classiques, enregistrées dans un seul fichier : permissions d’un script, fichiers SUID, règles sudo, tâches cron de root et comptes du système. Ta mission : repérer ce qui permettrait à un utilisateur ordinaire de devenir administrateur.",
      constraints: ["Analyse uniquement le fichier fourni : n’exécute rien sur un système réel.", "Cite la ligne qui prouve chaque réponse."],
      tools: ["Visionneuse de journaux CyberPingo", "grep (facultatif)", "Guide : audit Linux en cinq vérifications"],
      objectives: ["Repérer un fichier modifiable par tous", "Relier un script dangereux à une tâche cron de root", "Identifier un fichier SUID qui ne devrait pas l’être", "Détecter une règle sudo trop large et un compte administrateur caché"],
      hints: ["Les sections du fichier sont séparées par un en-tête qui rappelle la commande exécutée.", "Un mode qui finit par 7 donne tous les droits à tout le monde.", "Dans /etc/passwd, le troisième champ est l’UID : cherche 0 hors du compte root."],
      tasks: [
        { prompt: "Quel script est modifiable par tous les utilisateurs du système ?", hint: "Regarde la sortie de ls -l : cherche rwxrwxrwx.", answerFormat: "Chemin complet, par exemple /opt/tools/script.sh", accepted: compact([audit.worldWritableScript, bare(audit.worldWritableScript)]), explanation: `Le script ${audit.worldWritableScript} est en mode ${audit.worldWritableMode} : n’importe quel compte peut le réécrire.` },
        { prompt: "Quel est le mode numérique de ce script ?", hint: "Chaque triplet rwx vaut 7.", answerFormat: "Trois chiffres", accepted: compact([audit.worldWritableMode, "rwxrwxrwx"]), explanation: `rwx pour le propriétaire, le groupe et les autres donne ${audit.worldWritableMode}. Un script exécuté par un compte privilégié ne devrait jamais être ouvert ainsi.` },
        { prompt: "Quel compte lance ce script par une tâche cron ?", hint: "Lis la sortie de crontab -l -u root.", answerFormat: "Nom du compte", accepted: compact([audit.cronUser]), explanation: `La tâche appartient à ${audit.cronUser}. Il exécute le script avec tous les droits : en le modifiant, un simple utilisateur fait exécuter ses commandes à ${audit.cronUser}.` },
        { prompt: "Toutes les combien de minutes cette tâche s’exécute-t-elle ?", hint: "Le premier champ de la ligne cron est celui des minutes : */n signifie « toutes les n minutes ».", answerFormat: "Un nombre entier", accepted: [String(cronMinutes)], explanation: `La planification ${audit.cronSchedule} lance le script toutes les ${cronMinutes} minutes : la fenêtre pour exploiter la faille est courte.` },
        { prompt: "Combien de fichiers SUID la commande find liste-t-elle au total ?", hint: "Compte les lignes de la section « find / -perm -4000 ».", answerFormat: "Un nombre entier", accepted: [String(audit.suidCount)], explanation: `Il y a ${audit.suidCount} fichiers SUID. La plupart sont légitimes (passwd, sudo, mount) : l’audit consiste à repérer celui qui n’a rien à faire là.` },
        { prompt: "Quel fichier SUID est un outil de recherche qui permet d’obtenir un terminal root ?", hint: "Parmi les outils de la liste, un seul sert à chercher des fichiers.", answerFormat: "Chemin complet ou nom du programme", accepted: compact([audit.suidUnexpected, base(audit.suidUnexpected)]), explanation: `${audit.suidUnexpected} avec le bit SUID permet de lancer une commande avec les droits de root (option -exec). C’est un détournement classique, à retirer avec chmod u-s.` },
        { prompt: "Quel compte dispose d’une règle sudo « NOPASSWD: ALL » ?", hint: "Lis la section /etc/sudoers.d : la règle large est celle qui finit par ALL.", answerFormat: "Nom du compte", accepted: compact([audit.sudoUser]), explanation: `${audit.sudoUser} peut tout exécuter en root sans mot de passe. Une règle limitée à une commande précise, comme celle du compte compta, est saine ; celle-ci non.` },
        { prompt: "Quel compte, autre que root, a l’UID 0 ?", hint: "Le troisième champ de /etc/passwd est l’UID. La commande awk de la dernière section liste les comptes concernés.", answerFormat: "Nom du compte", accepted: compact([audit.extraRootAccount]), explanation: `Le compte ${audit.extraRootAccount} a l’UID 0 : c’est un second root, au nom proche (root à l’envers). Les ${audit.uidZeroAccounts} comptes à UID 0 de la liste sont un signe d’alerte.` },
      ],
      assets: [
        { kind: "log", title: "Audit de srv-compta01 (audit-linux-serveur.log)", description: `${audit.lineCount} lignes : permissions, fichiers SUID, règles sudo, tâches cron et comptes du système.`, url: "/labs/audit-linux-serveur.log" },
        { kind: "guide", title: "Guide : audit Linux en cinq vérifications", description: "Les commandes et les critères d’un audit Linux express.", url: "/labs/guide-audit-linux.md" },
      ],
    },
    {
      slug: "brute-force-ssh",
      title: "Force brute SSH : de l’échec à la prise de contrôle",
      description: "Le serveur web a subi une rafale de tentatives SSH pendant la nuit. Retrouve l’attaquant, le moment où il entre et ce qu’il fait ensuite.",
      difficulty: "intermediaire",
      xp: 150,
      format: "logs",
      minutes: 30,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      course: "c6",
      briefing: "Le serveur web-srv01 sert le site de la boutique. À 08 h, l’équipe de supervision signale un compte inattendu sur la machine. Le fichier auth.log de la nuit est disponible. Il mélange les connexions normales des administrateurs (par clé, depuis le réseau interne) et du bruit venu d’Internet. Ta mission : identifier l’adresse qui a mené l’attaque, le compte qu’elle visait, le moment exact où elle est entrée, puis ce qu’elle a fait après, sans te laisser piéger par un scanner inoffensif.",
      constraints: ["Ne conclus que ce que le journal prouve.", "Les heures sont en UTC, sur une seule nuit.", "Une adresse qui échoue sans jamais réussir n’est pas forcément l’attaquant."],
      tools: ["Visionneuse de journaux CyberPingo", "grep, sort et uniq (facultatif)", "Guide : lire un journal d’incident"],
      objectives: ["Trouver l’adresse la plus agressive", "Identifier le compte réel visé", "Dater l’entrée et mesurer la durée de l’attaque", "Repérer la persistance : compte créé et groupe"],
      hints: ["Filtre sur « Failed password » puis compte par adresse : l’attaquant cumule des dizaines d’échecs.", "Cherche « Accepted » : une connexion par mot de passe depuis une adresse externe est suspecte.", "Après le succès, cherche useradd et usermod."],
      tasks: [
        { prompt: "Quelle adresse IP cumule le plus de lignes « Failed password » ?", hint: "Filtre sur Failed password et compte par adresse source.", answerFormat: "Adresse IPv4", accepted: [ssh.attackerIp], explanation: `${ssh.attackerIp} cumule ${ssh.attackerFailures} échecs : c’est la source de la rafale. L’autre adresse qui échoue n’en compte que ${ssh.scannerFailures}.` },
        { prompt: "Combien de lignes « Failed password » cette adresse a-t-elle laissées au total ?", hint: "Compte les lignes, y compris celles pour « invalid user ».", answerFormat: "Un nombre entier", accepted: [String(ssh.attackerFailures)], explanation: `Il y a ${ssh.attackerFailures} échecs, répartis sur ${ssh.invalidUserCount} comptes inventés et un compte réel.` },
        { prompt: "Quel compte réel (qui existe sur la machine) l’attaquant a-t-il visé ?", hint: "Les comptes inventés sont marqués « invalid user ». Cherche l’échec qui ne l’est pas.", answerFormat: "Nom du compte", accepted: compact([ssh.targetedUser]), explanation: `Les lignes « Failed password for ${ssh.targetedUser} » (sans « invalid user ») prouvent que le compte existe : ${ssh.targetedAttempts} tentatives ont été faites dessus.` },
        { prompt: "À quelle heure (UTC, HH:MM:SS) l’attaque commence-t-elle, première ligne de l’attaquant ?", hint: "C’est la première ligne qui contient son adresse.", answerFormat: "HH:MM:SS", accepted: times(ssh.firstAttackTime), explanation: `La première ligne de l’attaquant est à ${ssh.firstAttackTime} : un essai sur un compte inventé.` },
        { prompt: "À quelle heure (UTC, HH:MM:SS) l’attaquant réussit-il à se connecter ?", hint: "Cherche « Accepted » avec l’adresse de l’attaquant.", answerFormat: "HH:MM:SS", accepted: times(ssh.successTime), explanation: `La ligne « Accepted ${ssh.authMethod} for ${ssh.targetedUser} » est à ${ssh.successTime}. C’est le moment de la compromission. L’attaque aura duré ${ssh.attackDurationSeconds} secondes.` },
        { prompt: "Combien de secondes séparent la première ligne de l’attaquant de sa connexion réussie ?", hint: "Soustrais les deux heures.", answerFormat: "Un nombre entier de secondes", accepted: [String(ssh.attackDurationSeconds)], explanation: `De ${ssh.firstAttackTime} à ${ssh.successTime}, il s’écoule ${ssh.attackDurationSeconds} secondes. Aucune limite de tentatives ne l’a freiné.` },
        { prompt: "Quel compte l’attaquant crée-t-il ensuite pour garder un accès ?", hint: "Cherche la ligne useradd après la connexion.", answerFormat: "Nom du compte", accepted: compact([ssh.newUser]), explanation: `Le compte ${ssh.newUser} est créé quelques secondes après l’ouverture d’un terminal root avec sudo : c’est une persistance.` },
        { prompt: "À quel groupe ce compte est-il ajouté, ce qui lui donne des droits d’administration ?", hint: "Cherche la ligne usermod.", answerFormat: "Nom du groupe", accepted: compact([ssh.newUserGroup]), explanation: `Le compte est ajouté au groupe ${ssh.newUserGroup} : il peut désormais lancer des commandes en administrateur.` },
        { prompt: "Quelle adresse IP a tenté root trois fois, sans jamais réussir ?", hint: "C’est la deuxième adresse qui échoue, avec très peu de lignes.", answerFormat: "Adresse IPv4", accepted: [ssh.scannerIp], explanation: `${ssh.scannerIp} est un scanner : ${ssh.scannerFailures} échecs sur root puis une fermeture avant authentification. Aucun « Accepted » : ce n’est pas l’intrusion.` },
      ],
      assets: [
        { kind: "log", title: "Journal d’authentification de web-srv01 (auth-ssh-web-srv01.log)", description: `${ssh.lineCount} lignes sur une nuit : connexions par clé, rafale d’échecs, une connexion réussie et ses conséquences.`, url: "/labs/auth-ssh-web-srv01.log" },
        guideLecture,
      ],
    },
    {
      slug: "intrusion-web",
      title: "Intrusion web : du scan au webshell",
      description: "Une page de la boutique en ligne a été exploitée. Dans le journal d’accès, retrouve l’outil de scan, l’injection SQL, la prise d’accès et la porte dérobée.",
      difficulty: "intermediaire",
      xp: 160,
      format: "logs",
      minutes: 30,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      course: "c6",
      briefing: "Le site de la boutique tourne sur un serveur Apache. Le client constate que des pages d’administration ont été modifiées. Le journal d’accès de la nuit contient le trafic normal des visiteurs et plusieurs comportements anormaux : un scanner, une série de requêtes étranges sur une page de produits, un envoi de fichier. Ta mission : reconstituer les étapes de l’attaque, de la reconnaissance jusqu’aux premières commandes exécutées sur le serveur.",
      constraints: ["Suis l’adresse suspecte du début à la fin.", "Les heures sont en UTC.", "Une adresse qui fait des fautes de frappe n’est pas un attaquant."],
      tools: ["Visionneuse de journaux CyberPingo", "grep, awk et sort (facultatif)", "Guide : lire un journal d’incident"],
      objectives: ["Identifier l’adresse et l’outil du scan", "Trouver la page vulnérable à l’injection SQL", "Dater la connexion à l’administration", "Retrouver le webshell et le premier ordre exécuté"],
      hints: ["Le scanner se déclare souvent dans le dernier champ de la ligne (le User-Agent).", "Les requêtes d’injection contiennent %27, UNION ou ORDER BY.", "Un POST sur la page de connexion suivi d’un 302 signale une connexion réussie."],
      tasks: [
        { prompt: "Quel outil de scan de vulnérabilités s’identifie dans le User-Agent des requêtes qui génèrent des 404 ?", hint: "Regarde le dernier champ des lignes de la rafale de 404.", answerFormat: "Nom de l’outil", accepted: compact([web.firstTool]), explanation: `Le User-Agent annonce ${web.firstTool} (un scanner de serveurs web très connu). Il teste des chemins courants : d’où les 404.` },
        { prompt: "Quelle adresse IP lance ce scan puis les attaques qui suivent ?", hint: "C’est la source des requêtes du scanner.", answerFormat: "Adresse IPv4", accepted: [web.attackerIp], explanation: `${web.attackerIp} cumule ${web.requestsFromAttacker} requêtes dont ${web.notFoundFromAttacker} réponses 404. L’autre adresse en 404, ${web.decoyIp}, fait de simples fautes de frappe.` },
        { prompt: "Quelle page du site est la cible de l’injection SQL ?", hint: "Les requêtes avec %27 et UNION visent toutes la même page.", answerFormat: "Chemin de la page, par exemple /page.php", accepted: compact([web.vulnerablePage, bare(web.vulnerablePage)]), explanation: `${web.vulnerablePage} reçoit ${web.injectionRequests} requêtes d’injection, dont ${web.unionRequests} avec UNION SELECT pour extraire des données.` },
        { prompt: "Combien de requêtes contiennent « UNION » dans leur adresse ?", hint: "Filtre sur UNION, sans tenir compte de la casse.", answerFormat: "Un nombre entier", accepted: [String(web.unionRequests)], explanation: `${web.unionRequests} requêtes UNION SELECT : l’attaquant a compté les colonnes avec ORDER BY, puis extrait des données d’une autre table.` },
        { prompt: "À quelle heure (UTC, HH:MM:SS) la première requête d’injection est-elle envoyée ?", hint: "Cherche la première requête avec %27 de l’attaquant.", answerFormat: "HH:MM:SS", accepted: times(web.firstInjectionTime), explanation: `La première injection est à ${web.firstInjectionTime} : une simple apostrophe pour faire échouer la requête SQL et confirmer la faille.` },
        { prompt: "À quelle heure (UTC, HH:MM:SS) l’attaquant se connecte-t-il à la page d’administration ?", hint: "Cherche POST /admin/login.php suivi d’un code 302.", answerFormat: "HH:MM:SS", accepted: times(web.loginTime), explanation: `Le POST sur la page de connexion à ${web.loginTime} reçoit un 302 : l’attaquant s’est authentifié, probablement avec des identifiants extraits par l’injection.` },
        { prompt: "Quel est le chemin du webshell que l’attaquant dépose puis appelle ?", hint: "Il apparaît dans le dossier d’envois, juste après un POST d’envoi de fichier.", answerFormat: "Chemin du fichier", accepted: compact([web.webshellPath, bare(web.webshellPath)]), explanation: `${web.webshellPath} est appelé ${web.webshellRequests} fois : une fois pour le tester, puis pour exécuter des commandes passées dans le paramètre cmd.` },
        { prompt: "À quelle heure (UTC, HH:MM:SS) la première commande est-elle exécutée via ce webshell ?", hint: "C’est la première requête sur le webshell qui contient ?cmd=.", answerFormat: "HH:MM:SS", accepted: times(web.firstCommandTime), explanation: `À ${web.firstCommandTime}, la requête ?cmd=id vérifie sous quel compte tourne le serveur web. C’est le premier ordre exécuté.` },
      ],
      assets: [
        { kind: "log", title: "Journal d’accès de la boutique (access-web-boutique.log)", description: `${web.lineCount} lignes au format combined : visiteurs normaux, scan, injection SQL, connexion et webshell.`, url: "/labs/access-web-boutique.log" },
        guideLecture,
      ],
    },
    {
      slug: "investigation-soc",
      title: "Investigation SOC : reconstituer une intrusion complète",
      description: "Évaluation finale. Trois heures de journaux consolidés du serveur web et du pare-feu : retrouve l’accès initial, le rebond, la persistance et la sortie de données.",
      difficulty: "avance",
      xp: 250,
      format: "logs",
      minutes: 45,
      requiresComputer: false,
      isAssessment: true,
      category: "securite",
      course: "c6",
      briefing: `Le SOC a consolidé en un seul fichier les journaux du serveur web ${incident.webHost} (nginx, ssh, cron) et du pare-feu fw01. Chaque ligne suit le format « horodatage ISO, machine, service, message ». Une intrusion s’est produite dans la nuit. Elle se mêle à du trafic normal et à plusieurs faux positifs : une administratrice qui se connecte depuis le bureau, un scanner qui échoue. Ta mission : reconstituer toute la chaîne (accès initial, exécution, rebond, persistance, exfiltration) avec une preuve pour chaque étape. Le modèle de rapport d’incident peut t’aider à structurer tes conclusions.`,
      constraints: ["Chaque réponse doit s’appuyer sur une ligne du fichier.", "Les heures sont en UTC (suffixe Z).", "Écarte les faux positifs en vérifiant s’il y a eu un succès.", "Le rapport fourni est un modèle : il ne remplace pas les réponses ci-dessous."],
      tools: ["Visionneuse de journaux CyberPingo", "grep, sort et uniq (facultatif)", "Modèle de rapport d’incident", "Guide : lire un journal d’incident"],
      objectives: ["Trouver l’adresse de l’attaquant et le compte compromis", "Dater l’accès initial et décrire l’exécution", "Identifier le rebond et la persistance", "Repérer la sortie de données et sa destination"],
      hints: ["Commence par les échecs d’authentification : une même adresse en cumule beaucoup.", "L’accès initial est la première connexion réussie après ces échecs.", "Pour la persistance, cherche crontab et un script placé dans /tmp.", "Pour l’exfiltration, filtre le journal du pare-feu sur ALLOW OUT."],
      tasks: [
        { prompt: "Quelle adresse IP externe a mené l’attaque, du premier échec de connexion à l’exfiltration ?", hint: "Cherche la source qui cumule des échecs d’authentification puis les requêtes suspectes.", answerFormat: "Adresse IPv4", accepted: [incident.attackerIp], explanation: `${incident.attackerIp} apparaît du premier échec jusqu’à la destination du transfert sortant : elle relie toutes les étapes.` },
        { prompt: "Combien d’échecs de connexion à l’administration web précèdent la réussite ?", hint: "Compte les lignes auth=FAILED de l’attaquant sur le serveur web.", answerFormat: "Un nombre entier", accepted: [String(incident.failedLogins)], explanation: `${incident.failedLogins} échecs : une attaque par force brute sur le compte ${incident.compromisedWebAccount}. Le premier est à ${incident.firstAttackTime}.` },
        { prompt: "Quel compte web a été compromis ?", hint: "Lis le champ user= de la première ligne auth=SUCCESS de l’attaquant.", answerFormat: "Nom du compte", accepted: compact([incident.compromisedWebAccount]), explanation: `Le compte ${incident.compromisedWebAccount} est aussi celui de la vraie administratrice : l’attaquant a deviné son mot de passe, ce qui explique pourquoi sa connexion paraît légitime.` },
        { prompt: "À quelle heure (UTC, HH:MM:SS) l’attaquant obtient-il son accès initial ?", hint: "C’est la première ligne auth=SUCCESS depuis son adresse.", answerFormat: "HH:MM:SS", accepted: times(incident.loginTime), explanation: `L’accès initial est à ${incident.loginTime}. La connexion légitime de l’administratrice, plus tôt dans la nuit, vient d’une adresse interne : ce n’est pas la même.` },
        { prompt: "Quel est le chemin du webshell déposé sur le serveur web ?", hint: "Cherche le POST d’envoi de fichier, puis la page appelée avec un paramètre c=.", answerFormat: "Chemin du fichier", accepted: compact([incident.webshellPath, bare(incident.webshellPath)]), explanation: `${incident.webshellPath} est déposé à ${incident.uploadTime} via la fonction d’envoi de l’administration, puis appelé avec c= pour lancer des commandes.` },
        { prompt: "Quel fichier de configuration l’attaquant lit-il avec son webshell pour récupérer des identifiants ?", hint: "Cherche la commande cat dans le paramètre c=.", answerFormat: "Nom du fichier", accepted: compact([incident.stolenFile, `/var/www/html/${incident.stolenFile}`]), explanation: `Il lit ${incident.stolenFile}, qui contient les identifiants de la base de données. C’est ce qui lui permet ensuite de se connecter avec un autre compte.` },
        { prompt: "Quel autre compte l’attaquant utilise-t-il pour se connecter en SSH (le rebond) ?", hint: "Cherche « Accepted password » avec l’adresse de l’attaquant.", answerFormat: "Nom du compte", accepted: compact([incident.pivotAccount]), explanation: `La connexion ${incident.pivotProtocol.toUpperCase()} avec ${incident.pivotAccount} à ${incident.pivotTime} réutilise les identifiants trouvés dans ${incident.stolenFile} : le rebond.` },
        { prompt: "Quel fichier est lancé périodiquement pour garder un accès (la persistance) ?", hint: "Cherche les lignes CRON qui lancent un script placé dans /tmp.", answerFormat: "Chemin du fichier", accepted: compact([incident.persistenceFile]), explanation: `Le script ${incident.persistenceFile} est téléchargé puis planifié avec ${incident.persistenceMethod} : il est relancé toutes les dix minutes.` },
        { prompt: "Quel mécanisme du système l’attaquant utilise-t-il pour planifier ce script ?", hint: "Le service qui journalise l’édition est celui de la planification.", answerFormat: "Nom du mécanisme", accepted: compact([incident.persistenceMethod, "cron"]), explanation: `La modification de la table de planification (${incident.persistenceMethod}) assure la persistance, même si le mot de passe du compte change.` },
        { prompt: "À quelle heure (UTC, HH:MM:SS) la première connexion sortante vers l’adresse de l’attaquant apparaît-elle dans le pare-feu ?", hint: "Filtre sur ALLOW OUT et l’adresse de l’attaquant.", answerFormat: "HH:MM:SS", accepted: times(incident.firstExfilTime), explanation: `À ${incident.firstExfilTime}, le pare-feu laisse sortir une première grosse connexion. Elle sera répétée ${incident.exfilConnections} fois : c’est l’exfiltration.` },
        { prompt: "Vers quel port de destination ces transferts sortants sont-ils envoyés ?", hint: "Lis le champ DPT= des lignes ALLOW OUT.", answerFormat: "Numéro de port", accepted: [String(incident.exfilPort)], explanation: `Le port ${incident.exfilPort} est inhabituel pour du trafic de bureau : c’est un canal de sortie choisi par l’attaquant.` },
      ],
      assets: [
        { kind: "log", title: "Journaux consolidés du SOC (incident-consolide-soc.log)", description: `${incident.lineCount} lignes de deux machines, le serveur web et le pare-feu, avec du trafic normal et des faux positifs.`, url: "/labs/incident-consolide-soc.log" },
        { kind: "report_template", title: "Modèle de rapport d’incident", description: "Un squelette de rapport : résumé, chronologie, impact, remédiation.", url: "/labs/modele-rapport-incident.md" },
        guideLecture,
      ],
    },
  ];

  const skills: PathSkill[] = [
    { slug: "lecture-journaux-linux", name: "Lecture des journaux Linux", description: "Lire /var/log, comprendre le format syslog et retrouver une ligne avec grep.", domain: "linux", lessonKey: "linux-journaux", practiceLab: "audit-linux-droits", validationLab: "investigation-soc" },
    { slug: "audit-droits-linux", name: "Audit des droits Linux", description: "Repérer les droits excessifs, les fichiers SUID, les règles sudo et les comptes cachés.", domain: "linux", lessonKey: "linux-audit-droits", practiceLab: "audit-linux-droits", validationLab: "investigation-soc" },
    { slug: "detection-bruteforce-ssh", name: "Détection d’une force brute SSH", description: "Distinguer un scanner d’une vraie intrusion dans un journal d’authentification.", domain: "detection", lessonKey: "soc-ssh-bruteforce", practiceLab: "brute-force-ssh", validationLab: "investigation-soc" },
    { slug: "analyse-logs-web", name: "Analyse des journaux web", description: "Reconnaître un scan, une injection SQL et un webshell dans un journal d’accès.", domain: "detection", lessonKey: "soc-web-logs", practiceLab: "intrusion-web", validationLab: "investigation-soc" },
    { slug: "reconstitution-incident", name: "Reconstitution d’incident", description: "Relier plusieurs sources en une chronologie et en tirer un rapport.", domain: "detection", lessonKey: "soc-chronologie", practiceLab: "investigation-soc", validationLab: "investigation-soc" },
  ];

  const badges: PathBadge[] = [
    { slug: "auditeur-linux", name: "Auditeur Linux", description: "Terminer l’audit de srv-compta01 : droits, sudo, cron et comptes.", icon: "linux", rarity: "common", xp: 40, position: 180, lab: "audit-linux-droits" },
    { slug: "chasseur-bruteforce", name: "Chasseur de force brute", description: "Retrouver l’attaquant SSH, son entrée et sa persistance.", icon: "terminal", rarity: "rare", xp: 40, position: 190, lab: "brute-force-ssh" },
    { slug: "analyste-web", name: "Analyste web", description: "Reconstituer une intrusion web, du scan au webshell.", icon: "eye", rarity: "rare", xp: 50, position: 200, lab: "intrusion-web" },
    { slug: "analyste-soc", name: "Analyste SOC", description: "Réussir l’évaluation d’investigation : de l’accès initial à l’exfiltration.", icon: "shield", rarity: "epic", xp: 60, position: 210, lab: "investigation-soc" },
    { slug: "reconstitueur-incident", name: "Reconstitueur d’incident", description: "Valider la compétence Reconstitution d’incident par l’évaluation pratique.", icon: "target", rarity: "epic", xp: 60, position: 220, skill: "reconstitution-incident" },
  ];

  const mascot: MascotSeed[] = [
    { key: "soc-challenge-1", event: "challenge", expression: "focused", text: "Dans un journal, chaque ligne est un témoin. Cherche d’abord l’adresse qui revient trop souvent.", priority: 4 },
    { key: "soc-challenge-2", event: "challenge", expression: "mission", text: "Mission d’analyste : trouve ce qui s’est passé, et prouve-le avec une ligne du fichier.", priority: 4 },
    { key: "soc-exercise-fail-1", event: "exercise_fail", expression: "thinking", text: "Vérifie l’heure : les journaux sont en UTC. Une heure de décalage change toute l’histoire.", priority: 3 },
    { key: "soc-exercise-fail-2", event: "exercise_fail", expression: "encouraging", text: "Un faux positif t’a peut-être piégé. Cherche si l’adresse a réussi à se connecter, pas seulement essayé.", priority: 3 },
    { key: "soc-exercise-success-1", event: "exercise_success", expression: "expert", text: "Bien vu ! Une bonne réponse d’analyste s’appuie toujours sur une ligne de preuve.", priority: 3 },
    { key: "soc-lab-complete-1", event: "lab_complete", expression: "proud", text: "Enquête bouclée. Pense à écrire ta chronologie : c’est la base d’un vrai rapport d’incident.", priority: 5 },
    { key: "soc-new-skill-1", event: "new_skill", expression: "expert", text: "Compétence d’investigation validée. Les équipes de sécurité cherchent exactement ce réflexe.", priority: 6 },
    { key: "soc-lesson-start-1", event: "lesson_start", expression: "explanation", text: "Un journal se lit comme une histoire : qui, quoi, quand, d’où. Garde ces quatre questions en tête.", priority: 2 },
  ];

  const lessonMinutes = (prefix: string) => modules
    .filter((module) => module.key.startsWith(prefix))
    .flatMap((module) => module.lessons)
    .reduce((sum, lesson) => sum + lesson.minutes, 0);

  const courseUpdates = [
    { slug: "linux", lessonMinutes: lessonMinutes("c3:") },
    { slug: "analyse-logs", lessonMinutes: lessonMinutes("c6:") },
  ];

  return { domains: [] as never[], modules, labs, skills, badges, existingBadgeRarity: {}, mascot, courseUpdates };
}
