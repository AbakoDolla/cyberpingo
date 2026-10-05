"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import LanguageToggle from "./LanguageToggle";
import Avatar from "@/components/ui/Avatar";
import { IconArrowRight, IconBolt, IconMenu, IconX } from "@/components/ui/Icon";
import { useUser } from "@/context/UserContext";
import { useTranslation } from "@/lib/i18n";

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
  const { lang } = useTranslation();
  const isEn = lang === "en";
  const spaceHref = isStaff ? "/admin" : "/dashboard";

  const links = [
    { href: "/", label: isEn ? "Home" : "Accueil" },
    { href: "/parcours", label: isEn ? "Tracks & Courses" : "Cours" },
    { href: "/fonctionnalites", label: isEn ? "Features" : "Fonctionnalités" },
    { href: "/ressources", label: isEn ? "Resources" : "Ressources" },
    { href: "/materiel", label: isEn ? "Hardware" : "Matériel" },
    { href: "/a-propos", label: isEn ? "About" : "À propos" },
  ];

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
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageToggle />
          <button
            ref={menuButton}
            type="button"
            className="nav-menu-toggle"
            aria-label={open ? (isEn ? "Close menu" : "Fermer le menu") : (isEn ? "Open menu" : "Ouvrir le menu")}
            aria-expanded={open}
            aria-controls="public-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <IconX size={24} /> : <IconMenu size={24} />}
          </button>
        </div>
        <div id="public-navigation" className={`nav-content ${open ? "is-open" : ""}`}>
          <nav aria-label={isEn ? "Main navigation" : "Navigation principale"}>
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
              aria-label={isEn ? "Toggle animations" : "Activer les animations"}
              aria-pressed={motionEnabled}
              title={motionEnabled ? (isEn ? "Disable animations" : "Désactiver les animations") : (isEn ? "Enable animations" : "Activer les animations")}
              onClick={onToggleMotion}
            >
              <IconBolt size={20} />
            </button>
            <div className="hidden lg:inline-flex">
              <LanguageToggle />
            </div>
            {!hydrated ? (
              <span className="nav-session-placeholder" aria-hidden="true" />
            ) : isAuthenticated ? (
              <>
                <Link href={spaceHref} className="public-button button-primary" onClick={() => setOpen(false)}>
                  {isStaff ? (isEn ? "Admin Console" : "Console admin") : (isEn ? "My Dashboard" : "Mon espace")} <IconArrowRight size={16} />
                </Link>
                {profile && (
                  <Link href="/profile" className="nav-avatar" aria-label={`Mon profil (${profile.display_name})`} onClick={() => setOpen(false)}>
                    <Avatar name={profile.display_name} src={profile.avatar_url} size="sm" ringTone="none" />
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/login" className="public-button button-outline">{isEn ? "Sign In" : "Se connecter"}</Link>
                <Link href="/register" className="public-button button-primary">{isEn ? "Sign Up" : "S'inscrire"}</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
