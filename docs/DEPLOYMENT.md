# Déploiement

Ce guide couvre l'installation locale, la mise en place d'un projet Supabase (migrations, contenu, Edge Functions, Auth), le déploiement du frontend sur Vercel et la création du premier administrateur.

## Environnements

| Environnement | Supabase | Frontend | Secrets |
|---|---|---|---|
| Développement | Stack locale (`npx supabase start`, Docker) ou projet cloud dédié | `npm run dev` | `.env.local` |
| Staging | Projet Supabase séparé | Déploiements *Preview* Vercel | Variables Vercel de l'environnement *Preview* |
| Production | Projet Supabase séparé | Déploiement *Production* Vercel | Variables Vercel de l'environnement *Production* |

Chaque environnement a ses propres clés. Ne réutilisez jamais la clé `service_role` ou le mot de passe de base d'un environnement dans un autre, et ne pointez jamais une préversion vers la base de production.

## Prérequis

- Node.js 20 ou plus et npm.
- La CLI Supabase, utilisée via `npx supabase` (aucune installation globale nécessaire).
- Docker, uniquement pour la stack Supabase locale.
- Un compte Vercel relié au dépôt GitHub.

## 1. Développement local

```bash
npm install
cp .env.example .env.local
```

### Option A : stack Supabase locale

```bash
npx supabase start          # applique supabase/migrations puis supabase/seed/*.sql
npx supabase status         # affiche API URL et anon key
```

Renseignez `NEXT_PUBLIC_SUPABASE_URL` (en général `http://127.0.0.1:54321`) et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env.local`, puis lancez `npm run dev`. Les e-mails de confirmation arrivent dans Inbucket (`http://127.0.0.1:54324`).

`npx supabase db reset` reconstruit la base locale à partir des migrations et du seed.

### Option B : projet cloud de développement

Suivez les étapes 2 à 5 ci-dessous sur un projet dédié au développement, puis copiez son URL et sa clé dans `.env.local`.

### Tests sans Docker

`npm test` rejoue toutes les migrations dans PGlite (PostgreSQL en WebAssembly) et vérifie les politiques RLS, l'anti-triche et le moteur de progression. Aucune base externe n'est nécessaire.

## 2. Créer le projet Supabase

1. Sur [supabase.com/dashboard](https://supabase.com/dashboard), créez un projet (région proche des utilisateurs, par exemple `eu-west-3` Paris ou `eu-central-1` Francfort).
2. Conservez le mot de passe de la base dans un gestionnaire de mots de passe.
3. Relevez dans *Project Settings > API* :
   - l'URL du projet ;
   - la clé `anon` (ou la clé `publishable`) pour le frontend ;
   - la clé `service_role` (ou la clé `secret`) : **elle ne doit jamais quitter Supabase**. Les Edge Functions la reçoivent automatiquement ; vous n'avez pas à la copier.

## 3. Appliquer les migrations

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

`db push` applique, dans l'ordre, les fichiers de `supabase/migrations/` qui ne sont pas encore enregistrés sur le projet. Les migrations sont la seule source de vérité du schéma : ne créez pas de table à la main dans le Studio. Toute évolution passe par un nouveau fichier :

```bash
npx supabase migration new nom_de_la_modification
```

Pour vérifier l'état : `npx supabase migration list`.

> Le fichier `supabase/config.toml` déclare PostgreSQL 15 pour la stack locale. Si votre projet cloud utilise une version plus récente, `link` vous le signale ; alignez `major_version` pour que le local reflète la production.

## 4. Charger le contenu pédagogique

`supabase/seed/01_starter_content.sql` contient 6 cours, 17 leçons, 12 quiz et 6 labs, publiés. Il ne crée **aucun** compte, aucune progression, aucune statistique. Il est idempotent (`on conflict do nothing`) et peut être rejoué sans risque.

Deux façons de le charger sur un projet cloud :

- ouvrir *SQL Editor* dans le Studio, coller le fichier et l'exécuter ;
- ou `npx supabase db push --include-seed`, qui exécute aussi les fichiers déclarés dans `[db.seed]` de `config.toml`.

Le fichier est généré : modifiez `supabase/seed/content/*.ts`, puis `npm run db:seed`.

## 5. Déployer les Edge Functions

Deux fonctions nécessitent la clé `service_role` et vivent donc côté serveur :

| Fonction | Rôle | Appelée par |
|---|---|---|
| `admin-actions` | Bannir, débannir, supprimer un compte, envoyer un lien de réinitialisation, lire l'état Auth | `services/admin.service.ts` |
| `generate-certificate` | Produire le PDF d'un certificat et le déposer dans le bucket privé `certificates` | `services/gamification.service.ts` |

```bash
npx supabase functions deploy admin-actions generate-certificate
```

### Secrets des fonctions

```bash
npx supabase secrets set SITE_URL=https://cyberpingo.example ALLOWED_ORIGINS=https://cyberpingo.example
```

| Variable | Usage | Si absente |
|---|---|---|
| `SITE_URL` | Lien de retour des e-mails de réinitialisation (`admin-actions`) et URL de vérification imprimée sur le PDF (`generate-certificate`) | `admin-actions` utilise l'en-tête `Origin` de la requête, sinon répond 500 ; `generate-certificate` utilise `https://cyberpingo.vercel.app` |
| `ALLOWED_ORIGINS` | Origines autorisées par CORS, séparées par des virgules | Toutes les origines sont acceptées (un JWT valide reste exigé) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` et `SUPABASE_DB_URL` sont injectées automatiquement par Supabase. Ne les définissez pas vous-même et ne les copiez jamais dans Vercel.

### Vérification du JWT

`config.toml` active `verify_jwt = true` pour les deux fonctions, et chaque fonction revérifie elle-même l'appelant (`auth.getUser()`) puis ses droits en base. Si le projet utilise les nouvelles clés de signature JWT asymétriques et que les appels répondent 401 alors que l'utilisateur est connecté, redéployez avec :

```bash
npx supabase functions deploy admin-actions generate-certificate --no-verify-jwt
```

La sécurité n'en dépend pas : la vérification applicative reste active.

> Si vous désactivez les anciennes clés `anon` / `service_role` au profit des clés `publishable` / `secret`, vérifiez après coup que les fonctions reçoivent bien les nouvelles valeurs (un appel admin réussi suffit).

## 6. Configurer l'authentification

Dans *Authentication* du Studio.

### URL Configuration

- **Site URL** : l'URL de production, par exemple `https://cyberpingo.example`.
- **Redirect URLs** : chaque origine qui utilise la route de retour :
  - `https://cyberpingo.example/auth/callback**`
  - `https://*-<compte-vercel>.vercel.app/auth/callback**` pour les préversions (uniquement sur le projet de staging)
  - `http://localhost:3000/auth/callback**` pour le développement

Tous les liens (confirmation d'inscription, récupération de mot de passe, changement d'e-mail, OAuth) reviennent sur `/auth/callback`, qui accepte un `code` PKCE ou un couple `token_hash` + `type`. Les modèles d'e-mail par défaut fonctionnent tels quels.

### Politique des comptes

Reproduisez les réglages de `config.toml` :

- confirmation d'e-mail obligatoire ;
- double confirmation lors d'un changement d'e-mail ;
- réauthentification pour changer de mot de passe ;
- mot de passe de 8 caractères minimum, avec lettres et chiffres ;
- rotation des *refresh tokens* activée, JWT d'une heure.

### SMTP

Le service d'e-mail intégré à Supabase est réservé aux essais : débit très faible et envoi limité aux membres de l'équipe du projet. Configurez un SMTP (Resend, Brevo, Postmark, Amazon SES…) dans *Authentication > Emails > SMTP Settings* avant d'ouvrir les inscriptions.

### OAuth (optionnel)

Activez GitHub ou Google dans *Authentication > Providers* (URL de rappel fournie par Supabase à déclarer chez le fournisseur), puis listez-les côté frontend :

```
NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS=github,google
```

Sans cette variable, les boutons OAuth ne s'affichent pas.

## 7. Déployer le frontend sur Vercel

1. *Add New > Project*, importez le dépôt GitHub. Vercel détecte Next.js ; gardez les commandes par défaut (`npm install`, `npm run build`).
2. Dans *Settings > Environment Variables*, définissez pour *Production* (et, avec les valeurs de staging, pour *Preview*) :

   | Variable | Valeur |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé `anon`, ou à la place `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
   | `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS` | Facultatif, par exemple `github,google` |
   | `GEMINI_API_KEY` | Facultatif, active le mentor IA et l'analyse de PDF ; sans elle ces routes répondent 503 avec un message clair |
   | `GEMINI_MODEL` | Facultatif, `gemini-2.5-flash` par défaut |

   Les variables `NEXT_PUBLIC_*` sont intégrées au bundle au moment du build : après une modification, redéployez.
3. Lancez le déploiement.
4. Reportez le domaine obtenu (ou votre domaine personnalisé) dans la *Site URL* et les *Redirect URLs* de Supabase, ainsi que dans les secrets `SITE_URL` et `ALLOWED_ORIGINS` des fonctions.

Conseil : choisissez pour les fonctions Vercel (*Settings > Functions > Region*) une région proche de celle du projet Supabase pour réduire la latence du middleware et des pages serveur.

Les en-têtes de sécurité (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`) sont définis dans `next.config.js` ; aucun `vercel.json` n'est nécessaire.

## 8. Créer le premier administrateur

Les rôles ne se modifient que par la base : aucun écran ne permet de s'auto-promouvoir.

1. Inscrivez-vous sur le site déployé et confirmez l'e-mail.
2. Dans *SQL Editor* :

   ```sql
   update public.profiles set role = 'superadmin' where email = 'vous@exemple.com';
   ```

3. Rechargez la page : le middleware relit le rôle en base à chaque navigation, la console `/admin` est accessible sans nouvelle connexion.

Les rôles suivants se donnent depuis `/admin/utilisateurs` (réservé au superadmin). La fonction `admin_set_role` refuse de modifier son propre rôle et conserve toujours au moins un superadmin.

## 9. Types TypeScript

`types/database.types.ts` est généré à partir du schéma. Après chaque nouvelle migration :

```bash
npm run db:types
```

Ce script rejoue les migrations dans PGlite et fonctionne hors ligne. Alternative à partir du projet lié :

```bash
npx supabase gen types typescript --linked --schema public > types/database.types.ts
```

Puis `npm run typecheck` pour repérer le code à adapter.

## Liste de contrôle avant la production

- [ ] Projet Supabase de production distinct du staging, mot de passe de base stocké hors du dépôt.
- [ ] `npx supabase migration list` : aucune migration en attente.
- [ ] Contenu de départ chargé, cours visibles sur `/parcours` en navigation privée.
- [ ] Edge Functions déployées, `SITE_URL` et `ALLOWED_ORIGINS` renseignés.
- [ ] Site URL et Redirect URLs à jour, SMTP personnalisé configuré, confirmation d'e-mail active.
- [ ] Variables Vercel définies pour *Production* ; aucune clé `service_role` ou `secret` dans Vercel.
- [ ] Premier superadmin créé ; parcours testé : inscription, confirmation, leçon, quiz, XP, certificat, page `/certificat/[code]`.
- [ ] *Advisors* du Studio (Security et Performance) consultés sans alerte bloquante.
- [ ] Stratégie de sauvegarde validée (sauvegardes quotidiennes à partir de l'offre Pro, PITR en option).

## Dépannage

| Symptôme | Cause probable | Correction |
|---|---|---|
| `/login` affiche un message de configuration | `NEXT_PUBLIC_SUPABASE_URL` ou la clé est absente du build | Définir les variables puis redéployer |
| Un lien d'e-mail mène à `/login?lien=expire` | URL absente des *Redirect URLs*, lien déjà utilisé ou expiré, ou ouvert dans un autre navigateur que celui de l'inscription (PKCE) | Ajouter `https://<domaine>/auth/callback**`, redemander un lien |
| Aucun e-mail reçu | SMTP par défaut limité | Configurer un SMTP personnalisé |
| Les cours n'apparaissent pas sur `/parcours` | Seed non chargé ou cours en brouillon | Exécuter `01_starter_content.sql`, ou publier depuis `/admin/cours` |
| Les actions admin ou le PDF répondent 401 | Vérification JWT de la passerelle incompatible avec les clés asymétriques | Redéployer avec `--no-verify-jwt` (voir étape 5) |
| Erreur CORS depuis le navigateur | Domaine absent de `ALLOWED_ORIGINS` | Mettre à jour le secret ; aucun redéploiement nécessaire |
| Le mentor IA répond « pas configuré » | `GEMINI_API_KEY` absente | L'ajouter dans Vercel puis redéployer |
| Le temps réel n'arrive pas | Tables absentes de la publication `supabase_realtime` | Vérifier que la migration `_190400_admin` est appliquée |
