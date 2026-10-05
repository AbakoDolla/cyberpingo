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
    "nav.leaderboard": "Classement",
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

    // Leaderboard
    "leaderboard.title": "Ligue Hebdomadaire CyberPingo",
    "leaderboard.subtitle": "Chaque niveau se mérite : gagne des CyberBits chaque semaine !",
    "leaderboard.rewards": "Récompenses hebdomadaires",
    "leaderboard.countdown": "Fin de ligue dans",
    "leaderboard.your_rank": "Ton rang actuel",

    // Daily Chest
    "chest.title": "Coffre Mystère Quotidien",
    "chest.open": "Ouvrir le coffre",
    "chest.opened": "Coffre ouvert aujourd'hui",

    // Theme
    "theme.label": "Thème de grade",
    "theme.rank_unlocked": "Débloqué au grade",

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
    "settings.title": "Paramètres du compte",
    "settings.subtitle": "Règle ton rythme d’apprentissage, tes préférences de notification, tes données et les actions sensibles depuis des sections indépendantes.",
    "settings.public_profile": "Profil public",
    "settings.learning": "Apprentissage",
    "settings.preferences": "Préférences",
    "settings.pingo": "Pingo, ton coach",
    "settings.account": "Compte et connexion",
    "settings.data": "Données",
    "settings.danger": "Zone sensible",
    "settings.main_goal": "Objectif principal",
    "settings.skill_level": "Niveau estimé",
    "settings.daily_time": "Temps quotidien",
    "settings.existing_knowledge": "Connaissances déjà présentes",
    "settings.save_learning": "Enregistrer l’apprentissage",
    "settings.timezone": "Fuseau horaire",
    "settings.email_notif": "Notifications e-mail",
    "settings.email_notif_desc": "Recevoir les messages importants de CyberPingo.",
    "settings.streak_reminders": "Rappels de série",
    "settings.streak_reminders_desc": "Être prévenu avant de perdre ta série.",
    "settings.new_content": "Nouveaux contenus",
    "settings.new_content_desc": "Découvrir les parcours et défis publiés.",
    "settings.sound_fx": "Effets sonores",
    "settings.sound_fx_desc": "Activer les sons de réussite dans l’interface.",
    "settings.save_prefs": "Enregistrer les préférences",
    "settings.new_email": "Nouvelle adresse e-mail",
    "settings.send_conf_link": "Envoyer le lien de confirmation",
    "settings.new_password": "Nouveau mot de passe",
    "settings.confirm_password": "Confirmer le mot de passe",
    "settings.change_password": "Changer le mot de passe",
    "settings.logout": "Déconnexion",
    "settings.logout_desc": "Ferme la session locale sur cet appareil.",
    "settings.disconnect": "Se déconnecter",
    "settings.export_json": "Exporter mes données en JSON",
    "settings.export_desc": "Télécharge une copie de tes métadonnées de profil et de tes préférences.",

    // Shop / Boutique
    "shop.title": "Boutique CyberBits",
    "shop.subtitle": "Gagne des CyberBits en apprenant, puis utilise-les pour débloquer des parcours spécialisés et des laboratoires pratiques.",
    "shop.available_balance": "Mon solde disponible",
    "shop.discovery_mode": "Mode découverte",
    "shop.tab_courses": "Parcours",
    "shop.tab_labs": "Laboratoires",
    "shop.tab_history": "Mon historique",
    "shop.tab_rules": "Comment gagner ?",
    "shop.loading_catalog": "Chargement du catalogue…",
    "shop.free": "Gratuit",
    "shop.access": "Accéder",
    "shop.unlock": "Débloquer",
    "shop.locked_prereq": "Prérequis nécessaire",
    "shop.valid_prereq": "Prérequis validé",
    "shop.search_lab": "Rechercher un laboratoire...",
    "shop.all_categories": "Toutes les catégories",
    "shop.all_levels": "Tous les niveaux",
    "shop.empty_labs": "Aucun laboratoire ne correspond à tes filtres.",
    "shop.rules_title": "Règles d'attribution et prix des contenus",
    "shop.rules_desc": "Chaque récompense est créditée sur preuve d'apprentissage réel.",
    "shop.rewards_section": "Actions récompensées",
    "shop.prices_section": "Prix des déblocages",
    "shop.history_title": "Historique de tes transactions",
    "shop.history_empty": "Aucune transaction pour le moment.",

    // Skills
    "skills.title": "Mes compétences",
    "skills.rank": "Ton grade",
    "skills.ladder": "Échelle des grades",
    "skills.empty": "Aucune compétence publiée pour le moment.",
    "skills.see_courses": "Voir les parcours",

    // Notifications
    "notif.title": "Centre de notifications",
    "notif.subtitle": "Suis tes validations de modules, trophées, séries et annonces de la plateforme.",
    "notif.mark_all_read": "Tout marquer comme lu",
    "notif.empty": "Aucune notification pour l’instant.",
    "notif.filter_all": "Toutes",
    "notif.filter_unread": "Non lues",
  },
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.courses": "Courses",
    "nav.labs": "Hands-on Labs",
    "nav.shop": "CyberBits Shop",
    "nav.leaderboard": "Leaderboard",
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

    // Leaderboard
    "leaderboard.title": "CyberPingo Weekly League",
    "leaderboard.subtitle": "Every rank is earned: win CyberBits every week!",
    "leaderboard.rewards": "Weekly Rewards",
    "leaderboard.countdown": "League ends in",
    "leaderboard.your_rank": "Your current rank",

    // Daily Chest
    "chest.title": "Daily Mystery Chest",
    "chest.open": "Open chest",
    "chest.opened": "Chest claimed today",

    // Theme
    "theme.label": "Rank theme",
    "theme.rank_unlocked": "Unlocked at rank",

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
    "settings.title": "Account Settings",
    "settings.subtitle": "Adjust your learning pace, notification preferences, data exports, and sensitive actions from dedicated sections.",
    "settings.public_profile": "Public Profile",
    "settings.learning": "Learning Goals",
    "settings.preferences": "Preferences",
    "settings.pingo": "Pingo, your coach",
    "settings.account": "Account & Security",
    "settings.data": "Data & Exports",
    "settings.danger": "Danger Zone",
    "settings.main_goal": "Primary Goal",
    "settings.skill_level": "Estimated Level",
    "settings.daily_time": "Daily Time",
    "settings.existing_knowledge": "Existing Knowledge",
    "settings.save_learning": "Save Learning Goals",
    "settings.timezone": "Timezone",
    "settings.email_notif": "Email Notifications",
    "settings.email_notif_desc": "Receive critical CyberPingo updates.",
    "settings.streak_reminders": "Streak Reminders",
    "settings.streak_reminders_desc": "Get notified before losing your streak.",
    "settings.new_content": "New Content",
    "settings.new_content_desc": "Discover newly published courses and labs.",
    "settings.sound_fx": "Sound Effects",
    "settings.sound_fx_desc": "Enable interactive success sound effects.",
    "settings.save_prefs": "Save Preferences",
    "settings.new_email": "New Email Address",
    "settings.send_conf_link": "Send Confirmation Link",
    "settings.new_password": "New Password",
    "settings.confirm_password": "Confirm Password",
    "settings.change_password": "Change Password",
    "settings.logout": "Sign Out",
    "settings.logout_desc": "Close your active session on this device.",
    "settings.disconnect": "Log Out",
    "settings.export_json": "Export My Data (JSON)",
    "settings.export_desc": "Download a complete copy of your profile metadata and preferences.",

    // Shop / Boutique
    "shop.title": "CyberBits Shop",
    "shop.subtitle": "Earn CyberBits as you learn, then spend them to unlock specialized tracks and hands-on labs.",
    "shop.available_balance": "Available Balance",
    "shop.discovery_mode": "Discovery Mode",
    "shop.tab_courses": "Courses",
    "shop.tab_labs": "Hands-on Labs",
    "shop.tab_history": "My History",
    "shop.tab_rules": "How to Earn?",
    "shop.loading_catalog": "Loading catalog…",
    "shop.free": "Free",
    "shop.access": "Access",
    "shop.unlock": "Unlock",
    "shop.locked_prereq": "Prerequisite required",
    "shop.valid_prereq": "Prerequisite met",
    "shop.search_lab": "Search hands-on labs...",
    "shop.all_categories": "All Categories",
    "shop.all_levels": "All Levels",
    "shop.empty_labs": "No hands-on labs match your current filters.",
    "shop.rules_title": "Earning Rules & Content Pricing",
    "shop.rules_desc": "Every grant is credited upon verified proof of actual hands-on learning.",
    "shop.rewards_section": "Rewarding Actions",
    "shop.prices_section": "Content Unlock Prices",
    "shop.history_title": "Your Transaction History",
    "shop.history_empty": "No transactions recorded yet.",

    // Skills
    "skills.title": "My Skills Matrix",
    "skills.rank": "Your Rank",
    "skills.ladder": "Rank Ladder",
    "skills.empty": "No skills published yet.",
    "skills.see_courses": "Browse Courses",

    // Notifications
    "notif.title": "Notification Center",
    "notif.subtitle": "Track your module completions, trophies, streaks, and platform announcements.",
    "notif.mark_all_read": "Mark All as Read",
    "notif.empty": "No notifications right now.",
    "notif.filter_all": "All",
    "notif.filter_unread": "Unread",
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
