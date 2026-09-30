import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { LAB_CATEGORY_LABELS } from "@/components/challenges/ChallengeCard";
import { levelLabel } from "@/lib/format";
import type { Lab } from "@/types/api";

export default function ChallengesSection({ labs }: { labs: Lab[] }) {
  const preview = labs.slice(0, 3);
  return (
    <section id="challenges" className="max-w-7xl mx-auto px-6 py-20">
      <div className="max-w-2xl mb-12">
        <h2 className="font-display text-3xl md:text-4xl font-semibold">Mets tes compétences à l’épreuve dans des labs guidés</h2>
        <p className="mt-4 text-white/60">Des mini-laboratoires pédagogiques, alimentés par le catalogue publié, pour pratiquer sans inventer de résultats.</p>
      </div>
      {preview.length ? <div className="grid md:grid-cols-3 gap-6">{preview.map((lab) => (
        <Card key={lab.id} glow="green"><div className="flex items-center justify-between"><Badge tone="purple">{LAB_CATEGORY_LABELS[lab.category]}</Badge><Badge tone="blue">{levelLabel(lab.difficulty)}</Badge></div><h3 className="mt-4 font-display font-semibold text-lg">{lab.title}</h3><p className="mt-2 text-sm text-white/60">{lab.description}</p><p className="mt-4 text-cyber-green text-sm font-medium">+{lab.xp_reward} XP</p></Card>
      ))}</div> : <div className="library-empty"><h2>Aucun lab publié pour le moment.</h2><p>La section apparaîtra dès que l’équipe publiera des exercices.</p></div>}
    </section>
  );
}