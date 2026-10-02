// The lab viewers filter what the learner sees; these rules decide which packets and log lines stay visible.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("../scripts/ts-loader.cjs");

const { filterPackets, countProtocols, packetHaystack, toLogLines, filterLogLines } = load("lib/lab-view");

const packet = (index, protocol, extra = {}) => ({
  index, time: index, length: 60, protocol, srcMac: "aa:aa:aa:aa:aa:aa", dstMac: "bb:bb:bb:bb:bb:bb",
  src: "192.168.1.10", dst: "192.168.1.1", srcPort: null, dstPort: null, flags: [], payloadLength: 0, info: "", dns: null, ...extra,
});

const packets = [
  packet(1, "ARP", { info: "Who has 192.168.1.1" }),
  packet(2, "TCP", { srcPort: 40000, dstPort: 80, flags: ["SYN"], info: "SYN" }),
  packet(3, "TCP", { srcPort: 80, dstPort: 40000, flags: ["SYN", "ACK"], info: "SYN ACK" }),
  packet(4, "DNS", { dst: "8.8.8.8", info: "Query", dns: { name: "exemple.test" } }),
];

test("an empty query and no protocol selected keeps every packet", () => {
  assert.equal(filterPackets(packets, "", new Set()).length, 4);
  assert.equal(filterPackets(packets, "   ", new Set()).length, 4);
});

test("protocol chips narrow the list and combine with the search", () => {
  assert.deepEqual(filterPackets(packets, "", new Set(["TCP"])).map((p) => p.index), [2, 3]);
  assert.deepEqual(filterPackets(packets, "", new Set(["TCP", "DNS"])).map((p) => p.index), [2, 3, 4]);
  assert.deepEqual(filterPackets(packets, "ack", new Set(["TCP"])).map((p) => p.index), [3]);
});

test("search terms are ANDed and a leading dash excludes", () => {
  assert.deepEqual(filterPackets(packets, "tcp syn", new Set()).map((p) => p.index), [2, 3]);
  assert.deepEqual(filterPackets(packets, "tcp -ack", new Set()).map((p) => p.index), [2]);
  assert.deepEqual(filterPackets(packets, "-tcp", new Set()).map((p) => p.index), [1, 4]);
  assert.deepEqual(filterPackets(packets, "EXEMPLE.TEST", new Set()).map((p) => p.index), [4]);
  assert.deepEqual(filterPackets(packets, "8.8.8.8", new Set()).map((p) => p.index), [4]);
});

test("a lone dash is searched literally instead of excluding everything", () => {
  assert.equal(filterPackets(packets, "-", new Set()).length, 0);
  assert.ok(packetHaystack(packets[0]).includes("aa:aa:aa:aa:aa:aa"));
});

test("protocol counts are sorted by frequency", () => {
  assert.deepEqual(countProtocols(packets), [["TCP", 2], ["ARP", 1], ["DNS", 1]]);
  assert.deepEqual(countProtocols([]), []);
});

test("log lines are numbered from 1, keep their text and tone, and drop the trailing newline", () => {
  const lines = toLogLines("ALLOW tcp 10.0.0.2\r\nDENY tcp 10.0.0.9\nWARN scan\nplain line\n");
  assert.deepEqual(lines.map((l) => [l.number, l.tone]), [[1, "allow"], [2, "deny"], [3, "warn"], [4, "plain"]]);
  assert.equal(lines[0].text, "ALLOW tcp 10.0.0.2");
  assert.deepEqual(toLogLines(""), []);
});

test("a denied line stays denied even when it also mentions allow", () => {
  assert.equal(toLogLines("DENY after ALLOW rule")[0].tone, "deny");
  assert.equal(toLogLines("denied lowercase")[0].tone, "plain");
});

test("log search is case-insensitive, ANDed and supports exclusion", () => {
  const lines = toLogLines("ALLOW tcp 10.0.0.2 port 443\nDENY tcp 10.0.0.9 port 22\nDENY udp 10.0.0.9 port 53");
  assert.deepEqual(filterLogLines(lines, "DENY tcp").map((l) => l.number), [2]);
  assert.deepEqual(filterLogLines(lines, "10.0.0.9 -udp").map((l) => l.number), [2]);
  assert.deepEqual(filterLogLines(lines, "").map((l) => l.number), [1, 2, 3]);
});