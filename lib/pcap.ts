// Minimal, dependency-free reader for classic .pcap captures (Ethernet frames carrying ARP, IPv4, TCP, UDP, ICMP, DNS and plain HTTP).
// It runs in the browser for the lab viewer and in Node for the tests that check lab answers against the real capture files.

export type PcapProtocol = "ARP" | "DNS" | "TCP" | "UDP" | "ICMP" | "HTTP" | "IPv4" | "Ethernet";

export interface PcapDns {
  id: number;
  isResponse: boolean;
  name: string;
  answers: string[];
}

export interface PcapPacket {
  index: number;
  time: number;
  length: number;
  protocol: PcapProtocol;
  srcMac: string;
  dstMac: string;
  src: string;
  dst: string;
  srcPort: number | null;
  dstPort: number | null;
  flags: string[];
  payloadLength: number;
  info: string;
  dns: PcapDns | null;
}

export const MAX_PCAP_BYTES = 2_000_000;
export const MAX_PCAP_PACKETS = 5000;

const TCP_FLAGS: Array<[number, string]> = [[0x02, "SYN"], [0x10, "ACK"], [0x01, "FIN"], [0x04, "RST"], [0x08, "PSH"], [0x20, "URG"]];

const hex = (value: number) => value.toString(16).padStart(2, "0");
const mac = (bytes: Uint8Array, offset: number) => Array.from(bytes.subarray(offset, offset + 6), hex).join(":");
const ip = (bytes: Uint8Array, offset: number) => Array.from(bytes.subarray(offset, offset + 4)).join(".");

function readName(view: DataView, bytes: Uint8Array, start: number): { name: string; next: number } {
  const labels: string[] = [];
  let offset = start;
  let next = -1;
  for (let jumps = 0; jumps < 16 && offset < bytes.length; ) {
    const length = bytes[offset];
    if (length === 0) {
      return { name: labels.join("."), next: next === -1 ? offset + 1 : next };
    }
    if ((length & 0xc0) === 0xc0) {
      if (offset + 1 >= bytes.length) break;
      if (next === -1) next = offset + 2;
      offset = view.getUint16(offset) & 0x3fff;
      jumps += 1;
      continue;
    }
    if (offset + 1 + length > bytes.length) break;
    labels.push(String.fromCharCode(...bytes.subarray(offset + 1, offset + 1 + length)));
    offset += 1 + length;
  }
  return { name: labels.join("."), next: next === -1 ? offset : next };
}

function parseDns(payload: Uint8Array): PcapDns | null {
  if (payload.length < 12) return null;
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const flags = view.getUint16(2);
  const questions = view.getUint16(4);
  const answerCount = view.getUint16(6);
  if (questions < 1 || questions > 4 || answerCount > 32) return null;

  let offset = 12;
  let first = "";
  for (let index = 0; index < questions; index += 1) {
    const read = readName(view, payload, offset);
    if (index === 0) first = read.name;
    offset = read.next + 4;
  }
  const answers: string[] = [];
  for (let index = 0; index < answerCount && offset + 10 <= payload.length; index += 1) {
    const read = readName(view, payload, offset);
    offset = read.next;
    if (offset + 10 > payload.length) break;
    const type = view.getUint16(offset);
    const length = view.getUint16(offset + 8);
    offset += 10;
    if (offset + length > payload.length) break;
    if (type === 1 && length === 4) answers.push(ip(payload, offset));
    offset += length;
  }
  return { id: view.getUint16(0), isResponse: (flags & 0x8000) !== 0, name: first, answers };
}

function httpSummary(payload: Uint8Array): string | null {
  if (payload.length < 5) return null;
  const head = String.fromCharCode(...payload.subarray(0, Math.min(payload.length, 120)));
  const line = head.split("\r\n")[0] ?? "";
  if (/^(GET|POST|HEAD|PUT|DELETE|OPTIONS) \S+ HTTP\/1\.[01]$/.test(line) || /^HTTP\/1\.[01] \d{3}/.test(line)) return line;
  return null;
}

export function parsePcap(data: Uint8Array): PcapPacket[] {
  if (data.length > MAX_PCAP_BYTES) throw new Error("Ce fichier de capture est trop volumineux.");
  if (data.length < 24) throw new Error("Ce fichier n’est pas une capture .pcap valide.");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const magic = view.getUint32(0, false);
  let littleEndian: boolean;
  let nanoseconds = false;
  if (magic === 0xa1b2c3d4) littleEndian = false;
  else if (magic === 0xd4c3b2a1) littleEndian = true;
  else if (magic === 0xa1b23c4d) { littleEndian = false; nanoseconds = true; }
  else if (magic === 0x4d3cb2a1) { littleEndian = true; nanoseconds = true; }
  else throw new Error("Ce fichier n’est pas une capture .pcap valide (le format .pcapng n’est pas pris en charge).");
  if (view.getUint32(20, littleEndian) !== 1) throw new Error("Seules les captures Ethernet sont prises en charge.");

  const packets: PcapPacket[] = [];
  let offset = 24;
  let origin = -1;
  while (offset + 16 <= data.length && packets.length < MAX_PCAP_PACKETS) {
    const seconds = view.getUint32(offset, littleEndian);
    const fraction = view.getUint32(offset + 4, littleEndian);
    const captured = view.getUint32(offset + 8, littleEndian);
    const original = view.getUint32(offset + 12, littleEndian);
    offset += 16;
    if (offset + captured > data.length) throw new Error("La capture est tronquée.");
    const timestamp = seconds + fraction / (nanoseconds ? 1e9 : 1e6);
    if (origin < 0) origin = timestamp;
    packets.push(parseFrame(data.subarray(offset, offset + captured), packets.length + 1, timestamp - origin, original));
    offset += captured;
  }
  return packets;
}

function parseFrame(frame: Uint8Array, index: number, time: number, length: number): PcapPacket {
  const base: PcapPacket = {
    index, time, length, protocol: "Ethernet", srcMac: "", dstMac: "", src: "", dst: "",
    srcPort: null, dstPort: null, flags: [], payloadLength: 0, info: "Trame illisible", dns: null,
  };
  if (frame.length < 14) return base;
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  base.dstMac = mac(frame, 0);
  base.srcMac = mac(frame, 6);
  const type = view.getUint16(12);

  if (type === 0x0806 && frame.length >= 42) {
    const operation = view.getUint16(20);
    const senderMac = mac(frame, 22);
    const senderIp = ip(frame, 28);
    const targetIp = ip(frame, 38);
    return {
      ...base, protocol: "ARP", src: senderIp, dst: targetIp,
      info: operation === 1 ? `Qui possède ${targetIp} ? Répondre à ${senderIp}` : `${senderIp} se trouve à l’adresse MAC ${senderMac}`,
    };
  }
  if (type !== 0x0800 || frame.length < 34) return { ...base, info: `Type Ethernet 0x${type.toString(16).padStart(4, "0")}` };

  const headerLength = (frame[14] & 0x0f) * 4;
  const protocol = frame[23];
  const total = view.getUint16(16);
  const l4 = 14 + headerLength;
  const packet: PcapPacket = { ...base, protocol: "IPv4", src: ip(frame, 26), dst: ip(frame, 30), info: `IPv4 protocole ${protocol}` };
  if (headerLength < 20 || l4 > frame.length) return packet;
  const end = Math.min(frame.length, 14 + total);

  if (protocol === 6 && l4 + 20 <= frame.length) {
    const dataOffset = (frame[l4 + 12] >> 4) * 4;
    const flagBits = frame[l4 + 13];
    const flags = TCP_FLAGS.filter(([bit]) => (flagBits & bit) !== 0).map(([, name]) => name);
    const payload = frame.subarray(Math.min(l4 + dataOffset, end), end);
    const srcPort = view.getUint16(l4);
    const dstPort = view.getUint16(l4 + 2);
    const http = httpSummary(payload);
    return {
      ...packet, protocol: http ? "HTTP" : "TCP", srcPort, dstPort, flags, payloadLength: payload.length,
      info: http ?? `${srcPort} → ${dstPort} [${flags.join(", ") || "aucun drapeau"}] seq=${view.getUint32(l4 + 4)} ack=${view.getUint32(l4 + 8)} win=${view.getUint16(l4 + 14)} len=${payload.length}`,
    };
  }
  if (protocol === 17 && l4 + 8 <= frame.length) {
    const srcPort = view.getUint16(l4);
    const dstPort = view.getUint16(l4 + 2);
    const payload = frame.subarray(l4 + 8, end);
    const dns = srcPort === 53 || dstPort === 53 ? parseDns(payload) : null;
    if (dns) {
      return {
        ...packet, protocol: "DNS", srcPort, dstPort, payloadLength: payload.length, dns,
        info: dns.isResponse ? `Réponse DNS : ${dns.name} → ${dns.answers.join(", ") || "aucune adresse"}` : `Requête DNS : quelle est l’adresse de ${dns.name} ?`,
      };
    }
    return { ...packet, protocol: "UDP", srcPort, dstPort, payloadLength: payload.length, info: `${srcPort} → ${dstPort} len=${payload.length}` };
  }
  if (protocol === 1 && l4 + 2 <= frame.length) {
    const kind = frame[l4];
    return { ...packet, protocol: "ICMP", info: kind === 8 ? "Écho (ping)" : kind === 0 ? "Réponse d’écho" : `ICMP type ${kind}` };
  }
  return packet;
}
