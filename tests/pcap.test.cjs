// The capture parser is what the lab viewer shows to learners, so it is tested against the real
// lab files: what the viewer displays must match what the lab answer keys expect.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("../scripts/ts-loader.cjs");

const { parsePcap, MAX_PCAP_BYTES, MAX_PCAP_PACKETS } = load("lib/pcap");

const read = (name) => new Uint8Array(fs.readFileSync(path.join(root, "public", "labs", name)));
const synsTo = (packets, ip) => packets.filter((p) => p.protocol === "TCP" && p.dst === ip && p.flags.length === 1 && p.flags[0] === "SYN");

test("reseau-instable.pcap exposes the DNS, refused and silent connections the lab asks about", () => {
  const packets = parsePcap(read("reseau-instable.pcap"));
  assert.equal(packets.length, 22);
  assert.deepEqual(packets.map((p) => p.index), packets.map((_, i) => i + 1));

  const arp = packets.filter((p) => p.protocol === "ARP");
  assert.equal(arp.length, 2);
  assert.match(arp[1].info, /00:1b:21:aa:00:02/);

  const answer = packets.find((p) => p.dns?.isResponse);
  assert.equal(answer.dns.name, "intranet.cyberpingo.lab");
  assert.deepEqual(answer.dns.answers, ["192.168.10.50"]);
  assert.equal(answer.src, "192.168.10.2");

  const refused = packets.filter((p) => p.protocol === "TCP" && p.srcPort === 8080 && p.flags.includes("RST"));
  assert.equal(refused.length, 2);
  assert.ok(refused.every((p) => p.src === "192.168.10.60"));

  const silent = synsTo(packets, "192.168.10.70");
  assert.equal(silent.length, 4);
  assert.ok(silent.every((p) => p.dstPort === 22));
  assert.equal(packets.filter((p) => p.src === "192.168.10.70").length, 0, "the silent host never answers");

  const http = packets.filter((p) => p.protocol === "HTTP");
  assert.match(http[0].info, /GET \/accueil/);
  assert.match(http[1].info, /200 OK/);
});

test("evaluation-reseaux.pcap exposes the scanner and the open ports", () => {
  const packets = parsePcap(read("evaluation-reseaux.pcap"));
  assert.equal(packets.length, 40);

  const probes = packets.filter((p) => p.src === "192.168.10.99" && p.flags.length === 1 && p.flags[0] === "SYN");
  assert.equal(probes.length, 14);
  assert.deepEqual([...new Set(probes.map((p) => p.srcPort))], [44817], "a scanner keeps one source port");

  const open = packets
    .filter((p) => p.src === "192.168.10.50" && p.dst === "192.168.10.99" && p.flags.includes("SYN") && p.flags.includes("ACK"))
    .map((p) => p.srcPort)
    .sort((a, b) => a - b);
  assert.deepEqual(open, [22, 80, 443, 3306]);

  const query = packets.find((p) => p.dns && !p.dns.isResponse);
  assert.equal(query.dns.name, "portail.cyberpingo.lab");
});

test("every packet exposes a readable French summary", () => {
  for (const name of ["reseau-instable.pcap", "evaluation-reseaux.pcap"]) {
    for (const packet of parsePcap(read(name))) {
      assert.ok(packet.info.length > 0);
      assert.ok(packet.length >= 14);
      assert.ok(Number.isFinite(packet.time));
    }
  }
});

test("a damaged or foreign file is rejected with a clear message instead of crashing", () => {
  assert.throws(() => parsePcap(new Uint8Array(0)), Error);
  assert.throws(() => parsePcap(new Uint8Array(24).fill(7)), /pcap|capture|format/i);

  const valid = read("reseau-instable.pcap");
  const truncated = valid.slice(0, valid.length - 7);
  const result = (() => { try { return parsePcap(truncated); } catch (error) { return error; } })();
  assert.ok(result instanceof Error || result.length < 22, "a truncated capture never returns phantom packets");

  const notEthernet = valid.slice();
  new DataView(notEthernet.buffer).setUint32(20, 113, true);
  assert.throws(() => parsePcap(notEthernet), /Ethernet/i);
});

test("the size limits protect the browser", () => {
  assert.equal(MAX_PCAP_BYTES, 2_000_000);
  assert.equal(MAX_PCAP_PACKETS, 5000);
});
