"use client";

import { useEffect, useMemo, useState } from "react";
import { IconAlert, IconDownload } from "@/components/ui/Icon";
import { filterLogLines, toLogLines, type LogLine } from "@/lib/lab-view";

const PAGE = 300;
const MAX_BYTES = 1_000_000;

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; lines: LogLine[] };

/** Reads a real log file: filter it with search terms and spot the pattern yourself. */
export default function LogViewer({ url, title }: { url: string; title: string }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    let cancelled = false;
    setLoad({ state: "loading" });
    fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error("Le fichier de journal est introuvable.");
        const text = await response.text();
        if (text.length > MAX_BYTES) throw new Error("Ce journal est trop volumineux pour l’aperçu.");
        return toLogLines(text);
      })
      .then((lines) => { if (!cancelled) setLoad({ state: "ready", lines }); })
      .catch((cause: unknown) => { if (!cancelled) setLoad({ state: "error", message: cause instanceof Error ? cause.message : "Journal illisible." }); });
    return () => { cancelled = true; };
  }, [url]);

  const lines = load.state === "ready" ? load.lines : null;
  const visible = useMemo(() => (lines ? filterLogLines(lines, query) : []), [lines, query]);

  return (
    <section className="lab-viewer log-viewer" aria-label={`Journal : ${title}`}>
      <header className="lab-viewer__bar">
        <strong>{title}</strong>
        <a className="lab-viewer__download" href={url} download><IconDownload size={14} /> Télécharger le .log</a>
      </header>
      {load.state === "loading" && <p className="lab-viewer__state" role="status">Lecture du journal…</p>}
      {load.state === "error" && <p className="lab-viewer__state is-error" role="alert"><IconAlert size={15} /> {load.message}</p>}
      {lines && (
        <>
          <div className="lab-viewer__tools">
            <label className="lab-viewer__search">
              <span className="sr-only">Filtrer les lignes</span>
              <input type="search" value={query} placeholder="Filtrer : deny, 445, 203.0.113.9, -allow…" onChange={(event) => { setQuery(event.target.value); setLimit(PAGE); }} />
            </label>
            <p className="lab-viewer__count" aria-live="polite">{visible.length} / {lines.length} lignes</p>
          </div>
          <div className="lab-viewer__scroll" tabIndex={0} role="region" aria-label="Lignes du journal">
            <ol className="log-lines">
              {visible.slice(0, limit).map((line) => (
                <li key={line.number} data-tone={line.tone} value={line.number}><code>{line.text}</code></li>
              ))}
            </ol>
            {visible.length === 0 && <p className="lab-viewer__state">Aucune ligne ne correspond à ce filtre.</p>}
          </div>
          {visible.length > limit && <button type="button" className="lab-viewer__more" onClick={() => setLimit((value) => value + PAGE)}>Afficher {Math.min(PAGE, visible.length - limit)} lignes de plus</button>}
        </>
      )}
    </section>
  );
}