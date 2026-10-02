import type { PcapPacket, PcapProtocol } from "@/lib/pcap";

/** Terms are ANDed; a leading "-" excludes. Matching is case-insensitive over what the learner can see. */
function matcher(query: string): (haystack: string) => boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return () => true;
  return (haystack) => terms.every((term) => (term.startsWith("-") && term.length > 1 ? !haystack.includes(term.slice(1)) : haystack.includes(term)));
}

export function packetHaystack(packet: PcapPacket): string {
  return [
    packet.index, packet.protocol, packet.src, packet.dst, packet.srcPort ?? "", packet.dstPort ?? "", packet.srcMac, packet.dstMac,
    packet.flags.join(" "), packet.info, packet.dns?.name ?? "",
  ].join(" ").toLowerCase();
}

export function filterPackets(packets: readonly PcapPacket[], query: string, protocols: ReadonlySet<PcapProtocol>): PcapPacket[] {
  const match = matcher(query);
  return packets.filter((packet) => (protocols.size === 0 || protocols.has(packet.protocol)) && match(packetHaystack(packet)));
}

export function countProtocols(packets: readonly PcapPacket[]): Array<[PcapProtocol, number]> {
  const counts = new Map<PcapProtocol, number>();
  for (const packet of packets) counts.set(packet.protocol, (counts.get(packet.protocol) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export interface LogLine { number: number; text: string; tone: "deny" | "allow" | "warn" | "plain" }

const DENY = /\b(DENY|DROP|REJECT|BLOCK|FAILED|ERROR)\b/;
const ALLOW = /\b(ALLOW|ACCEPT|PERMIT|SUCCESS)\b/;
const WARN = /\b(WARN|WARNING|ALERT)\b/;

export function toLogLines(text: string): LogLine[] {
  const lines = text.split(/\r?\n/);
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.map((line, index) => ({
    number: index + 1,
    text: line,
    tone: DENY.test(line) ? "deny" : WARN.test(line) ? "warn" : ALLOW.test(line) ? "allow" : "plain",
  }));
}

export function filterLogLines(lines: readonly LogLine[], query: string): LogLine[] {
  const match = matcher(query);
  return lines.filter((line) => match(line.text.toLowerCase()));
}