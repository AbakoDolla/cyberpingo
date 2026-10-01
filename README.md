# CyberPingo

Plateforme francophone d'apprentissage de la cybersécurité, gamifiée à la manière de Duolingo : parcours, modules, leçons, quiz, labs, XP, niveaux, séries quotidiennes, badges, défis et certificats vérifiables.

Le frontend est une application **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS**. Le backend est **Supabase** : Auth, PostgreSQL avec Row Level Security, Storage, Realtime et Edge Functions.

En production : **https://cyberpingo.vercel.app** (Vercel, déployé automatiquement à chaque push sur `main`).

> **Pourquoi Next.js et pas Vite ?** Le projet existait déjà en Next.js. Next apporte le rendu serveur des pages publiques (SEO, partage des certificats), un middleware qui protège les routes avant tout rendu, et des routes API serveur pour les clés secrètes (Gemini). Les conventions du cahier des charges sont conservées : `VITE_SUPABASE_*` devient `NEXT_PUBLIC_SUPABASE_*`, et `src/services` devient `services/`.

## Fonctionnalités

| Domaine | Ce qui fonctionne réellement |
|---|---|
| Comptes | Inscription avec confirmation par e-mail, connexion, OAuth GitHub/Google (optionnel), mot de passe oublié, changement d'e-mail, suppression de compte |
| Profil | Pseudo, nom affiché, bio, avatar (Storage), objectif quotidien, fuseau horaire, préférences de notifications |
| Apprentissage | Catalogue publié, inscription au cours, modules ordonnés, leçons en blocs JSON, temps minimal de lecture, sauvegarde de la progression |
| Quiz | Correction côté serveur, bonnes réponses révélées seulement après soumission, meilleure note conservée |
| Labs | Drapeaux stockés hors de portée du client, comparaison normalisée, budget de tentatives |
| Gamification | Registre d'XP, 20 niveaux, séries quotidiennes selon le fuseau de l'utilisateur, badges, défis du jour, objectif quotidien |
| Certificats | Émis automatiquement à la fin d'un parcours, PDF généré par Edge Function, page publique `/certificat/[code]` |
| Notifications | Badges, niveaux, séries, certificats, annonces des administrateurs, temps réel |
| Mentor IA | Assistant Gemini côté serveur, quota de 40 messages par jour et par utilisateur |
| Administration | Vue d'ensemble en direct, utilisateurs (rôles, XP, bannissement), éditeur de cours et de quiz, import IA, labs, badges, défis, certificats, annonces, messages de contact, journal d'audit |

Aucune donnée n'est simulée : chaque écran lit Supabase et affiche un état de chargement, un état vide ou une erreur propre.

## Démarrage rapide

Prérequis : Node.js 20 ou plus, un projet Supabase (voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

```bash
npm install
cp .env.example .env.local      # puis renseigner l'URL et la clé anon Supabase
npm run dev                     # http://localhost:3000
```

Sans variables Supabase, l'application démarre mais toutes les pages privées redirigent vers `/login`, qui affiche un message de configuration.

Pour créer la base : appliquer les migrations (`npx supabase db push`), charger `supabase/seed/01_starter_content.sql`, puis promouvoir le premier compte :

```sql
update public.profiles set role = 'superadmin' where email = 'vous@exemple.com';
```

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (Turbopack) |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | ESLint (config Next) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Tests de la base (PGlite, sans Docker) et des modules purs |
| `npm run db:types` | Régénère `types/database.types.ts` à partir des migrations |
| `npm run db:seed` | Régénère `supabase/seed/01_starter_content.sql` à partir de `supabase/seed/content/*.ts` |

## Structure

```
app/                  Routes Next.js (publiques, auth, apprenant, /admin, /api)
components/           UI : layout (AppShell), admin, courses, quiz, challenges, mentor,
                      onboarding, landing, public, realtime, ui
context/UserContext   Session, profil, actions et toasts de récompense
hooks/                useAsync, useRealtime / useAdminLive
lib/                  supabase/{client,server,public,config}, errors, levels, roles, navigation…
services/             Accès aux données : auth, profile, courses, lessons, quiz, labs,
                      gamification, notification, platform, mentor, admin
types/                database.types.ts (généré), api.ts (formes des RPC), realtime.ts
middleware.ts         Protection des routes (session, rôle staff pour /admin)
supabase/
  migrations/         Schéma complet, RLS, RPC, Storage (source de vérité)
  functions/          Edge Functions : admin-actions, generate-certificate
  seed/               Contenu pédagogique de départ (aucun utilisateur, aucune statistique)
tests/                database.test.cjs (sécurité, anti-triche), learning.test.cjs
```

## Rôles

| Rôle | Droits |
|---|---|
| `user` | Cours publiés, progression, quiz, labs, profil, certificats personnels |
| `admin` | En plus : console `/admin`, contenus en brouillon, utilisateurs, statistiques, annonces |
| `superadmin` | En plus : gestion des rôles, actions sur les comptes du staff |

Les rôles sont vérifiés par PostgreSQL (`is_admin()`, `is_superadmin()` dans les politiques RLS et les RPC) et par le middleware ; l'interface ne fait que refléter ces droits.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) : couches, flux d'authentification, RPC contre Edge Functions, temps réel
- [Base de données](docs/DATABASE.md) : tables, relations, RPC, XP, niveaux, séries, certificats, Storage
- [Sécurité](docs/SECURITY.md) : RLS, anti-triche, limites de débit, secrets
- [Déploiement](docs/DEPLOYMENT.md) : Supabase (migrations, fonctions, Auth), Vercel, premier administrateur

Les polices de `public/fonts/` sont sous licence SIL OFL.
