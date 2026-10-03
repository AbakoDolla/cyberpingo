// Réseaux, programme complet : assemblage des dix modules, des cinq laboratoires, des compétences et des badges.
// Les leçons sont écrites dans reseaux-programme-a à d ; les réponses attendues des laboratoires viennent des
// faits calculés par scripts/lab-scenarios-reseaux.cjs et lab-scenarios-kora.cjs à partir des fichiers que les
// apprenants téléchargent, donc elles ne peuvent pas s’en écarter.
// Lu par scripts/generate-reseaux-programme-seed.cjs, qui produit supabase/seed/05_reseaux_programme.sql.
import { modules as modulesA } from "./reseaux-programme-a";
import { modules as modulesB } from "./reseaux-programme-b";
import { modules as modulesC } from "./reseaux-programme-c";
import { modules as modulesD } from "./reseaux-programme-d";
import { example, questions, reference, type PathBlock, type PathModuleEntry, type PathQuiz } from "./path-kit";
import type { PathBadge, PathLab, PathSkill } from "./reseaux-path";

export interface ProgrammeFacts {
  home: {
    network: string; gateway: string; broadcast: string; poolStart: string; poolEnd: string; poolSize: number; printer: string; printerInPool: boolean;
    pc1Address: string; dhcpServer: string; dnsServer: string; leaseHours: number; delegated: string; delegatedCount: number; secondSubnet: string;
    expanded: string; compressedAddress: string; globalAddress: string;
  };
  vlan: {
    vlans: Array<{ id: number; name: string; network: string; gateway: string; portCount: number }>; guestVlan: number; employesPortCount: number; trunkPort: string;
    allowedList: string; nativeVlan: number; createdVlanCount: number; employesGateway: string; invitesSubinterface: string; encapsulationCommand: string;
    aclNumber: number; aclLine: string; aclInterface: string; aclDirection: string; mask: string;
  };
  sites: {
    linkUsable: number; linkSudBroadcast: string; nordToSud: string; sudDefault: string; missingRoute: string; siegeFix: string; summary: string;
    staticCode: string; staticDistance: number; defaultNeedsSpecific: boolean; siegeLan: string; nordLan: string; sudLan: string; linkNord: string; linkSud: string;
  };
  incident: {
    server: string; wrongGateway: string; goodGateway: string; gatewayLayer: number; atelierPort: string; atelierVlanFound: number; atelierVlan: number;
    atelierFix: string; trunkMissingVlan: number; trunkFix: string; aclRule: string; aclRuleNumber: number; aclMatches: number; aclRemove: string; clockSkewMinutes: number;
  };
  project: {
    block: string; employesPrefix: number; administrationNetwork: string; invitesBroadcast: string; serveursFirst: string; gestionMask: string; firstFree: string;
    slash27Count: number; ipv6Block: string; ipv6SubnetCount: number; invitesV6: string; poolStart: string; poolSize: number; patAddresses: number;
    operatorLink: string; operatorGateway: string; publicAddress: string; defaultRoute: string; connectedRoutes: number;
    duplicateAddress: string; outsideDevice: string; noGatewayDevice: string; plan: Array<{ name: string; vlan: number; network: string }>;
  };
}

const lower = (value: string) => value.toLowerCase();
const compact = (values: string[]) => Array.from(new Set(values.map(lower)));
const withoutSlash = (value: string) => value.replace(/\/\d+$/, "");
const yesNo = (value: boolean) => (value ? ["oui", "yes"] : ["non", "no"]);

// Les modules déjà publiés par les graines précédentes gardent leur identifiant : seul leur titre et leur rang changent.
const captureModule: PathModuleEntry = {
  key: "c2:5",
  position: 8,
  existing: { fromTitle: "Capture et analyse" },
  title: "Capture et analyse du trafic",
  description: "Lire une capture de paquets pour raconter un échange réseau, puis reconnaître un scan de ports. Critères de réussite : retrouver dans une capture qui parle à qui et avec quel protocole, distinguer un port ouvert, fermé et filtré, et réussir les quiz du module avec 70 % de bonnes réponses.",
  lessons: [{ key: "reseaux-pcap", existing: true }, { key: "reseaux-scan", existing: true }],
};

// Références ajoutées aux leçons déjà publiées : elles n’en avaient pas.
const references: Array<{ key: string; blocks: PathBlock[] }> = [
  { key: "reseaux-ipv4", blocks: [reference("rfc791"), reference("rfc1918"), reference("pythonIpaddress")] },
  { key: "reseaux-cidr", blocks: [reference("rfc4632"), reference("pythonIpaddress")] },
  { key: "reseaux-tcp", blocks: [reference("rfc9293"), reference("wiresharkGuide")] },
  { key: "reseaux-dns-arp", blocks: [reference("rfc1034"), reference("rfc826"), reference("msNslookup")] },
  { key: "reseaux-pcap", blocks: [reference("wiresharkGuide"), reference("wiresharkFilters")] },
  { key: "reseaux-scan", blocks: [reference("nmapMan"), reference("wiresharkFilters")] },
  { key: "reseaux-packet-tracer", blocks: [example("Dans une maquette, PC-A (172.16.8.10/27) ne joint pas PC-B (172.16.8.40) alors que le routeur a une interface dans chaque sous-réseau. Avant de rien modifier, tu notes ce que tu observes, puis tu relis la configuration de PC-B : son masque est 255.255.255.0 au lieu de 255.255.255.224. PC-B croit donc que 172.16.8.10 se trouve sur son propre réseau : il l’appelle directement avec ARP au lieu de passer par sa passerelle, 172.16.8.33. Après correction du masque, le ping réussit, et show ip interface brief confirme que les deux interfaces du routeur sont up."), reference("packetTracer"), reference("netacad")] },
];

// La leçon Packet Tracer avait été publiée sans quiz : elle en reçoit un.
const packetTracerQuiz: PathQuiz = {
  title: "Quiz : Packet Tracer en pratique",
  questions: [
    questions.choice("Où s’exécute Cisco Packet Tracer ?", ["Dans CyberPingo, sur nos serveurs", "Sur ton ordinateur", "Dans ton navigateur, sans installation", "Sur le routeur de ton fournisseur d’accès"], 1, "Packet Tracer est un logiciel installé sur ton ordinateur. CyberPingo ne l’exécute pas et ne lit pas tes fichiers .pkt : la plateforme fournit le sujet, la topologie et le guide, puis valide les résultats que tu saisis."),
    questions.tf("Sans Packet Tracer, tu ne peux pas valider les tâches d’un laboratoire Packet Tracer de CyberPingo.", false, "Faux : les calculs du laboratoire se valident dans CyberPingo, avec ou sans le logiciel. Packet Tracer sert à pratiquer et à tester ton plan, il n’est pas une condition de validation.", "moyen"),
    questions.choice("Quelle commande IOS affiche une ligne par interface avec son adresse IP et son état, après une configuration ?", ["show running-config", "show version", "show ip interface brief", "show clock"], 2, "show ip interface brief résume l’adresse, l’état et le protocole de chaque interface : c’est la vérification la plus rapide. show running-config affiche toute la configuration, show version le matériel et le logiciel, show clock l’heure.", "moyen"),
    questions.choice("Dans Packet Tracer, un ping échoue entre deux sous-réseaux reliés par un routeur. Que vérifies-tu en premier ?", ["Le masque, la passerelle de chaque PC et l’état des interfaces du routeur", "Réinstaller Packet Tracer", "La couleur des câbles", "Le remplacement du routeur par un commutateur"], 0, "Un ping entre sous-réseaux traverse le routeur : on vérifie d’abord le masque et la passerelle des PC, puis l’état des interfaces avec show ip interface brief. Réinstaller le logiciel ou changer l’apparence des câbles n’a aucun effet sur la configuration.", "difficile"),
  ],
};

const withQuizzes = (module: PathModuleEntry): PathModuleEntry => ({
  ...module,
  lessons: module.lessons.map((lesson) => ("existing" in lesson && lesson.key === "reseaux-packet-tracer" ? { ...lesson, quiz: packetTracerQuiz } : lesson)),
});

export function buildReseauxProgramme(facts: ProgrammeFacts) {
  const { home, vlan, sites, incident, project } = facts;
  const guestVlan = vlan.vlans.find((item) => item.id === vlan.guestVlan);
  const administration = vlan.vlans[0];
  const modules = [...modulesA, ...modulesB, captureModule, ...modulesC, ...modulesD].map(withQuizzes).sort((left, right) => (left.position ?? 0) - (right.position ?? 0));

  const labs: PathLab[] = [
    {
      slug: "tp-reseau-domestique",
      title: "TP 1 : construire le réseau d’une maison",
      description: "Relie un PC, un portable et une imprimante à Internet : DHCP, IPv6 par autoconfiguration et partage d’une adresse publique. Prouve que tu sais lire un ipconfig /all.",
      difficulty: "debutant",
      xp: 140,
      format: "packet_tracer",
      minutes: 45,
      requiresComputer: true,
      isAssessment: false,
      briefing: `Une famille veut relier un PC, un portable et une imprimante à Internet. Le réseau local est ${home.network}, le routeur R-Maison en est la passerelle et attribue des adresses par DHCP entre ${home.poolStart} et ${home.poolEnd}. Le fournisseur d’accès délègue le préfixe IPv6 ${home.delegated}. Ta mission : construire la topologie (dans Packet Tracer si tu l’as, sinon sur le papier), compléter le service DHCP, lire la sortie ipconfig /all relevée sur PC-Salon et répondre aux questions de dimensionnement.`,
      constraints: ["Travaille uniquement sur la topologie et les fichiers fournis : ne configure aucun équipement réel qui ne t’appartient pas.", "Packet Tracer est facultatif : les tâches se valident ici, avec ou sans le logiciel."],
      tools: ["Cisco Packet Tracer (gratuit, sur ton ordinateur, facultatif)", "Visionneuse de journaux CyberPingo", "Une calculatrice ou Node.js pour vérifier les calculs"],
      objectives: ["Calculer l’adresse de diffusion et la taille d’une plage DHCP", "Lire une sortie ipconfig /all : adresse, bail, passerelle, DNS, IPv6", "Découper une délégation IPv6 en sous-réseaux /64", "Expliquer la traduction d’adresse avec ports (PAT)"],
      hints: ["Les extrémités d’une plage comptent toutes les deux.", "La sortie fournie se lit ligne par ligne : cherche « Bail obtenu » et « Bail expirant ».", "Un /56 contient 2 puissance (64 moins 56) sous-réseaux /64."],
      tasks: [
        { prompt: `Quelle est l’adresse de diffusion du réseau ${home.network} ?`, hint: "C’est la dernière adresse du bloc : tous les bits de la partie hôte valent 1.", answerFormat: "Adresse IPv4", accepted: [home.broadcast], explanation: `Le réseau ${home.network} se termine par ${home.broadcast}. Cette dernière adresse est la diffusion : on ne peut l’attribuer à aucun appareil.` },
        { prompt: `Combien d’adresses la plage DHCP de ${home.poolStart} à ${home.poolEnd} contient-elle, extrémités comprises ?`, hint: "Soustrais les deux derniers octets, puis ajoute un : les deux extrémités comptent.", answerFormat: "Un nombre entier", accepted: [String(home.poolSize)], explanation: `De ${home.poolStart} à ${home.poolEnd}, la plage compte ${home.poolSize} adresses (${home.poolEnd.split(".")[3]} moins ${home.poolStart.split(".")[3]}, plus 1).` },
        { prompt: `L’imprimante a l’adresse fixe ${home.printer}. Cette adresse fait-elle partie de la plage DHCP ? (oui ou non)`, hint: "Compare ce dernier octet avec ceux de la plage.", answerFormat: "oui ou non", accepted: yesNo(home.printerInPool), explanation: `${home.printer} est en dehors de la plage ${home.poolStart} à ${home.poolEnd} : le service DHCP ne la distribuera jamais, ce qui évite un conflit d’adresse avec l’imprimante.` },
        { prompt: "Dans la sortie ipconfig /all fournie, quelle adresse IPv4 PC-Salon a-t-il obtenue ?", hint: "Cherche la ligne « Adresse IPv4 ».", answerFormat: "Adresse IPv4", accepted: [home.pc1Address], explanation: `PC-Salon a reçu ${home.pc1Address}, la première adresse de la plage : c’est la première machine qui a demandé un bail.` },
        { prompt: "Quelle est la durée du bail DHCP de PC-Salon, en heures ?", hint: "Compare « Bail obtenu » et « Bail expirant ».", answerFormat: "Un nombre d’heures", accepted: compact([String(home.leaseHours), `${home.leaseHours} heures`, `${home.leaseHours}h`]), explanation: `Le bail est obtenu un jour et expire le lendemain à la même heure : ${home.leaseHours} heures, la durée par défaut du service DHCP d’un routeur Cisco.` },
        { prompt: "Quelle adresse est annoncée comme serveur DNS ?", hint: "Cherche la ligne « Serveurs DNS ».", answerFormat: "Adresse IPv4", accepted: [home.dnsServer], explanation: `Le routeur ${home.dnsServer} joue aussi le rôle de relais DNS : le service DHCP annonce son adresse avec l’option « dns-server ».` },
        { prompt: "Quel préfixe /64 retrouve-t-on au début de l’adresse IPv6 globale de PC-Salon ? (notation compressée, avec /64)", hint: "Garde les quatre premiers groupes de l’adresse IPv6 sans les « fe80 ».", answerFormat: "Préfixe, par exemple 2001:db8:1::/64", accepted: compact([home.secondSubnet, withoutSlash(home.secondSubnet)]), explanation: `Le PC combine le préfixe ${home.secondSubnet} annoncé par le routeur et un identifiant d’interface dérivé de son adresse MAC : c’est l’autoconfiguration SLAAC.` },
        { prompt: `Le fournisseur délègue ${home.delegated}. Combien de sous-réseaux /64 cette délégation contient-elle ?`, hint: "Il y a 64 moins 56 bits de plus pour numéroter les sous-réseaux.", answerFormat: "Un nombre entier", accepted: [String(home.delegatedCount)], explanation: `Entre /56 et /64, il y a 8 bits pour numéroter les sous-réseaux : 2 puissance 8, soit ${home.delegatedCount} sous-réseaux /64.` },
        { prompt: `Écris en notation compressée l’adresse ${home.expanded}.`, hint: "Retire les zéros de tête de chaque groupe, puis remplace la plus longue suite de groupes nuls par « :: ».", answerFormat: "Adresse IPv6 compressée", accepted: [home.compressedAddress], explanation: `Les zéros de tête disparaissent (0db8 devient db8, 0001 devient 1) et les trois groupes nuls consécutifs deviennent « :: » : ${home.compressedAddress}.` },
        { prompt: "Quelle commande Windows affiche l’adresse MAC, le bail DHCP, la passerelle et les serveurs DNS ?", hint: "C’est ipconfig avec une option qui veut dire « tout ».", answerFormat: "Commande Windows", accepted: compact(["ipconfig /all", "ipconfig.exe /all"]), explanation: "ipconfig seul n’affiche que l’adresse, le masque et la passerelle. L’option /all ajoute l’adresse physique, le bail DHCP et les serveurs DNS : c’est la commande de référence pour documenter un poste." },
        { prompt: "Le foyer n’a qu’une adresse publique, celle de la sortie de R-Maison. Combien d’adresses publiques faut-il au minimum pour que tous ses appareils aillent sur Internet avec la traduction PAT ?", hint: "PAT distingue les conversations par leur numéro de port.", answerFormat: "Un nombre entier", accepted: compact(["1", "une", "un", "1 adresse"]), explanation: "Avec PAT, le routeur remplace l’adresse source par son adresse publique et distingue chaque conversation par un numéro de port : une seule adresse publique suffit pour de nombreux appareils." },
        { prompt: "Dans la commande « ip nat inside source list 1 interface GigabitEthernet0/1 … », quel mot-clé final active la traduction avec ports (PAT) ?", hint: "Il signifie « surcharge » en anglais.", answerFormat: "Un mot-clé IOS", accepted: ["overload"], explanation: "Le mot-clé overload autorise plusieurs adresses internes à partager l’adresse de l’interface de sortie en se distinguant par leur port. Sans lui, une seule adresse interne peut être traduite à la fois." },
      ],
      assets: [
        { kind: "topology", title: "Topologie du TP 1", description: "Un routeur, un commutateur, deux PC et une imprimante.", url: "/labs/tp1-topologie.svg" },
        { kind: "log", title: "Sortie ipconfig /all de PC-Salon (tp1-ipconfig-pc-salon.log)", description: "La configuration IP obtenue par DHCP, en IPv4 et en IPv6.", url: "/labs/tp1-ipconfig-pc-salon.log" },
        { kind: "guide", title: "Guide pas à pas du TP 1", description: "Matériel, adressage, DHCP, traduction d’adresse et tests.", url: "/labs/tp1-guide.md" },
      ],
    },
    {
      slug: "tp-vlan-pme",
      title: "TP 2 : VLAN, trunk et routage inter-VLAN pour la PME Kora",
      description: "Sépare trois services sur un seul commutateur, relie-les par un trunk à un routeur et protège le réseau d’administration. Prouve que tu sais lire un show vlan brief.",
      difficulty: "intermediaire",
      xp: 180,
      format: "packet_tracer",
      minutes: 70,
      requiresComputer: true,
      isAssessment: false,
      briefing: `Kora loue des locaux et veut séparer trois services sur un seul commutateur : l’administration (VLAN ${administration.id}), les employés et les invités (VLAN ${vlan.guestVlan}). Un VLAN de gestion sert à administrer les équipements. Un routeur R1 relie les VLAN par un seul trunk, et les invités ne doivent pas atteindre l’administration. Ta mission : appliquer la démarche du guide aux autres VLAN, lire les sorties fournies de SW1 et écrire les commandes demandées.`,
      constraints: ["Travaille uniquement sur la topologie et les fichiers fournis : ne configure aucun équipement réel qui ne t’appartient pas.", "Écris les commandes exactement comme dans Cisco IOS : l’abréviation habituelle des interfaces est acceptée."],
      tools: ["Cisco Packet Tracer (gratuit, sur ton ordinateur, facultatif)", "Visionneuse de journaux CyberPingo", "Le guide du TP 2"],
      objectives: ["Lire un show vlan brief et un show interfaces trunk", "Configurer une sous-interface 802.1Q de routeur", "Écrire une ACL étendue qui isole un VLAN", "Rapprocher le plan documenté de la configuration observée"],
      hints: ["Le routeur sur un bras a une sous-interface par VLAN, avec le numéro du VLAN dans son nom et dans la commande d’encapsulation.", "Le masque inverse d’un /24 s’écrit 0.0.0.255.", "Une ACL placée au plus près de la source évite de faire voyager des paquets qui seront refusés."],
      tasks: [
        { prompt: "Quel est l’identifiant du VLAN réservé aux invités ?", hint: "Relis le briefing.", answerFormat: "Un numéro de VLAN", accepted: [String(vlan.guestVlan)], explanation: `Les invités sont dans le VLAN ${vlan.guestVlan}, réseau ${guestVlan?.network}. Séparer les invités dans un VLAN dédié permet ensuite de leur appliquer des règles de filtrage propres.` },
        { prompt: "D’après show vlan brief, combien de ports d’accès le VLAN 20 compte-t-il ?", hint: "Compte les ports listés sur les lignes du VLAN 20 (la liste peut continuer à la ligne suivante).", answerFormat: "Un nombre entier", accepted: [String(vlan.employesPortCount)], explanation: `Le VLAN 20 compte ${vlan.employesPortCount} ports, de Fa0/9 à Fa0/16. La liste de ports continue sur la ligne suivante quand elle est trop longue.` },
        { prompt: "Quel est le seul port de SW1 en mode trunk ? (nom court, par exemple Fa0/1)", hint: "Les ports en trunk n’apparaissent pas dans show vlan brief : regarde show interfaces trunk.", answerFormat: "Nom d’interface", accepted: compact([vlan.trunkPort, "g0/1", "gigabitethernet0/1", "gigabitethernet 0/1", "gig0/1"]), explanation: `${vlan.trunkPort} est le lien trunk vers R1. Un port en trunk transporte plusieurs VLAN : il n’appartient à aucun d’eux et n’apparaît donc pas dans show vlan brief.` },
        { prompt: "Quels VLAN la sortie de show interfaces trunk autorise-t-elle sur le trunk ? (numéros séparés par des virgules)", hint: "Regarde le bloc « Vlans allowed on trunk ».", answerFormat: "Par exemple 10,20", accepted: compact([vlan.allowedList, vlan.allowedList.replace(/,/g, ", "), vlan.allowedList.replace(/,/g, " "), vlan.allowedList.replace(/,/g, ";")]), explanation: `Le trunk transporte les VLAN ${vlan.allowedList}. Un VLAN absent de cette liste n’est jamais transmis à l’autre extrémité : c’est une cause classique de panne ciblée.` },
        { prompt: "Quel est le VLAN natif du trunk ?", hint: "Dernière colonne de la première table de show interfaces trunk.", answerFormat: "Un numéro de VLAN", accepted: [String(vlan.nativeVlan)], explanation: `Le VLAN natif est le ${vlan.nativeVlan}, le VLAN de gestion. Ses trames circulent sans étiquette 802.1Q : les deux extrémités du trunk doivent s’accorder sur ce numéro.` },
        { prompt: `Quelle commande, dans la sous-interface Gi0/0.${vlan.guestVlan} de R1, associe cette sous-interface au VLAN ${vlan.guestVlan} avec l’étiquette 802.1Q ?`, hint: "Adapte la commande « encapsulation » de l’exemple du guide.", answerFormat: "Commande IOS", accepted: compact([vlan.encapsulationCommand]), explanation: `« ${vlan.encapsulationCommand} » indique à la sous-interface de traiter les trames étiquetées ${vlan.guestVlan}. Sans cette commande, le routeur ne saurait pas quelle sous-interface doit recevoir ces trames.` },
        { prompt: "Quelle adresse donnes-tu à la sous-interface du VLAN 20 de R1, qui sert de passerelle aux employés ?", hint: "La passerelle est la première adresse utilisable du réseau du VLAN.", answerFormat: "Adresse IPv4", accepted: [vlan.employesGateway], explanation: `Le réseau du VLAN 20 est 10.40.20.0/24. Sa première adresse utilisable, ${vlan.employesGateway}, devient la passerelle des postes du VLAN.` },
        { prompt: "Combien de VLAN l’administrateur a-t-il créés, sans compter le VLAN 1 par défaut ni les VLAN 1002 à 1005 réservés ?", hint: "Compte les VLAN nommés dans show vlan brief.", answerFormat: "Un nombre entier", accepted: [String(vlan.createdVlanCount)], explanation: `Quatre VLAN ont été créés : ${vlan.vlans.map((item) => `${item.id} (${item.name})`).join(", ")}. Les VLAN 1 et 1002 à 1005 existent d’origine.` },
        { prompt: `Écris la ligne d’ACL étendue numérotée ${vlan.aclNumber} qui refuse tout le trafic IP des invités (${guestVlan?.network}) vers l’administration (${administration.network}).`, hint: "Format : access-list <numéro> deny ip <réseau source> <masque inverse> <réseau destination> <masque inverse>.", answerFormat: "Commande IOS en une ligne", accepted: compact([vlan.aclLine, vlan.aclLine.replace(/^access-list /, "")]), explanation: `Le masque inverse d’un /24 est 0.0.0.255. La ligne « ${vlan.aclLine} » refuse les invités vers l’administration ; une ligne « permit ip any any » devra suivre, car une ACL se termine par un refus implicite.` },
        { prompt: "Sur quelle interface et dans quel sens appliques-tu cette ACL pour bloquer le trafic au plus près de sa source ? (par exemple Gi0/0.10 out)", hint: "La source est le VLAN des invités, et le trafic entre dans le routeur par sa sous-interface.", answerFormat: "Interface et sens", accepted: compact([`${vlan.aclInterface} ${vlan.aclDirection}`, "g0/0.30 in", "gigabitethernet0/0.30 in", "interface gi0/0.30 in", "gi0/0.30 entrant", "gigabitethernet0/0.30 entrant", "gigabitethernet 0/0.30 in"]), explanation: `Appliquée en entrée (in) sur ${vlan.aclInterface}, l’ACL filtre le trafic dès qu’il arrive des invités, avant qu’il soit routé : c’est la règle « étendue au plus près de la source ».` },
        { prompt: "Quel VLAN créé n’a aucun port d’accès dans show vlan brief, parce qu’il ne sert qu’à administrer les équipements ?", hint: "Cherche la ligne sans port.", answerFormat: "Un numéro de VLAN", accepted: [String(vlan.nativeVlan)], explanation: `Le VLAN ${vlan.nativeVlan} (Gestion) n’a aucun port d’accès : il sert aux adresses d’administration des équipements. Rapprocher le plan documenté de la configuration observée est un réflexe de documentation.` },
      ],
      assets: [
        { kind: "topology", title: "Topologie du TP 2", description: "Un routeur sur un bras, un commutateur et trois VLAN.", url: "/labs/tp2-topologie.svg" },
        { kind: "log", title: "Relevés de SW1 (tp2-show-sw1.log)", description: "show vlan brief, show interfaces trunk et show mac address-table.", url: "/labs/tp2-show-sw1.log" },
        { kind: "guide", title: "Guide pas à pas du TP 2", description: "Plan d’adressage, démarche pour un VLAN et vérifications.", url: "/labs/tp2-guide.md" },
      ],
    },
    {
      slug: "tp-multi-sites",
      title: "TP 3 : relier trois sites avec des routes statiques",
      description: "Relie le siège de Kora à deux agences par des liaisons /30, écris les routes statiques nécessaires et repère la route qui manque dans une table de routage.",
      difficulty: "intermediaire",
      xp: 160,
      format: "packet_tracer",
      minutes: 60,
      requiresComputer: true,
      isAssessment: false,
      briefing: `Kora ouvre deux agences. Le siège (${sites.siegeLan}) est relié à l’agence Nord (${sites.nordLan}) par la liaison ${sites.linkNord}, et à l’agence Sud (${sites.sudLan}) par la liaison ${sites.linkSud}. Les agences ne sont reliées qu’au siège. Ta mission : écrire les routes statiques qui permettent aux trois sites de communiquer, puis lire la table de routage de R-Siege, relevée sur un réseau dont un test échoue, pour trouver ce qui manque.`,
      constraints: ["Travaille uniquement sur la topologie et les fichiers fournis : ne configure aucun équipement réel qui ne t’appartient pas.", "Écris les commandes comme dans Cisco IOS : adresse de réseau, masque en notation décimale, puis prochain saut."],
      tools: ["Cisco Packet Tracer (gratuit, sur ton ordinateur, facultatif)", "Visionneuse de journaux CyberPingo", "Une calculatrice de sous-réseaux"],
      objectives: ["Dimensionner une liaison point à point en /30", "Écrire des routes statiques et une route par défaut", "Lire une table de routage et y repérer une route manquante", "Résumer deux réseaux voisins en une seule route"],
      hints: ["Un prochain saut est l’adresse du routeur voisin sur la liaison commune.", "Les agences n’ont qu’une sortie : le siège.", "Deux /24 voisins se résument en un /23."],
      tasks: [
        { prompt: "Combien d’adresses utilisables contient un réseau /30 comme celui d’une liaison entre deux routeurs ?", hint: "Un /30 contient 4 adresses, dont deux sont réservées.", answerFormat: "Un nombre entier", accepted: [String(sites.linkUsable)], explanation: `Un /30 contient 4 adresses : l’adresse réseau, l’adresse de diffusion et ${sites.linkUsable} adresses utilisables, une par routeur. C’est le plus petit réseau pratique pour une liaison point à point.` },
        { prompt: `Quelle est l’adresse de diffusion de la liaison ${sites.linkSud} ?`, hint: "C’est la dernière adresse du bloc de 4 adresses.", answerFormat: "Adresse IPv4", accepted: [sites.linkSudBroadcast], explanation: `Le bloc ${sites.linkSud} va de 172.20.0.4 à ${sites.linkSudBroadcast}. La dernière adresse est la diffusion : seules les deux adresses du milieu sont attribuables.` },
        { prompt: "Écris la commande à saisir sur R-Nord pour joindre le réseau local de l’agence Sud.", hint: "Format : ip route <réseau> <masque> <prochain saut>. Le prochain saut de R-Nord est le siège, sur la liaison Nord.", answerFormat: "Commande IOS", accepted: compact([sites.nordToSud]), explanation: `R-Nord ne connaît que le siège : il lui envoie tout ce qui vise l’agence Sud. « ${sites.nordToSud} » désigne le réseau de l’agence Sud et, comme prochain saut, l’adresse de R-Siege sur la liaison Nord.` },
        { prompt: "Écris la commande qui définit la route par défaut de R-Sud, dont la seule sortie est le siège.", hint: "La route par défaut s’écrit avec le réseau 0.0.0.0 et le masque 0.0.0.0.", answerFormat: "Commande IOS", accepted: compact([sites.sudDefault]), explanation: `La route par défaut « ${sites.sudDefault} » envoie tout le trafic inconnu vers le siège. C’est la solution la plus simple pour une agence qui n’a qu’une sortie.` },
        { prompt: "Dans la table de routage de R-Siege fournie, quel réseau est absent ? (réseau et préfixe, par exemple 10.0.0.0/24)", hint: "Compare les routes S de la table avec les réseaux locaux des agences.", answerFormat: "Réseau avec préfixe", accepted: compact([sites.missingRoute, withoutSlash(sites.missingRoute)]), explanation: `R-Siege connaît le réseau de l’agence Nord (route S) mais pas ${sites.missingRoute}. C’est pourquoi le ping vers l’agence Sud échoue : le routeur n’a aucune route pour cette destination.` },
        { prompt: "Écris la commande qui ajoute à R-Siege la route manquante.", hint: "Le prochain saut est l’adresse de R-Sud sur la liaison Sud.", answerFormat: "Commande IOS", accepted: compact([sites.siegeFix]), explanation: `« ${sites.siegeFix} » indique à R-Siege que le réseau de l’agence Sud est atteignable via R-Sud, côté liaison Sud. Après cette commande, show ip route affichera une seconde route S.` },
        { prompt: "Quel préfixe unique résume les réseaux locaux des agences Nord et Sud ?", hint: "Deux /24 voisins se regroupent dans un /23.", answerFormat: "Réseau avec préfixe", accepted: compact([sites.summary]), explanation: `Les deux /24 voisins (${sites.nordLan} et ${sites.sudLan}) tiennent dans ${sites.summary}. Un résumé réduit la taille des tables de routage, à condition que tout le bloc résumé soit bien joignable par ce chemin.` },
        { prompt: "Quelle lettre désigne une route statique dans la colonne de gauche de show ip route ?", hint: "Regarde la légende « Codes » en haut de la sortie.", answerFormat: "Une lettre", accepted: compact([sites.staticCode, `${sites.staticCode} (static)`, "static"]), explanation: "Dans la légende de show ip route, S désigne une route statique, C une route directement connectée et L l’adresse locale d’une interface." },
        { prompt: "Quelle est la distance administrative d’une route statique, d’après le [1/0] de la route de R-Siege ?", hint: "Le premier nombre entre crochets est la distance administrative.", answerFormat: "Un nombre entier", accepted: [String(sites.staticDistance)], explanation: `Dans [${sites.staticDistance}/0], le premier nombre est la distance administrative (${sites.staticDistance} pour une route statique) et le second la métrique. Une distance faible signifie une source de confiance : une route statique l’emporte sur une route RIP ou OSPF.` },
        { prompt: "R-Nord a une route par défaut vers le siège. A-t-il besoin d’une route spécifique vers le réseau de l’agence Sud pour la joindre ? (oui ou non)", hint: "Que fait un routeur d’un paquet dont la destination ne figure pas dans sa table ?", answerFormat: "oui ou non", accepted: yesNo(sites.defaultNeedsSpecific), explanation: "Non : la route par défaut envoie le paquet vers le siège, qui connaît le chemin. Une route spécifique n’est utile que pour choisir un autre chemin que la route par défaut." },
      ],
      assets: [
        { kind: "topology", title: "Topologie du TP 3", description: "Trois routeurs, deux liaisons /30 et un réseau local par site.", url: "/labs/tp3-topologie.svg" },
        { kind: "log", title: "Table de routage de R-Siege (tp3-show-ip-route-siege.log)", description: "show ip route et un ping qui échoue vers l’agence Sud.", url: "/labs/tp3-show-ip-route-siege.log" },
        { kind: "guide", title: "Guide pas à pas du TP 3", description: "Plan des liaisons, exemple de configuration et vérifications.", url: "/labs/tp3-guide.md" },
      ],
    },
    {
      slug: "incident-reseau-kora",
      title: "TP 4 : incident réseau chez Kora",
      description: "Les comptables n’atteignent plus leur serveur, le Wi-Fi invités est coupé et un poste ne reçoit plus d’adresse. Trouve les quatre pannes cachées dans les relevés d’un poste, d’un routeur et d’un commutateur.",
      difficulty: "intermediaire",
      xp: 320,
      format: "logs",
      minutes: 60,
      requiresComputer: false,
      isAssessment: true,
      briefing: "Un ticket signale que les postes de la comptabilité n’atteignent plus le serveur de fichiers FS01, que le Wi-Fi des invités est coupé et qu’un poste de l’atelier n’obtient plus d’adresse. Le fichier fourni rassemble les relevés faits sur trois postes, le routeur R1 et le commutateur SW1. Plusieurs défauts se cumulent : corriger le premier en révèle un autre. Ta mission : les trouver un à un en suivant le chemin des paquets, nommer la couche concernée, écrire la correction et expliquer pourquoi les horloges des équipements ne concordent pas. Ce laboratoire valide les compétences sur les modèles en couches, les VLAN et le trunk, le filtrage par ACL et le diagnostic : sans indice, il demande de recouper plusieurs sources.",
      constraints: ["Évaluation : réponds sans aide extérieure, comme en situation réelle.", "Appuie chaque réponse sur les relevés fournis, pas sur une supposition.", "Les corrections s’écrivent en commandes Cisco IOS exactes."],
      tools: ["Visionneuse de journaux CyberPingo", "Cisco Packet Tracer (facultatif, pour reproduire les pannes)", "Un tableur ou du papier pour noter ta chronologie"],
      objectives: ["Suivre le chemin d’un paquet pour localiser une panne", "Rapprocher une adresse MAC, un port et un VLAN", "Lire un trunk, une ACL et leurs compteurs", "Repérer un décalage d’horloge entre équipements"],
      hints: ["Teste de l’intérieur vers l’extérieur : poste, passerelle, serveur.", "Retrouve l’adresse physique du poste isolé, puis cherche-la dans la table MAC.", "Compare la liste des VLAN du commutateur avec celle du trunk."],
      tasks: [
        { prompt: "Quelle passerelle par défaut est configurée sur PC-Compta ?", hint: "Relis le ipconfig de la section 1.", answerFormat: "Adresse IPv4", accepted: [incident.wrongGateway], explanation: `PC-Compta utilise ${incident.wrongGateway}, une adresse qui n’existe pas : la passerelle du VLAN 20 est ${incident.goodGateway}. Le poste joint son propre réseau mais ne peut rien joindre au-delà.` },
        { prompt: "Quelle est la cause du premier échec (le ping vers le serveur depuis PC-Compta) ? Réponds par un seul mot : passerelle, vlan, trunk ou acl.", hint: "Le ping vers 10.40.20.1 réussit : le poste joint son routeur. Que se passe-t-il pour tout ce qui est hors du réseau local ?", answerFormat: "Un mot", accepted: compact(["passerelle", "mauvaise passerelle", "passerelle erronée", "passerelle erronee", "passerelle par défaut", "passerelle par defaut", "gateway", "la passerelle"]), explanation: `La passerelle configurée (${incident.wrongGateway}) n’existe pas. Le poste n’arrive pas à la joindre et affiche « Impossible de joindre l’hôte de destination » en répondant depuis sa propre adresse : c’est la signature d’une passerelle injoignable.` },
        { prompt: "À quelle couche du modèle OSI se situe cette panne de passerelle ? (donne le numéro)", hint: "La passerelle est une adresse IP, utilisée pour router.", answerFormat: "Un numéro de couche", accepted: compact([String(incident.gatewayLayer), `couche ${incident.gatewayLayer}`, "réseau", "reseau", "couche réseau", "couche reseau", "layer 3"]), explanation: "Une adresse de passerelle est une adresse IP : le défaut se situe à la couche 3, la couche réseau. Un défaut de câble serait en couche 1, un défaut de VLAN en couche 2." },
        { prompt: "Sur quel port de SW1 est branché PC-Atelier ? (cherche son adresse physique 00-90-2B-7A-31-D5 dans la table MAC ; nom court, par exemple Fa0/3)", hint: "Les adresses MAC s’écrivent par groupes de quatre chiffres dans la table de SW1.", answerFormat: "Nom d’interface", accepted: compact([incident.atelierPort, "fastethernet0/12", "fastethernet 0/12", "f0/12", "fa 0/12"]), explanation: `La table MAC associe 0090.2b7a.31d5 au port ${incident.atelierPort}. Une adresse MAC se retrouve d’un format à l’autre : 00-90-2B-7A-31-D5 devient 0090.2b7a.31d5.` },
        { prompt: "Dans quel VLAN ce port est-il affecté, alors qu’il devrait appartenir au VLAN des employés ?", hint: "La ligne de la table MAC donne le VLAN dans lequel l’adresse a été apprise.", answerFormat: "Un numéro de VLAN", accepted: compact([String(incident.atelierVlanFound), `vlan ${incident.atelierVlanFound}`]), explanation: `Le port ${incident.atelierPort} est resté dans le VLAN ${incident.atelierVlanFound}, le VLAN par défaut, où aucun service DHCP n’écoute. Le poste s’attribue alors une adresse automatique en 169.254.x.x.` },
        { prompt: `Quelle commande, saisie sur le port ${incident.atelierPort}, remet ce poste dans le VLAN des employés (VLAN ${incident.atelierVlan}) ?`, hint: "C’est la commande qui affecte un port d’accès à un VLAN.", answerFormat: "Commande IOS", accepted: compact([incident.atelierFix]), explanation: `« ${incident.atelierFix} » affecte le port d’accès au VLAN ${incident.atelierVlan}. Le poste recevra alors une adresse du service DHCP de son VLAN.` },
        { prompt: "Quel VLAN manque dans la liste des VLAN autorisés sur le trunk et explique la panne du Wi-Fi des invités ?", hint: "Compare la liste du trunk avec les VLAN de show vlan brief.", answerFormat: "Un numéro de VLAN", accepted: compact([String(incident.trunkMissingVlan), `vlan ${incident.trunkMissingVlan}`]), explanation: `Le VLAN ${incident.trunkMissingVlan} (Invités) existe sur SW1 mais n’est pas autorisé sur le trunk : ses trames n’atteignent jamais le routeur. Les autres VLAN fonctionnent, ce qui isole la panne.` },
        { prompt: "Quelle commande, sur l’interface trunk, ajoute ce VLAN à la liste sans retirer les autres ?", hint: "Le mot-clé « add » complète la liste au lieu de la remplacer.", answerFormat: "Commande IOS", accepted: compact([incident.trunkFix]), explanation: `« ${incident.trunkFix} » ajoute le VLAN ${incident.trunkMissingVlan} à la liste. Sans « add », la commande remplacerait la liste entière et couperait tous les autres VLAN.` },
        { prompt: "Après correction de la passerelle, le ping vers FS01 échoue encore. Quelle ligne d’ACL en est la cause ? (copie la règle, sans le compteur entre parenthèses)", hint: "Regarde les compteurs « matches » de show access-lists.", answerFormat: "Ligne d’ACL", accepted: compact([incident.aclRule, `${incident.aclRuleNumber} ${incident.aclRule}`]), explanation: `La ligne « ${incident.aclRuleNumber} ${incident.aclRule} » refuse tout le VLAN 20 vers le serveur : c’est un blocage trop large pour un serveur que la comptabilité doit joindre. Ses compteurs montrent qu’elle intercepte vraiment le trafic.` },
        { prompt: "Combien de paquets cette règle a-t-elle déjà refusés ?", hint: "Le compteur est à la fin de la ligne.", answerFormat: "Un nombre entier", accepted: [String(incident.aclMatches)], explanation: `Le compteur affiche ${incident.aclMatches} correspondances : chaque tentative de la comptabilité vers FS01 a été refusée. Un compteur qui monte pendant un test prouve qu’une règle agit.` },
        { prompt: "Quelle commande, en mode de configuration de l’ACL SERVEURS, supprime cette ligne fautive ?", hint: "En mode ACL nommée, on supprime une ligne grâce à son numéro de séquence.", answerFormat: "Commande IOS", accepted: compact([incident.aclRemove]), explanation: `« ${incident.aclRemove} » supprime la ligne de séquence ${incident.aclRuleNumber} sans toucher aux autres. Il faut ensuite refaire le test, puis vérifier que les règles voulues sont bien présentes.` },
        { prompt: "Les deux extrémités du même lien (Gi0/0 de R1 et Gi0/1 de SW1) ont changé d’état au même moment. Quel décalage d’horloge, en minutes, sépare les deux journaux ?", hint: "Compare les heures des deux événements « changed state to down ».", answerFormat: "Un nombre de minutes", accepted: compact([String(incident.clockSkewMinutes), `${incident.clockSkewMinutes} minutes`, `${incident.clockSkewMinutes} min`]), explanation: `Le routeur indique 09:41 et le commutateur 09:34 pour le même événement : ${incident.clockSkewMinutes} minutes d’écart. Corréler ces journaux sans corriger ce décalage mènerait à de fausses conclusions.` },
        { prompt: "Quel protocole synchronise les horloges des équipements sur une source de temps commune ?", hint: "Son nom veut dire « protocole de temps réseau ».", answerFormat: "Un sigle", accepted: compact(["ntp", "network time protocol"]), explanation: "NTP aligne l’horloge de chaque équipement sur un serveur de temps. Sans lui, les journaux ne se corrèlent pas : les équipements affichent un astérisque devant l’heure quand leur horloge n’est pas synchronisée." },
      ],
      assets: [
        { kind: "log", title: "Relevés du ticket 2026-0317 (incident-reseau-kora.log)", description: "Trois postes, le routeur R1 et le commutateur SW1 : outputs de ping, ipconfig, show et journaux.", url: "/labs/incident-reseau-kora.log" },
      ],
    },
    {
      slug: "projet-reseau-kora",
      title: "Projet final : concevoir et documenter le réseau de Kora",
      description: `Découpe ${project.block} pour cinq services avec VLSM, prépare le plan IPv6, dimensionne le DHCP et la traduction d’adresse, puis repère les incohérences d’un inventaire existant.`,
      difficulty: "avance",
      xp: 380,
      format: "packet_tracer",
      minutes: 90,
      requiresComputer: true,
      isAssessment: true,
      briefing: `Kora regroupe ses équipes dans un nouveau bâtiment et te confie son réseau. Le cahier des charges fourni donne le bloc IPv4 ${project.block}, le préfixe IPv6 ${project.ipv6Block}, le lien vers l’opérateur, les besoins de cinq services, les services à prévoir et les règles de filtrage. Ta mission : calculer le plan d’adressage (du plus grand besoin au plus petit, sans trou), déduire le plan IPv6, dimensionner le DHCP, écrire la route vers l’opérateur et prévoir la table de routage du routeur, puis relire l’inventaire existant pour y repérer les incohérences. La maquette dans Packet Tracer est facultative ; le modèle de documentation fourni te sert à rédiger ton dossier, que tu peux déposer pour une relecture. Ce laboratoire valide les compétences d’adressage VLSM et IPv6, de DHCP et de traduction d’adresse, de routage statique et de documentation.`,
      constraints: ["Évaluation : réponds sans aide extérieure, comme en situation réelle.", "Respecte la règle d’allocation du cahier des charges : du plus grand besoin au plus petit, sans trou.", "N’inscris aucun mot de passe dans ta documentation."],
      tools: ["Cisco Packet Tracer (gratuit, facultatif)", "Une calculatrice de sous-réseaux ou Node.js pour vérifier les calculs", "Un éditeur de texte pour le modèle de documentation"],
      objectives: ["Dimensionner des sous-réseaux avec VLSM", "Construire un plan IPv6 à partir d’un /48", "Dimensionner une plage DHCP et justifier la traduction PAT", "Relire une documentation et y repérer des incohérences"],
      hints: ["Pour chaque besoin, cherche la plus petite puissance de 2 qui couvre les adresses utilisables nécessaires.", "Le quatrième groupe IPv6 reprend le numéro du VLAN en hexadécimal.", "Dans l’inventaire, vérifie chaque adresse contre le réseau de son VLAN."],
      tasks: [
        { prompt: "Quel est le plus petit préfixe qui peut accueillir les 110 adresses utilisables du service Employés ? (par exemple /24)", hint: "Un préfixe /n offre 2 puissance (32 moins n) adresses, moins deux.", answerFormat: "Préfixe, par exemple /24", accepted: compact([`/${project.employesPrefix}`, String(project.employesPrefix)]), explanation: `Un /${project.employesPrefix} offre ${2 ** (32 - project.employesPrefix) - 2} adresses utilisables : assez pour 110, alors qu’un /${project.employesPrefix + 1} n’en offre que ${2 ** (31 - project.employesPrefix) - 2}.` },
        { prompt: "Quelle est l’adresse réseau du sous-réseau Administration, alloué juste après Employés ?", hint: "Le sous-réseau Employés occupe le début du bloc ; Administration commence juste après.", answerFormat: "Adresse IPv4", accepted: [project.administrationNetwork], explanation: `Employés occupe le début du bloc ; Administration (45 adresses, donc un /26) commence juste après : ${project.administrationNetwork}.` },
        { prompt: "Quelle est l’adresse de diffusion du sous-réseau Invités ?", hint: "Invités a besoin de 28 adresses, donc d’un /27, et suit Administration.", answerFormat: "Adresse IPv4", accepted: [project.invitesBroadcast], explanation: `Le sous-réseau Invités est un /27 de 32 adresses qui suit Administration. Sa dernière adresse, ${project.invitesBroadcast}, est la diffusion.` },
        { prompt: "Quelle est la première adresse utilisable du sous-réseau Serveurs ? (c’est aussi sa passerelle)", hint: "Serveurs (12 adresses, un /28) suit Invités.", answerFormat: "Adresse IPv4", accepted: [project.serveursFirst], explanation: `Serveurs est un /28 de 16 adresses. Sa première adresse utilisable est ${project.serveursFirst} : c’est la passerelle du VLAN, selon la règle du cahier des charges.` },
        { prompt: "Quel masque (notation décimale) porte le sous-réseau Gestion, qui doit accueillir 5 adresses utilisables ?", hint: "Trois bits d’hôte offrent 8 adresses, donc 6 utilisables.", answerFormat: "Masque décimal", accepted: [project.gestionMask], explanation: `Pour 5 adresses utilisables, il faut un /29 (6 utilisables), soit le masque ${project.gestionMask}. Un /30 n’en offrirait que 2.` },
        { prompt: `Quelle est la première adresse libre du bloc ${project.block} une fois les cinq sous-réseaux alloués ?`, hint: "Elle suit directement le dernier sous-réseau alloué (Gestion).", answerFormat: "Adresse IPv4", accepted: [project.firstFree], explanation: `Les cinq sous-réseaux occupent le début du bloc sans trou. La première adresse libre est ${project.firstFree} : tout le reste de ${project.block} est disponible pour la croissance.` },
        { prompt: `Combien de sous-réseaux /27 le bloc ${project.block} contient-il en tout ?`, hint: "Divise le nombre d’adresses du bloc par celui d’un /27.", answerFormat: "Un nombre entier", accepted: [String(project.slash27Count)], explanation: `Un ${project.block} compte 1 024 adresses et un /27 en compte 32 : le bloc contient ${project.slash27Count} sous-réseaux /27.` },
        { prompt: `Combien de sous-réseaux /64 le préfixe ${project.ipv6Block} peut-il contenir ?`, hint: "Il y a 64 moins 48 bits pour numéroter les sous-réseaux.", answerFormat: "Un nombre entier", accepted: compact([String(project.ipv6SubnetCount), "65 536", "65536"]), explanation: `Entre /48 et /64, il y a 16 bits pour numéroter les sous-réseaux : 2 puissance 16, soit ${project.ipv6SubnetCount} sous-réseaux /64.` },
        { prompt: "Quel est le /64 du VLAN des invités (VLAN 30), sachant que le quatrième groupe reprend le numéro du VLAN en hexadécimal ? (notation compressée, avec /64)", hint: "30 en hexadécimal s’écrit 1e.", answerFormat: "Préfixe, par exemple 2001:db8:1::/64", accepted: compact([project.invitesV6, withoutSlash(project.invitesV6)]), explanation: `Le numéro de VLAN 30 vaut 1e en hexadécimal. Le quatrième groupe devient donc 1e : ${project.invitesV6}.` },
        { prompt: "Quelle est la première adresse de la plage DHCP des employés, sachant que les dix premières adresses utilisables sont exclues ?", hint: "La passerelle est la première adresse utilisable ; les dix premières sont exclues.", answerFormat: "Adresse IPv4", accepted: [project.poolStart], explanation: `Les dix premières adresses utilisables (passerelle comprise) sont exclues du service : la plage commence à ${project.poolStart}.` },
        { prompt: "Combien d’adresses la plage DHCP des employés contient-elle, de sa première adresse à la dernière adresse utilisable du sous-réseau ?", hint: "Dernière utilisable moins première de la plage, plus un.", answerFormat: "Un nombre entier", accepted: [String(project.poolSize)], explanation: `La plage va de ${project.poolStart} à la dernière adresse utilisable du /${project.employesPrefix} : ${project.poolSize} adresses disponibles pour les postes des employés.` },
        { prompt: "Kora n’a qu’une adresse publique. Combien d’adresses publiques faut-il au minimum pour faire sortir tous les VLAN avec PAT ?", hint: "PAT distingue les conversations par leur numéro de port.", answerFormat: "Un nombre entier", accepted: compact([String(project.patAddresses), "une", "un", "1 adresse", "une adresse"]), explanation: "PAT remplace l’adresse source par une adresse publique et distingue chaque conversation par un numéro de port : une seule adresse publique suffit pour tous les VLAN." },
        { prompt: `Écris la commande qui définit la route par défaut du routeur de Kora vers l’opérateur, dont l’adresse sur le lien ${project.operatorLink} figure dans le cahier des charges.`, hint: "La route par défaut utilise le réseau 0.0.0.0 et le masque 0.0.0.0 ; le prochain saut est l’adresse de l’opérateur.", answerFormat: "Commande IOS", accepted: compact([project.defaultRoute]), explanation: `« ${project.defaultRoute} » envoie vers l’opérateur tout ce que le routeur ne connaît pas : c’est la sortie Internet de Kora. Le prochain saut est l’adresse de l’opérateur sur le lien, jamais l’adresse de Kora.` },
        { prompt: "Combien de routes connectées (code C dans show ip route) le routeur de Kora contiendra-t-il, une fois les cinq sous-réseaux des VLAN et le lien vers l’opérateur configurés ?", hint: "Chaque interface active porte un réseau connecté ; les routes locales (code L) ne sont pas des routes C.", answerFormat: "Un nombre entier", accepted: [String(project.connectedRoutes)], explanation: `Un réseau connecté par interface active : ${project.plan.length} sous-réseaux de VLAN et 1 lien opérateur, soit ${project.connectedRoutes} routes C. Chaque interface ajoute aussi une route locale (L, en /32), qui est comptée à part.` },
        { prompt: "Dans l’inventaire à vérifier, quelle adresse IP est attribuée à deux équipements différents ?", hint: "Cherche les doublons dans la colonne des adresses.", answerFormat: "Adresse IPv4", accepted: [project.duplicateAddress], explanation: `${project.duplicateAddress} apparaît deux fois, pour deux serveurs : un conflit d’adresse. Un inventaire sans doublon est la première vérification d’une documentation fiable.` },
        { prompt: "Quel équipement de l’inventaire a une adresse qui ne se trouve pas dans le sous-réseau de son VLAN ?", hint: "Compare l’adresse de chaque équipement avec le réseau de son VLAN dans le plan en vigueur.", answerFormat: "Nom de l’équipement", accepted: compact([project.outsideDevice, project.outsideDevice.replace("é", "e")]), explanation: `${project.outsideDevice} est déclaré dans le VLAN Invités mais son adresse appartient au sous-réseau Administration : elle ne communiquera pas correctement avec la passerelle de son VLAN.` },
        { prompt: "Quel équipement de l’inventaire n’a aucune passerelle indiquée ?", hint: "Cherche la case vide de la dernière colonne.", answerFormat: "Nom de l’équipement", accepted: compact([project.noGatewayDevice, "nas", "nas-sauvegarde"]), explanation: `${project.noGatewayDevice} n’a pas de passerelle documentée : on ne saura ni lui permettre de sortir de son sous-réseau ni dépanner sa configuration. Une documentation incomplète est une dette technique.` },
      ],
      assets: [
        { kind: "guide", title: "Cahier des charges de Kora", description: "Bloc IPv4 et IPv6, besoins par service, services à prévoir et règles de filtrage.", url: "/labs/projet-kora-cahier-des-charges.md" },
        { kind: "topology", title: "Topologie de référence", description: "Le routeur, le commutateur et les cinq VLAN de Kora.", url: "/labs/projet-kora-topologie.svg" },
        { kind: "guide", title: "Inventaire existant à vérifier", description: "Le plan en vigueur et l’inventaire saisi à la main, avec ses incohérences.", url: "/labs/projet-kora-inventaire-a-verifier.md" },
        { kind: "report_template", title: "Modèle de documentation réseau", description: "Plan d’adressage, VLAN, services, filtrage, inventaire et tests.", url: "/labs/projet-kora-modele-documentation.md" },
      ],
    },
  ];

  const skills: PathSkill[] = [
    { slug: "modeles-reseau", name: "Modèles OSI et TCP/IP", description: "Situer un protocole ou un équipement dans les couches et expliquer le trajet d’un paquet.", lessonKey: "reseaux-encapsulation", practiceLab: "tp-reseau-domestique", validationLab: "incident-reseau-kora" },
    { slug: "plan-vlsm", name: "Plan d’adressage VLSM", description: "Dimensionner des sous-réseaux de tailles différentes et les allouer sans chevauchement.", lessonKey: "reseaux-vlsm", practiceLab: "packet-tracer-sous-reseaux", validationLab: "projet-reseau-kora" },
    { slug: "adressage-ipv6", name: "Adressage IPv6", description: "Lire et compresser une adresse IPv6, découper un préfixe et distinguer les types d’adresses.", lessonKey: "reseaux-ipv6-types", practiceLab: "tp-reseau-domestique", validationLab: "projet-reseau-kora" },
    { slug: "services-dhcp", name: "Service DHCP", description: "Dimensionner une plage, des exclusions et des options, et lire un bail.", lessonKey: "reseaux-dhcp", practiceLab: "tp-reseau-domestique", validationLab: "projet-reseau-kora" },
    { slug: "nat-pat", name: "Traduction d’adresse NAT et PAT", description: "Expliquer la traduction d’adresse avec ports et ses limites.", lessonKey: "reseaux-nat-pat", practiceLab: "tp-reseau-domestique", validationLab: "projet-reseau-kora" },
    { slug: "commutation-vlan", name: "VLAN et trunk", description: "Segmenter un commutateur en VLAN et lire l’état d’un trunk 802.1Q.", lessonKey: "reseaux-vlan", practiceLab: "tp-vlan-pme", validationLab: "incident-reseau-kora" },
    { slug: "routage-statique", name: "Routage statique", description: "Écrire des routes statiques et une route par défaut, lire une table de routage.", lessonKey: "reseaux-table-routage", practiceLab: "tp-multi-sites", validationLab: "projet-reseau-kora" },
    { slug: "filtrage-acl", name: "Filtrage par ACL", description: "Écrire, placer et vérifier une liste de contrôle d’accès sans se bloquer.", lessonKey: "reseaux-acl", practiceLab: "tp-vlan-pme", validationLab: "incident-reseau-kora" },
    { slug: "diagnostic-reseau", name: "Diagnostic réseau", description: "Appliquer une méthode de dépannage et recouper des relevés pour isoler une panne.", lessonKey: "reseaux-depannage", practiceLab: "tp-multi-sites", validationLab: "incident-reseau-kora" },
    { slug: "documentation-reseau", name: "Documentation réseau", description: "Documenter un réseau et y repérer incohérences et oublis.", lessonKey: "reseaux-documentation", practiceLab: "tp-vlan-pme", validationLab: "projet-reseau-kora" },
  ];

  const badges: PathBadge[] = [
    { slug: "pionnier-ipv6", name: "Pionnier IPv6", description: "Valider la compétence Adressage IPv6 par le projet final.", icon: "zap", rarity: "rare", xp: 40, position: 230, skill: "adressage-ipv6" },
    { slug: "maitre-des-vlan", name: "Maître des VLAN", description: "Valider la compétence VLAN et trunk par l’incident chez Kora.", icon: "network", rarity: "rare", xp: 40, position: 240, skill: "commutation-vlan" },
    { slug: "routeur-confirme", name: "Routeur confirmé", description: "Valider la compétence Routage statique par le projet final.", icon: "flag", rarity: "rare", xp: 40, position: 250, skill: "routage-statique" },
    { slug: "gardien-des-flux", name: "Gardien des flux", description: "Valider la compétence Filtrage par ACL par l’incident chez Kora.", icon: "lock", rarity: "rare", xp: 40, position: 260, skill: "filtrage-acl" },
    { slug: "depanneur-reseau", name: "Dépanneur réseau", description: "Réussir l’incident réseau chez Kora : quatre pannes, un seul ticket.", icon: "terminal", rarity: "epic", xp: 60, position: 270, lab: "incident-reseau-kora" },
    { slug: "architecte-kora", name: "Architecte de Kora", description: "Réussir le projet final : concevoir et documenter le réseau de Kora.", icon: "trophy", rarity: "epic", xp: 60, position: 280, lab: "projet-reseau-kora" },
  ];

  return {
    modules: modules as PathModuleEntry[],
    labs,
    skills,
    badges,
    externalLabs: [
      { slug: "reseau-instable" },
      { slug: "incident-pare-feu" },
      { slug: "packet-tracer-sous-reseaux" },
      { slug: "evaluation-reseaux", isAssessment: true },
    ],
    appendResources: references,
    durationSync: ["reseaux"],
    courseTexts: [
      {
        slug: "reseaux",
        fromShort: "Comprendre comment circulent les données pour mieux les protéger.",
        fromDescription: "DNS, ports, protocoles et modèle OSI : comprendre comment circulent les données pour repérer ce qui cloche et mieux les protéger.",
        short: "De l’adressage IPv4 et IPv6 aux VLAN, au routage, aux services et au diagnostic : un parcours complet pour comprendre un réseau, le configurer en simulation et le dépanner.",
        description: "Ce parcours t’apprend à concevoir un petit réseau, à le configurer dans un simulateur gratuit, à expliquer les échanges entre équipements et à diagnostiquer les pannes les plus fréquentes. Dix modules progressifs couvrent les fondamentaux, l’adressage IPv4 et IPv6, la commutation Ethernet et les VLAN, le routage, les services (DNS, DHCP, NAT, NTP), les protocoles, la lecture de captures, la sécurité réseau, le diagnostic et la documentation.\n\nChaque leçon propose un cours détaillé, des exemples corrigés et un quiz avec correction. Trois travaux pratiques guidés, un incident à diagnostiquer et un projet final te font manipuler ce que tu apprends, avec des critères de réussite vérifiés par la plateforme.\n\nCompétences visées : calculer un plan d’adressage, configurer une topologie, comprendre les échanges entre équipements, segmenter un réseau, diagnostiquer une panne, documenter une configuration.\n\nAucun prérequis : un ordinateur suffit. Cisco Packet Tracer et Wireshark sont gratuits. Les vidéos sont en préparation : chaque leçon indique clairement quand la sienne n’est pas encore disponible, et le cours écrit couvre déjà l’essentiel.",
      },
    ],
  };
}
