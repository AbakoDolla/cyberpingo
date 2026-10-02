#!/usr/bin/env node
// Builds the lab files served from public/labs: two real .pcap captures, a firewall log,
// the Packet Tracer topology and the guides. Run `node scripts/generate-lab-assets.cjs` after editing it.
// Everything is deterministic (no clock, no randomness), so the answers expected by the labs can be
// derived from the same scenario and verified against the files by the tests.
const fs = require("node:fs");
const path = require("node:path");
const { buildSocAssets } = require("./lab-scenarios-soc.cjs");

const root = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(root, "public", "labs");

// --- Binary helpers ---------------------------------------------------------------------------

const ipBytes = (address) => Buffer.from(address.split(".").map(Number));
const macBytes = (address) => Buffer.from(address.split(":").map((part) => parseInt(part, 16)));
const u16 = (value) => { const b = Buffer.alloc(2); b.writeUInt16BE(value); return b; };
const u32 = (value) => { const b = Buffer.alloc(4); b.writeUInt32BE(value >>> 0); return b; };

function checksum(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 2) sum += (buffer[i] << 8) | (i + 1 < buffer.length ? buffer[i + 1] : 0);
  while (sum >>> 16) sum = (sum & 0xffff) + (sum >>> 16);
  return ~sum & 0xffff;
}

function ethernet(dst, src, type, payload) {
  const frame = Buffer.concat([macBytes(dst), macBytes(src), u16(type), payload]);
  return frame.length < 60 ? Buffer.concat([frame, Buffer.alloc(60 - frame.length)]) : frame;
}

let nextIpId = 0x1a2b;
function ipv4(src, dst, protocol, payload, ttl = 64) {
  const header = Buffer.alloc(20);
  header[0] = 0x45;
  header.writeUInt16BE(20 + payload.length, 2);
  header.writeUInt16BE(nextIpId = (nextIpId + 37) & 0xffff, 4);
  header.writeUInt16BE(0x4000, 6);
  header[8] = ttl;
  header[9] = protocol;
  ipBytes(src).copy(header, 12);
  ipBytes(dst).copy(header, 16);
  header.writeUInt16BE(checksum(header), 10);
  return Buffer.concat([header, payload]);
}

const FIN = 0x01;
const SYN = 0x02;
const RST = 0x04;
const PSH = 0x08;
const ACK = 0x10;

function tcpSegment(srcIp, dstIp, { sport, dport, seq, ack = 0, flags, window = 64240, payload = Buffer.alloc(0), mss = false }) {
  const options = mss ? Buffer.from([2, 4, 0x05, 0xb4]) : Buffer.alloc(0);
  const header = Buffer.alloc(20 + options.length);
  header.writeUInt16BE(sport, 0);
  header.writeUInt16BE(dport, 2);
  header.writeUInt32BE(seq >>> 0, 4);
  header.writeUInt32BE(ack >>> 0, 8);
  header[12] = ((20 + options.length) / 4) << 4;
  header[13] = flags;
  header.writeUInt16BE(window, 14);
  options.copy(header, 20);
  const segment = Buffer.concat([header, payload]);
  const pseudo = Buffer.concat([ipBytes(srcIp), ipBytes(dstIp), Buffer.from([0, 6]), u16(segment.length)]);
  segment.writeUInt16BE(checksum(Buffer.concat([pseudo, segment])), 16);
  return segment;
}

function udpDatagram(srcIp, dstIp, sport, dport, payload) {
  const header = Buffer.alloc(8);
  header.writeUInt16BE(sport, 0);
  header.writeUInt16BE(dport, 2);
  header.writeUInt16BE(8 + payload.length, 4);
  const datagram = Buffer.concat([header, payload]);
  const pseudo = Buffer.concat([ipBytes(srcIp), ipBytes(dstIp), Buffer.from([0, 17]), u16(datagram.length)]);
  datagram.writeUInt16BE(checksum(Buffer.concat([pseudo, datagram])) || 0xffff, 6);
  return datagram;
}

const dnsName = (name) => Buffer.concat([
  ...name.split(".").map((label) => Buffer.concat([Buffer.from([label.length]), Buffer.from(label)])),
  Buffer.from([0]),
]);
const dnsQuestion = (name) => Buffer.concat([dnsName(name), u16(1), u16(1)]);

function dnsQuery(id, name) {
  return Buffer.concat([u16(id), u16(0x0100), u16(1), u16(0), u16(0), u16(0), dnsQuestion(name)]);
}

function dnsAnswer(id, name, address, ttl = 300) {
  return Buffer.concat([
    u16(id), u16(0x8180), u16(1), u16(1), u16(0), u16(0), dnsQuestion(name),
    u16(0xc00c), u16(1), u16(1), u32(ttl), u16(4), ipBytes(address),
  ]);
}

function arpPayload(operation, senderMac, senderIp, targetMac, targetIp) {
  return Buffer.concat([u16(1), u16(0x0800), Buffer.from([6, 4]), u16(operation), macBytes(senderMac), ipBytes(senderIp), macBytes(targetMac), ipBytes(targetIp)]);
}

function pcapFile(packets, baseEpoch) {
  const sorted = packets.map((packet, index) => ({ ...packet, index })).sort((a, b) => a.t - b.t || a.index - b.index);
  const header = Buffer.alloc(24);
  header.writeUInt32LE(0xa1b2c3d4, 0);
  header.writeUInt16LE(2, 4);
  header.writeUInt16LE(4, 6);
  header.writeUInt32LE(65535, 16);
  header.writeUInt32LE(1, 20);
  const records = sorted.map(({ t, frame }) => {
    const micros = Math.round(t * 1e6);
    const record = Buffer.alloc(16);
    record.writeUInt32LE(baseEpoch + Math.floor(micros / 1e6), 0);
    record.writeUInt32LE(micros % 1e6, 4);
    record.writeUInt32LE(frame.length, 8);
    record.writeUInt32LE(frame.length, 12);
    return Buffer.concat([record, frame]);
  });
  return Buffer.concat([header, ...records]);
}

// --- Addressing helpers (also used to derive the subnet answers) ---------------------------------

const toInt = (address) => address.split(".").reduce((total, part) => total * 256 + Number(part), 0);
const toIp = (value) => [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join(".");

function subnetOf(address, prefix) {
  const size = 2 ** (32 - prefix);
  const network = Math.floor(toInt(address) / size) * size;
  return { network: toIp(network), broadcast: toIp(network + size - 1), first: toIp(network + 1), last: toIp(network + size - 2), hosts: size - 2 };
}

const maskOf = (prefix) => toIp(prefix === 0 ? 0 : (2 ** 32 - 2 ** (32 - prefix)));

const BASE_EPOCH = Date.UTC(2026, 2, 14, 9, 0, 0) / 1000;

const text = (value) => Buffer.from(value, "utf8");

// --- Capture A: "Réseau instable" ---------------------------------------------------------------

function buildInstableCapture() {
  const client = { ip: "192.168.10.23", mac: "00:1b:21:3a:4c:23" };
  const dns = { ip: "192.168.10.2", mac: "00:1b:21:aa:00:02" };
  const web = { ip: "192.168.10.50", mac: "00:1b:21:bb:00:50" };
  const app = { ip: "192.168.10.60", mac: "00:1b:21:bb:00:60" };
  const silent = { ip: "192.168.10.70", mac: "00:1b:21:bb:00:70" };
  const name = "intranet.cyberpingo.lab";
  const packets = [];
  const push = (t, frame) => packets.push({ t, frame });
  const tcp = (t, from, to, fields) => push(t, ethernet(to.mac, from.mac, 0x0800, ipv4(from.ip, to.ip, 6, tcpSegment(from.ip, to.ip, fields))));

  push(0, ethernet("ff:ff:ff:ff:ff:ff", client.mac, 0x0806, arpPayload(1, client.mac, client.ip, "00:00:00:00:00:00", dns.ip)));
  push(0.001, ethernet(client.mac, dns.mac, 0x0806, arpPayload(2, dns.mac, dns.ip, client.mac, client.ip)));
  push(0.002, ethernet(dns.mac, client.mac, 0x0800, ipv4(client.ip, dns.ip, 17, udpDatagram(client.ip, dns.ip, 53124, 53, dnsQuery(0x3a7c, name)))));
  push(0.014, ethernet(client.mac, dns.mac, 0x0800, ipv4(dns.ip, client.ip, 17, udpDatagram(dns.ip, client.ip, 53, 53124, dnsAnswer(0x3a7c, name, web.ip)))));

  const body = "<html><body>Intranet OK</body></html>";
  const request = text(`GET /accueil HTTP/1.1\r\nHost: ${name}\r\nConnection: close\r\n\r\n`);
  const response = text(`HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: ${body.length}\r\n\r\n${body}`);
  const c = { sport: 49820, dport: 80 };
  const s = { sport: 80, dport: 49820 };
  const cSeq = 0x2f8a4c10;
  const sSeq = 0x71c03b55;
  tcp(0.02, client, web, { ...c, seq: cSeq, flags: SYN, mss: true, window: 64240 });
  tcp(0.021, web, client, { ...s, seq: sSeq, ack: cSeq + 1, flags: SYN | ACK, mss: true, window: 65160 });
  tcp(0.0211, client, web, { ...c, seq: cSeq + 1, ack: sSeq + 1, flags: ACK });
  tcp(0.025, client, web, { ...c, seq: cSeq + 1, ack: sSeq + 1, flags: PSH | ACK, payload: request });
  tcp(0.026, web, client, { ...s, seq: sSeq + 1, ack: cSeq + 1 + request.length, flags: ACK, window: 65160 });
  tcp(0.09, web, client, { ...s, seq: sSeq + 1, ack: cSeq + 1 + request.length, flags: PSH | ACK, payload: response, window: 65160 });
  tcp(0.091, client, web, { ...c, seq: cSeq + 1 + request.length, ack: sSeq + 1 + response.length, flags: ACK });
  tcp(0.12, client, web, { ...c, seq: cSeq + 1 + request.length, ack: sSeq + 1 + response.length, flags: FIN | ACK });
  tcp(0.121, web, client, { ...s, seq: sSeq + 1 + response.length, ack: cSeq + 2 + request.length, flags: FIN | ACK, window: 65160 });
  tcp(0.1215, client, web, { ...c, seq: cSeq + 2 + request.length, ack: sSeq + 2 + response.length, flags: ACK });

  [[1.5, 49822, 0x10a4e2b1], [3.0, 49824, 0x6be5d03c]].forEach(([t, sport, seq]) => {
    tcp(t, client, app, { sport, dport: 8080, seq, flags: SYN, mss: true });
    tcp(t + 0.001, app, client, { sport: 8080, dport: sport, seq: 0, ack: seq + 1, flags: RST | ACK, window: 0 });
  });

  [5, 6, 8, 12].forEach((t) => tcp(t, client, silent, { sport: 49830, dport: 22, seq: 0x4d2c9a07, flags: SYN, mss: true }));

  return {
    file: pcapFile(packets, BASE_EPOCH),
    facts: {
      clientIp: client.ip,
      dnsServerIp: dns.ip,
      dnsServerMac: dns.mac,
      resolvedName: name,
      resolvedIp: web.ip,
      refusedPort: 8080,
      silentIp: silent.ip,
      silentSynCount: 4,
      packetCount: packets.length,
    },
  };
}

// --- Capture B: assessment (an internal host scans the server) ------------------------------------

function buildEvaluationCapture() {
  const client = { ip: "192.168.10.23", mac: "00:1b:21:3a:4c:23" };
  const dns = { ip: "192.168.10.2", mac: "00:1b:21:aa:00:02" };
  const web = { ip: "192.168.10.50", mac: "00:1b:21:bb:00:50" };
  const scanner = { ip: "192.168.10.99", mac: "00:1b:21:3a:4c:99" };
  const name = "portail.cyberpingo.lab";
  const packets = [];
  const push = (t, frame) => packets.push({ t, frame });
  const tcp = (t, from, to, fields) => push(t, ethernet(to.mac, from.mac, 0x0800, ipv4(from.ip, to.ip, 6, tcpSegment(from.ip, to.ip, fields))));

  push(0, ethernet(dns.mac, client.mac, 0x0800, ipv4(client.ip, dns.ip, 17, udpDatagram(client.ip, dns.ip, 51342, 53, dnsQuery(0x91d4, name)))));
  push(0.011, ethernet(client.mac, dns.mac, 0x0800, ipv4(dns.ip, client.ip, 17, udpDatagram(dns.ip, client.ip, 53, 51342, dnsAnswer(0x91d4, name, web.ip, 120)))));

  const request = text(`GET / HTTP/1.1\r\nHost: ${name}\r\n\r\n`);
  const response = text("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 12\r\n\r\nBienvenue !\n");
  const cSeq = 0x5a11c9e0;
  const sSeq = 0x3d6e0f42;
  tcp(0.03, client, web, { sport: 50210, dport: 80, seq: cSeq, flags: SYN, mss: true });
  tcp(0.031, web, client, { sport: 80, dport: 50210, seq: sSeq, ack: cSeq + 1, flags: SYN | ACK, mss: true, window: 65160 });
  tcp(0.0311, client, web, { sport: 50210, dport: 80, seq: cSeq + 1, ack: sSeq + 1, flags: ACK });
  tcp(0.035, client, web, { sport: 50210, dport: 80, seq: cSeq + 1, ack: sSeq + 1, flags: PSH | ACK, payload: request });
  tcp(0.06, web, client, { sport: 80, dport: 50210, seq: sSeq + 1, ack: cSeq + 1 + request.length, flags: PSH | ACK, payload: response, window: 65160 });
  tcp(0.061, client, web, { sport: 50210, dport: 80, seq: cSeq + 1 + request.length, ack: sSeq + 1 + response.length, flags: ACK });

  const probed = [21, 22, 23, 25, 53, 80, 110, 139, 143, 443, 445, 3306, 3389, 8080];
  const open = [22, 80, 443, 3306];
  const scanPort = 44817;
  probed.forEach((port, index) => {
    const t = 4.2 + index * 0.003;
    const seq = 0x20a1b3c0 + index * 0x1f3d;
    tcp(t, scanner, web, { sport: scanPort, dport: port, seq, flags: SYN, window: 1024, mss: true });
    if (open.includes(port)) {
      const serverSeq = 0x6e4d0000 + index * 0x2711;
      tcp(t + 0.0004, web, scanner, { sport: port, dport: scanPort, seq: serverSeq, ack: seq + 1, flags: SYN | ACK, mss: true, window: 65160 });
      tcp(t + 0.0008, scanner, web, { sport: scanPort, dport: port, seq: seq + 1, flags: RST, window: 0 });
    } else {
      tcp(t + 0.0004, web, scanner, { sport: port, dport: scanPort, seq: 0, ack: seq + 1, flags: RST | ACK, window: 0 });
    }
  });

  const mask = 26;
  return {
    file: pcapFile(packets, BASE_EPOCH + 1260),
    facts: {
      clientIp: client.ip,
      dnsServerIp: dns.ip,
      resolvedName: name,
      resolvedIp: web.ip,
      serverIp: web.ip,
      scannerIp: scanner.ip,
      probedPorts: probed.length,
      openPorts: open,
      databasePort: 3306,
      mask,
      serverSubnet: subnetOf(web.ip, mask),
      scannerSubnet: subnetOf(scanner.ip, mask),
      sameSubnet: subnetOf(web.ip, mask).network === subnetOf(scanner.ip, mask).network,
      packetCount: packets.length,
    },
  };
}

// --- Firewall log ------------------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildFirewallLog() {
  const random = mulberry32(20260314);
  const attacker = "198.51.100.77";
  const server = "192.168.10.50";
  const events = [];
  const add = (second, action, proto, src, sport, dst, dport, rule) => events.push({ second, action, proto, src, sport, dst, dport, rule });

  const workstations = ["192.168.10.23", "192.168.10.31", "192.168.10.44"];
  for (let second = 3; second < 360; second += 6 + Math.floor(random() * 5)) {
    const source = workstations[Math.floor(random() * workstations.length)];
    add(second, "ALLOW", "TCP", source, 49152 + Math.floor(random() * 15000), "203.0.113.20", 443, "OUT-WEB");
  }

  [[41, "203.0.113.9"], [44, "203.0.113.9"], [47, "203.0.113.9"]].forEach(([second, source]) => add(second, "DENY", "TCP", source, 40000 + Math.floor(random() * 9000), server, 445, "DEFAULT-DENY"));
  [[88, "192.0.2.14"], [91, "192.0.2.14"]].forEach(([second, source]) => add(second, "DENY", "TCP", source, 40000 + Math.floor(random() * 9000), server, 3389, "DEFAULT-DENY"));

  let second = 123;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    add(second, "DENY", "TCP", attacker, 51000 + attempt * 7, server, 22, "DEFAULT-DENY");
    if (attempt === 9 || attempt === 17) add(second + 1, "DENY", "TCP", attacker, 52100 + attempt, server, 3389, "DEFAULT-DENY");
    second += 3 + Math.floor(random() * 3);
  }
  const firstAllow = 252;
  [firstAllow, 261, 274, 301].forEach((when) => add(when, "ALLOW", "TCP", attacker, 53311, server, 22, "ALLOW-ADMIN-TMP"));
  add(302, "ALLOW", "TCP", server, 38874, attacker, 4444, "OUT-ANY");

  events.sort((a, b) => a.second - b.second);
  const format = (second) => new Date((BASE_EPOCH + 600 + second) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const lines = events.map((event) => `${format(event.second)} FW01 ${event.action.padEnd(5)} proto=${event.proto} src=${event.src}:${event.sport} dst=${event.dst}:${event.dport} rule=${event.rule}`);

  const denies = events.filter((event) => event.action === "DENY");
  const attackerDenies = denies.filter((event) => event.src === attacker);
  const firstAttackerAllow = events.find((event) => event.action === "ALLOW" && event.src === attacker);
  const outbound = events.find((event) => event.src === server && event.dst === attacker);
  return {
    file: text(`${lines.join("\n")}\n`),
    facts: {
      attackerIp: attacker,
      serverIp: server,
      attackerDenyCount: attackerDenies.length,
      attackerTopPort: 22,
      firstAllowTime: format(firstAttackerAllow.second).slice(11, 19),
      allowRule: firstAttackerAllow.rule,
      outboundPort: outbound.dport,
      lineCount: lines.length,
    },
  };
}

// --- Packet Tracer lab -----------------------------------------------------------------------------------

function buildPacketTracerFacts() {
  const prefix = 26;
  const base = "192.168.20.0";
  const subnets = ["Direction", "Atelier", "Comptabilité", "Invités"].map((name, index) => ({ name, ...subnetOf(toIp(toInt(base) + index * 64), prefix) }));
  return { network: `${base}/24`, prefix, mask: maskOf(prefix), hostsPerSubnet: subnets[0].hosts, subnets };
}

function buildTopology(facts) {
  const [direction, atelier, compta, invites] = facts.subnets;
  const node = (x, y, w, h, title, subtitle, color) => `
  <g>
    <rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="10" fill="#0f1a33" stroke="${color}" stroke-width="2"/>
    <text x="${x}" y="${y + (subtitle ? h / 2 - 3 : h / 2 + 5)}" text-anchor="middle" fill="#f8fafc" font-size="15" font-weight="700">${title}</text>
    ${subtitle ? `<text x="${x}" y="${y + h / 2 + 15}" text-anchor="middle" fill="#94a3b8" font-size="12">${subtitle}</text>` : ""}
  </g>`;
  const link = (d) => `<path d="${d}" fill="none" stroke="#334155" stroke-width="2"/>`;
  const label = (x, y, value) => `<text x="${x}" y="${y}" text-anchor="middle" fill="#00d9ff" font-size="12" font-family="'JetBrains Mono', Consolas, monospace">${value}</text>`;
  const columns = [
    { x: 125, subnet: direction, port: "Gi0/0", pc: "PC-Direction", host: toIp(toInt(direction.network) + 2), color: "#2563eb" },
    { x: 380, subnet: atelier, port: "Gi0/1", pc: "PC-Atelier", host: toIp(toInt(atelier.network) + 2), color: "#22c55e" },
    { x: 635, subnet: compta, port: "Gi0/2", pc: "PC-Comptabilité", host: toIp(toInt(compta.network) + 2), color: "#7c3aed" },
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 450" role="img" aria-labelledby="t d" font-family="Inter, Arial, sans-serif">
  <title id="t">Topologie de l’atelier Kora</title>
  <desc id="d">Un routeur R1 relie trois commutateurs. Chaque commutateur dessert un PC dans son propre sous-réseau /26 du réseau ${facts.network}.</desc>
  <rect width="760" height="450" rx="16" fill="#0b1020"/>
  ${columns.map((col) => link(`M380 96 V140 H${col.x} V196`)).join("\n  ")}
  ${columns.map((col) => link(`M${col.x} 240 V304`)).join("\n  ")}
  ${node(380, 40, 190, 56, "R1", "Routeur / passerelle", "#00d9ff")}
  ${columns.map((col) => node(col.x, 196, 130, 44, `S${columns.indexOf(col) + 1}`, "", col.color)).join("")}
  ${columns.map((col) => node(col.x, 304, 168, 52, col.pc, col.host, col.color)).join("")}
  ${columns.map((col) => label(col.x, 172, `${col.port} · ${toIp(toInt(col.subnet.network) + 1)}`)).join("\n  ")}
  ${columns.map((col) => `<text x="${col.x}" y="384" text-anchor="middle" fill="${col.color}" font-size="13" font-weight="700">${col.subnet.name} · ${col.subnet.network}/${facts.prefix}</text>`).join("\n  ")}
  <text x="380" y="426" text-anchor="middle" fill="#94a3b8" font-size="12">Sous-réseau n°4 « ${invites.name} » : réservé, à calculer dans le laboratoire.</text>
</svg>
`;
}

function buildPacketTracerGuide(facts) {
  const [direction, atelier, compta] = facts.subnets;
  const gateway = (subnet) => subnet.first;
  const pc = (subnet) => toIp(toInt(subnet.network) + 2);
  return `# Packet Tracer : le plan d’adressage de l’atelier Kora

Ce guide t’accompagne si tu utilises Cisco Packet Tracer. Les tâches du laboratoire se valident dans CyberPingo, avec ou sans le logiciel : tu peux aussi répondre par le calcul.

Packet Tracer s’exécute sur ton ordinateur. CyberPingo ne l’exécute pas et ne lit pas tes fichiers .pkt : tu y saisis tes résultats.

## Matériel à placer

- 1 routeur (modèle 2911) nommé R1
- 3 commutateurs (modèle 2960) nommés S1, S2, S3
- 3 PC nommés PC-Direction, PC-Atelier, PC-Comptabilité
- Câbles cuivre droits : R1 vers chaque commutateur, puis chaque commutateur vers son PC

## Plan d’adressage

Réseau de l’entreprise : ${facts.network}, découpé en 4 sous-réseaux /${facts.prefix} (masque ${facts.mask}).
La passerelle reçoit la première adresse utilisable de chaque sous-réseau. Les PC prennent les adresses suivantes.

| Sous-réseau | Adresse réseau | Passerelle (R1) | PC |
|---|---|---|---|
| Direction | ${direction.network}/${facts.prefix} | ${gateway(direction)} | ${pc(direction)} |
| Atelier | ${atelier.network}/${facts.prefix} | ${gateway(atelier)} | ${pc(atelier)} |
| Comptabilité | ${compta.network}/${facts.prefix} | ${gateway(compta)} | ${pc(compta)} |
| Invités | à calculer | à calculer | non câblé |

## Configurer le routeur

\`\`\`
enable
configure terminal
interface GigabitEthernet0/0
 ip address ${gateway(direction)} ${facts.mask}
 no shutdown
exit
interface GigabitEthernet0/1
 ip address ${gateway(atelier)} ${facts.mask}
 no shutdown
exit
interface GigabitEthernet0/2
 ip address ${gateway(compta)} ${facts.mask}
 no shutdown
end
show ip interface brief
\`\`\`

## Configurer les PC

Dans l’onglet Desktop, puis IP Configuration, choisis « Static » et renseigne l’adresse IP, le masque ${facts.mask} et la passerelle de son sous-réseau.

## Tester

Depuis PC-Direction, ouvre Command Prompt et lance \`ping ${pc(atelier)}\` : les paquets traversent R1. Si le ping échoue, vérifie le masque, la passerelle et l’état des interfaces (\`show ip interface brief\`).

## Rendre ton travail

1. Enregistre ton fichier .pkt.
2. Fais une capture d’écran de \`show ip interface brief\` et d’un ping réussi.
3. Remplis le modèle de rapport, puis dépose ton rapport ou le lien vers tes captures dans CyberPingo. Un formateur le relit.
`;
}

function buildReportTemplate() {
  return `# Rapport de laboratoire : plan d’adressage de l’atelier Kora

Nom : 
Date : 

## 1. Contexte
Décris en deux phrases le besoin de l’atelier et le réseau de départ.

## 2. Plan d’adressage
| Sous-réseau | Adresse réseau | Masque | Première utilisable | Dernière utilisable | Broadcast |
|---|---|---|---|---|---|
| Direction | | | | | |
| Atelier | | | | | |
| Comptabilité | | | | | |
| Invités | | | | | |

## 3. Méthode
Explique comment tu as trouvé la taille des sous-réseaux et le nombre d’hôtes utilisables.

## 4. Tests réalisés
Joins les captures de \`show ip interface brief\` et de tes pings (réussis et échoués).

## 5. Difficultés et améliorations
Qu’est-ce qui a été difficile ? Que ferais-tu différemment ?
`;
}

function buildWiresharkGuide() {
  return `# Lire une capture : les filtres qui servent vraiment

Ces filtres fonctionnent dans Wireshark (gratuit). La visionneuse de CyberPingo propose une recherche plus simple par texte.

| Je cherche | Filtre Wireshark |
|---|---|
| Les échanges d’une machine | \`ip.addr == 192.168.10.23\` |
| Les requêtes et réponses DNS | \`dns\` |
| Les échanges ARP | \`arp\` |
| Les ouvertures de connexion TCP (SYN seul) | \`tcp.flags.syn == 1 && tcp.flags.ack == 0\` |
| Les connexions refusées (RST) | \`tcp.flags.reset == 1\` |
| Un port précis | \`tcp.port == 8080\` |

## Les drapeaux TCP à connaître

- **SYN** : « je veux ouvrir une connexion ».
- **SYN-ACK** : « d’accord, j’ouvre aussi de mon côté ».
- **ACK** : « bien reçu ».
- **RST** : « refus ou rupture immédiate ».
- **FIN** : « j’ai fini d’envoyer ».

## Trois réflexes

1. Une réponse RST signifie que la machine est joignable mais que le port est fermé.
2. Un SYN répété sans aucune réponse suggère un filtrage (pare-feu) ou une machine arrêtée.
3. Beaucoup de SYN vers des ports différents depuis une même source, avec le même port source, ressemble à un scan.
`;
}

function buildLabAssets() {
  nextIpId = 0x1a2b;
  const instable = buildInstableCapture();
  const evaluation = buildEvaluationCapture();
  const firewall = buildFirewallLog();
  const packetTracer = buildPacketTracerFacts();
  const soc = buildSocAssets();
  return {
    files: [
      { name: "reseau-instable.pcap", data: instable.file },
      { name: "evaluation-reseaux.pcap", data: evaluation.file },
      { name: "incident-pare-feu.log", data: firewall.file },
      { name: "packet-tracer-topologie.svg", data: text(buildTopology(packetTracer)) },
      { name: "packet-tracer-guide.md", data: text(buildPacketTracerGuide(packetTracer)) },
      { name: "modele-rapport-reseau.md", data: text(buildReportTemplate()) },
      { name: "guide-wireshark.md", data: text(buildWiresharkGuide()) },
      ...soc.files,
    ],
    facts: { instable: instable.facts, evaluation: evaluation.facts, firewall: firewall.facts, packetTracer, soc: soc.facts },
  };
}

if (require.main === module) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const { files } = buildLabAssets();
  for (const file of files) fs.writeFileSync(path.join(OUTPUT_DIR, file.name), file.data);
  console.log(`Fichiers de laboratoire écrits dans ${path.relative(root, OUTPUT_DIR)} : ${files.map((file) => file.name).join(", ")}`);
}

module.exports = { buildLabAssets, OUTPUT_DIR, subnetOf, maskOf };
