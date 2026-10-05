"use client";

import { useEffect, useState } from "react";

export type Language = "fr" | "en";

export const TRANSLATIONS = {
  fr: {
    // Navigation
    "nav.dashboard": "Tableau de bord",
    "nav.courses": "Cours",
    "nav.labs": "Labs",
    "nav.shop": "Boutique",
    "nav.progress": "Ma progression",
    "nav.skills": "Compétences",
    "nav.mentor": "Mentor IA",
    "nav.notifications": "Notifications",
    "nav.profile": "Profil",
    "nav.settings": "Paramètres",
    "nav.admin": "Console admin",
    "nav.resources": "Guides & Ressources",
    "nav.login": "Se connecter",
    "nav.register": "Créer un compte",

    // Common actions
    "action.save": "Enregistrer",
    "action.cancel": "Annuler",
    "action.close": "Fermer",
    "action.continue": "Continuer",
    "action.start": "Commencer",
    "action.unlock": "Débloquer",
    "action.completed": "Terminé",
    "action.submit": "Valider",
    "action.retry": "Réessayer",
    "action.download_pdf": "Télécharger en PDF",
    "action.share_linkedin": "Partager sur LinkedIn",
    "action.add_linkedin": "Ajouter à mon profil LinkedIn",

    // CyberBits
    "cb.title": "Boutique CyberBits",
    "cb.balance": "Mon solde",
    "cb.gained": "Gagnés",
    "cb.spent": "Dépensés",
    "cb.tagline": "La monnaie de ton apprentissage",

    // Exam & Cert
    "exam.title": "Examen final de certification",
    "exam.pass_threshold": "Seuil de réussite : 70 %",
    "exam.time_left": "Temps restant",
    "exam.submit_confirm": "Soumettre l’examen",
    "exam.success": "Félicitations, certification obtenue !",
    "exam.review": "Correction détaillée",

    // Settings
    "settings.language": "Langue de l’interface",
    "settings.language_desc": "Choisis la langue d’affichage des menus, boutons et interfaces.",
    "settings.language_fr": "Français (par défaut)",
    "settings.language_en": "English",
  },
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.courses": "Courses",
    "nav.labs": "Hands-on Labs",
    "nav.shop": "CyberBits Shop",
    "nav.progress": "My Progress",
    "nav.skills": "Skills Matrix",
    "nav.mentor": "AI Mentor",
    "nav.notifications": "Notifications",
    "nav.profile": "Profile",
    "nav.settings": "Settings",
    "nav.admin": "Admin Console",
    "nav.resources": "Guides & Resources",
    "nav.login": "Sign In",
    "nav.register": "Sign Up",

    // Common actions
    "action.save": "Save Changes",
    "action.cancel": "Cancel",
    "action.close": "Close",
    "action.continue": "Continue",
    "action.start": "Start",
    "action.unlock": "Unlock",
    "action.completed": "Completed",
    "action.submit": "Submit",
    "action.retry": "Retry",
    "action.download_pdf": "Download PDF",
    "action.share_linkedin": "Share on LinkedIn",
    "action.add_linkedin": "Add to LinkedIn Profile",

    // CyberBits
    "cb.title": "CyberBits Shop",
    "cb.balance": "My Balance",
    "cb.gained": "Earned",
    "cb.spent": "Spent",
    "cb.tagline": "The currency of your learning journey",

    // Exam & Cert
    "exam.title": "Final Certification Exam",
    "exam.pass_threshold": "Passing score: 70%",
    "exam.time_left": "Time left",
    "exam.submit_confirm": "Submit Exam",
    "exam.success": "Congratulations, certification earned!",
    "exam.review": "Detailed Review",

    // Settings
    "settings.language": "Interface Language",
    "settings.language_desc": "Choose the language for menus, controls, and buttons.",
    "settings.language_fr": "French (default)",
    "settings.language_en": "English",
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.fr;

const LANG_KEY = "cyberpingo_lang";
let currentLang: Language = "fr";

export function getLanguage(): Language {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem(LANG_KEY);
  return stored === "en" ? "en" : "fr";
}

export function setLanguage(lang: Language) {
  if (typeof window === "undefined") return;
  currentLang = lang;
  window.localStorage.setItem(LANG_KEY, lang);
  window.dispatchEvent(new CustomEvent("cyberpingo:language", { detail: lang }));
}

export function useTranslation() {
  const [lang, setLangState] = useState<Language>(() => (typeof window !== "undefined" ? getLanguage() : "fr"));

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<Language>;
      setLangState(custom.detail);
    };
    window.addEventListener("cyberpingo:language", handler);
    return () => window.removeEventListener("cyberpingo:language", handler);
  }, []);

  const t = (key: TranslationKey, fallback?: string): string => {
    const dict = TRANSLATIONS[lang] ?? TRANSLATIONS.fr;
    return (dict as Record<string, string>)[key] ?? (TRANSLATIONS.fr as Record<string, string>)[key] ?? fallback ?? key;
  };

  const changeLanguage = (newLang: Language) => {
    setLanguage(newLang);
    setLangState(newLang);
  };

  return { t, lang, setLanguage: changeLanguage };
}
