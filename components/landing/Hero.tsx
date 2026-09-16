import Link from "next/link";
import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section id="accueil" className="relative overflow-hidden grid-lines">
      <div className="absolute inset-0 bg-cyber-radial pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 grid md:grid-cols-2 gap-16 items-center relative">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-cyber-blue bg-cyber-blue/10 border border-cyber-blue/20 px-3 py-1.5 rounded-full">
            Nouvelle génération d&apos;apprentissage cybersécurité
          </span>
          <h1 className="mt-6 font-display font-bold text-4xl md:text-6xl leading-tight">
            Apprends la cybersécurité comme tu joues à ton jeu préféré
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-lg">
            Cyberpingo transforme les débutants en professionnels grâce à des
            leçons interactives, des challenges pratiques et un mentor IA
            disponible à chaque étape.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                Commencer gratuitement
              </Button>
            </Link>
            <a href="#parcours">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Explorer les parcours
              </Button>
            </a>
          </div>
          <div className="mt-10 flex items-center gap-8 text-sm text-white/50">
            <div>
              <p className="text-2xl font-display font-bold text-white">40+</p>
              modules pratiques
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-white">100%</p>
              gratuit pour démarrer
            </div>
          </div>
        </div>

        <div className="relative flex justify-center">
          <div className="absolute w-72 h-72 bg-cyber-blue/20 rounded-full blur-3xl" />
          <svg
            viewBox="0 0 320 360"
            className="relative w-64 md:w-80 drop-shadow-[0_0_40px_rgba(0,168,255,0.35)]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse cx="160" cy="330" rx="90" ry="14" fill="#0F172A" />
            <path d="M160 20 L280 70 V180 C280 260 226 320 160 340 C94 320 40 260 40 180 V70 L160 20Z" fill="url(#hero-gradient)" />
            <circle cx="130" cy="150" r="12" fill="#050816" />
            <circle cx="190" cy="150" r="12" fill="#050816" />
            <circle cx="134" cy="146" r="4" fill="#00FF88" />
            <circle cx="194" cy="146" r="4" fill="#00FF88" />
            <path d="M110 200c25 22 75 22 100 0" stroke="#050816" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M160 20 V60" stroke="#00FF88" strokeWidth="4" strokeLinecap="round" />
            <circle cx="160" cy="14" r="8" fill="#00FF88" />
            <rect x="80" y="230" width="160" height="6" rx="3" fill="#8B5CF6" opacity="0.6" />
            <rect x="80" y="248" width="110" height="6" rx="3" fill="#00A8FF" opacity="0.6" />
            <defs>
              <linearGradient id="hero-gradient" x1="40" y1="20" x2="280" y2="340" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00A8FF" />
                <stop offset="1" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </section>
  );
}
