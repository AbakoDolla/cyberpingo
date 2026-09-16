import { challenges } from "@/data/challenges";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const preview = challenges.slice(0, 3);

const difficultyLabel: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

export default function ChallengesSection() {
  return (
    <section id="challenges" className="max-w-7xl mx-auto px-6 py-20">
      <div className="max-w-2xl mb-12">
        <h2 className="font-display text-3xl md:text-4xl font-semibold">
          Mets tes compétences à l&apos;épreuve dans des challenges réels
        </h2>
        <p className="mt-4 text-white/60">
          Des mini-laboratoires guidés, dans un environnement pédagogique
          contrôlé, pour pratiquer sans risque.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {preview.map((challenge) => (
          <Card key={challenge.id} glow="green">
            <div className="flex items-center justify-between">
              <Badge tone="blue">{difficultyLabel[challenge.difficulty]}</Badge>
              <span className="text-cyber-green text-sm font-medium">+{challenge.xpReward} XP</span>
            </div>
            <h3 className="mt-4 font-display font-semibold text-lg">{challenge.title}</h3>
            <p className="mt-2 text-sm text-white/60">{challenge.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
