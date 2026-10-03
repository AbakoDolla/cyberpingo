// Deterministic scenarios of the three guided practical works of the Réseaux programme: the home network
// (DHCP and IPv6), the VLAN network of the company Kora and the three-site network with static routes.
// Every file is generated from structured values and every expected answer (the "facts") is computed from
// them, so the files served to learners and the answer keys can never drift apart.
// Used by scripts/generate-lab-assets.cjs.

const { text, toInt, toIp, subnetOf, subPrefixV6, compressV6, expandV6, eui64, diagram } = require("./lab-network-kit.cjs");

// --- TP 1: the home network ------------------------------------------------------------------------------

function buildHomeLab() {
  const lan = subnetOf("192.168.50.0", 24);
  const pool = { start: "192.168.50.100", end: "192.168.50.150" };
  const poolSize = toInt(pool.end) - toInt(pool.start) + 1;
  const printer = "192.168.50.20";
  const mac = "00-1A-4B-5C-6D-7E";
  const delegated = "2001:db8:5a00::/56";
  const lanPrefixV6 = subPrefixV6("2001:db8:5a00::", 56, 64, 1);
  const lanBaseV6 = lanPrefixV6.split("/")[0];
  const interfaceId = eui64(mac);
  const globalAddress = `${lanBaseV6.replace(/::$/, "")}:${interfaceId}`;
  const temporaryAddress = `${lanBaseV6.replace(/::$/, "")}:7d3e:91c2:48aa:b5f`;
  const expanded = "2001:0db8:5a00:0001:0000:0000:0000:0001";
  const compressedAddress = compressV6(expandV6(expanded));
  const leaseHours = 24;
  const facts = {
    network: `${lan.network}/24`, gateway: lan.first, broadcast: lan.broadcast,
    poolStart: pool.start, poolEnd: pool.end, poolSize, printer, printerInPool: toInt(printer) >= toInt(pool.start) && toInt(printer) <= toInt(pool.end),
    pc1Address: pool.start, dhcpServer: lan.first, dnsServer: lan.first, leaseHours,
    delegated, delegatedCount: 2 ** (64 - 56), secondSubnet: lanPrefixV6, expanded, compressedAddress, globalAddress,
  };

  const ipconfig = `C:\\> ipconfig /all

Configuration IP de Windows

   Nom de l’hôte . . . . . . . . . . . . : PC-SALON
   Suffixe DNS principal  . . . . . . . . :
   Type de nœud. . . . . . . . . . . . . .: Hybride
   Routage IP activé . . . . . . . . . . : Non
   Proxy WINS activé . . . . . . . . . . : Non

Carte Ethernet Ethernet :

   Suffixe DNS propre à la connexion. . . : maison.example
   Description. . . . . . . . . . . . . . : Carte réseau Gigabit
   Adresse physique . . . . . . . . . . . : ${mac}
   DHCP activé. . . . . . . . . . . . . . : Oui
   Configuration automatique activée. . . : Oui
   Adresse IPv6. . . . . . . . . . . . . .: ${globalAddress}(préféré)
   Adresse IPv6 temporaire . . . . . . . .: ${temporaryAddress}(préféré)
   Adresse IPv6 de liaison locale. . . . .: fe80::${interfaceId}%12(préféré)
   Adresse IPv4. . . . . . . . . . . . . .: ${pool.start}(préféré)
   Masque de sous-réseau. . . . . . . . . : ${lan.mask}
   Bail obtenu. . . . . . . . . . . . . . : samedi 14 mars 2026 09:12:03
   Bail expirant. . . . . . . . . . . . . : dimanche 15 mars 2026 09:12:03
   Passerelle par défaut. . . . . . . . . : fe80::1%12
                                            ${lan.first}
   Serveur DHCP . . . . . . . . . . . . . : ${lan.first}
   Serveurs DNS. . .  . . . . . . . . . . : ${lan.first}
   NetBIOS sur Tcpip. . . . . . . . . . . : Activé
`;

  const topology = diagram({
    width: 760, height: 430,
    title: "Topologie du TP 1 : le réseau d’une maison",
    desc: `Un routeur R-Maison relie le fournisseur d’accès au réseau ${facts.network}. Un commutateur dessert un PC, un portable et une imprimante.`,
    nodes: [
      { id: "isp", x: 380, y: 44, w: 190, h: 46, title: "Fournisseur d’accès", sub: "WAN, hors du TP", color: "#64748b" },
      { id: "r", x: 380, y: 134, w: 210, h: 58, title: "R-Maison", sub: "Passerelle · DHCP · IPv6", color: "#00d9ff" },
      { id: "s", x: 380, y: 232, w: 160, h: 46, title: "SW-Maison", sub: "Commutateur", color: "#2563eb" },
      { id: "pc", x: 130, y: 332, w: 180, h: 54, title: "PC-Salon", sub: "adresse par DHCP", color: "#22c55e" },
      { id: "lap", x: 380, y: 332, w: 180, h: 54, title: "Laptop", sub: "adresse par DHCP", color: "#7c3aed" },
      { id: "prn", x: 630, y: 332, w: 180, h: 54, title: "Imprimante", sub: "adresse fixe", color: "#f59e0b" },
    ],
    links: [{ from: "isp", to: "r", label: "Gi0/1" }, { from: "r", to: "s", label: "Gi0/0" }, { from: "s", to: "pc" }, { from: "s", to: "lap" }, { from: "s", to: "prn" }],
    notes: [`Réseau local : ${facts.network} · délégation IPv6 du fournisseur : ${delegated}`],
  });

  const guide = `# TP 1 : construire le réseau d’une maison

Ce guide t’accompagne si tu utilises Cisco Packet Tracer. Les tâches se valident dans CyberPingo, avec ou sans le logiciel : tu peux aussi raisonner à la main à partir du cahier des charges et de la sortie fournie.

## Le besoin

Une famille veut relier un PC, un portable et une imprimante à Internet. Le réseau local est ${facts.network}. Le routeur R-Maison est la passerelle (première adresse utilisable). Il attribue les adresses par DHCP dans la plage de ${pool.start} à ${pool.end} (les adresses plus basses et plus hautes sont réservées à des équipements fixes). L’imprimante a une adresse fixe, ${printer}.

Le fournisseur d’accès délègue le préfixe IPv6 ${delegated}. Le réseau local utilise le deuxième sous-réseau /64 de cette délégation, et les PC se configurent seuls (autoconfiguration).

## Matériel à placer

- 1 routeur (modèle 2911) nommé R-Maison
- 1 commutateur (modèle 2960) nommé SW-Maison
- 2 PC (PC-Salon, Laptop) et 1 imprimante (ou un troisième PC nommé Imprimante)
- Câbles cuivre droits : R-Maison Gi0/0 vers SW-Maison, puis chaque appareil vers le commutateur

## Étapes

1. Place et câble les équipements comme sur la topologie.
2. Configure l’interface du routeur côté réseau local (adresse IPv4, masque, \`no shutdown\`) :

\`\`\`
enable
configure terminal
hostname R-Maison
ipv6 unicast-routing
interface GigabitEthernet0/0
 ip address ${lan.first} ${lan.mask}
 ipv6 address ${lanBaseV6}1/64
 no shutdown
exit
\`\`\`

3. Crée le service DHCP. L’adresse de l’imprimante et celles des équipements fixes sont exclues du service :

\`\`\`
ip dhcp excluded-address ${lan.first} ${toIp(toInt(pool.start) - 1)}
ip dhcp excluded-address ${toIp(toInt(pool.end) + 1)} ${lan.last}
ip dhcp pool MAISON
 network ${lan.network} ${lan.mask}
 default-router ${lan.first}
 dns-server ${lan.first}
\`\`\`

4. Sur chaque PC, choisis « DHCP » pour l’IPv4 et « Automatic » pour l’IPv6 (onglet Desktop, IP Configuration). Donne à l’imprimante son adresse fixe.
5. Partage l’adresse publique : l’interface Gi0/1 de R-Maison, côté fournisseur d’accès, porte l’unique adresse publique du foyer. Configure la traduction d’adresse pour que tous les appareils sortent avec cette adresse :

\`\`\`
interface GigabitEthernet0/0
 ip nat inside
interface GigabitEthernet0/1
 ip nat outside
access-list 1 permit ${lan.network} ${lan.wildcard}
ip nat inside source list 1 interface GigabitEthernet0/1 ...
\`\`\`

   Complète la dernière commande avec le mot-clé qui permet à plusieurs appareils de partager une seule adresse publique : il fait l’objet d’une tâche du laboratoire.
6. Vérifie : \`ipconfig /all\` sur un PC, puis \`ping\` vers la passerelle et vers l’imprimante.

## Tester

- \`ping ${lan.first}\` : la passerelle répond.
- \`ping ${printer}\` : l’imprimante répond.
- \`show ip dhcp binding\` sur le routeur : les adresses attribuées et les adresses MAC.

## Rendre ton travail

Réponds aux tâches du laboratoire : elles portent sur le plan d’adressage, sur la sortie \`ipconfig /all\` fournie (relevée sur PC-Salon), sur le plan IPv6 et sur la traduction d’adresse. Si tu le souhaites, garde des captures d’écran de tes tests pour ton portfolio.
`;

  return {
    facts,
    files: [
      { name: "tp1-ipconfig-pc-salon.log", data: text(ipconfig) },
      { name: "tp1-topologie.svg", data: text(topology) },
      { name: "tp1-guide.md", data: text(guide) },
    ],
  };
}

// --- Shared Cisco output formats -------------------------------------------------------------------------

function portRange(prefix, from, to) {
  return Array.from({ length: to - from + 1 }, (_, index) => `${prefix}${from + index}`);
}

function vlanBriefRow(id, name, status, ports) {
  const head = `${String(id).padEnd(5)}${name.padEnd(33)}${status.padEnd(10)}`;
  const lines = [];
  for (let index = 0; index < ports.length; index += 4) lines.push(ports.slice(index, index + 4).join(", "));
  if (!lines.length) return head.trimEnd();
  return [`${head}${lines[0]}`, ...lines.slice(1).map((line) => `${" ".repeat(48)}${line}`)].join("\n");
}

function vlanBrief(vlans, defaultPorts) {
  const lines = [
    "VLAN Name                             Status    Ports",
    "---- -------------------------------- --------- -------------------------------",
    vlanBriefRow(1, "default", "active", defaultPorts),
    ...vlans.map((vlan) => vlanBriefRow(vlan.id, vlan.name, "active", vlan.ports)),
    vlanBriefRow(1002, "fddi-default", "act/unsup", []),
    vlanBriefRow(1003, "token-ring-default", "act/unsup", []),
    vlanBriefRow(1004, "fddinet-default", "act/unsup", []),
    vlanBriefRow(1005, "trnet-default", "act/unsup", []),
  ];
  return lines.join("\n");
}

function trunkTable(port, native, allowed) {
  const list = allowed.join(",");
  return `Port        Mode             Encapsulation  Status        Native vlan
${port.padEnd(12)}on               802.1q         trunking      ${native}

Port        Vlans allowed on trunk
${port.padEnd(12)}${list}

Port        Vlans allowed and active in management domain
${port.padEnd(12)}${list}

Port        Vlans in spanning tree forwarding state and not pruned
${port.padEnd(12)}${list}`;
}

// --- TP 2: VLANs, trunk and inter-VLAN routing at Kora --------------------------------------------------

function buildVlanLab() {
  const vlans = [
    { id: 10, name: "Administration", ports: portRange("Fa0/", 1, 8) },
    { id: 20, name: "Employes", ports: portRange("Fa0/", 9, 16) },
    { id: 30, name: "Invites", ports: portRange("Fa0/", 17, 22) },
    { id: 99, name: "Gestion", ports: [] },
  ].map((vlan) => ({ ...vlan, ...subnetOf(`10.40.${vlan.id}.0`, 24), gateway: `10.40.${vlan.id}.1` }));
  const [admin, employes, invites, gestion] = vlans;
  const trunkPort = "Gi0/1";
  const nativeVlan = 99;
  const allowed = vlans.map((vlan) => vlan.id);
  const aclNumber = 110;
  const aclLine = `access-list ${aclNumber} deny ip ${invites.network} ${invites.wildcard} ${admin.network} ${admin.wildcard}`;
  const facts = {
    vlans: vlans.map(({ id, name, network, gateway, ports }) => ({ id, name, network: `${network}/24`, gateway, portCount: ports.length })),
    guestVlan: invites.id, employesPortCount: employes.ports.length, trunkPort, allowedList: allowed.join(","), nativeVlan,
    createdVlanCount: vlans.length, employesGateway: employes.gateway, invitesSubinterface: `GigabitEthernet0/0.${invites.id}`,
    encapsulationCommand: `encapsulation dot1q ${invites.id}`, aclNumber, aclLine, aclInterface: `Gi0/0.${invites.id}`, aclDirection: "in",
    mask: admin.mask,
  };

  const log = `SW1#show vlan brief

${vlanBrief(vlans, ["Fa0/23", "Fa0/24", "Gi0/2"])}

SW1#show interfaces trunk

${trunkTable(trunkPort, nativeVlan, allowed)}

SW1#show mac address-table dynamic
          Mac Address Table
-------------------------------------------

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
  10    0001.9632.aa01    DYNAMIC     Fa0/1
  10    0001.c7e4.0b10    DYNAMIC     Gi0/1
  20    00d0.ba3c.5e02    DYNAMIC     Fa0/9
  20    0001.c7e4.0b10    DYNAMIC     Gi0/1
  30    0060.2f4a.19c1    DYNAMIC     Fa0/17
  30    0001.c7e4.0b10    DYNAMIC     Gi0/1
  99    0001.c7e4.0b10    DYNAMIC     Gi0/1
Total Mac Addresses for this criterion: 7
`;

  const topology = diagram({
    width: 760, height: 450,
    title: "Topologie du TP 2 : VLAN et routage inter-VLAN chez Kora",
    desc: "Un routeur R1 est relié par un seul lien trunk à un commutateur SW1. Trois PC sont placés dans trois VLAN différents.",
    nodes: [
      { id: "r", x: 380, y: 50, w: 220, h: 58, title: "R1", sub: "routeur sur un bras", color: "#00d9ff" },
      { id: "s", x: 380, y: 170, w: 200, h: 50, title: "SW1", sub: "commutateur 2960", color: "#2563eb" },
      { id: "p1", x: 130, y: 300, w: 190, h: 56, title: "PC-Direction", sub: `VLAN ${admin.id} · ${admin.network}/24`, color: "#22c55e" },
      { id: "p2", x: 380, y: 300, w: 190, h: 56, title: "PC-Compta", sub: `VLAN ${employes.id} · ${employes.network}/24`, color: "#7c3aed" },
      { id: "p3", x: 630, y: 300, w: 190, h: 56, title: "Borne-Invités", sub: `VLAN ${invites.id} · ${invites.network}/24`, color: "#f59e0b" },
    ],
    links: [{ from: "r", to: "s", label: "trunk Gi0/0 - Gi0/1" }, { from: "s", to: "p1" }, { from: "s", to: "p2" }, { from: "s", to: "p3" }],
    notes: [`Gestion : VLAN ${gestion.id} · ${gestion.network}/24 · VLAN natif du trunk`, "Chaque VLAN a sa passerelle sur le routeur : la première adresse utilisable."],
  });

  const guide = `# TP 2 : VLAN, trunk et routage inter-VLAN pour la PME Kora

Ce guide t’accompagne si tu utilises Cisco Packet Tracer. Les tâches se valident dans CyberPingo, avec ou sans le logiciel : certaines portent sur les sorties \`show\` fournies (relevées sur SW1), d’autres sur les commandes à écrire.

## Le besoin

Kora loue des locaux et veut séparer trois services sur un seul commutateur : l’administration (VLAN ${admin.id}), les employés (VLAN ${employes.id}) et les invités (VLAN ${invites.id}). Un VLAN de gestion (${gestion.id}) sert à administrer les équipements ; c’est aussi le VLAN natif du trunk. Chaque VLAN a son réseau /24 dans 10.40.0.0/16 : le réseau d’un VLAN porte son numéro dans le troisième octet. La passerelle de chaque VLAN est la première adresse utilisable.

Les invités ne doivent pas atteindre le réseau d’administration, mais peuvent aller vers Internet. Pour cela, une liste de contrôle d’accès numérotée ${aclNumber} est appliquée sur la sous-interface du VLAN des invités.

## Matériel à placer

- 1 routeur (2911) nommé R1, 1 commutateur (2960) nommé SW1
- 3 PC : PC-Direction (VLAN ${admin.id}), PC-Compta (VLAN ${employes.id}), Borne-Invités (VLAN ${invites.id})
- Un seul câble entre R1 (Gi0/0) et SW1 (${trunkPort}) : c’est le trunk

## Exemple de configuration pour le VLAN ${admin.id}

À toi de répéter la démarche pour les autres VLAN en adaptant le numéro, le nom et le réseau.

\`\`\`
! Commutateur SW1
vlan ${admin.id}
 name ${admin.name}
interface range FastEthernet0/1 - 8
 switchport mode access
 switchport access vlan ${admin.id}

! Routeur R1 (routeur sur un bras)
interface GigabitEthernet0/0
 no shutdown
interface GigabitEthernet0/0.${admin.id}
 encapsulation dot1Q ${admin.id}
 ip address ${admin.gateway} ${admin.mask}
\`\`\`

## Étapes

1. Crée les VLAN sur SW1, affecte les ports d’accès (voir \`show vlan brief\` fourni pour la répartition attendue) et configure ${trunkPort} en trunk.
2. Crée une sous-interface par VLAN sur R1, avec la bonne encapsulation 802.1Q et la bonne adresse.
3. Configure chaque PC en IP statique : adresse dans son VLAN, masque ${admin.mask}, passerelle du VLAN.
4. Teste : un ping entre PC-Direction et PC-Compta doit réussir (le routeur relie les VLAN). Applique ensuite l’ACL ${aclNumber} et vérifie que la borne invités ne joint plus PC-Direction.
5. Vérifie avec \`show vlan brief\`, \`show interfaces trunk\` et \`show access-lists\`.

## Rendre ton travail

Réponds aux tâches du laboratoire. Garde les captures de tes \`show\` si tu veux les ajouter à ton portfolio.
`;

  return {
    facts,
    files: [
      { name: "tp2-show-sw1.log", data: text(log) },
      { name: "tp2-topologie.svg", data: text(topology) },
      { name: "tp2-guide.md", data: text(guide) },
    ],
    shared: { vlans, trunkPort, nativeVlan },
  };
}

// --- TP 3: three sites linked with static routes ---------------------------------------------------------

function buildSitesLab() {
  const sites = [
    { name: "Siège", router: "R-Siege", lan: subnetOf("10.60.0.0", 24) },
    { name: "Agence Nord", router: "R-Nord", lan: subnetOf("10.60.4.0", 24) },
    { name: "Agence Sud", router: "R-Sud", lan: subnetOf("10.60.5.0", 24) },
  ];
  const [siege, nord, sud] = sites;
  const linkNord = subnetOf("172.20.0.0", 30);
  const linkSud = subnetOf("172.20.0.4", 30);
  const siegeOnNord = linkNord.first;
  const nordOnLink = toIp(toInt(linkNord.first) + 1);
  const siegeOnSud = linkSud.first;
  const sudOnLink = toIp(toInt(linkSud.first) + 1);
  const summary = subnetOf(nord.lan.network, 23);
  const missing = `${sud.lan.network}/24`;
  const facts = {
    linkUsable: linkNord.hosts, linkSudBroadcast: linkSud.broadcast, nordToSud: `ip route ${sud.lan.network} ${sud.lan.mask} ${siegeOnNord}`,
    sudDefault: `ip route 0.0.0.0 0.0.0.0 ${siegeOnSud}`, missingRoute: missing, siegeFix: `ip route ${sud.lan.network} ${sud.lan.mask} ${sudOnLink}`,
    summary: `${summary.network}/23`, staticCode: "S", staticDistance: 1, defaultNeedsSpecific: false,
    siegeLan: `${siege.lan.network}/24`, nordLan: `${nord.lan.network}/24`, sudLan: `${sud.lan.network}/24`,
    linkNord: `${linkNord.network}/30`, linkSud: `${linkSud.network}/30`,
  };

  const routeLog = `R-Siege#show ip route
Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2, E - EGP
       i - IS-IS, L1 - IS-IS level-1, L2 - IS-IS level-2, ia - IS-IS inter area
       * - candidate default, U - per-user static route, o - ODR
       P - periodic downloaded static route

Gateway of last resort is not set

      10.0.0.0/8 is variably subnetted, 3 subnets, 2 masks
C        ${siege.lan.network}/24 is directly connected, GigabitEthernet0/0
L        ${siege.lan.first}/32 is directly connected, GigabitEthernet0/0
S        ${nord.lan.network}/24 [1/0] via ${nordOnLink}
      172.20.0.0/16 is variably subnetted, 4 subnets, 2 masks
C        ${linkNord.network}/30 is directly connected, Serial0/0/0
L        ${siegeOnNord}/32 is directly connected, Serial0/0/0
C        ${linkSud.network}/30 is directly connected, Serial0/0/1
L        ${siegeOnSud}/32 is directly connected, Serial0/0/1

R-Siege#ping ${sud.lan.first}

Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to ${sud.lan.first}, timeout is 2 seconds:
.....
Success rate is 0 percent (0/5)
`;

  const topology = diagram({
    width: 760, height: 450,
    title: "Topologie du TP 3 : trois sites reliés par des routes statiques",
    desc: "Le routeur du siège est relié par deux liaisons /30 aux routeurs des agences Nord et Sud. Chaque site a son réseau local.",
    nodes: [
      { id: "siege", x: 380, y: 50, w: 230, h: 58, title: "R-Siege", sub: `LAN ${siege.lan.network}/24`, color: "#00d9ff" },
      { id: "nord", x: 150, y: 190, w: 210, h: 58, title: "R-Nord", sub: `LAN ${nord.lan.network}/24`, color: "#22c55e" },
      { id: "sud", x: 610, y: 190, w: 210, h: 58, title: "R-Sud", sub: `LAN ${sud.lan.network}/24`, color: "#7c3aed" },
      { id: "pcn", x: 150, y: 330, w: 190, h: 54, title: "PC-Nord", sub: `${nord.lan.first.replace(/\.1$/, ".10")}`, color: "#22c55e" },
      { id: "pcs", x: 610, y: 330, w: 190, h: 54, title: "PC-Sud", sub: `${sud.lan.first.replace(/\.1$/, ".10")}`, color: "#7c3aed" },
    ],
    links: [{ from: "siege", to: "nord", label: `${linkNord.network}/30` }, { from: "siege", to: "sud", label: `${linkSud.network}/30` }, { from: "nord", to: "pcn" }, { from: "sud", to: "pcs" }],
    notes: ["Chaque liaison entre routeurs est un petit réseau /30 : deux adresses utilisables, une par routeur."],
  });

  const guide = `# TP 3 : relier trois sites avec des routes statiques

Ce guide t’accompagne si tu utilises Cisco Packet Tracer. Les tâches se valident dans CyberPingo, avec ou sans le logiciel : certaines portent sur les commandes à écrire, d’autres sur la table de routage fournie (relevée sur R-Siege).

## Le besoin

Kora ouvre deux agences et veut que les trois sites communiquent. Le siège (réseau ${siege.lan.network}/24) est relié à l’agence Nord (${nord.lan.network}/24) par la liaison ${linkNord.network}/30, et à l’agence Sud (${sud.lan.network}/24) par la liaison ${linkSud.network}/30. Chaque routeur de liaison prend, côté siège, la première adresse utilisable du /30 ; l’agence prend la seconde. Les agences ne sont reliées qu’au siège.

## Matériel à placer

- 3 routeurs (2911 avec carte série HWIC-2T) : R-Siege, R-Nord, R-Sud
- 1 PC par agence (PC-Nord, PC-Sud), reliés à leur routeur
- Câbles série (DCE côté siège) entre R-Siege et chaque agence

## Exemple pour une liaison

\`\`\`
! R-Siege, liaison vers l’agence Nord
interface Serial0/0/0
 ip address ${siegeOnNord} ${linkNord.mask}
 clock rate 64000
 no shutdown

! R-Nord, de l’autre côté
interface Serial0/0/0
 ip address ${nordOnLink} ${linkNord.mask}
 no shutdown
\`\`\`

## Étapes

1. Configure toutes les interfaces, puis vérifie avec \`show ip interface brief\`. À ce stade, chaque routeur ne connaît que ses réseaux directement connectés.
2. Ajoute les routes statiques nécessaires pour que chaque site joigne les deux autres. Une agence n’a qu’une sortie : le siège.
3. Vérifie la table avec \`show ip route\` et teste avec \`ping\` et \`tracert\` entre PC-Nord et PC-Sud (ou \`traceroute\` depuis un routeur).
4. Compare avec la table de routage de R-Siege fournie : elle a été relevée sur un réseau dont un test échoue.

## Rendre ton travail

Réponds aux tâches du laboratoire. Garde les captures de tes \`show ip route\` si tu veux les ajouter à ton portfolio.
`;

  return {
    facts,
    files: [
      { name: "tp3-show-ip-route-siege.log", data: text(routeLog) },
      { name: "tp3-topologie.svg", data: text(topology) },
      { name: "tp3-guide.md", data: text(guide) },
    ],
  };
}

function buildReseauxLabAssets() {
  const home = buildHomeLab();
  const vlan = buildVlanLab();
  const sites = buildSitesLab();
  return {
    files: [...home.files, ...vlan.files, ...sites.files],
    facts: { home: home.facts, vlan: vlan.facts, sites: sites.facts },
    shared: { vlan: vlan.shared },
  };
}

module.exports = { buildReseauxLabAssets, vlanBrief, trunkTable, portRange };
