import { notFound } from "next/navigation";
import Link from "next/link";
import FigureView from "@/components/figures/Figure";
import { FIGURE_SAMPLES } from "@/lib/figure-samples";
import { serializeFigure, parseFigure } from "@/lib/figure-spec";

export const metadata = { title: "Galerie des figures", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Development only: one sample of every figure kind, to review the drawings. */
export default function FigureGallery() {
  if (process.env.NODE_ENV === "production") notFound();
  const figures = FIGURE_SAMPLES.map((sample) => ({ id: sample.id, figure: parseFigure(serializeFigure(sample.figure)) }));
  return (
    <main style={{ maxWidth: 940, margin: "0 auto", padding: "32px 20px 80px", display: "grid", gap: 26 }}>
      <h1 style={{ fontFamily: "var(--font-space-grotesk)", fontSize: 30, fontWeight: 800 }}>Galerie des figures</h1>
      <p style={{ color: "#b5c5df" }}>
        {figures.length} exemples, un par type. Les leçons d’un parcours : <Link href="/dev/figures/reseaux" style={{ color: "#75ddff" }}>/dev/figures/[cours]</Link>
      </p>
      {figures.map(({ id, figure }) => (
        <section key={id} id={id} style={{ display: "grid", gap: 8 }}>
          <code style={{ color: "#8ea3c0", fontSize: 12 }}>{id}</code>
          {figure ? <FigureView figure={figure} /> : <p style={{ color: "#ff6b7d" }}>Figure invalide : {id}</p>}
        </section>
      ))}
    </main>
  );
}
