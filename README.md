# CyberPingo

Plateforme francophone d'apprentissage de la cybersécurité : parcours, leçons,
quiz, challenges, mentor IA et console d'administration en temps réel.

- **Frontend** : Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend** : Supabase (Auth, Postgres + RLS, fonctions RPC, Realtime)
- **IA** : Gemini, appelé uniquement côté serveur (mentor et analyse de PDF)

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis renseigne les valeurs
npm run dev
```

L'application démarre sur http://localhost:3000. Sans variables Supabase, les
pages publiques restent consultables et les écrans de connexion affichent un
message de configuration.

## Mettre en place Supabase

1. Crée un projet sur https://supabase.com (région Europe conseillée).
2. Dans **SQL Editor**, exécute dans l'ordre :
   - `supabase/migrations/20260928190000_cyberpingo_backend.sql`
   - `supabase/migrations/20260928190100_catalog_content.sql`

   Avec la CLI : `supabase link --project-ref <ref>` puis `supabase db push`.
3. **Project Settings > API** : copie l'URL et la clé `anon` dans `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. **Authentication > URL Configuration** :
   - Site URL : l'URL de production (par exemple `https://cyberpingo.vercel.app`)
   - Redirect URLs : `http://localhost:3000/**`, `http://127.0.0.1:3000/**`
     et `https://<ton-domaine>/**`
5. Crée ton compte depuis `/register`, puis promeus-le administrateur :

   ```sql
   update public.profiles set role = 'admin' where email = 'toi@exemple.fr';
   ```

   Les administrateurs suivants peuvent être promus depuis l'onglet
   **Apprenants** de la console.
6. Recommandé en production : configure un SMTP personnalisé
   (**Authentication > Emails > SMTP Settings**). Le service d'e-mail intégré
   de Supabase est limité à quelques envois par heure.
7. Optionnel : active GitHub ou Google dans **Authentication > Providers** et
   liste-les dans `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS=github,google`.

Les liens reçus par e-mail (confirmation, réinitialisation) utilisent PKCE : ils
doivent être ouverts dans le navigateur où la demande a été faite. Sinon,
l'écran de connexion propose d'en demander un nouveau.

## Architecture du backend

Tout le backend est décrit dans `supabase/migrations/`. Aucune clé
`service_role` n'est utilisée par l'application.

| Élément | Rôle |
|---|---|
| `profiles` | Profil créé automatiquement à l'inscription (trigger sur `auth.users`), rôle `learner` ou `admin`, XP, niveau, série, préférences d'onboarding |
| `lesson_completions`, `quiz_results`, `challenge_completions`, `user_badges` | Progression, en lecture seule pour l'apprenant |
| `published_courses`, `published_challenges` | Contenus publiés par l'équipe depuis la console |
| `activity_events`, `learner_sessions` | Journal d'activité et présence, diffusés en temps réel aux administrateurs |
| `contact_messages` | Messages du formulaire de contact, triés par l'équipe |
| schéma `private` | Barème des quiz, réponses des challenges, limites de débit ; jamais exposé à l'API |

Les XP ne sont jamais calculés par le navigateur. Les fonctions RPC
`complete_lesson`, `submit_quiz` et `submit_challenge` corrigent côté serveur
à partir du barème privé, créditent la différence en cas d'amélioration, mettent
à jour la série et les badges, puis journalisent l'événement. Un quiz est validé
à partir de 70 %.

Autres fonctions : `complete_onboarding`, `record_login`, `heartbeat`
(présence toutes les 60 s), `end_session`, `consume_mentor_quota`
(40 messages par jour), `submit_contact_message` (ouvert aux visiteurs, limité
par adresse IP hachée), `reset_my_progress`, `delete_my_account`, et pour les
administrateurs `admin_overview`, `admin_learners`, `admin_set_role`.

Les politiques RLS limitent chaque apprenant à ses propres données. Les
administrateurs lisent l'ensemble, publient les contenus et traitent les
messages. La réponse attendue d'un challenge publié est retirée de la table
publique par un trigger et conservée dans le schéma privé.

Le contenu pédagogique affiché (textes des leçons, questions) reste dans
`data/`. Après toute modification des questions, réponses ou récompenses,
régénère le barème :

```bash
node scripts/generate-content-seed.cjs
```

puis exécute à nouveau `20260928190100_catalog_content.sql`.

## Espaces de l'application

- **Public** : accueil, `/parcours`, `/ressources`, `/fonctionnalites`,
  `/a-propos`, `/communaute`, `/faq`, `/contact`, `/confidentialite`,
  `/conditions`. Le formulaire de contact enregistre le message dans Supabase.
- **Comptes** : `/register`, `/login`, `/mot-de-passe-oublie`,
  `/reinitialiser-mot-de-passe`, `/auth/callback`, puis `/onboarding`.
- **Apprenant** : `/courses`, `/lessons/[id]`, `/quiz/[id]`, `/challenges`,
  `/mentor`, `/progression`, `/profile`, `/parametres` (profil, objectif,
  export JSON, remise à zéro et suppression du compte).
- **Administration** (`/dashboard`, rôle `admin`) : vue d'ensemble, apprenants
  en direct, activité en temps réel, gestion des rôles, boîte de réception des
  messages et publication de cours ou de challenges à partir d'un PDF analysé
  par Gemini.

Le middleware protège les routes : les pages apprenant exigent une session,
`/dashboard` exige le rôle administrateur, et les pages de connexion renvoient
les utilisateurs déjà connectés vers leur espace.

## Déployer sur Vercel

1. Importe le dépôt dans Vercel (framework Next.js détecté automatiquement).
2. Ajoute les variables d'environnement de `.env.example` pour Production et
   Preview.
3. Déploie, puis ajoute l'URL obtenue dans Supabase (Site URL et Redirect URLs).

Avec la CLI :

```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add GEMINI_API_KEY production
npx vercel --prod
```

## Structure

- `app/` : pages, routes API (`/api/mentor`, `/api/publish/analyze`) et callback d'authentification
- `components/` : interface (landing, apprentissage, publication, administration, temps réel)
- `context/UserContext.tsx` : session Supabase, profil et actions de progression
- `hooks/` : publication (`usePublishStore`) et supervision (`useAdminLive`)
- `lib/supabase/` : clients navigateur et serveur, configuration
- `lib/` : règles de progression, mapping des profils, publication, Gemini
- `data/` : contenu pédagogique
- `supabase/migrations/` : schéma, fonctions, RLS et barème
- `tests/` : tests unitaires et tests SQL (PGlite)

## Vérifications

```bash
node --test tests/learning.test.cjs tests/database.test.cjs
npx tsc --noEmit
npm run lint
npm run build
```

`tests/database.test.cjs` exécute les migrations dans PGlite (Postgres en
WebAssembly) avec une doublure du schéma `auth` de Supabase, puis vérifie les
RLS, la correction côté serveur et les fonctions d'administration.

## Design

- Logo : `public/images/cyberpingo-transparent.png` (fond retiré par
  `scripts/remove-logo-background.ps1`, l'original est conservé). L'animation de
  démarrage dure moins de deux secondes, s'affiche une fois par onglet et
  respecte `prefers-reduced-motion`.
- Polices Inter, Space Grotesk et JetBrains Mono servies localement depuis
  `public/fonts/` (licences SIL OFL).
- Les animations peuvent être désactivées depuis la navigation publique.
- Les badges de la plateforme ne sont pas des certifications.
