# Cyberpingo — Frontend MVP 1

Frontend Next.js (App Router) + TypeScript + Tailwind CSS pour Cyberpingo,
plateforme d'apprentissage interactif en cybersécurité.

## Démarrer le projet

```bash
npm install
npm run dev
```

L'application démarre sur http://localhost:3000.

## Structure

- `app/` — pages et routes (App Router)
- `components/` — composants réutilisables (ui, layout, dashboard, courses, quiz, challenges, profile, onboarding, mentor, landing)
- `data/` — données mockées (cours, leçons, quiz, challenges, badges, roadmap, utilisateur)
- `services/` — couche d'accès aux données, prête à être connectée à une API NestJS (`NEXT_PUBLIC_API_URL`)
- `types/` — types TypeScript partagés
- `hooks/` — hooks React (auth, progression/XP)
- `lib/` — utilitaires

## État actuel (MVP 1)

Toutes les fonctionnalités du cahier des charges Cyberpingo MVP 1 sont
implémentées avec des données mockées :

- Landing page (hero, fonctionnalités, roadmap, challenges, mentor IA, carrière)
- Inscription / Connexion (email + Google/GitHub en façade)
- Onboarding en 4 étapes avec génération de roadmap mockée
- Dashboard (XP, streak, roadmap visuelle, badges, cours en cours)
- Cours, leçons (texte, schéma, vidéo, code, exemple) et système de quiz
- Challenges cybersécurité par catégorie avec terminal mocké
- Mentor IA (interface de chat mockée)
- Profil (statistiques, compétences, badges)
- Navigation responsive (sidebar desktop / bottom nav mobile)

## Prochaines étapes suggérées

- Brancher `services/` sur l'API NestJS réelle
- Ajouter l'authentification (Auth.js ou JWT)
- Remplacer les données mockées de `data/` par des appels API
- Connecter le Mentor IA à un vrai moteur (ex. API Claude)
