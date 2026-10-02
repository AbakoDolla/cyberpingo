"use client";

import { useEffect, useMemo, useState } from "react";
import { IconAlert, IconDownload } from "@/components/ui/Icon";
import { countProtocols, filterPackets } from "@/lib/lab-view";
import { MAX_PCAP_BYTES, parsePcap, type PcapPacket, type PcapProtocol } from "@/lib/pcap";

const PAGE = 200;

function formatTime(seconds: number) { return seconds.toFixed(3); }
function endpoint(host: string, port: number | null) { return port === null ? host : `${host}:${port}`; }

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; packets: PcapPacket[] };

/** Reads a real capture file in the browser: filter it, click a packet, answer from what you see. */
export default function PcapViewer({ url, title }: { url: string; title: string }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [query, setQuery] = useState("");
  const [protocols, setProtocols] = useState<ReadonlySet<PcapProtocol>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    setLoad({ state: "loading" });
    fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error("Le fichier de capture est introuvable.");
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > MAX_PCAP_BYTES) throw new Error("Ce fichier de capture est trop volumineux pour l’aperçu.");
        return parsePcap(new Uint8Array(buffer));
      })
      .then((packets) => { if (!cancelled) setLoad({ state: "ready", packets }); })
      .catch((cause: unknown) => { if (!cancelled) setLoad({ state: "error", message: cause instanceof Error ? cause.message : "Capture illisible." }); });
    return () => { cancelled = true; };
  }, [url]);

  const packets = load.state === "ready" ? load.packets : null;
  const counts = useMemo(() => (packets ? countProtocols(packets) : []), [packets]);
  const visible = useMemo(() => (packets ? filterPackets(packets, query, protocols) : []), [packets, query, protocols]);
  const current = packets && selected !== null ? packets.find((packet) => packet.index === selected) ?? null : null;

  function toggle(protocol: PcapProtocol) {
    setProtocols((value) => {
      const next = new Set(value);
      if (next.has(protocol)) next.delete(protocol); else next.add(protocol);
      return next;
    });
    setLimit(PAGE);
  }

  return (
    <section className="lab-viewer pcap-viewer" aria-label={`Capture réseau : ${title}`}>
      <header className="lab-viewer__bar">
        <strong>{title}</strong>
        <a className="lab-viewer__download" href={url} download><IconDownload size={14} /> Télécharger le .pcap</a>
      </header>
      {load.state === "loading" && <p className="lab-viewer__state" role="status">Lecture de la capture…</p>}
      {load.state === "error" && <p className="lab-viewer__state is-error" role="alert"><IconAlert size={15} /> {load.message}</p>}
      {packets && (
        <>
          <div className="lab-viewer__tools">
            <label className="lab-viewer__search">
              <span className="sr-only">Filtrer les paquets</span>
              <input type="search" value={query} placeholder="Filtrer : ip, port, SYN, -arp…" onChange={(event) => { setQuery(event.target.value); setLimit(PAGE); }} />
            </label>
            <div className="lab-viewer__chips" role="group" aria-label="Protocoles">
              {counts.map(([protocol, count]) => (
                <button key={protocol} type="button" className="lab-chip" aria-pressed={protocols.has(protocol)} onClick={() => toggle(protocol)}>{protocol} <span>{count}</span></button>
              ))}
            </div>
            <p className="lab-viewer__count" aria-live="polite">{visible.length} / {packets.length} paquets</p>
          </div>
          <div className="lab-viewer__scroll" tabIndex={0} role="region" aria-label="Liste des paquets">
            <table className="pcap-table">
              <thead><tr><th scope="col">N°</th><th scope="col">Temps</th><th scope="col">Source</th><th scope="col">Destination</th><th scope="col">Proto</th><th scope="col">Info</th></tr></thead>
              <tbody>
                {visible.slice(0, limit).map((packet) => (
                  <tr key={packet.index} className={packet.index === selected ? "is-selected" : undefined} data-protocol={packet.protocol}>
                    <td>{packet.index}</td>
                    <td>{formatTime(packet.time)}</td>
                    <td>{endpoint(packet.src || packet.srcMac, packet.srcPort)}</td>
                    <td>{endpoint(packet.dst || packet.dstMac, packet.dstPort)}</td>
                    <td><span className="pcap-proto">{packet.protocol}</span></td>
                    <td><button type="button" className="pcap-row-button" aria-pressed={packet.index === selected} onClick={() => setSelected(packet.index === selected ? null : packet.index)}>{packet.info || "—"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && <p className="lab-viewer__state">Aucun paquet ne correspond à ce filtre.</p>}
          </div>
          {visible.length > limit && <button type="button" className="lab-viewer__more" onClick={() => setLimit((value) => value + PAGE)}>Afficher {Math.min(PAGE, visible.length - limit)} paquets de plus</button>}
          {current && (
            <dl className="pcap-detail" aria-label={`Détail du paquet ${current.index}`}>
              <div><dt>Paquet</dt><dd>n° {current.index} · {current.length} octets · {formatTime(current.time)} s</dd></div>
              <div><dt>Ethernet</dt><dd>{current.srcMac} → {current.dstMac}</dd></div>
              {current.src && <div><dt>IP</dt><dd>{current.src} → {current.dst}</dd></div>}
              {(current.srcPort !== null || current.dstPort !== null) && <div><dt>Ports</dt><dd>{current.srcPort ?? "—"} → {current.dstPort ?? "—"}</dd></div>}
              {current.flags.length > 0 && <div><dt>Drapeaux TCP</dt><dd>{current.flags.join(" · ")}</dd></div>}
              {current.payloadLength > 0 && <div><dt>Données</dt><dd>{current.payloadLength} octets</dd></div>}
              {current.dns && <div><dt>DNS</dt><dd>{current.dns.isResponse ? "Réponse" : "Requête"} #{current.dns.id} · {current.dns.name}{current.dns.answers.length ? ` → ${current.dns.answers.join(", ")}` : ""}</dd></div>}
              <div><dt>Résumé</dt><dd>{current.info}</dd></div>
            </dl>
          )}
        </>
      )}
    </section>
  );
}