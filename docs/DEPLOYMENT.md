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

La migration `20261002010000_staff_roles_voice.sql` réserve le journal d'audit au superadmin et crée le bucket `mascot-voice`. Les visuels de `public/images/` (dont `features`, `about`, `resources` et `brand`) et les voix de `public/audio/` sont versionnés ; pour les régénérer : `node scripts/generate-images.cjs` et `node scripts/generate-voices.cjs`.

> Le fichier `supabase/config.toml` déclare PostgreSQL 15 pour la stack locale. Si votre projet cloud utilise une version plus récente, `link` vous le signale ; alignez `major_version` pour que le local reflète la production.

## 4. Charger le contenu pédagogique

`supabase/seed/01_starter_content.sql` contient 6 cours, 17 leçons, 12 quiz et 6 labs, publiés. Il ne crée **aucun** compte, aucune progression, aucune statistique. Il est idempotent (`on conflict do nothing`) et peut être rejoué sans risque.

Deux façons de le charger sur un projet cloud :

- ouvrir *SQL Editor* dans le Studio, coller le fichier et l'exécuter ;
- ou `npx supabase db push --include-seed`, qui exécute aussi les fichiers déclarés dans `[db.seed]` de `config.toml`.

Le fichier est généré : modifiez `supabase/seed/content/*.ts`, puis `npm run db:seed`.

Chargez ensuite `supabase/seed/02_reseaux_path.sql` (même méthode, idempotent) : il complète le parcours Réseaux avec 24 leçons, 43 questions, 10 labs, 8 ressources, 6 domaines, 6 compétences et 22 répliques de mascotte. Il suppose que la migration `20261002000000_academy_engine.sql` est déjà appliquée (elle crée les 9 grades). Ce fichier est généré par `node scripts/generate-reseaux-seed.cjs` à partir de `supabase/seed/content/reseaux-path.ts`.

Chargez ensuite `supabase/seed/03_soc_path.sql` (idempotent, après le 02) : il ajoute le parcours Linux et investigation SOC, soit 5 leçons, 5 quiz, 4 labs de journaux (36 étapes vérifiées), 5 compétences, 5 badges et 8 répliques de mascotte, répartis sur les cours `linux` et `analyse-logs`. Il est généré par `node scripts/generate-soc-seed.cjs` à partir de `supabase/seed/content/soc-path.ts`. Le 04 (`supabase/seed/04_mascot_voices.sql`, généré par `node scripts/generate-voices.cjs`) rattache aux 30 répliques de la mascotte les fichiers de `public/audio/mascot/` ; il ne touche jamais une réplique qui a déjà un audio.

Chargez ensuite `supabase/seed/05_reseaux_programme.sql` (idempotent, après le 04) : il livre le programme Réseaux complet, soit 21 leçons, 24 quiz, 5 labs (63 étapes vérifiées, dont deux évaluations), 10 compétences et 6 badges, et réorganise le cours déjà publié sans rien supprimer (voir `docs/CONTENU.md`). Il est généré par `node scripts/generate-reseaux-programme-seed.cjs`.

Chargez enfin `supabase/seed/06_fondamentaux_programme.sql` (idempotent, après le 05) : il livre le programme Fondamentaux complet, soit 21 leçons, 23 quiz, 7 labs (88 étapes vérifiées, dont deux évaluations), 8 compétences et 6 badges, et réorganise le cours déjà publié sans rien supprimer : les trois leçons de départ sont réécrites seulement si leur contenu est encore celui de départ, et le quiz de départ est complété sans toucher aux tentatives des apprenants. Il est généré par `node scripts/generate-fondamentaux-seed.cjs`.

Le 07 (`supabase/seed/07_lab_documents_pdf.sql`, idempotent, après le 06) ne crée rien : il fait pointer les 22 guides, aide-mémoire, cahiers des charges, grilles et modèles de rapport des labs vers leur version PDF (`/labs/tp1-guide.md` devient `/labs/tp1-guide.pdf`). L'adresse n'est changée que tant qu'elle désigne encore le fichier Markdown, donc une adresse modifiée dans la console n'est jamais écrasée, et les journaux, captures et fichiers de données gardent leur format. Il est généré par `node scripts/generate-documents-seed.cjs` d'après `scripts/pdf/documents.cjs` ; les PDF eux-mêmes (`node scripts/build-lab-pdfs.cjs`) et les photos du matériel (`public/images/equipment/`) font partie du code déployé.

**Déployez le code avant de charger ces fichiers** : les labs référencent des fichiers de `public/labs/` (`/labs/tp1-guide.pdf`, `/labs/fond-tp1-courriel.log`...) qui doivent déjà être servis par Vercel. Les sept seeds ne sont pas des migrations : appliquez-les une fois par environnement, dans l'ordre 01, 02, 03, 04, 05, 06, 07. Après chargement en production, 26 labs, 71 leçons, 70 quiz, 29 compétences et 34 badges sont publiés.

### Ce que l'équipe doit fournir

La plateforme a les emplacements et affiche un état vide honnête tant que ces éléments manquent. Rien n'est simulé :

- **Voix** : enregistrements courts d'un comédien ou d'une comédienne, à enregistrer ou importer directement depuis le studio de `/admin/mascotte` (envoi dans le bucket `mascot-voice`, crédit de la voix obligatoire) ou à rattacher par URL `https://` ou chemin `/audio/…`. Les 30 répliques de départ ont une voix de synthèse neuronale créditée comme telle, à remplacer par une voix humaine quand elle existe ;
- **Vidéos pédagogiques** : à ajouter dans les leçons par un bloc vidéo (lien YouTube, Vimeo ou fichier), depuis l'éditeur de cours. Les encadrés « Vidéo à venir : titre » déjà présents sont affichés comme tels, sans faux lecteur ;
- **Fichier Packet Tracer réel** (`.pkt`) : à ajouter comme ressource du lab `packet-tracer-sous-reseaux` ; la plateforme fournit la consigne, le rendu et la relecture, pas l'exécution du logiciel.

Tant qu'un rôle Formateur n'existe pas, la relecture des rendus est réservée aux administrateurs.

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

`config.toml` déclare `verify_jwt = false` pour les deux fonctions. La vérification de la passerelle Supabase ne comprend que les anciens jetons HS256 ; un projet récent signe ses sessions en ES256 et la passerelle répondrait 401 à un utilisateur pourtant connecté. Chaque fonction authentifie donc elle-même l'appelant (`requireCaller()` puis `auth.getUser()`), puis contrôle ses droits en base. Un appel sans jeton valide reçoit toujours 401.

`npx supabase functions deploy` lit ce réglage dans `config.toml` : aucune option supplémentaire n'est nécessaire.

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

> En développement, ouvrez le site sur `http://localhost:3000` et non sur `http://127.0.0.1:3000`. Next.js réécrit les adresses de bouclage en `localhost` dans ses redirections : les cookies de session posés sur `127.0.0.1` seraient perdus et vous reviendriez sur `/login` après une connexion OAuth réussie. Ce cas ne se produit pas en production.

### Politique des comptes

Reproduisez les réglages de `config.toml` :

- confirmation d'e-mail obligatoire ;
- double confirmation lors d'un changement d'e-mail ;
- réauthentification pour changer de mot de passe ;
- mot de passe de 8 caractères minimum, avec lettres et chiffres ;
- rotation des *refresh tokens* activée, JWT d'une heure.

### SMTP

Le service d'e-mail intégré à Supabase est réservé aux essais : débit très faible et envoi limité aux membres de l'équipe du projet. Configurez un SMTP (Resend, Brevo, Postmark, Amazon SES…) dans *Authentication > Emails > SMTP Settings* avant d'ouvrir les inscriptions.

### OAuth Google et GitHub

Les deux fournisseurs utilisent la même URL de rappel, celle de Supabase (pas celle du site) :

```
https://<project-ref>.supabase.co/auth/v1/callback
```

**GitHub**

1. Sur GitHub : *Settings > Developer settings > OAuth Apps > New OAuth App*.
2. *Homepage URL* : l'URL du site. *Authorization callback URL* : l'URL de rappel Supabase ci-dessus.
3. Générez un *client secret*.
4. Dans Supabase, *Authentication > Providers > GitHub* : activez, collez le *Client ID* et le *Client Secret*.

**Google**

1. Dans [Google Cloud Console](https://console.cloud.google.com), créez (ou choisissez) un projet.
2. *Google Auth Platform > Branding* : nom de l'application, e-mail d'assistance, page d'accueil (`https://<domaine>`), règles de confidentialité (`https://<domaine>/confidentialite`), conditions d'utilisation (`https://<domaine>/conditions`) et domaines autorisés (`<domaine>` et `supabase.co`).
3. *Audience* : type *External*. Tant que l'application est en mode *Testing*, seuls les utilisateurs de test listés peuvent se connecter ; cliquez sur *Publish app* pour l'ouvrir à tous. Les portées demandées (`openid`, `email`, `profile`) ne nécessitent pas de validation par Google.
4. *Clients > Create client* : type *Web application*.
   - *Authorized JavaScript origins* : `https://<domaine>` et `http://localhost:3000`.
   - *Authorized redirect URIs* : l'URL de rappel Supabase.
5. Dans Supabase, *Authentication > Providers > Google* : activez, collez l'ID client et le code secret.

**Frontend**

Listez les fournisseurs actifs, dans l'ordre d'affichage des boutons :

```
NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS=google,github
```

Sans cette variable, les boutons OAuth ne s'affichent pas. Un premier passage par OAuth crée le compte et son profil (`handle_new_user`), puis `/auth/callback` envoie l'apprenant sur `/onboarding`. Les secrets client restent dans Supabase : ne les mettez ni dans Vercel ni dans le dépôt.

## 7. Déployer le frontend sur Vercel

1. *Add New > Project*, importez le dépôt GitHub. Vercel détecte Next.js ; gardez les commandes par défaut (`npm install`, `npm run build`).
2. Dans *Settings > Environment Variables*, définissez pour *Production* (et, avec les valeurs de staging, pour *Preview*) :

   | Variable | Valeur |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé `anon`, ou à la place `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
   | `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS` | Facultatif, par exemple `google,github` |
   | `GEMINI_API_KEY` | Facultatif, active le mentor IA et l'analyse de PDF ; sans elle ces routes répondent 503 avec un message clair |
   | `GEMINI_MODEL` | Facultatif, `gemini-2.5-flash` par défaut |

   Les variables `NEXT_PUBLIC_*` sont intégrées au bundle au moment du build : après une modification, redéployez.
3. Lancez le déploiement. Si l'import n'en déclenche aucun, ouvrez *Deployments*, menu « ... » > *Create Deployment*, saisissez la branche `main` puis *Deploy to Production*. Les push suivants sur `main` sont déployés automatiquement.
4. Reportez le domaine obtenu (ou votre domaine personnalisé) dans la *Site URL* et les *Redirect URLs* de Supabase (`https://<domaine>/**`), ainsi que dans les secrets `SITE_URL` et `ALLOWED_ORIGINS` des fonctions.
5. Mettez aussi à jour les fournisseurs OAuth : *Homepage URL* de l'OAuth App GitHub, et chez Google l'origine JavaScript autorisée, la page d'accueil, les liens de confidentialité et de conditions et le domaine autorisé.

Déploiement actuel : `https://cyberpingo.vercel.app`, relié au projet Supabase `gajmauudbffiqrhtpqjj`. Pour un domaine personnalisé, répétez les étapes 4 et 5 avec le nouveau domaine.

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
| Les actions admin ou le PDF répondent 401 | Session expirée, ou fonction déployée avec `verify_jwt = true` alors que le projet signe en ES256 | Se reconnecter ; vérifier `verify_jwt = false` dans `config.toml` puis redéployer (voir étape 5) |
| Retour sur `/login` juste après une connexion Google ou GitHub, en local | Site ouvert sur `127.0.0.1` | Utiliser `http://localhost:3000` |
| Google affiche « Accès bloqué » ou « app non validée » | Application Google en mode *Testing* et compte absent des utilisateurs de test | Ajouter le compte aux utilisateurs de test, ou publier l'application (*Audience > Publish app*) |
| `redirect_uri_mismatch` chez Google ou GitHub | URL de rappel déclarée chez le fournisseur différente de `https://<project-ref>.supabase.co/auth/v1/callback` | Corriger l'URL chez le fournisseur |
| Variables de `.env.local` ignorées sous Windows | Fichier enregistré en UTF-8 avec BOM | Réenregistrer en UTF-8 sans BOM, puis relancer `npm run dev` |
| Erreur CORS depuis le navigateur | Domaine absent de `ALLOWED_ORIGINS` | Mettre à jour le secret ; aucun redéploiement nécessaire |
| Le mentor IA répond « pas configuré » | `GEMINI_API_KEY` absente | L'ajouter dans Vercel puis redéployer |
| Le temps réel n'arrive pas | Tables absentes de la publication `supabase_realtime` | Vérifier que la migration `_190400_admin` est appliquée |
