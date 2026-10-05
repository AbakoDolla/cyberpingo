"use client";

import { useTranslation, type Language } from "@/lib/i18n";

interface LanguageToggleProps {
  className?: string;
}

export default function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const { lang, setLanguage } = useTranslation();

  const toggle = () => {
    const next: Language = lang === "fr" ? "en" : "fr";
    setLanguage(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`lang-toggle ${className}`}
      aria-label={`Langue actuelle : ${lang.toUpperCase()}. Cliquer pour basculer vers ${lang === "fr" ? "l'anglais" : "le français"}`}
      title={lang === "fr" ? "Passer en anglais (Switch to English)" : "Passer en français (Switch to French)"}
    >
      <span className="lang-toggle__icon" aria-hidden="true">🌐</span>
      <span className={`lang-toggle__code ${lang === "fr" ? "is-active" : ""}`}>FR</span>
      <span className="lang-toggle__sep" aria-hidden="true">|</span>
      <span className={`lang-toggle__code ${lang === "en" ? "is-active" : ""}`}>EN</span>
    </button>
  );
}
