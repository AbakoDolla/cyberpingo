import Card from "@/components/ui/Card";
import { IconAI } from "@/components/ui/Icon";

const suggestions = [
  "Explique-moi le DNS",
  "Pourquoi dois-je apprendre Linux ?",
  "Quelle est ma prochaine étape ?",
];

export default function MentorSection() {
  return (
    <section id="mentor" className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-14 items-center">
      <div>
        <h2 className="font-display text-3xl md:text-4xl font-semibold">
          Un mentor IA qui explique, jamais qui juge
        </h2>
        <p className="mt-4 text-white/60 max-w-md">
          Bloqué sur une notion ou une erreur ? Ton mentor Cyberpingo est
          disponible à tout moment pour t&apos;accompagner pas à pas, dans un
          langage clair et sans jargon inutile.
        </p>
        <ul className="mt-6 space-y-3">
          {suggestions.map((s) => (
            <li key={s} className="flex items-center gap-3 text-sm text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-purple" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      <Card glow="purple" className="bg-gradient-to-b from-dark-navy to-cyber-black">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center">
            <IconAI size={20} strokeWidth={1.5} className="text-neon-purple" />
          </div>
          <div>
            <p className="font-display font-semibold text-sm">Mentor Cyberpingo</p>
            <p className="text-xs text-cyber-green">En ligne</p>
          </div>
        </div>
        <div className="py-4 space-y-3">
          <div className="bg-white/5 rounded-xl rounded-tl-none px-4 py-2.5 text-sm max-w-[85%]">
            Le DNS traduit les noms de domaine en adresses IP, un peu comme un
            annuaire téléphonique pour Internet.
          </div>
          <div className="bg-cyber-blue/20 rounded-xl rounded-tr-none px-4 py-2.5 text-sm max-w-[85%] ml-auto text-right">
            Quelle est ma prochaine étape ?
          </div>
        </div>
      </Card>
    </section>
  );
}
