// Authoring content of the complete "Réseaux" path: domains, new modules and lessons, quizzes, four
// labs with auto-checked tasks, skills, badges and the mascot's lines. It is read by
// scripts/generate-reseaux-seed.cjs, which turns it into supabase/seed/02_reseaux_path.sql.
// The expected lab answers come from `facts`, computed by scripts/generate-lab-assets.cjs from the very
// files learners download, so the answers cannot drift away from the captures.

import { figure } from "./path-kit";

export interface SubnetFacts { network: string; broadcast: string; first: string; last: string; hosts: number }

export interface LabFacts {
  instable: { clientIp: string; dnsServerIp: string; dnsServerMac: string; resolvedName: string; resolvedIp: string; refusedPort: number; silentIp: string; silentSynCount: number };
  evaluation: {
    clientIp: string; dnsServerIp: string; resolvedName: string; resolvedIp: string; serverIp: string; scannerIp: string;
    probedPorts: number; openPorts: number[]; databasePort: number; mask: number; serverSubnet: SubnetFacts; scannerSubnet: SubnetFacts; sameSubnet: boolean;
  };
  firewall: { attackerIp: string; serverIp: string; attackerDenyCount: number; attackerTopPort: number; firstAllowTime: string; allowRule: string; outboundPort: number };
  packetTracer: { network: string; prefix: number; mask: string; hostsPerSubnet: number; subnets: Array<{ name: string } & SubnetFacts> };
}

export interface PathBlock { type: "text" | "schema" | "code" | "example" | "callout"; content: string; language?: string }
export interface PathQuestion { type: "single_choice" | "true_false"; prompt: string; options: string[]; correct: number; explanation: string; difficulty: "facile" | "moyen" | "difficile" }
export interface PathLesson { key: string; title: string; summary: string; minutes: number; xp: number; blocks: PathBlock[]; quiz?: { title: string; questions: PathQuestion[] } }
export interface PathModule { key: string; title: string; description: string; lessons: PathLesson[] }
export interface PathTask { prompt: string; hint: string; answerFormat: string; accepted: string[]; explanation: string }
export interface PathAsset { kind: "log" | "pcap" | "pkt" | "guide" | "image" | "topology" | "report_template"; title: string; description: string; url: string }
export interface PathLab {
  slug: string; title: string; description: string; difficulty: "debutant" | "intermediaire" | "avance"; xp: number;
  format: "pcap" | "logs" | "packet_tracer"; minutes: number; requiresComputer: boolean; isAssessment: boolean;
  briefing: string; constraints: string[]; tools: string[]; objectives: string[]; hints: string[]; tasks: PathTask[]; assets: PathAsset[];
}
export interface PathSkill {
  slug: string; name: string; description: string; lessonKey: string; practiceLab: string; validationLab?: string; domain?: string;
}
export interface PathBadge { slug: string; name: string; description: string; icon: string; rarity: "common" | "rare" | "epic" | "legendary"; xp: number; position: number; lab?: string; skill?: string }
export interface PathDomain { slug: string; name: string; description: string; icon: string; categories: string[] }
export interface MascotSeed { key: string; event: string; expression: string; text: string; priority: number }

const callout = (content: string): PathBlock => ({ type: "callout", content });
const text = (content: string): PathBlock => ({ type: "text", content });
const videoSlot = (title: string): PathBlock => callout(`Vidéo à venir : ${title}`);

const lower = (value: string) => value.toLowerCase();
const compact = (values: string[]) => Array.from(new Set(values.map(lower)));

const questions = {
  tf: (prompt: string, truth: boolean, explanation: string, difficulty: PathQuestion["difficulty"] = "facile"): PathQuestion => ({
    type: "true_false", prompt, options: ["Vrai", "Faux"], correct: truth ? 0 : 1, explanation, difficulty,
  }),
  choice: (prompt: string, options: string[], correct: number, explanation: string, difficulty: PathQuestion["difficulty"] = "facile"): PathQuestion => ({
    type: "single_choice", prompt, options, correct, explanation, difficulty,
  }),
};

export function buildReseauxPath(facts: LabFacts) {
  const { instable, evaluation, firewall, packetTracer } = facts;
  const [direction, atelier, compta, invites] = packetTracer.subnets;
  const evalOpenPorts = evaluation.openPorts.length;

  const domains: PathDomain[] = [
    { slug: "fondamentaux", name: "Fondamentaux", description: "Les bases de la cybersécurité : menaces, hygiène numérique, vocabulaire.", icon: "fondamentaux", categories: ["Fondamentaux"] },
    { slug: "reseaux", name: "Réseaux", description: "Adressage, protocoles et lecture du trafic : le socle de tout le reste.", icon: "reseaux", categories: ["Réseaux"] },
    { slug: "linux", name: "Linux", description: "Maîtriser le terminal, les droits et les services d’un système Linux.", icon: "linux", categories: ["Linux"] },
    { slug: "securite-web", name: "Sécurité Web", description: "Comprendre et corriger les failles des applications web.", icon: "securite-web", categories: ["Sécurité Web"] },
    { slug: "pentest", name: "Pentest éthique", description: "Tester un système avec autorisation pour mieux le défendre.", icon: "pentest-intro", categories: ["Pentest"] },
    { slug: "detection", name: "Détection et logs", description: "Lire les journaux, repérer les anomalies, documenter un incident.", icon: "analyse-logs", categories: ["Détection"] },
  ];

  const modules: PathModule[] = [
    {
      key: "c2:3",
      title: "Adresser et segmenter",
      description: "Lire une adresse IPv4, la masquer et découper un réseau en sous-réseaux.",
      lessons: [
        {
          key: "reseaux-ipv4",
          title: "Adresses IPv4 et masques",
          summary: "Décomposer une adresse IPv4, comprendre le masque et trouver l’adresse réseau.",
          minutes: 18,
          xp: 25,
          blocks: [
            callout("Objectifs : lire une adresse IPv4, comprendre le rôle d’un masque, calculer l’adresse réseau et l’adresse de diffusion d’un réseau simple."),
            text("Une adresse IPv4 identifie une machine sur un réseau. Elle contient 32 bits, écrits en quatre nombres de 0 à 255 séparés par des points : 192.168.10.23. Chaque nombre est un octet (8 bits). Sans adresse, une machine ne peut ni recevoir ni envoyer de paquets."),
            videoSlot("Lire une adresse IPv4 et son masque en 5 minutes"),
            text("Une adresse se compose de deux parties : la partie réseau (qui désigne le réseau) et la partie hôte (qui désigne la machine dans ce réseau). Le masque de sous-réseau indique où passe la frontière. Dans 255.255.255.0, les trois premiers octets forment la partie réseau et le dernier la partie hôte."),
            { type: "schema", content: figure({
              kind: "table",
              title: "Adresse, masque, réseau et diffusion",
              columns: ["Élément", "Décimal", "Binaire", "Rôle"],
              rows: [
                ["Adresse", "192.168.10.23", "11000000.10101000.00001010.00010111", "3 premiers octets = réseau, dernier = hôte"],
                ["Masque", "255.255.255.0", "11111111.11111111.11111111.00000000", "bits réseau à 1, bits hôte à 0"],
                ["Réseau", "192.168.10.0", "adresse ET masque", "bits hôte à 0"],
                ["Diffusion", "192.168.10.255", "tous les bits hôte à 1", "atteint tout le réseau"],
              ],
              mono: [1, 2],
              caption: "Le masque place la frontière : ici, les trois premiers octets désignent le réseau et le dernier l’hôte.",
            }).content },
            text("Pour trouver l’adresse réseau, on applique un ET logique entre l’adresse et le masque : les bits hôte passent à 0. L’adresse de diffusion (broadcast) met tous les bits hôte à 1 : un paquet envoyé à cette adresse atteint toutes les machines du réseau. Ces deux adresses sont réservées et ne peuvent pas être attribuées à une machine."),
            { type: "code", language: "bash", content: "# Linux : voir l'adresse et le masque de ses interfaces\nip -4 addr show\n# Windows\nipconfig" },
            text("Certaines plages sont privées et ne sont jamais routées sur Internet : 10.0.0.0/8, 172.16.0.0/12 et 192.168.0.0/16. Elles servent dans les réseaux d’entreprise et les box domestiques. Une adresse privée atteint Internet grâce à la traduction d’adresse (NAT) faite par le routeur."),
            { type: "example", content: "Exemple : 192.168.10.23 avec le masque 255.255.255.0. Le réseau est 192.168.10.0, la diffusion 192.168.10.255, et les machines utilisables vont de 192.168.10.1 à 192.168.10.254 (254 adresses)." },
            callout("À retenir : adresse + masque = réseau + hôte. L’adresse réseau a tous les bits hôte à 0, l’adresse de diffusion tous les bits hôte à 1."),
          ],
          quiz: {
            title: "Quiz : adresses IPv4 et masques",
            questions: [
              questions.choice("Combien de bits contient une adresse IPv4 ?", ["16", "32", "48", "128"], 1, "Une adresse IPv4 fait 32 bits, soit quatre octets."),
              questions.choice("Quelle est l’adresse réseau de 192.168.10.23 avec le masque 255.255.255.0 ?", ["192.168.10.1", "192.168.10.255", "192.168.10.0", "192.168.0.0"], 2, "On met à 0 tous les bits de la partie hôte : le dernier octet devient 0.", "moyen"),
              questions.tf("L’adresse 192.168.10.255, avec le masque 255.255.255.0, peut être attribuée à un ordinateur.", false, "C’est l’adresse de diffusion du réseau : elle est réservée.", "moyen"),
            ],
          },
        },
        {
          key: "reseaux-cidr",
          title: "Sous-réseaux et notation CIDR",
          summary: "Découper un réseau avec la notation CIDR et compter les adresses utilisables.",
          minutes: 22,
          xp: 30,
          blocks: [
            callout("Objectifs : lire la notation /n, calculer la taille d’un sous-réseau, découper un /24 en quatre /26 et trouver réseau, premières et dernières adresses utilisables, diffusion."),
            text("La notation CIDR écrit le masque sous forme d’un nombre de bits : /24 signifie « les 24 premiers bits forment la partie réseau ». Elle est plus courte que 255.255.255.0 et c’est celle que vous verrez dans la plupart des outils. Plus le nombre après la barre est grand, plus le réseau est petit."),
            videoSlot("Découper un réseau en sous-réseaux sans se tromper"),
            { type: "schema", content: figure({
              kind: "table",
              title: "Préfixes CIDR courants",
              columns: ["Préfixe", "Masque", "Adresses", "Utilisables"],
              rows: [
                ["/24", "255.255.255.0", "256 adresses", "254 utilisables"],
                ["/25", "255.255.255.128", "128 adresses", "126 utilisables"],
                ["/26", "255.255.255.192", "64 adresses", "62 utilisables"],
                ["/27", "255.255.255.224", "32 adresses", "30 utilisables"],
                ["/28", "255.255.255.240", "16 adresses", "14 utilisables"],
                ["/29", "255.255.255.248", "8 adresses", "6 utilisables"],
                ["/30", "255.255.255.252", "4 adresses", "2 utilisables"],
              ],
              mono: [0, 1],
              highlight: 3,
            }).content },
            text("Pour un préfixe /n, il reste 32 − n bits pour les hôtes. Le sous-réseau contient 2^(32 − n) adresses, dont deux sont réservées (réseau et diffusion) : 2^(32 − n) − 2 sont utilisables. Pour un /26 : 2^6 = 64 adresses, donc 62 machines."),
            text("Pourquoi découper ? Séparer les services (direction, atelier, invités) limite les dégâts d’une intrusion, réduit le trafic de diffusion et permet d’appliquer des règles de pare-feu entre les groupes. Un réseau invités ne devrait jamais pouvoir joindre la comptabilité."),
            { type: "schema", content: figure({
              kind: "table",
              title: "192.168.20.0/24 découpé en quatre /26",
              columns: ["Sous-réseau", "Réseau", "Utilisables", "Diffusion"],
              rows: [
                ["192.168.20.0/26", "réseau .0", "utilisables .1 à .62", "diffusion .63"],
                ["192.168.20.64/26", "réseau .64", "utilisables .65 à .126", "diffusion .127"],
                ["192.168.20.128/26", "réseau .128", "utilisables .129 à .190", "diffusion .191"],
                ["192.168.20.192/26", "réseau .192", "utilisables .193 à .254", "diffusion .255"],
              ],
              mono: [0],
            }).content },
            { type: "code", language: "bash", content: "# Vérifier un calcul avec Python (disponible partout)\npython3 -c \"import ipaddress as i; n=i.ip_network('192.168.20.64/26'); print(n.network_address, n.broadcast_address, n.num_addresses-2)\"" },
            { type: "example", content: "Exemple : 192.168.10.99/26. Les blocs font 64 adresses (0, 64, 128, 192). 99 est dans le bloc 64 à 127 : réseau 192.168.10.64, diffusion 192.168.10.127. Le serveur 192.168.10.50 est dans le bloc 0 à 63 : les deux machines ne sont pas dans le même sous-réseau." },
            callout("À retenir : taille du bloc = 2^(32 − n). Les sous-réseaux commencent à des multiples de cette taille. Utilisables = taille − 2."),
          ],
          quiz: {
            title: "Quiz : sous-réseaux et CIDR",
            questions: [
              questions.choice("Combien de machines peut-on adresser dans un sous-réseau /27 ?", ["32", "30", "62", "28"], 1, "Un /27 contient 32 adresses, moins l’adresse réseau et l’adresse de diffusion : 30.", "moyen"),
              questions.choice("Quelle est l’adresse de diffusion de 10.0.0.64/26 ?", ["10.0.0.127", "10.0.0.128", "10.0.0.255", "10.0.0.100"], 0, "Le bloc va de 10.0.0.64 à 10.0.0.127. La dernière adresse du bloc est celle de diffusion.", "moyen"),
              questions.choice("Combien de sous-réseaux /26 contient un réseau /24 ?", ["2", "4", "6", "8"], 1, "Un /24 compte 256 adresses et un /26 en compte 64 : 256 / 64 = 4.", "facile"),
            ],
          },
        },
      ],
    },
    {
      key: "c2:4",
      title: "Lire un échange TCP",
      description: "Suivre une connexion TCP, comprendre les ports et retrouver une adresse avec DNS et ARP.",
      lessons: [
        {
          key: "reseaux-tcp",
          title: "Le handshake TCP et les ports",
          summary: "Comprendre les trois temps d’une connexion TCP et lire ce que signifie un port ouvert, fermé ou filtré.",
          minutes: 20,
          xp: 30,
          blocks: [
            callout("Objectifs : décrire le handshake TCP (SYN, SYN-ACK, ACK), reconnaître un port ouvert, fermé ou filtré et associer les ports courants à leurs services."),
            text("TCP établit une connexion fiable entre deux machines avant d’échanger des données. Cette ouverture se fait en trois temps, le « handshake » : le client envoie SYN, le serveur répond SYN-ACK, le client confirme avec ACK. Ensuite seulement les données circulent."),
            videoSlot("Le handshake TCP expliqué pas à pas"),
            { type: "schema", content: figure({
              kind: "steps",
              title: "Ouverture puis fermeture d’une connexion TCP vers le port 80",
              items: [
                { title: "SYN", text: "Client vers serveur : « je veux me connecter »" },
                { title: "SYN-ACK", text: "Serveur vers client : « d’accord, moi aussi »" },
                { title: "ACK", text: "Client vers serveur : « c’est établi »" },
                { title: "Données HTTP", text: "Client vers serveur : la requête peut circuler" },
                { title: "FIN", text: "Client vers serveur : fermeture propre" },
              ],
            }).content },
            text("Un port identifie un service sur une machine, comme un numéro de guichet. Le port 80 est utilisé par HTTP, 443 par HTTPS, 22 par SSH, 53 par DNS, 3306 par MySQL et 3389 par le Bureau à distance Windows. Une connexion est définie par quatre éléments : adresse et port source, adresse et port destination."),
            text("Ce que répond une machine à un SYN raconte l’état du port. Un port ouvert répond SYN-ACK. Un port fermé répond RST (« rupture immédiate »), la machine est joignable mais aucun service n’écoute. Un port filtré ne répond rien : un pare-feu jette le paquet, ou la machine est éteinte, et le client réessaie en vain."),
            { type: "schema", content: figure({
              kind: "compare",
              title: "Ce qu’un SYN révèle sur l’état du port",
              sides: [
                { title: "Port OUVERT", tone: "green", items: ["SYN envoyé", "SYN-ACK reçu"] },
                { title: "Port FERMÉ", tone: "red", items: ["SYN envoyé", "RST ou RST-ACK reçu", "machine joignable"] },
                { title: "Port FILTRÉ ou machine injoignable", tone: "amber", items: ["SYN envoyé", "rien, puis SYN répétés"] },
              ],
              verdict: "SYN-ACK = ouvert, RST = fermé, silence = filtré ou machine injoignable.",
            }).content },
            { type: "code", language: "bash", content: "# Tester un port sans rien envoyer d'autre qu'une connexion\nnc -vz 192.168.10.50 80\n# Voir les services qui écoutent sur sa propre machine\nss -tln" },
            { type: "example", content: "Exemple : un client envoie un SYN vers 192.168.10.60 sur le port 8080 et reçoit immédiatement RST-ACK : la machine est là, mais rien n’écoute sur ce port. Un SYN vers 192.168.10.70 sur le port 22 reste sans réponse, même après trois retransmissions : un filtrage est probable." },
            callout("À retenir : SYN-ACK = ouvert, RST = fermé, silence = filtré ou injoignable. Une machine qui répond RST est vivante."),
          ],
          quiz: {
            title: "Quiz : handshake TCP et ports",
            questions: [
              questions.choice("Quelle est la bonne séquence d’ouverture d’une connexion TCP ?", ["SYN, ACK, SYN-ACK", "SYN, SYN-ACK, ACK", "ACK, SYN, SYN-ACK", "SYN-ACK, SYN, ACK"], 1, "Le client envoie SYN, le serveur répond SYN-ACK, le client termine par ACK."),
              questions.choice("Un client envoie un SYN et reçoit immédiatement RST-ACK. Que peut-on conclure ?", ["Le port est fermé mais la machine est joignable", "Le port est filtré par un pare-feu", "La connexion est établie", "La machine est éteinte"], 0, "Un RST est la réponse d’une machine vivante dont aucun service n’écoute sur ce port.", "moyen"),
              questions.choice("Quel port est utilisé par défaut par HTTPS ?", ["22", "53", "443", "3389"], 2, "HTTPS utilise le port 443. Le 22 est SSH, le 53 DNS et le 3389 le Bureau à distance."),
            ],
          },
        },
        {
          key: "reseaux-dns-arp",
          title: "DNS et ARP : retrouver une adresse",
          summary: "Distinguer ce que résolvent DNS (noms vers IP) et ARP (IP vers adresse MAC) dans un échange réel.",
          minutes: 18,
          xp: 25,
          blocks: [
            callout("Objectifs : expliquer le rôle de DNS et d’ARP, savoir lesquels voyagent sur le réseau local ou au-delà et les repérer dans une capture."),
            text("Pour afficher un site, ton ordinateur doit passer par deux traductions. Le DNS transforme un nom (intranet.cyberpingo.lab) en adresse IP. Puis, sur le réseau local, ARP transforme l’adresse IP du voisin en adresse MAC, l’identifiant matériel de sa carte réseau, car les trames Ethernet se livrent avec des adresses MAC."),
            videoSlot("DNS et ARP : deux annuaires, deux rôles"),
            { type: "schema", content: figure({
              kind: "steps",
              title: "Avant le HTTP : DNS, ARP, puis TCP",
              items: [
                { title: "DNS", text: "`intranet.cyberpingo.lab` donne `192.168.10.50` en UDP, port 53" },
                { title: "ARP", text: "« qui a 192.168.10.2 ? » donne `00:1b:21:aa:00:02` en diffusion locale" },
                { title: "TCP", text: "SYN vers `192.168.10.50:80` : la connexion commence" },
              ],
            }).content },
            text("ARP fonctionne par diffusion : « Qui a l’adresse 192.168.10.2 ? Répondez à 192.168.10.23 ». Toutes les machines du réseau local reçoivent la question, seule la bonne répond, en unicast, avec son adresse MAC. Cette absence de contrôle rend ARP vulnérable à l’usurpation (ARP spoofing) : n’importe quelle machine peut répondre."),
            text("DNS interroge un serveur (souvent celui de la box ou de l’entreprise) en UDP sur le port 53. La réponse contient un enregistrement A (adresse IPv4) et une durée de vie (TTL) pendant laquelle le résultat peut être gardé en cache. Un DNS falsifié peut rediriger vers un faux site : c’est le DNS spoofing."),
            { type: "code", language: "bash", content: "# Voir le cache ARP (voisins locaux)\narp -a\n# Interroger un nom de domaine\nnslookup intranet.cyberpingo.lab 192.168.10.2\ndig +short intranet.cyberpingo.lab" },
            { type: "example", content: "Exemple : dans une capture, le client 192.168.10.23 diffuse une requête ARP pour 192.168.10.2, puis envoie une question DNS à cette adresse. La réponse DNS donne l’adresse du serveur web, et c’est seulement après que le handshake TCP commence." },
            callout("À retenir : DNS = nom vers IP, ARP = IP vers MAC. ARP reste dans le réseau local, DNS peut traverser des routeurs."),
          ],
          quiz: {
            title: "Quiz : DNS et ARP",
            questions: [
              questions.choice("Que fait le protocole ARP ?", ["Il traduit un nom de domaine en IP", "Il traduit une adresse IP en adresse MAC sur le réseau local", "Il chiffre les échanges", "Il attribue des adresses IP"], 1, "ARP associe une adresse IP à l’adresse MAC de la machine correspondante, sur le réseau local."),
              questions.tf("Une requête ARP est envoyée en diffusion à tout le réseau local.", true, "La question « qui a cette adresse ? » est diffusée, seule la machine concernée répond.", "moyen"),
              questions.choice("Sur quel port UDP un serveur DNS écoute-t-il par défaut ?", ["22", "53", "80", "443"], 1, "DNS utilise le port 53, en UDP pour la plupart des requêtes.", "facile"),
            ],
          },
        },
      ],
    },
    {
      key: "c2:5",
      title: "Capture et analyse",
      description: "Lire une capture de paquets et reconnaître le comportement d’un scan de ports.",
      lessons: [
        {
          key: "reseaux-pcap",
          title: "Lire une capture de paquets",
          summary: "Ouvrir un fichier .pcap, filtrer le trafic et retrouver qui parle à qui.",
          minutes: 22,
          xp: 30,
          blocks: [
            callout("Objectifs : expliquer ce qu’est une capture, lire les colonnes d’un paquet, appliquer des filtres et raconter un échange réseau de bout en bout."),
            text("Une capture de paquets (fichier .pcap) est un enregistrement du trafic qui passe à un endroit du réseau. Chaque paquet est horodaté et contient ses en-têtes (Ethernet, IP, TCP ou UDP) et parfois ses données. C’est l’outil de base d’un analyste : on ne devine pas ce qui s’est passé, on le relit."),
            videoSlot("Ouvrir une capture et raconter ce qui s’est passé"),
            text("Dans la visionneuse de CyberPingo, comme dans Wireshark, chaque ligne affiche l’heure relative, la source, la destination, le protocole et un résumé. Lis dans l’ordre : qui initie la conversation, qui répond, quel service est visé et si la réponse est positive (SYN-ACK, réponse DNS) ou négative (RST)."),
            { type: "schema", content: figure({
              kind: "table",
              title: "Lecture rapide de quatre paquets",
              columns: ["No.", "Temps", "Source", "Destination", "Proto", "Info"],
              rows: [
                ["1", "0.0000", "192.168.10.23", "broadcast", "ARP", "Who has 192.168.10.2 ?"],
                ["2", "0.0010", "192.168.10.2", "192.168.10.23", "ARP", "192.168.10.2 is at 00:1b:21:aa:00:02"],
                ["3", "0.0020", "192.168.10.23", "192.168.10.2", "DNS", "Standard query A intranet.cyberpingo.lab"],
                ["4", "0.0140", "192.168.10.2", "192.168.10.23", "DNS", "Standard query response A 192.168.10.50"],
              ],
              mono: [0, 1, 2, 3, 4, 5],
            }).content },
            text("Les filtres réduisent le bruit : ip.addr == 192.168.10.23 ne garde que cette machine, dns n’affiche que les échanges DNS, tcp.port == 8080 isole un service, tcp.flags.reset == 1 montre les connexions refusées. Un bon réflexe : commencer large, puis filtrer pour confirmer une hypothèse."),
            { type: "code", language: "bash", content: "# Lire une capture en ligne de commande (tcpdump)\ntcpdump -nn -r capture.pcap\n# Ne garder que les ouvertures de connexion TCP\ntcpdump -nn -r capture.pcap 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn'" },
            text("Une règle à respecter : ne capture du trafic que sur des réseaux que tu administres ou avec une autorisation écrite. Une capture contient des données privées (noms, mots de passe en clair, pages visitées) et sa collecte non autorisée est illégale dans la plupart des pays."),
            { type: "example", content: "Exemple : dans le laboratoire « Réseau instable », tu relis une capture de 22 paquets. Les tâches te demandent de retrouver l’adresse du client, l’adresse MAC qui répond à ARP, l’adresse renvoyée par DNS et le port qui refuse la connexion." },
            callout("À retenir : lis une capture dans l’ordre, repère qui parle, à quel service et si la réponse est positive. Filtre pour confirmer une hypothèse, pas pour chercher au hasard."),
          ],
          quiz: {
            title: "Quiz : lire une capture",
            questions: [
              questions.choice("Que contient un fichier .pcap ?", ["Une copie du trafic réseau enregistré, paquet par paquet", "La liste des mots de passe d’un réseau", "Un schéma du réseau", "Les règles du pare-feu"], 0, "Un fichier .pcap enregistre les paquets observés, avec leur heure."),
              questions.choice("Quel filtre Wireshark n’affiche que les échanges DNS ?", ["dns", "ip.dns", "port 53 only", "show dns"], 0, "Le filtre d’affichage « dns » suffit à isoler ces paquets."),
              questions.tf("Il est légal de capturer le trafic de n’importe quel réseau Wi-Fi public pour s’entraîner.", false, "Capturer le trafic d’autrui sans autorisation est illégal. On s’entraîne sur ses propres réseaux ou sur des fichiers fournis.", "moyen"),
            ],
          },
        },
        {
          key: "reseaux-scan",
          title: "Repérer un scan de ports",
          summary: "Reconnaître la signature d’un scan SYN dans une capture ou dans un journal de pare-feu.",
          minutes: 24,
          xp: 35,
          blocks: [
            callout("Objectifs : expliquer comment fonctionne un scan SYN, le reconnaître dans une capture et dans un journal de pare-feu et savoir comment s’en protéger."),
            text("Un scan de ports sonde une machine pour savoir quels services elle expose. C’est la première étape de beaucoup d’attaques, mais aussi un outil légitime d’audit quand il est autorisé. Pour le défenseur, la question est de le voir et de le distinguer d’un trafic normal."),
            videoSlot("À quoi ressemble un scan dans une capture ?"),
            text("Le scan SYN (« demi-ouvert ») envoie un SYN sur chaque port sans terminer le handshake. Si le port est ouvert, la cible répond SYN-ACK et le scanner envoie RST pour ne pas ouvrir la connexion. S’il est fermé, la cible répond RST-ACK. S’il est filtré, le scanner n’obtient aucune réponse."),
            { type: "schema", content: figure({
              kind: "compare",
              title: "Scan SYN : réponse d’un port ouvert ou fermé",
              sides: [
                {
                  title: "Port ouvert",
                  tone: "green",
                  items: ["Scanner envoie SYN vers la cible", "Cible répond SYN-ACK", "Scanner renvoie RST et ne finit jamais le handshake"],
                },
                {
                  title: "Port fermé",
                  tone: "red",
                  items: ["Scanner envoie SYN vers la cible", "Cible répond RST-ACK"],
                },
              ],
              verdict: "Le scan SYN est demi-ouvert : il sonde sans établir la connexion complète.",
            }).content },
            text("Signature d’un scan : une même source envoie en quelques millisecondes des SYN vers beaucoup de ports différents d’une même cible, souvent avec le même port source. Dans un journal de pare-feu, on voit une même adresse accumuler des DENY sur des ports variés, puis parfois un ALLOW fautif sur un service sensible comme SSH."),
            { type: "code", language: "bash", content: "# Seulement sur un réseau que tu administres ou avec autorisation écrite\nnmap -sS -p 1-1024 192.168.10.50\n\n# Côté défense : compter les refus par source dans un journal\ngrep DENY firewall.log | grep -o 'src=[0-9.]*' | sort | uniq -c | sort -nr | head" },
            text("Se défendre : exposer le minimum de ports, refuser par défaut, limiter le nombre de connexions par source, journaliser et surveiller les refus répétés, et traiter toute règle d’autorisation temporaire comme un risque à retirer. Un scan n’est pas une intrusion en soi, mais une règle trop permissive après un scan en est souvent la suite."),
            { type: "example", content: "Exemple : dans le laboratoire d’évaluation, 192.168.10.99 envoie un SYN vers 14 ports du serveur en moins de 50 ms. Quatre ports répondent SYN-ACK : ce sont les services ouverts que l’attaquant a découverts." },
            callout("À retenir : beaucoup de ports, une même source, très peu de temps, le même port source. SYN-ACK suivi de RST révèle un port ouvert sondé par un scan demi-ouvert."),
          ],
          quiz: {
            title: "Quiz : repérer un scan",
            questions: [
              questions.choice("Que renvoie un serveur à un SYN sur un port ouvert ?", ["RST", "SYN-ACK", "FIN", "Rien"], 1, "Un port ouvert répond SYN-ACK, c’est la deuxième étape du handshake."),
              questions.choice("Quel indice évoque le plus un scan de ports ?", ["Un client qui charge une page web", "Une même source qui envoie des SYN vers de nombreux ports en quelques millisecondes", "Une requête DNS", "Une requête ARP"], 1, "Un grand nombre de ports sondés par une même source en très peu de temps est la signature d’un scan.", "moyen"),
              questions.tf("Un scan SYN termine le handshake TCP pour tous les ports ouverts.", false, "Le scanner envoie RST après le SYN-ACK : le handshake n’est jamais terminé, d’où le nom de scan demi-ouvert.", "difficile"),
            ],
          },
        },
      ],
    },
    {
      key: "c2:6",
      title: "Pratique et évaluation",
      description: "Passer de la théorie à la pratique avec Packet Tracer, puis valider tes compétences.",
      lessons: [
        {
          key: "reseaux-packet-tracer",
          title: "Packet Tracer : de la théorie à la pratique",
          summary: "Préparer le laboratoire Packet Tracer : ce que CyberPingo fournit, ce que tu fais dans le logiciel, comment rendre ton travail.",
          minutes: 15,
          xp: 20,
          blocks: [
            callout("Objectifs : comprendre le rôle de Packet Tracer, préparer ton poste, suivre la démarche du laboratoire et savoir comment rendre ton travail."),
            text("Cisco Packet Tracer est un simulateur gratuit : on y place des routeurs, des commutateurs et des PC, on les câble et on les configure comme sur un vrai réseau. C’est un excellent terrain d’entraînement quand on n’a pas de matériel."),
            callout("Packet Tracer s’exécute sur ton ordinateur, pas dans CyberPingo. La plateforme te donne le sujet, la topologie, un guide, des critères de validation et un espace pour rendre ton travail. Les calculs du laboratoire se valident ici, sans le logiciel."),
            videoSlot("Prendre en main Packet Tracer en 10 minutes"),
            text("Le fonctionnement du laboratoire : tu lis le briefing de l’atelier Kora, tu télécharges la topologie et le guide, tu construis le réseau dans Packet Tracer, tu calcules le plan d’adressage et tu saisis tes résultats dans les tâches de CyberPingo. Un rapport est facultatif : si tu le déposes, un formateur le relit et te répond."),
            { type: "schema", content: figure({
              kind: "network",
              title: "Topologie de départ pour Packet Tracer",
              cols: 3,
              rows: 3,
              nodes: [
                { id: "r1", label: "R1", sub: "passerelle", icon: "router", col: 0, row: 1, tone: "violet" },
                { id: "s1", label: "S1", icon: "switch", col: 1, row: 0, tone: "green" },
                { id: "dir", label: "PC-Direction", sub: "sous-réseau 1", icon: "pc", col: 2, row: 0 },
                { id: "s2", label: "S2", icon: "switch", col: 1, row: 1, tone: "green" },
                { id: "atelier", label: "PC-Atelier", sub: "sous-réseau 2", icon: "pc", col: 2, row: 1 },
                { id: "s3", label: "S3", icon: "switch", col: 1, row: 2, tone: "green" },
                { id: "compta", label: "PC-Comptabilité", sub: "sous-réseau 3", icon: "pc", col: 2, row: 2 },
              ],
              links: [
                { from: "r1", to: "s1", label: "Gi0/0" },
                { from: "s1", to: "dir" },
                { from: "r1", to: "s2", label: "Gi0/1" },
                { from: "s2", to: "atelier" },
                { from: "r1", to: "s3", label: "Gi0/2" },
                { from: "s3", to: "compta" },
              ],
            }).content },
            { type: "code", language: "text", content: "enable\nconfigure terminal\ninterface GigabitEthernet0/0\n ip address 192.168.20.1 255.255.255.192\n no shutdown\nend\nshow ip interface brief" },
            text("Pas de Packet Tracer sous la main ? Tu peux faire les calculs à la main ou avec un outil comme Python (module ipaddress). Les tâches se valident de la même façon. Tu peux revenir au logiciel plus tard pour tester le plan que tu as calculé."),
            callout("À retenir : Packet Tracer sert à pratiquer. CyberPingo valide tes résultats et ton rapport. Aucun fichier .pkt n’est exécuté sur la plateforme."),
          ],
        },
      ],
    },
  ];

  const sameAnswer = evaluation.sameSubnet ? ["oui", "yes"] : ["non", "no"];
  const labs: PathLab[] = [
    {
      slug: "reseau-instable",
      title: "Réseau instable : lire une capture",
      description: "Un collègue signale que l’intranet répond par intermittence. Il te fournit une capture : retrouve qui parle, qui refuse et qui reste muet.",
      difficulty: "debutant",
      xp: 120,
      format: "pcap",
      minutes: 25,
      requiresComputer: false,
      isAssessment: false,
      briefing: "Un utilisateur se plaint que l’intranet est lent et que deux services internes ne répondent pas. Le service informatique a capturé le trafic de son poste pendant quelques secondes. Ta mission : analyser cette capture pour comprendre ce qui fonctionne (nom, adresse, page web) et ce qui échoue (un port refusé, un hôte qui ne répond jamais).",
      constraints: ["Analyse uniquement le fichier fourni : ne scanne aucun réseau réel.", "Relis les paquets dans l’ordre chronologique avant de répondre."],
      tools: ["Visionneuse de capture CyberPingo", "Wireshark (facultatif)", "tcpdump (facultatif)"],
      objectives: ["Identifier le poste qui a généré le trafic", "Associer une adresse IP à une adresse MAC avec ARP", "Suivre une résolution DNS puis un handshake TCP", "Distinguer un port fermé d’un hôte silencieux"],
      hints: ["Les premiers paquets de la capture sont ARP, puis DNS.", "RST-ACK signifie que le port est fermé. Un SYN répété sans réponse est autre chose.", "Compte les lignes SYN envoyées vers l’hôte silencieux, retransmissions comprises."],
      tasks: [
        { prompt: "Quelle est l’adresse IP du poste du client, celui qui envoie la requête ARP et la requête DNS ?", hint: "C’est la source du premier paquet.", answerFormat: "Adresse IPv4, par exemple 10.0.0.1", accepted: [instable.clientIp], explanation: `Le client est ${instable.clientIp} : c’est lui qui diffuse la requête ARP puis interroge le DNS.` },
        { prompt: `Quelle est l’adresse MAC qui répond à la requête ARP pour ${instable.dnsServerIp} ?`, hint: "Lis le paquet ARP qui suit la requête.", answerFormat: "Six octets hexadécimaux, par exemple 00:11:22:33:44:55", accepted: compact([instable.dnsServerMac, instable.dnsServerMac.replace(/:/g, "-")]), explanation: `ARP associe ${instable.dnsServerIp} à l’adresse MAC ${instable.dnsServerMac}.` },
        { prompt: `Quelle adresse IP la réponse DNS donne-t-elle pour ${instable.resolvedName} ?`, hint: "Ouvre la réponse DNS (enregistrement A).", answerFormat: "Adresse IPv4", accepted: [instable.resolvedIp], explanation: `Le serveur DNS répond ${instable.resolvedIp}. C’est vers cette adresse que le client ouvre ensuite sa connexion HTTP.` },
        { prompt: "Un SYN vers le port suivant reçoit immédiatement un RST-ACK : quel est ce port ?", hint: "Cherche les paquets RST. Le port est celui visé par le SYN.", answerFormat: "Numéro de port", accepted: [String(instable.refusedPort)], explanation: `Le port ${instable.refusedPort} est fermé : la machine répond RST-ACK. Elle est joignable, mais aucun service n’écoute.` },
        { prompt: "Quelle adresse IP ne répond jamais aux SYN du client ?", hint: "Cherche une destination qui n’apparaît jamais comme source.", answerFormat: "Adresse IPv4", accepted: [instable.silentIp], explanation: `${instable.silentIp} ne répond pas du tout. L’absence totale de réponse évoque un filtrage par pare-feu ou un hôte injoignable, pas un port fermé.` },
        { prompt: "Combien de paquets SYN le client envoie-t-il vers cette adresse, retransmissions comprises ?", hint: "Le même SYN est renvoyé à intervalles croissants.", answerFormat: "Un nombre entier", accepted: [String(instable.silentSynCount)], explanation: `Le client envoie ${instable.silentSynCount} SYN : l’original et trois retransmissions espacées de plus en plus. Sans réponse, TCP finit par abandonner.` },
      ],
      assets: [
        { kind: "pcap", title: "Capture du poste client (reseau-instable.pcap)", description: "22 paquets : ARP, DNS, une session HTTP, un port refusé et un hôte silencieux.", url: "/labs/reseau-instable.pcap" },
        { kind: "guide", title: "Guide : les filtres et drapeaux utiles", description: "Les filtres Wireshark et les drapeaux TCP à connaître.", url: "/labs/guide-wireshark.md" },
      ],
    },
    {
      slug: "incident-pare-feu",
      title: "Incident au pare-feu : lire un journal",
      description: "Le pare-feu a enregistré une série de refus suivie d’une autorisation suspecte. Retrouve l’attaquant, ce qu’il visait et comment il est passé.",
      difficulty: "intermediaire",
      xp: 150,
      format: "logs",
      minutes: 30,
      requiresComputer: false,
      isAssessment: false,
      briefing: `Le journal du pare-feu FW01 contient six minutes de trafic autour du serveur interne ${firewall.serverIp}. Une adresse externe semble avoir insisté sur plusieurs services avant qu’une règle ne la laisse passer. Ta mission : reconstituer l’incident à partir des lignes du journal et nommer la règle qui a ouvert la porte.`,
      constraints: ["Ne conclus que ce que le journal prouve : cite les lignes qui appuient ta réponse.", "Les heures sont en UTC."],
      tools: ["Visionneuse de journaux CyberPingo", "grep, sort et uniq (facultatif)", "Un tableur (facultatif)"],
      objectives: ["Trouver la source la plus agressive", "Identifier le service visé", "Repérer le moment où une règle laisse passer l’attaquant", "Nommer la règle fautive"],
      hints: ["Filtre sur DENY, puis compte par adresse source.", "Une même source peut viser plusieurs ports : prends celui qui revient le plus.", "Cherche la première ligne ALLOW de l’attaquant vers le serveur."],
      tasks: [
        { prompt: "Quelle adresse IP source cumule le plus de lignes DENY ?", hint: "Filtre sur DENY puis regarde les sources.", answerFormat: "Adresse IPv4", accepted: [firewall.attackerIp], explanation: `${firewall.attackerIp} cumule ${firewall.attackerDenyCount} refus, bien plus que les autres sources. C’est le principal suspect.` },
        { prompt: `Quel est le port de destination le plus visé par cette adresse ?`, hint: "Regarde le champ dst= des lignes de cette source.", answerFormat: "Numéro de port", accepted: [String(firewall.attackerTopPort)], explanation: `Le port ${firewall.attackerTopPort} (SSH) est visé en rafale : c’est typique d’une tentative d’accès à distance par force brute.` },
        { prompt: "Combien de lignes DENY cette adresse a-t-elle au total, tous ports confondus ?", hint: "Compte les DENY de cette source uniquement.", answerFormat: "Un nombre entier", accepted: [String(firewall.attackerDenyCount)], explanation: `Il y a ${firewall.attackerDenyCount} refus. L’essentiel vise le port ${firewall.attackerTopPort}, avec quelques tentatives sur le Bureau à distance.` },
        { prompt: "À quelle heure (UTC, format HH:MM:SS) le pare-feu laisse-t-il passer cette adresse pour la première fois ?", hint: "Cherche la première ligne ALLOW dont la source est l’attaquant.", answerFormat: "HH:MM:SS", accepted: compact([firewall.firstAllowTime, `${firewall.firstAllowTime}z`]), explanation: `Le premier ALLOW est à ${firewall.firstAllowTime}. Après une longue série de refus, une règle finit par autoriser la même source.` },
        { prompt: "Quel est le nom de la règle qui l’autorise ?", hint: "Le nom suit rule= sur la ligne ALLOW.", answerFormat: "Nom de la règle", accepted: compact([firewall.allowRule]), explanation: `La règle ${firewall.allowRule} est temporaire et trop permissive : elle laisse l’attaquant atteindre le service SSH. À supprimer et à contrôler.` },
      ],
      assets: [
        { kind: "log", title: "Journal du pare-feu FW01 (incident-pare-feu.log)", description: "83 lignes sur six minutes : trafic normal, refus répétés, puis une autorisation.", url: "/labs/incident-pare-feu.log" },
      ],
    },
    {
      slug: "packet-tracer-sous-reseaux",
      title: "Packet Tracer : le plan d’adressage de l’atelier Kora",
      description: `Découpe ${packetTracer.network} en quatre sous-réseaux pour une petite entreprise, puis construis et teste le réseau dans Packet Tracer.`,
      difficulty: "intermediaire",
      xp: 200,
      format: "packet_tracer",
      minutes: 60,
      requiresComputer: true,
      isAssessment: false,
      briefing: `L’atelier Kora est une petite entreprise qui dispose du réseau ${packetTracer.network}. Elle veut quatre sous-réseaux de taille identique : Direction, Atelier, Comptabilité et Invités, pour que les invités n’atteignent jamais la comptabilité. Chaque sous-réseau reçoit un routeur R1 comme passerelle, qui prend la première adresse utilisable du sous-réseau. Ta mission : calculer le plan d’adressage, le monter dans Packet Tracer (ou à la main) et déposer un rapport si tu veux un retour d’un formateur.`,
      constraints: ["Utilise la même taille pour les quatre sous-réseaux.", "La passerelle de chaque sous-réseau prend sa première adresse utilisable.", "Packet Tracer est facultatif : les calculs se valident ici, sans lui."],
      tools: ["Cisco Packet Tracer (gratuit, sur ton ordinateur)", "Un outil de calcul de sous-réseaux ou Python (module ipaddress)"],
      objectives: ["Calculer un plan d’adressage en CIDR", "Configurer les interfaces d’un routeur", "Tester la connectivité entre sous-réseaux", "Documenter son travail dans un rapport"],
      hints: ["Pour quatre sous-réseaux égaux dans un /24, ajoute deux bits au masque.", "Les sous-réseaux commencent à des multiples de la taille du bloc.", "Le résumé des interfaces s’affiche avec une commande show."],
      tasks: [
        { prompt: "Quel masque de sous-réseau (notation décimale pointée) obtiens-tu pour quatre sous-réseaux égaux dans un /24 ?", hint: "Un /24 avec deux bits de plus devient un /26.", answerFormat: "Masque, par exemple 255.255.255.0", accepted: [packetTracer.mask], explanation: `Il faut deux bits de plus : /${packetTracer.prefix}, soit ${packetTracer.mask}. Chaque sous-réseau compte ${2 ** (32 - packetTracer.prefix)} adresses.` },
        { prompt: `Quelle est l’adresse réseau du sous-réseau « ${atelier.name} » (le deuxième) ?`, hint: "Les blocs commencent à 0, puis la taille du bloc, puis le double...", answerFormat: "Adresse IPv4", accepted: [atelier.network], explanation: `Le deuxième bloc commence à ${atelier.network} : ${direction.network} + ${2 ** (32 - packetTracer.prefix)}.` },
        { prompt: `Quelle est la première adresse utilisable du sous-réseau « ${compta.name} » ?`, hint: "C’est l’adresse réseau plus un.", answerFormat: "Adresse IPv4", accepted: [compta.first], explanation: `Le réseau ${compta.name} est ${compta.network}. Sa première adresse utilisable est ${compta.first}.` },
        { prompt: `Quelle est l’adresse de diffusion du sous-réseau « ${invites.name} » ?`, hint: "C’est la dernière adresse du bloc.", answerFormat: "Adresse IPv4", accepted: [invites.broadcast], explanation: `Le bloc ${invites.name} va de ${invites.network} à ${invites.broadcast}. La dernière adresse est celle de diffusion.` },
        { prompt: "Combien de machines peut-on adresser dans chaque sous-réseau ?", hint: "Taille du bloc moins deux.", answerFormat: "Un nombre entier", accepted: [String(packetTracer.hostsPerSubnet)], explanation: `Un /${packetTracer.prefix} compte ${2 ** (32 - packetTracer.prefix)} adresses, dont deux sont réservées : ${packetTracer.hostsPerSubnet} utilisables.` },
        { prompt: `Quelle adresse IP donnes-tu à l’interface de R1 dans le sous-réseau « ${atelier.name} » ?`, hint: "La passerelle prend la première adresse utilisable.", answerFormat: "Adresse IPv4", accepted: [atelier.first], explanation: `La passerelle de ${atelier.name} est ${atelier.first}, la première adresse utilisable du bloc ${atelier.network}.` },
        { prompt: "Quelle commande du routeur affiche une ligne par interface avec son adresse IP et son état ?", hint: "Commence par show ip... et termine par brief.", answerFormat: "Commande IOS", accepted: compact(["show ip interface brief", "show ip int brief", "show ip int br", "sh ip int br", "sh ip interface brief"]), explanation: "show ip interface brief résume l’adresse et l’état de chaque interface. C’est la commande de vérification la plus utile après une configuration." },
      ],
      assets: [
        { kind: "topology", title: "Topologie de l’atelier Kora", description: "Un routeur, trois commutateurs et trois PC. Le quatrième sous-réseau est à calculer.", url: "/labs/packet-tracer-topologie.svg" },
        { kind: "guide", title: "Guide pas à pas Packet Tracer", description: "Matériel, plan d’adressage, commandes et test de connectivité.", url: "/labs/packet-tracer-guide.md" },
        { kind: "report_template", title: "Modèle de rapport", description: "Plan d’adressage, méthode, tests et difficultés à remplir.", url: "/labs/modele-rapport-reseau.md" },
      ],
    },
    {
      slug: "evaluation-reseaux",
      title: "Évaluation réseau : enquête sur un scan interne",
      description: "Une machine du réseau sonde ton serveur. Prouve que tu sais lire la capture, repérer le scan et situer les machines dans leurs sous-réseaux.",
      difficulty: "intermediaire",
      xp: 300,
      format: "pcap",
      minutes: 45,
      requiresComputer: false,
      isAssessment: true,
      briefing: `Une alerte signale du trafic anormal vers le serveur ${evaluation.serverIp}. Une capture de quelques secondes est disponible. Ta mission : identifier la machine qui sonde le serveur, lister ce qu’elle a découvert et déterminer si elle se trouve dans le même sous-réseau que le serveur. Ce laboratoire valide les compétences du parcours Réseaux : sans indice, il demande de mobiliser les adresses, TCP, DNS et l’analyse de capture.`,
      constraints: ["Évaluation : réponds sans aide extérieure, comme en situation réelle.", "Appuie chaque réponse sur la capture, pas sur une supposition."],
      tools: ["Visionneuse de capture CyberPingo", "Wireshark (facultatif)", "Une calculatrice de sous-réseaux (facultatif)"],
      objectives: ["Distinguer le trafic normal d’un scan", "Mesurer l’étendue du scan", "Lister les services ouverts découverts", "Situer deux machines par rapport à un masque /26"],
      hints: ["Le client normal commence par une résolution DNS. Le scanner n’en fait aucune.", "Compte les ports différents ciblés par la même source.", "Un port ouvert répond SYN-ACK, un port fermé répond RST-ACK."],
      tasks: [
        { prompt: "Quelle adresse IP sonde le serveur (envoie des SYN vers de nombreux ports) ?", hint: "Cherche la source qui envoie le plus de SYN vers des ports différents.", answerFormat: "Adresse IPv4", accepted: [evaluation.scannerIp], explanation: `${evaluation.scannerIp} envoie un SYN vers ${evaluation.probedPorts} ports différents en quelques dizaines de millisecondes : c’est un scan.` },
        { prompt: "Combien de ports différents le scanner a-t-il sondés ?", hint: "Compte les ports de destination distincts.", answerFormat: "Un nombre entier", accepted: [String(evaluation.probedPorts)], explanation: `Le scanner sonde ${evaluation.probedPorts} ports : 21, 22, 23, 25, 53, 80, 110, 139, 143, 443, 445, 3306, 3389 et 8080.` },
        { prompt: "Combien de ports ont répondu SYN-ACK (ports ouverts) ?", hint: "Seuls les ports ouverts répondent SYN-ACK.", answerFormat: "Un nombre entier", accepted: [String(evalOpenPorts)], explanation: `${evalOpenPorts} ports sont ouverts : ${evaluation.openPorts.join(", ")}. Les autres répondent RST-ACK.` },
        { prompt: "Quel port ouvert correspond à une base de données MySQL ?", hint: "Parmi les ports ouverts, un seul est celui d’un serveur de base de données.", answerFormat: "Numéro de port", accepted: [String(evaluation.databasePort)], explanation: `Le port ${evaluation.databasePort} est celui de MySQL. Une base de données ne devrait pas être joignable depuis tout le réseau : c’est une découverte sensible.` },
        { prompt: "Quels drapeaux TCP le serveur renvoie-t-il sur un port ouvert au SYN du scanner ?", hint: "C’est la deuxième étape du handshake.", answerFormat: "Par exemple SYN-ACK", accepted: compact(["syn-ack", "syn,ack", "syn/ack", "syn ack", "syn+ack", "syn, ack"]), explanation: "Un port ouvert répond SYN-ACK. C’est ce qui révèle au scanner que le service existe." },
        { prompt: "Quel drapeau le scanner envoie-t-il après un SYN-ACK pour ne pas établir la connexion ?", hint: "Il referme brutalement.", answerFormat: "Un drapeau TCP", accepted: compact(["rst", "reset", "rst-ack"]), explanation: "Le scanner répond RST : il a appris que le port est ouvert sans jamais terminer le handshake, d’où le nom de scan demi-ouvert." },
        { prompt: `Quelle adresse IP la réponse DNS donne-t-elle pour ${evaluation.resolvedName} ?`, hint: "Regarde la réponse du client normal.", answerFormat: "Adresse IPv4", accepted: [evaluation.resolvedIp], explanation: `${evaluation.resolvedName} se résout en ${evaluation.resolvedIp}, le serveur visé par le scan. Le client légitime et le scanner ciblent donc la même machine.` },
        { prompt: `Avec un masque /${evaluation.mask}, quelle est l’adresse réseau du serveur ${evaluation.serverIp} ?`, hint: `Les blocs d’un /${evaluation.mask} font ${2 ** (32 - evaluation.mask)} adresses.`, answerFormat: "Adresse IPv4", accepted: [evaluation.serverSubnet.network], explanation: `${evaluation.serverIp} est dans le bloc ${evaluation.serverSubnet.network} à ${evaluation.serverSubnet.broadcast}.` },
        { prompt: `Avec un masque /${evaluation.mask}, le scanner ${evaluation.scannerIp} est-il dans le même sous-réseau que le serveur ? (oui ou non)`, hint: "Compare les blocs des deux machines.", answerFormat: "oui ou non", accepted: sameAnswer, explanation: `Le scanner est dans le bloc ${evaluation.scannerSubnet.network} à ${evaluation.scannerSubnet.broadcast}, le serveur dans ${evaluation.serverSubnet.network} à ${evaluation.serverSubnet.broadcast} : ${evaluation.sameSubnet ? "ils partagent le même sous-réseau" : "ils sont dans deux sous-réseaux différents"}.` },
        { prompt: `Quelle est l’adresse de diffusion du sous-réseau /${evaluation.mask} du scanner ?`, hint: "C’est la dernière adresse de son bloc.", answerFormat: "Adresse IPv4", accepted: [evaluation.scannerSubnet.broadcast], explanation: `Le bloc du scanner va de ${evaluation.scannerSubnet.network} à ${evaluation.scannerSubnet.broadcast}. Cette dernière adresse est la diffusion.` },
      ],
      assets: [
        { kind: "pcap", title: "Capture du serveur (evaluation-reseaux.pcap)", description: "Un client légitime et un scan SYN contre le serveur interne.", url: "/labs/evaluation-reseaux.pcap" },
        { kind: "guide", title: "Guide : les filtres et drapeaux utiles", description: "Les filtres Wireshark et les drapeaux TCP à connaître.", url: "/labs/guide-wireshark.md" },
      ],
    },
  ];

  const skills: PathSkill[] = [
    { slug: "adressage-ipv4", name: "Adressage IPv4", description: "Lire une adresse IPv4 et son masque, trouver l’adresse réseau et de diffusion.", lessonKey: "reseaux-ipv4", practiceLab: "packet-tracer-sous-reseaux" },
    { slug: "sous-reseaux-cidr", name: "Sous-réseaux et CIDR", description: "Découper un réseau, calculer la taille d’un bloc et les adresses utilisables.", lessonKey: "reseaux-cidr", practiceLab: "packet-tracer-sous-reseaux" },
    { slug: "tcp-handshake", name: "TCP et ports", description: "Suivre un handshake TCP et interpréter un port ouvert, fermé ou filtré.", lessonKey: "reseaux-tcp", practiceLab: "reseau-instable" },
    { slug: "dns-arp", name: "DNS et ARP", description: "Retrouver une adresse avec DNS (nom vers IP) et ARP (IP vers MAC).", lessonKey: "reseaux-dns-arp", practiceLab: "reseau-instable" },
    { slug: "analyse-pcap", name: "Analyse de capture", description: "Lire une capture de paquets et raconter un échange réseau.", lessonKey: "reseaux-pcap", practiceLab: "reseau-instable" },
    { slug: "detection-scan", name: "Détection de scan", description: "Reconnaître un scan de ports dans une capture et dans un journal de pare-feu.", lessonKey: "reseaux-scan", practiceLab: "incident-pare-feu" },
  ];

  const badges: PathBadge[] = [
    { slug: "specialiste-paquets", name: "Spécialiste des paquets", description: "Résoudre le laboratoire « Réseau instable » en lisant une capture.", icon: "network", rarity: "rare", xp: 40, position: 120, lab: "reseau-instable" },
    { slug: "lecteur-de-journaux", name: "Lecteur de journaux", description: "Reconstituer l’incident du pare-feu à partir de son journal.", icon: "analyse-logs", rarity: "common", xp: 40, position: 130, lab: "incident-pare-feu" },
    { slug: "constructeur-reseau", name: "Constructeur réseau", description: "Terminer le plan d’adressage de l’atelier Kora.", icon: "network", rarity: "rare", xp: 40, position: 140, lab: "packet-tracer-sous-reseaux" },
    { slug: "gardien-reseau", name: "Gardien du réseau", description: "Réussir l’évaluation réseau : enquête sur un scan interne.", icon: "shield", rarity: "epic", xp: 60, position: 150, lab: "evaluation-reseaux" },
    { slug: "detecteur-anomalies", name: "Détecteur d’anomalies", description: "Valider la compétence Détection de scan par l’évaluation pratique.", icon: "eye", rarity: "rare", xp: 40, position: 160, skill: "detection-scan" },
    { slug: "architecte-adressage", name: "Architecte d’adressage", description: "Valider la compétence Sous-réseaux et CIDR par l’évaluation pratique.", icon: "target", rarity: "rare", xp: 40, position: 170, skill: "sous-reseaux-cidr" },
  ];

  const existingBadgeRarity: Record<string, "common" | "rare" | "epic"> = {
    "premier-pas": "common", "premier-quiz": "common", assidu: "common", "premier-flag": "common", "serie-3": "common", "premier-cours": "common",
    "serie-7": "rare", "xp-1000": "rare", "serie-30": "epic", "premiere-certification": "epic", "expert-reseau": "epic",
  };

  const mascot: MascotSeed[] = [
    { key: "welcome-1", event: "welcome", expression: "happy", text: "Salut, moi c’est Pingo ! Je t’accompagne dans chaque leçon. On commence quand tu veux.", priority: 5 },
    { key: "welcome-2", event: "welcome", expression: "encouraging", text: "Content de te revoir ! Une leçon, un exercice, et tu avances déjà.", priority: 4 },
    { key: "lesson-start-1", event: "lesson_start", expression: "focused", text: "On se concentre : lis les objectifs, ils te disent ce que tu sauras faire à la fin.", priority: 3 },
    { key: "lesson-start-2", event: "lesson_start", expression: "explanation", text: "Si un schéma te semble obscur, relis-le calmement. Un bon schéma vaut dix paragraphes.", priority: 2 },
    { key: "exercise-success-1", event: "exercise_success", expression: "proud", text: "Bonne réponse ! Tu viens de prouver que tu as compris, pas seulement retenu.", priority: 5 },
    { key: "exercise-success-2", event: "exercise_success", expression: "happy", text: "Exact ! Continue sur cette lancée.", priority: 3 },
    { key: "exercise-fail-1", event: "exercise_fail", expression: "disappointed", text: "Pas tout à fait. Relis l’énoncé, regarde l’indice et retente : se tromper fait partie de l’entraînement.", priority: 5 },
    { key: "exercise-fail-2", event: "exercise_fail", expression: "thinking", text: "Hmm. Ouvre la capture ou le journal et cherche la ligne qui prouve ta réponse.", priority: 3 },
    { key: "chapter-end-1", event: "chapter_end", expression: "proud", text: "Leçon terminée ! Prends une seconde pour résumer ce que tu viens d’apprendre avec tes mots.", priority: 5 },
    { key: "chapter-end-2", event: "chapter_end", expression: "happy", text: "Une de plus de validée. La régularité bat l’intensité.", priority: 3 },
    { key: "level-up-1", event: "level_up", expression: "celebration", text: "Niveau supérieur ! Chaque niveau est le résultat de vrais efforts. Bravo !", priority: 8 },
    { key: "badge-1", event: "badge", expression: "celebration", text: "Un nouveau badge pour ta collection. Va voir sa condition : tu l’as gagné pour de bon.", priority: 7 },
    { key: "badge-2", event: "badge", expression: "surprised", text: "Oh, un badge ! Tu ne l’avais pas vu venir ?", priority: 4 },
    { key: "challenge-1", event: "challenge", expression: "mission", text: "Nouvelle mission : lis le briefing, repère les contraintes et lance-toi.", priority: 6 },
    { key: "challenge-2", event: "challenge", expression: "focused", text: "En situation réelle, personne ne te donne la réponse. Fie-toi aux preuves.", priority: 3 },
    { key: "return-1", event: "return_after_absence", expression: "happy", text: "Te revoilà ! Pas de souci pour la pause : on reprend doucement là où tu étais.", priority: 6 },
    { key: "return-2", event: "return_after_absence", expression: "encouraging", text: "Un petit rappel pour se remettre en route : refais le dernier quiz, c’est rapide.", priority: 4 },
    { key: "new-skill-1", event: "new_skill", expression: "expert", text: "Compétence validée par une vraie mise en pratique. C’est ce qui compte face à un employeur.", priority: 8 },
    { key: "rank-up-1", event: "rank_up", expression: "celebration", text: "Nouveau rang ! Ton parcours se voit maintenant. Continue, la suite t’attend.", priority: 9 },
    { key: "path-complete-1", event: "path_complete", expression: "celebration", text: "Parcours terminé ! De la théorie à la pratique, tu as bouclé la boucle. Fier de toi.", priority: 10 },
    { key: "lab-complete-1", event: "lab_complete", expression: "proud", text: "Laboratoire réussi ! Tu as fait un vrai travail d’analyste : preuve par preuve.", priority: 7 },
    { key: "lab-complete-2", event: "lab_complete", expression: "expert", text: "Mission accomplie. Retiens la méthode : observer, formuler une hypothèse, vérifier.", priority: 4 },
  ];

  const courseUpdates = { slug: "reseaux", lessonMinutes: modules.flatMap((module) => module.lessons).reduce((sum, lesson) => sum + lesson.minutes, 0) };

  return { domains, modules, labs, skills, badges, existingBadgeRarity, mascot, courseUpdates };
}
