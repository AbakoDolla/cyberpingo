import Image from "next/image";
import Link from "next/link";
import logo from "@/public/images/cyberpingo-transparent.png";

const groups = [
  { title: "Plateforme", links: [{ href: "/parcours", label: "Tous les parcours" }, { href: "/fonctionnalites", label: "Fonctionnalités" }, { href: "/progression", label: "Ma progression" }, { href: "/communaute", label: "Communauté" }] },
  { title: "Ressources", links: [{ href: "/ressources", label: "Guides & articles" }, { href: "/faq", label: "Questions fréquentes" }, { href: "/contact", label: "Contact & assistance" }] },
  { title: "CyberPingo", links: [{ href: "/a-propos", label: "Notre mission" }, { href: "/confidentialite", label: "Confidentialité" }, { href: "/conditions", label: "Conditions d’utilisation" }, { href: "/register", label: "Créer un compte" }] },
];

export default function Footer() {
  return (
    <footer className="public-footer">
      <div className="public-container footer-inner">
        <div className="footer-brand">
          <Link href="/" aria-label="CyberPingo — Accueil"><Image src={logo} width={112} height={112} alt="Logo CyberPingo sur fond transparent" /></Link>
          <div><strong>Apprends · Pratique · Protège</strong><p>La cybersécurité commence<br />par un premier pas.</p></div>
        </div>
        {groups.map((group) => <div key={group.title}><h2>{group.title}</h2>{group.links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</div>)}
      </div>
      <div className="public-container footer-bottom"><span>© {new Date().getFullYear()} CyberPingo.</span><span>Plateforme pédagogique gratuite · <Link href="/confidentialite">Tes données</Link></span></div>
    </footer>
  );
}
