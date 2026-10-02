"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import Avatar from "@/components/ui/Avatar";
import { IconArrowRight, IconBolt, IconMenu, IconX } from "@/components/ui/Icon";
import { useUser } from "@/context/UserContext";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/parcours", label: "Cours" },
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/ressources", label: "Ressources" },
  { href: "/a-propos", label: "À propos" },
];

interface NavbarProps {
  motionEnabled: boolean;
  onToggleMotion: () => void;
}

export default function Navbar({ motionEnabled, onToggleMotion }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { hydrated, isAuthenticated, isStaff, profile } = useUser();
  const spaceHref = isStaff ? "/admin" : "/dashboard";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={`public-nav ${scrolled ? "is-scrolled" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <div className="public-container nav-inner">
        <Logo variant="badge" />
        <button
          ref={menuButton}
          type="button"
          className="nav-menu-toggle"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          aria-controls="public-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <IconX size={24} /> : <IconMenu size={24} />}
        </button>
        <div id="public-navigation" className={`nav-content ${open ? "is-open" : ""}`}>
          <nav aria-label="Navigation principale">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`)) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <button
              type="button"
              className="motion-toggle"
              aria-label="Activer les animations"
              aria-pressed={motionEnabled}
              title={motionEnabled ? "Désactiver les animations" : "Activer les animations"}
              onClick={onToggleMotion}
            >
              <IconBolt size={20} />
            </button>
            {!hydrated ? (
              <span className="nav-session-placeholder" aria-hidden="true" />
            ) : isAuthenticated ? (
              <>
                <Link href={spaceHref} className="public-button button-primary" onClick={() => setOpen(false)}>
                  {isStaff ? "Console admin" : "Mon espace"} <IconArrowRight size={16} />
                </Link>
                {profile && (
                  <Link href="/profile" className="nav-avatar" aria-label={`Mon profil (${profile.display_name})`} onClick={() => setOpen(false)}>
                    <Avatar name={profile.display_name} src={profile.avatar_url} size="sm" ringTone="none" />
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/login" className="public-button button-outline">Se connecter</Link>
                <Link href="/register" className="public-button button-primary">S&apos;inscrire</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
