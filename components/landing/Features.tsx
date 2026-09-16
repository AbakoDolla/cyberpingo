import Card from "@/components/ui/Card";
import { IconBolt, IconShield, IconAI, IconMap } from "@/components/ui/Icon";

const features = [
  {
    title: "Gamification",
    description:
      "XP, niveaux, streaks et badges transforment chaque leçon en étape motivante de ta progression.",
    Icon: IconBolt,
    glow: "blue" as const,
  },
  {
    title: "Challenges",
    description:
      "Des mini-laboratoires pratiques en réseau, Linux, web et cryptographie dans un environnement contrôlé.",
    Icon: IconShield,
    glow: "green" as const,
  },
  {
    title: "IA Mentor",
    description:
      "Un accompagnateur pédagogique disponible à tout moment pour expliquer un concept ou débloquer une erreur.",
    Icon: IconAI,
    glow: "purple" as const,
  },
  {
    title: "Carrière",
    description:
      "Une roadmap claire qui te mène des fondamentaux jusqu'aux compétences recherchées par les recruteurs.",
    Icon: IconMap,
    glow: "blue" as const,
  },
];

const glowColor: Record<string, string> = {
  blue: "text-cyber-blue bg-cyber-blue/10",
  green: "text-cyber-green bg-cyber-green/10",
  purple: "text-neon-purple bg-neon-purple/10",
};

export default function Features() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl md:text-4xl font-semibold">
          Tout ce qu&apos;il faut pour progresser, réuni au même endroit
        </h2>
        <p className="mt-4 text-white/60">
          Cyberpingo combine la pédagogie d&apos;une plateforme d&apos;apprentissage,
          l&apos;énergie d&apos;un jeu et la rigueur d&apos;un vrai terrain d&apos;entraînement
          cybersécurité.
        </p>
      </div>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => (
          <Card key={feature.title} glow={feature.glow}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${glowColor[feature.glow]}`}>
              <feature.Icon size={22} strokeWidth={1.6} />
            </div>
            <h3 className="mt-4 font-display font-semibold text-lg">{feature.title}</h3>
            <p className="mt-2 text-sm text-white/60">{feature.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
