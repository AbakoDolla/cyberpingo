export default function LabTerminal({ lines }: { lines: string[] }) {
  const terminalLines = lines.length ? lines : ["$ Aucun journal de simulation n’est encore disponible."];
  return (
    <section className="lab-terminal" aria-label="Terminal de simulation">
      <div className="lab-terminal__bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <strong>simulation@cyberpingo</strong>
      </div>
      <pre aria-label="Sortie du terminal">
        {terminalLines.map((line, index) => (
          <span key={`${index}-${line}`}><em aria-hidden="true">{String(index + 1).padStart(2, "0")}</em><code>{line}</code></span>
        ))}
      </pre>
    </section>
  );
}