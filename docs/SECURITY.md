# Sécurité

Principe directeur : le navigateur n'est jamais cru sur parole. Toute règle qui protège une donnée, une récompense ou un rôle est appliquée par PostgreSQL ou par une fonction serveur. Les contrôles de l'interface (masquer un bouton, rediriger une route) ne servent qu'au confort.

## Modèle de menace

| Risque | Parade |
|---|---|
| Lire les données privées d'un autre apprenant | RLS sur toutes les tables, politiques basées sur `auth.uid()` |
| S'attribuer de l'XP, un niveau, un badge ou un certificat | Colonnes non modifiables par le client, écriture uniquement par fonctions `SECURITY DEFINER` |
| Terminer une leçon sans la lire | Ouverture obligatoire et 15 secondes minimum côté serveur |
| Récupérer les bonnes réponses d'un quiz | `quiz_answers.is_correct` et `quiz_questions.explanation` inaccessibles ; correction par `submit_quiz` |
| Farmer l'XP d'un quiz | Seule l'amélioration de la meilleure note rapporte, 30 soumissions par 10 minutes |
| Deviner le drapeau d'un lab | Drapeau dans le schéma `private`, 10 erreurs par 10 minutes |
| Devenir administrateur | `role` hors des droits de mise à jour, `admin_set_role` réservé au superadmin |
| Lire un brouillon | Politiques `status = 'published'` pour tous sauf le staff |
| Fuite de la clé `service_role` | Présente uniquement dans les secrets des Edge Functions, jamais dans Next.js |
| Abus d'API (spam, coût IA) | Limites de débit en base (`private.enforce_rate_limit`) |

## Row Level Security

- RLS est activé sur **toutes** les tables du schéma `public`. Un test (`every table is protected by RLS…`) échoue si une table en est dépourvue.
- Les données personnelles (`lesson_progress`, `quiz_attempts`, `xp_transactions`, `user_badges`, `user_challenges`, `daily_activity`, `certificates`, `notifications`, `enrollments`, `user_settings`) ne sont lisibles que par leur propriétaire et par le staff.
- Un profil n'est lisible que par son propriétaire et par le staff. `profiles.email` est une copie de `auth.users.email` tenue à jour par le trigger `on_auth_user_email_changed` ; le client ne peut pas la modifier (le changement d'adresse passe par Supabase Auth et sa confirmation).
- Le catalogue public (`courses`, `course_modules`, `lessons`, `quizzes`, `quiz_questions`, `labs`) ne montre que les cours publiés. Un apprenant inscrit garde l'accès à un cours archivé.
- Les politiques appellent `(select auth.uid())` et `(select public.is_admin())` pour que PostgreSQL évalue la fonction une seule fois par requête.

## Droits par colonne

Les tables exposées ont des `grant` explicites colonne par colonne :

- `anon` voit le plan des cours publiés, mais pas `lessons.content` : il faut être connecté pour lire une leçon.
- `authenticated` ne peut lire ni `quiz_answers.is_correct` ni `quiz_questions.explanation`. `submit_quiz` les renvoie après correction.
- Sur `profiles`, le client ne peut modifier que `username`, `display_name`, `avatar_path`, `bio`, `goal`, `skill_level`, `daily_minutes` et `known_areas`. `xp`, `level`, `role` et les séries sont hors de portée.
- Les tables de progression et de gamification n'ont aucun droit d'écriture pour `authenticated`.

## Schéma `private` et fonctions

- Le schéma `private` (drapeaux de labs, limites de débit, quota du mentor, séquence des certificats, fonctions internes) est révoqué pour `public`, `anon` et `authenticated`. PostgREST ne l'expose pas.
- Toutes les fonctions `SECURITY DEFINER` fixent `set search_path = ''` et qualifient chaque objet (`public.profiles`, `private.award_xp`), ce qui empêche le détournement par un objet homonyme.
- Les droits `execute` sont retirés de `public` puis accordés fonction par fonction : `anon` ne peut appeler que `verify_certificate`, `submit_contact_message` et les tests de rôle `is_admin` / `is_superadmin` (qui renvoient `false` pour un visiteur).
- Les RPC d'administration commencent par `private.require_admin()` ou `private.require_superadmin()` ; les RPC apprenant par `private.require_user()`.

## Moteur pédagogique

- **Réponses des étapes de lab** : elles vivent dans `private.lab_task_keys`, jamais lisibles par le client. `submit_lab_task` vérifie le budget d'erreurs (10 en 10 minutes par étape) avant de comparer, pour qu'une requête bloquée ne révèle rien.
- **Compétences, grades et badges** : `user_skills`, `user_ranks` et `user_badges` n'ont aucun droit d'écriture pour `authenticated`. Ils sont recalculés par `private.sync_skills`, `private.evaluate_rank` et `private.evaluate_badges` dans la transaction qui valide l'activité.
- **Rendus Packet Tracer** : un lien n'est accepté que s'il est en `https://` (508 caractères au plus), et il n'est affiché dans l'administration que sous cette forme, avec `rel="noopener noreferrer"`. `admin_review_submission` est réservé au staff, journalisé et notifie l'apprenant. Seul un administrateur peut valider tant qu'un rôle Formateur n'existe pas.
- **Contenu éditorial** : domaines, compétences, ressources, grades et répliques sont modifiables par le staff via RLS et droits par colonne, avec des contraintes de format (identifiants, longueurs, URL audio en `https://` ou chemin `/audio/…`).
- **Mascotte** : une réplique audio exige un crédit de voix. L'application n'embarque aucune voix synthétique ; sans enregistrement actif, seul le sous-titre s'affiche.

## Anti-triche

Chaque récompense suit le même chemin, dans une seule transaction :

```text
RPC (complete_lesson, submit_quiz, submit_lab)
  -> identité (auth.uid)
  -> accès au cours (course_mode : publié, inscrit ou staff en aperçu)
  -> règles de l'activité (temps minimal, correction, budget)
  -> private.award_xp -> xp_transactions -> trigger apply_xp_ledger -> profiles.xp / level
  -> série, objectif du jour, défis, badges, fin de parcours, certificat
```

Garanties :

- **XP par registre** : aucune fonction n'écrit `profiles.xp` ; le trigger du registre est la seule source. L'index unique `xp_transactions_once` empêche une double attribution, même en cas de requêtes concurrentes.
- **Leçons** : `complete_lesson` refuse une leçon non ouverte (`start_lesson`) ou ouverte depuis moins de 15 secondes, et ne paie qu'une fois.
- **Quiz** : les réponses sont corrigées en SQL ; la charge utile est limitée à 64 Ko ; une nouvelle tentative ne rapporte que la différence avec la meilleure note.
- **Labs** : comparaison au drapeau privé ; au-delà de 10 erreurs en 10 minutes, la RPC renvoie `PT429`.
- **Aperçu du staff** : un administrateur qui parcourt un brouillon est en mode `preview`, sans progression ni XP.
- **Certificats** : émis uniquement par `private.issue_certificate` après vérification de toutes les leçons et de tous les quiz. Le numéro vient d'une séquence privée et le code de vérification est aléatoire (16 caractères).

## Limites de débit

| Action | Limite | Emplacement |
|---|---|---|
| Soumission de quiz | 30 par 10 minutes | `submit_quiz` |
| Erreurs sur un lab | 10 par 10 minutes | `submit_lab` |
| Messages au mentor IA | 40 par jour | `consume_mentor_quota`, appelé par `/api/mentor` |
| Formulaire de contact | 5 par heure | `submit_contact_message` |
| Annonces d'administration | 10 par heure | `admin_broadcast_notification` |

Supabase Auth applique en plus ses propres limites (connexion, inscription, e-mails). Le message d'erreur renvoyé est `PT429`, traduit en `rate_limited` par `lib/errors.ts`.

## Rôles et administration

| Rôle | Peut |
|---|---|
| `user` | Suivre les cours publiés, progresser, gérer son profil |
| `admin` | Gérer le contenu, les défis, les badges, les certificats, voir les utilisateurs, ajuster l'XP (via le registre), envoyer des annonces |
| `superadmin` | Tout ce que fait `admin`, plus changer les rôles et agir sur les comptes du staff |

- `/admin` est protégé trois fois : `middleware.ts` (redirection des visiteurs et des apprenants), `components/admin/AdminShell.tsx` (écran d'accès refusé) et, surtout, la base (RLS et `private.require_admin()`). Les deux premiers niveaux ne sont que du confort.
- `admin_set_role` est réservé au superadmin, refuse de modifier son propre rôle et garde toujours au moins un superadmin.
- L'Edge Function `admin-actions` vérifie `is_admin`, refuse toute action sur son propre compte, exige un superadmin pour toucher un compte du staff et refuse de bannir ou supprimer un superadmin tant qu'il n'a pas été rétrogradé.
- Journal d'audit : les triggers `audit_admin_change` enregistrent dans `admin_logs` toute création, modification ou suppression sur `courses`, `course_modules`, `lessons`, `quizzes`, `labs`, `badges` et `challenges`. Les RPC et l'Edge Function d'administration journalisent aussi leurs actions (rôles, XP, bannissements, certificats, annonces).

## Storage

- Buckets séparés, chacun avec une taille maximale et une liste blanche de types MIME appliquées par Supabase.
- `avatars` (2 Mo, PNG/JPEG/WebP) : lecture publique, écriture limitée au dossier `<uid>/` du propriétaire ; `profiles.avatar_path` doit commencer par l'identifiant du profil.
- `course-images` (5 Mo) et `lesson-assets` (20 Mo, images, PDF, MP4) : lecture publique, écriture réservée au staff.
- `certificates` (5 Mo, PDF) : bucket privé. Seule la clé `service_role` y écrit (Edge Function `generate-certificate`) ; le propriétaire et le staff y lisent via des URL signées de 120 secondes.

## Edge Functions

- La clé `service_role` n'existe que dans l'environnement des Edge Functions (injectée par Supabase). Le frontend Next.js ne la connaît pas et n'en a pas besoin.
- Chaque fonction exige un jeton `Bearer` valide (`getUser`), limite la taille du corps, valide les identifiants (UUID) et renvoie des erreurs HTTP propres.
- `verify_jwt = false` dans `config.toml` : la vérification de la passerelle ne comprend que les anciens jetons HS256, alors que les projets récents signent les sessions en ES256. L'authentification n'est pas affaiblie pour autant : `requireCaller()` (`functions/_shared/http.ts`) appelle `auth.getUser()`, qui valide le jeton auprès de Supabase Auth avant toute requête privilégiée, et rejette tout appel sans session valide (401).
- `generate-certificate` lit d'abord le certificat avec le client de l'utilisateur : si le RLS ne le laisse pas le voir, la génération est refusée. Un certificat révoqué ne produit pas de PDF.
- CORS : en production, seules les origines listées dans le secret `ALLOWED_ORIGINS` sont renvoyées. Si ce secret est vide, toutes les origines sont acceptées (le jeton reste obligatoire) : renseigne-le toujours hors du développement local.

## Authentification et session

- Supabase Auth gère les identifiants ; aucun mot de passe n'est stocké dans les tables applicatives.
- Mot de passe : 8 caractères minimum avec lettres et chiffres (`supabase/config.toml`, à reproduire dans le tableau de bord en production).
- Confirmation d'e-mail activée, rotation des jetons de rafraîchissement activée.
- Flux PKCE : `/auth/callback` échange le code côté serveur ; les sessions sont stockées dans des cookies gérés par `@supabase/ssr`.
- OAuth Google et GitHub : les identifiants client vivent uniquement dans Supabase (*Authentication > Providers*). Les secrets client ne sont ni dans le dépôt ni dans Vercel. Le frontend ne connaît que la liste publique des fournisseurs (`NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS`). Un compte OAuth reçoit le rôle `user` comme tout autre inscrit.
- Les URL de retour acceptées sont limitées par la *Site URL* et les *Redirect URLs* de Supabase : un `redirectTo` vers un domaine non listé est ignoré.
- Le middleware vérifie la session avec `getClaims()` (signature du JWT) et non avec les données non vérifiées du cookie.
- Les liens de retour (`?next=`) sont filtrés pour rester dans l'application et ne jamais pointer vers `/admin` pour un apprenant.

## Application web

- En-têtes : `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (caméra, micro, géolocalisation désactivés).
- Les erreurs PostgreSQL ne sont jamais affichées : `lib/errors.ts` les traduit en messages français à partir du code SQLSTATE et du marqueur `hint = 'cyberpingo'`.
- Les contenus de leçon sont rendus bloc par bloc sans HTML brut ; les médias doivent être en `https://`. Les réponses du mentor IA passent par un rendu Markdown minimal qui échappe tout le HTML avant mise en forme.
- Les notifications n'acceptent que des liens relatifs, ce qui empêche une redirection vers un site externe.
- Les routes `/api/mentor` et `/api/publish/analyze` vérifient la session (et le rôle staff pour la seconde), limitent la taille des entrées et gardent `GEMINI_API_KEY` côté serveur.

## Secrets

| Secret | Où | Jamais |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel, `.env.local` | Publiques par nature, protégées par le RLS |
| Secrets client OAuth Google et GitHub | Supabase, *Authentication > Providers* | Vercel, `.env.local`, dépôt Git |
| `GEMINI_API_KEY` | Vercel (serveur) | Préfixe `NEXT_PUBLIC_` |
| `SUPABASE_SERVICE_ROLE_KEY` | Injectée automatiquement dans les Edge Functions | Vercel, `.env.local`, dépôt Git |
| `SITE_URL`, `ALLOWED_ORIGINS` | `supabase secrets set` | Dépôt Git |

`.gitignore` exclut `.env*` (sauf `.env.example`), `supabase/functions/.env`, `supabase/.temp` et `.vercel/`. Chaque environnement (développement, préproduction, production) utilise un projet Supabase distinct, donc des clés distinctes.

## Signaler une faille

Écris à l'équipe par le formulaire de contact (sujet « Signaler un problème », message commençant par « Sécurité ») en restant bref, sans publier les détails ailleurs. Ne teste jamais une faille sur les comptes d'autres personnes.
