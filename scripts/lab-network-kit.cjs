// Shared helpers of the network lab scenarios: IPv4 and IPv6 arithmetic used to compute every expected
// answer from the same numbers that appear in the files learners download, and a small SVG diagram
// builder so every topology looks like the first Packet Tracer lab.

const text = (value) => Buffer.from(value, "utf8");

// --- IPv4 ------------------------------------------------------------------------------------------------

const toInt = (address) => address.split(".").reduce((total, part) => total * 256 + Number(part), 0);
const toIp = (value) => [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join(".");
const maskOf = (prefix) => toIp(prefix === 0 ? 0 : 2 ** 32 - 2 ** (32 - prefix));
const wildcardOf = (prefix) => toIp(2 ** (32 - prefix) - 1);

function subnetOf(address, prefix) {
  const size = 2 ** (32 - prefix);
  const network = Math.floor(toInt(address) / size) * size;
  return {
    network: toIp(network), broadcast: toIp(network + size - 1), first: toIp(network + 1), last: toIp(network + size - 2),
    prefix, mask: maskOf(prefix), wildcard: wildcardOf(prefix), size, hosts: size - 2,
  };
}

/** The smallest prefix whose block holds `hosts` usable addresses. */
function prefixForHosts(hosts) {
  let prefix = 30;
  while (2 ** (32 - prefix) - 2 < hosts) prefix -= 1;
  return prefix;
}

// --- IPv6 ------------------------------------------------------------------------------------------------

function expandV6(address) {
  const [head, tail] = address.split("::");
  const left = head ? head.split(":") : [];
  const right = tail !== undefined && tail ? tail.split(":") : [];
  const fill = address.includes("::") ? 8 - left.length - right.length : 0;
  const groups = [...left, ...Array(fill).fill("0"), ...right].map((group) => parseInt(group, 16));
  if (groups.length !== 8 || groups.some((group) => Number.isNaN(group))) throw new Error(`Adresse IPv6 invalide : ${address}`);
  return groups;
}

/** Lower case, no leading zeros, the longest run of zero groups (two or more) written "::" (RFC 5952). */
function compressV6(groups) {
  let best = { start: -1, length: 0 };
  for (let index = 0; index < 8;) {
    if (groups[index] !== 0) { index += 1; continue; }
    let end = index;
    while (end < 8 && groups[end] === 0) end += 1;
    if (end - index > best.length) best = { start: index, length: end - index };
    index = end;
  }
  const hex = groups.map((group) => group.toString(16));
  if (best.length < 2) return hex.join(":");
  const left = hex.slice(0, best.start).join(":");
  const right = hex.slice(best.start + best.length).join(":");
  return `${left}::${right}`;
}

const groupsToBig = (groups) => groups.reduce((total, group) => (total << 16n) + BigInt(group), 0n);
const bigToGroups = (value) => Array.from({ length: 8 }, (_, index) => Number((value >> BigInt((7 - index) * 16)) & 0xffffn));

/** The `index`-th sub-prefix of length `newLength` inside `address`/`length`, compressed, with its length. */
function subPrefixV6(address, length, newLength, index) {
  const base = groupsToBig(expandV6(address));
  const step = 1n << BigInt(128 - newLength);
  const aligned = (base >> BigInt(128 - length)) << BigInt(128 - length);
  return `${compressV6(bigToGroups(aligned + step * BigInt(index)))}/${newLength}`;
}

const expandedV6 = (address) => expandV6(address).map((group) => group.toString(16).padStart(4, "0")).join(":");

/** Interface identifier a host derives from its MAC address (EUI-64), as four hexadecimal groups. */
function eui64(mac) {
  const bytes = mac.split(/[-:]/).map((part) => parseInt(part, 16));
  bytes[0] ^= 0x02;
  const full = [...bytes.slice(0, 3), 0xff, 0xfe, ...bytes.slice(3)];
  return [0, 2, 4, 6].map((offset) => ((full[offset] << 8) | full[offset + 1]).toString(16)).join(":");
}

// --- SVG diagrams ----------------------------------------------------------------------------------------

const escapeXml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * nodes: [{ id, x, y, w, h, title, sub?, color }] (x and y give the centre)
 * links: [{ from, to, label? }] drawn as elbow connectors from the bottom of `from` to the top of `to`
 * notes: lines of text written under the diagram.
 */
function diagram({ width, height, title, desc, nodes, links, notes = [] }) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const drawNode = (node) => {
    const top = node.y - node.h / 2;
    const titleY = node.sub ? node.y - 3 : node.y + 5;
    return `<g>
    <rect x="${node.x - node.w / 2}" y="${top}" width="${node.w}" height="${node.h}" rx="10" fill="#0f1a33" stroke="${node.color}" stroke-width="2"/>
    <text x="${node.x}" y="${titleY}" text-anchor="middle" fill="#f8fafc" font-size="14" font-weight="700">${escapeXml(node.title)}</text>${node.sub ? `
    <text x="${node.x}" y="${node.y + 15}" text-anchor="middle" fill="#94a3b8" font-size="11">${escapeXml(node.sub)}</text>` : ""}
  </g>`;
  };
  const drawLink = (link) => {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (!from || !to) throw new Error(`Lien inconnu : ${link.from} vers ${link.to}`);
    const y1 = from.y + from.h / 2;
    const y2 = to.y - to.h / 2;
    const middle = (y1 + y2) / 2;
    const path = `M${from.x} ${y1} V${middle} H${to.x} V${y2}`;
    const label = link.label
      ? `<text x="${(from.x + to.x) / 2}" y="${middle - 5}" text-anchor="middle" fill="#00d9ff" font-size="11" font-family="'JetBrains Mono', Consolas, monospace">${escapeXml(link.label)}</text>`
      : "";
    return `<path d="${path}" fill="none" stroke="#334155" stroke-width="2"/>${label}`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="t d" font-family="Inter, Arial, sans-serif">
  <title id="t">${escapeXml(title)}</title>
  <desc id="d">${escapeXml(desc)}</desc>
  <rect width="${width}" height="${height}" rx="16" fill="#0b1020"/>
  ${links.map(drawLink).join("\n  ")}
  ${nodes.map(drawNode).join("\n  ")}
  ${notes.map((note, index) => `<text x="${width / 2}" y="${height - 14 - (notes.length - 1 - index) * 18}" text-anchor="middle" fill="#94a3b8" font-size="12">${escapeXml(note)}</text>`).join("\n  ")}
</svg>
`;
}

module.exports = { text, toInt, toIp, maskOf, wildcardOf, subnetOf, prefixForHosts, expandV6, compressV6, subPrefixV6, expandedV6, eui64, diagram, escapeXml };
