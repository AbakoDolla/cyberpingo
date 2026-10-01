export default function LabTerminal({ lines }: { lines: string[] }) {
  return (
    <section className="lab-terminal" aria-label="Terminal de simulation">
      <div className="lab-terminal__bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <strong>simulation@cyberpingo</strong>
      </div>
      <pre>{lines.length ? lines.join("\n") : "$ Aucun journal de simulation n’est encore disponible."}</pre>
    </section>
  );
}