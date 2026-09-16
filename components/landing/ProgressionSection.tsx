import { roadmap } from "@/data/roadmap";

export default function ProgressionSection() {
  return (
    <section id="parcours" className="max-w-7xl mx-auto px-6 py-20">
      <div className="max-w-2xl mb-14">
        <h2 className="font-display text-3xl md:text-4xl font-semibold">
          Une roadmap pensée pour t&apos;emmener jusqu&apos;au niveau professionnel
        </h2>
        <p className="mt-4 text-white/60">
          Chaque module débloque le suivant. Tu avances à ton rythme, sans jamais
          te sentir perdu.
        </p>
      </div>

      <div className="relative">
        <div className="hidden md:block absolute left-0 right-0 top-6 h-px bg-white/10" />
        <div className="grid md:grid-cols-7 gap-6 md:gap-4">
          {roadmap.map((node, i) => (
            <div key={node.id} className="relative flex flex-col items-center text-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-semibold border-2 z-10 bg-cyber-black ${
                  node.status === "termine"
                    ? "border-cyber-green text-cyber-green"
                    : node.status === "en_cours"
                    ? "border-cyber-blue text-cyber-blue shadow-glow"
                    : "border-white/15 text-white/30"
                }`}
              >
                {node.status === "termine" ? "✓" : i + 1}
              </div>
              <p className="mt-3 text-sm font-medium">{node.title}</p>
              <p className="mt-1 text-xs text-white/50">{node.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
