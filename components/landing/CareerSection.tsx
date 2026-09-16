import Button from "@/components/ui/Button";
import Link from "next/link";

const steps = ["Débutant curieux", "Praticien confirmé", "Prêt pour l'emploi"];

export default function CareerSection() {
  return (
    <section id="carriere" className="max-w-7xl mx-auto px-6 py-20">
      <div className="bg-dark-navy border border-white/5 rounded-xl2 p-10 md:p-16 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-neon-purple/20 rounded-full blur-3xl" />
        <div className="relative max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl font-semibold">
            De débutant curieux à candidat recherché
          </h2>
          <p className="mt-4 text-white/60">
            Cyberpingo construit ton portfolio au fil de ta progression :
            badges, projets et challenges réussis deviennent des preuves
            concrètes de compétences pour les recruteurs.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <span className="px-4 py-2 rounded-full bg-cyber-black border border-white/10 text-sm">
                  {step}
                </span>
                {i < steps.length - 1 && <span className="text-white/30">→</span>}
              </div>
            ))}
          </div>

          <Link href="/register" className="inline-block mt-9">
            <Button variant="primary" size="lg">
              Démarrer mon parcours
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
