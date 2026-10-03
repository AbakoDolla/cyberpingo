// Deterministic scenarios of the two assessments of the Réseaux programme: the incident at Kora (a ticket
// with the outputs of a Windows PC, a router and a switch, where four faults hide) and the final project
// (design and document the network of Kora). Every expected answer (the "facts") is computed from the same
// values that are written into the files, so the files and the answer keys can never drift apart.
// Used by scripts/generate-lab-assets.cjs.

const { text, toInt, toIp, subnetOf, prefixForHosts, subPrefixV6, diagram } = require("./lab-network-kit.cjs");
const { vlanBrief, trunkTable, portRange } = require("./lab-scenarios-reseaux.cjs");

// --- TP 4: incident at Kora ------------------------------------------------------------------------------

function buildIncident() {
  const server = "10.40.10.10";
  const goodGateway = "10.40.20.1";
  const wrongGateway = "10.40.20.254";
  const atelierPort = "Fa0/12";
  const atelierMac = "0090.2b7a.31d5";
  const atelierVlan = 20;
  const aclName = "SERVEURS";
  const aclMatches = 12;
  const aclLine = `10 deny ip 10.40.20.0 0.0.0.255 host ${server}`;
  const skew = { routerTime: "09:41:12.512", switchTime: "09:34:12.231", minutes: 7 };

  const employesPorts = portRange("Fa0/", 9, 16).filter((port) => port !== atelierPort);
  const vlans = [
    { id: 10, name: "Administration", ports: portRange("Fa0/", 1, 8) },
    { id: 20, name: "Employes", ports: employesPorts },
    { id: 30, name: "Invites", ports: portRange("Fa0/", 17, 22) },
    { id: 99, name: "Gestion", ports: [] },
  ];
  const trunkAllowed = [10, 20, 99];
  const reply = (address, time = "temps<1ms", ttl = 255) => `Réponse de ${address} : octets=32 ${time} TTL=${ttl}`;
  const unreachable = "Réponse de 10.40.20.15 : Impossible de joindre l’hôte de destination.";
  const timeout = "Délai d’attente de la demande dépassé.";
  const stats = (target, sent, received, lost, extra = true) => `Statistiques Ping pour ${target}:
    Paquets : envoyés = ${sent}, reçus = ${received}, perdus = ${lost} (perte ${Math.round((lost / sent) * 100)}%),${extra ? `
Durée approximative des boucles en millisecondes :
    Minimum = 0ms, Maximum = 0ms, Moyenne = 0ms` : ""}`;
  const ping = (target, lines, summary) => `Envoi d’une requête 'Ping'  ${target} avec 32 octets de données :
${lines.join("\n")}

${summary}`;

  const lines = [
    "=== KORA : TICKET 2026-0317 ===",
    "Symptômes signalés : les postes de la comptabilité n’atteignent plus le serveur de fichiers FS01 (10.40.10.10), le Wi-Fi des invités ne passe plus,",
    "et un poste de l’atelier ne reçoit plus d’adresse. Les relevés ci-dessous ont été faits le 17/03/2026. Les heures sont celles affichées par chaque équipement.",
    "",
    "--- 1. Poste PC-Compta (VLAN 20) ---",
    "C:\\> ipconfig",
    "",
    "Configuration IP de Windows",
    "",
    "Carte Ethernet Ethernet :",
    "",
    "   Suffixe DNS propre à la connexion. . . : kora.example",
    "   Adresse IPv4. . . . . . . . . . . . . .: 10.40.20.15",
    "   Masque de sous-réseau. . . . . . . . . : 255.255.255.0",
    `   Passerelle par défaut. . . . . . . . . : ${wrongGateway}`,
    "",
    `C:\\> ping ${goodGateway}`,
    "",
    ping(goodGateway, Array(4).fill(reply(goodGateway)), stats(goodGateway, 4, 4, 0)),
    "",
    `C:\\> ping ${server}`,
    "",
    ping(server, Array(4).fill(unreachable), stats(server, 4, 4, 0, false)),
    "",
    "--- 2. Poste PC-Direction (VLAN 10) ---",
    `C:\\> ping ${server}`,
    "",
    ping(server, Array(4).fill(reply(server, "temps=1ms", 128)), stats(server, 4, 4, 0).replace("Minimum = 0ms, Maximum = 0ms, Moyenne = 0ms", "Minimum = 1ms, Maximum = 1ms, Moyenne = 1ms")),
    "",
    "--- 3. Poste PC-Atelier ---",
    "C:\\> ipconfig /all",
    "",
    "Carte Ethernet Ethernet :",
    "",
    "   Description. . . . . . . . . . . . . . : Carte réseau Fast Ethernet",
    "   Adresse physique . . . . . . . . . . . : 00-90-2B-7A-31-D5",
    "   DHCP activé. . . . . . . . . . . . . . : Oui",
    "   Adresse IPv4 autoconfiguration. . . . .: 169.254.38.7(préféré)",
    "   Masque de sous-réseau. . . . . . . . . : 255.255.0.0",
    "   Passerelle par défaut. . . . . . . . . :",
    "   Serveur DHCP . . . . . . . . . . . . . :",
    "",
    "--- 4. Routeur R1 ---",
    "R1#show ip interface brief",
    "Interface                  IP-Address      OK? Method Status                Protocol",
    "GigabitEthernet0/0         unassigned      YES unset  up                    up",
    "GigabitEthernet0/0.10      10.40.10.1      YES manual up                    up",
    "GigabitEthernet0/0.20      10.40.20.1      YES manual up                    up",
    "GigabitEthernet0/0.30      10.40.30.1      YES manual up                    up",
    "GigabitEthernet0/0.99      10.40.99.1      YES manual up                    up",
    "GigabitEthernet0/1         unassigned      YES unset  administratively down down",
    "",
    "R1#show running-config interface GigabitEthernet0/0.10",
    "Building configuration...",
    "",
    "Current configuration : 148 bytes",
    "!",
    "interface GigabitEthernet0/0.10",
    " encapsulation dot1Q 10",
    " ip address 10.40.10.1 255.255.255.0",
    ` ip access-group ${aclName} out`,
    " no ip unreachables",
    "end",
    "",
    "--- 5. Après correction de la passerelle de PC-Compta (maintenant 10.40.20.1) ---",
    `C:\\> ping ${server}`,
    "",
    ping(server, Array(4).fill(timeout), stats(server, 4, 0, 4, false)),
    "",
    "R1#show access-lists",
    `Extended IP access list ${aclName}`,
    `    ${aclLine} (${aclMatches} matches)`,
    "    20 permit ip any any (87 matches)",
    "",
    "--- 6. Commutateur SW1 ---",
    "SW1#show vlan brief",
    "",
    vlanBrief(vlans, [atelierPort, "Fa0/23", "Fa0/24", "Gi0/2"]),
    "",
    "SW1#show interfaces trunk",
    "",
    trunkTable("Gi0/1", 99, trunkAllowed),
    "",
    "SW1#show mac address-table dynamic",
    "          Mac Address Table",
    "-------------------------------------------",
    "",
    "Vlan    Mac Address       Type        Ports",
    "----    -----------       --------    -----",
    "   1    " + `${atelierMac}    DYNAMIC     ${atelierPort}`,
    "  10    0001.9632.aa01    DYNAMIC     Fa0/1",
    "  10    0001.c7e4.0b10    DYNAMIC     Gi0/1",
    "  20    00d0.ba3c.5e02    DYNAMIC     Fa0/9",
    "  20    0001.c7e4.0b10    DYNAMIC     Gi0/1",
    "  99    0001.c7e4.0b10    DYNAMIC     Gi0/1",
    "Total Mac Addresses for this criterion: 6",
    "",
    "--- 7. Journaux (le port Gi0/0 de R1 est relié au port Gi0/1 de SW1) ---",
    "R1#show logging | include UPDOWN",
    `*Mar 17 ${skew.routerTime}: %LINK-3-UPDOWN: Interface GigabitEthernet0/0, changed state to down`,
    "*Mar 17 09:41:14.530: %LINK-3-UPDOWN: Interface GigabitEthernet0/0, changed state to up",
    "",
    "SW1#show logging | include UPDOWN",
    `*Mar 17 ${skew.switchTime}: %LINK-3-UPDOWN: Interface GigabitEthernet0/1, changed state to down`,
    "*Mar 17 09:34:14.248: %LINK-3-UPDOWN: Interface GigabitEthernet0/1, changed state to up",
    "",
  ];

  const facts = {
    server, wrongGateway, goodGateway, gatewayLayer: 3, atelierPort, atelierVlanFound: 1, atelierVlan,
    atelierFix: `switchport access vlan ${atelierVlan}`, trunkMissingVlan: 30, trunkFix: "switchport trunk allowed vlan add 30",
    aclRule: aclLine.replace(/^10 /, ""), aclRuleNumber: 10, aclMatches, aclRemove: "no 10", clockSkewMinutes: skew.minutes,
  };
  return { facts, file: text(lines.join("\n")) };
}

// --- Final project: design and document the network of Kora ---------------------------------------------

function buildProject() {
  const block = "10.80.0.0/22";
  const needs = [
    { name: "Employés", vlan: 20, hosts: 110 },
    { name: "Administration", vlan: 10, hosts: 45 },
    { name: "Invités", vlan: 30, hosts: 28 },
    { name: "Serveurs", vlan: 40, hosts: 12 },
    { name: "Gestion", vlan: 99, hosts: 5 },
  ];
  let cursor = toInt("10.80.0.0");
  const plan = needs.map((need) => {
    const prefix = prefixForHosts(need.hosts);
    const subnet = subnetOf(toIp(cursor), prefix);
    cursor += subnet.size;
    return { ...need, ...subnet };
  });
  const [employes, administration, invites, serveurs, gestion] = plan;
  const blockSubnet = subnetOf("10.80.0.0", 22);
  const ipv6Block = "2001:db8:4b00::/48";
  const invitesV6 = subPrefixV6("2001:db8:4b00::", 48, 64, invites.vlan);
  const excludedUntil = toIp(toInt(employes.first) + 9);
  const poolStart = toIp(toInt(excludedUntil) + 1);
  const poolSize = toInt(employes.last) - toInt(poolStart) + 1;
  const duplicate = toIp(toInt(serveurs.first) + 1);
  const operatorLink = subnetOf("192.0.2.0", 30);
  const operatorGateway = operatorLink.first;
  const publicAddress = toIp(toInt(operatorLink.first) + 1);
  const defaultRoute = `ip route 0.0.0.0 0.0.0.0 ${operatorGateway}`;

  const inventory = [
    { name: "Routeur-Kora", vlan: gestion.vlan, address: gestion.first, mask: gestion.mask, gateway: "sans objet (c’est la passerelle)" },
    { name: "Switch-Etage1", vlan: gestion.vlan, address: toIp(toInt(gestion.first) + 1), mask: gestion.mask, gateway: gestion.first },
    { name: "NAS-Sauvegarde", vlan: gestion.vlan, address: toIp(toInt(gestion.first) + 2), mask: gestion.mask, gateway: "" },
    { name: "Serveur-Fichiers", vlan: serveurs.vlan, address: duplicate, mask: serveurs.mask, gateway: serveurs.first },
    { name: "Serveur-Impression", vlan: serveurs.vlan, address: duplicate, mask: serveurs.mask, gateway: serveurs.first },
    { name: "AP-Invités", vlan: invites.vlan, address: toIp(toInt(administration.first) + 21), mask: invites.mask, gateway: invites.first },
    { name: "PC-Direction", vlan: administration.vlan, address: toIp(toInt(administration.first) + 11), mask: administration.mask, gateway: administration.first },
    { name: "PC-Compta", vlan: employes.vlan, address: toIp(toInt(employes.first) + 19), mask: employes.mask, gateway: employes.first },
  ];
  const outside = inventory.find((device) => device.name === "AP-Invités");
  const noGateway = inventory.find((device) => device.gateway === "");

  const facts = {
    block, employesPrefix: employes.prefix, administrationNetwork: administration.network, invitesBroadcast: invites.broadcast,
    serveursFirst: serveurs.first, gestionMask: gestion.mask, firstFree: toIp(cursor), slash27Count: blockSubnet.size / 32,
    ipv6Block, ipv6SubnetCount: 2 ** (64 - 48), invitesV6, poolStart, poolSize, patAddresses: 1, duplicateAddress: duplicate,
    operatorLink: `${operatorLink.network}/30`, operatorGateway, publicAddress, defaultRoute, connectedRoutes: plan.length + 1,
    outsideDevice: outside.name, noGatewayDevice: noGateway.name, plan: plan.map((item) => ({ name: item.name, vlan: item.vlan, network: `${item.network}/${item.prefix}` })),
  };

  const brief = `# Projet final : concevoir et documenter le réseau de Kora

Kora regroupe ses équipes dans un nouveau bâtiment et te confie la conception de son réseau. Ce cahier des charges décrit le besoin ; les tâches du laboratoire vérifient ton plan d’adressage et ta lecture critique d’une documentation existante.

## 1. Espace d’adressage

- Bloc IPv4 attribué à Kora : ${block}
- Préfixe IPv6 délégué : ${ipv6Block}. Pour chaque VLAN, le quatrième groupe de l’adresse reprend le numéro du VLAN écrit en hexadécimal (VLAN 10 : 000a, VLAN 20 : 0014...), et chaque VLAN reçoit un /64.

## 2. Besoins par service (adresses utilisables, passerelle comprise)

| Service | VLAN | Besoin |
|---|---|---|
${needs.map((need) => `| ${need.name} | ${need.vlan} | ${need.hosts} adresses utilisables |`).join("\n")}

Règle d’allocation : du plus grand besoin au plus petit, en commençant au début du bloc, sans trou entre deux sous-réseaux. La passerelle de chaque VLAN est la première adresse utilisable.

## 3. Services

- DHCP pour les employés : les dix premières adresses utilisables sont réservées à des équipements fixes et exclues du service ; le reste du sous-réseau constitue la plage DHCP.
- Les serveurs ont des adresses fixes.
- Un seul routeur relie Kora à Internet avec une seule adresse publique : les VLAN sortent par traduction d’adresse avec ports (PAT).
- Le lien vers l’opérateur est le réseau ${operatorLink.network}/30 : l’opérateur prend l’adresse ${operatorGateway} et Kora l’adresse ${publicAddress}, qui est son unique adresse publique. Tout ce que le routeur ne connaît pas part vers l’opérateur par une route par défaut.

## 4. Filtrage

- Les invités n’accèdent qu’à Internet.
- Les employés accèdent aux serveurs, pas à l’administration ni à la gestion.
- Seul le VLAN de gestion administre les équipements.

## 5. Ce que tu produis

1. Le plan d’adressage IPv4 et IPv6 (les tâches du laboratoire en vérifient les valeurs).
2. La documentation du réseau, avec le modèle fourni.
3. Facultatif : la maquette dans Packet Tracer, pour tester tes choix.
4. La relecture de l’inventaire existant (fichier « documentation à vérifier ») : il contient des incohérences à repérer.
`;

  const verifyDoc = `# Kora : inventaire existant à vérifier

Cet inventaire a été saisi à la main par un ancien administrateur. Il contient des incohérences par rapport au plan d’adressage de Kora. Ta mission est de les repérer, pas de les corriger dans ce fichier.

Plan en vigueur :

| Service | VLAN | Réseau | Masque | Passerelle |
|---|---|---|---|---|
${plan.map((item) => `| ${item.name} | ${item.vlan} | ${item.network}/${item.prefix} | ${item.mask} | ${item.first} |`).join("\n")}

Inventaire :

| Équipement | VLAN | Adresse IP | Masque | Passerelle |
|---|---|---|---|---|
${inventory.map((device) => `| ${device.name} | ${device.vlan} | ${device.address} | ${device.mask} | ${device.gateway} |`).join("\n")}
`;

  const template = `# Documentation réseau : modèle

Nom du réseau : 
Auteur : 
Date et version : 

## 1. Contexte et périmètre
Qui utilise le réseau, où, avec quels besoins.

## 2. Schéma
Joins le schéma logique (VLAN, routeur, services) et, si possible, le schéma physique (câblage, ports).

## 3. Plan d’adressage IPv4
| Service | VLAN | Réseau | Masque | Passerelle | Plage utilisable | Diffusion |
|---|---|---|---|---|---|---|

## 4. Plan d’adressage IPv6
| Service | VLAN | Préfixe /64 | Passerelle |
|---|---|---|---|

## 5. Services
DHCP (plages, exclusions), DNS, traduction d’adresse, heure (NTP), journaux.

## 6. Règles de filtrage
| Source | Destination | Service | Décision | Raison |
|---|---|---|---|---|

## 7. Inventaire des équipements
| Équipement | Rôle | VLAN | Adresse IP | Emplacement |
|---|---|---|---|---|

## 8. Tests de validation
Les tests réalisés (ping, traceroute, accès aux services) et leurs résultats.

## 9. Sauvegardes et changements
Où se trouvent les sauvegardes de configuration ; journal des modifications.

## 10. Risques et améliorations
Ce qui reste fragile et ce que tu ferais ensuite.

Rappel : aucun mot de passe ni clé secrète dans ce document.
`;

  const topology = diagram({
    width: 760, height: 430,
    title: "Topologie de référence du projet : le réseau de Kora",
    desc: "Un routeur relie Kora à Internet et dessert un commutateur. Cinq VLAN en dépendent : employés, administration, invités, serveurs et gestion.",
    nodes: [
      { id: "net", x: 380, y: 40, w: 190, h: 42, title: "Internet", sub: "une adresse publique", color: "#64748b" },
      { id: "r", x: 380, y: 124, w: 220, h: 54, title: "Routeur-Kora", sub: "passerelle · PAT · filtrage", color: "#00d9ff" },
      { id: "s", x: 380, y: 214, w: 190, h: 44, title: "Switch-Etage1", sub: "trunk 802.1Q", color: "#2563eb" },
      ...plan.map((item, index) => ({
        id: `v${item.vlan}`, x: 90 + index * 145, y: 330, w: 134, h: 62, title: `${item.name}`, sub: `VLAN ${item.vlan} · /${item.prefix}`,
        color: ["#22c55e", "#7c3aed", "#f59e0b", "#2563eb", "#64748b"][index],
      })),
    ],
    links: [{ from: "net", to: "r" }, { from: "r", to: "s" }, ...plan.map((item) => ({ from: "s", to: `v${item.vlan}` }))],
    notes: [`Bloc ${block} · IPv6 ${ipv6Block}`, `Lien opérateur ${operatorLink.network}/30 : opérateur ${operatorGateway}, Kora ${publicAddress}`],
  });

  return {
    facts,
    files: [
      { name: "projet-kora-cahier-des-charges.md", data: text(brief) },
      { name: "projet-kora-inventaire-a-verifier.md", data: text(verifyDoc) },
      { name: "projet-kora-modele-documentation.md", data: text(template) },
      { name: "projet-kora-topologie.svg", data: text(topology) },
    ],
  };
}

function buildKoraAssets() {
  const incident = buildIncident();
  const project = buildProject();
  return {
    files: [{ name: "incident-reseau-kora.log", data: incident.file }, ...project.files],
    facts: { incident: incident.facts, project: project.facts },
  };
}

module.exports = { buildKoraAssets };
