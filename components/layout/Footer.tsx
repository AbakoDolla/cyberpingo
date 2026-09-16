import Logo from "./Logo";

const columns = [
  {
    title: "Produit",
    links: [
      { label: "Parcours", href: "/#parcours" },
      { label: "Challenges", href: "/#challenges" },
      { label: "Mentor IA", href: "/#mentor" },
      { label: "Carrière", href: "/#carriere" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Blog", href: "#" },
      { label: "Communauté", href: "#" },
      { label: "Centre d'aide", href: "#" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "À propos", href: "#" },
      { label: "Carrières", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-dark-navy/40 mt-24">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2">
          <Logo />
          <p className="mt-4 text-sm text-white/50 max-w-xs">
            La plateforme mondiale pour apprendre, pratiquer et être recruté en
            cybersécurité.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="font-display text-sm font-semibold text-white mb-4">{col.title}</h3>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-white/50 hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-white/40">
        © 2026 Cyberpingo. Apprends. Pratique. Deviens cyber-pro.
      </div>
    </footer>
  );
}
