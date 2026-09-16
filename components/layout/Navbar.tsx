"use client";

import Link from "next/link";
import { useState } from "react";
import Logo from "./Logo";
import Button from "@/components/ui/Button";

const links = [
  { href: "/#accueil", label: "Accueil" },
  { href: "/#parcours", label: "Parcours" },
  { href: "/#challenges", label: "Challenges" },
  { href: "/#a-propos", label: "À propos" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-cyber-black/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Connexion
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">
              Commencer gratuitement
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden text-white/80"
          onClick={() => setOpen((v) => !v)}
          aria-label="Ouvrir le menu"
          aria-expanded={open}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 px-6 py-4 flex flex-col gap-4">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-white/80" onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/login">
              <Button variant="secondary" className="w-full">
                Connexion
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" className="w-full">
                Commencer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
