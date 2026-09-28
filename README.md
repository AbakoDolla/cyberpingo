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

Le prototype propose les surfaces suivantes. L'authentification reste simulée
et la progression est stockée uniquement dans le navigateur :

- Accueil public responsive (mascotte, démonstration interactive, parcours, communauté, mission et FAQ)
- Inscription / Connexion (email + Google/GitHub en façade)
- Onboarding en 4 étapes avec conservation des objectifs et connaissances déclarées
- Dashboard (XP, streak, roadmap visuelle, badges, cours en cours)
- Cours, leçons (texte, schéma, vidéo, code, exemple) et système de quiz
- Challenges cybersécurité par catégorie avec terminal mocké
- Mentor IA (interface disponible ; réponses conditionnées à la configuration Gemini côté serveur)
- Profil, progression détaillée et paramètres (objectif, export JSON, réinitialisation confirmée)
- Navigation responsive (sidebar desktop / bottom nav mobile)

## Accueil public

La page `/` reprend la maquette CyberPingo fournie : palette bleu nuit, cyan et
violet, panneaux de progression et illustrations de la mascotte. Le projet
conserve son architecture Next.js existante ; les routes de connexion et
d'apprentissage ne sont pas migrées.

- `app/landing.css` : styles limités à `.public-site`, navigation mobile,
  animations CSS et prise en compte de `prefers-reduced-motion`.
- `components/landing/LandingPage.tsx` : composition, catalogue public,
  aperçus accessibles via un dialogue natif et FAQ.
- `components/landing/Hero.tsx` : mini-quiz de démonstration avec progression
  animée. Ses XP restent locaux au composant et ne modifient pas le compte.
- `data/landing.ts` : contenu éditorial, programme prévu, FAQ et témoignage
  explicitement fictif, à remplacer par des données vérifiées.
- `public/images/cyberpingo-official.png` : logo officiel fourni, copié sans
  modification. Les autres images sont des recadrages des illustrations de
  la maquette fournie, pas une capture utilisée à la place de l'interface.
- `public/fonts/` : Inter, Space Grotesk et JetBrains Mono en WOFF2, distribuées
  par Fontsource avec leurs licences SIL OFL. Elles sont servies localement :
  aucun accès à Google Fonts n'est requis lors de la compilation.

Les leçons disponibles et leurs durées viennent de `data/courses.ts`.
Six parcours, dix-sept leçons et douze quiz sont disponibles ; aucun nombre
d'apprenants ou de certificats n'est inventé. La FAQ précise les limites du
prototype et l'absence de synchronisation entre appareils.

Les animations peuvent être désactivées avec le bouton éclair de la navigation.
Les contrôles restent utilisables au clavier ; les aperçus se ferment avec
Échap et rendent le focus à la carte d'origine.
Le dégradé du titre est intentionnel et reprend la référence visuelle.
Le cache immuable des chunks Next.js est réservé à la production pour éviter
de servir une ancienne interface pendant le développement.

## Pages et apprentissage

- `/parcours` : recherche, filtre de niveau et programme public de chaque parcours.
- `/ressources` : cinq guides consultables sans compte, filtrables par thème.
- `/fonctionnalites`, `/a-propos`, `/communaute`, `/faq`, `/contact`,
  `/confidentialite`, `/conditions` : pages d'information reliées à la navigation.
- `/contact` prépare un brouillon texte téléchargeable ; aucun e-mail n'est envoyé.
- `/progression` : reprise de la prochaine leçon, compétences, meilleurs scores et badges.
- `/parametres` : nom, objectif quotidien, export JSON et remise à zéro avec confirmation.
  L'export n'est pas un mécanisme de réimport. Le temps passé n'est pas chronométré.
- Les cours publiés localement sont également lisibles dans les routes leçon et quiz.
  Il n'existe pas encore de catalogue communautaire distant.

`lib/learning-progress.ts` contient les règles de progression. Un quiz est validé
à partir de 70 %. Les XP sont limités à la récompense du meilleur score, en ne
créditant que la différence lors d'une amélioration. Les anciens compteurs de
tentatives sans scores détaillés ne deviennent pas des quiz validés.
Les séries de jours utilisent UTC et progressent lors d'un nouvel acquis.
Les badges de la plateforme ne sont pas des certifications.

Les profils sont conservés sous `cyberpingo_user_<id>` et le profil actif sous
`cyberpingo_user_v1`. Les identifiants des nouveaux profils utilisent l'adresse
complète pour éviter les collisions entre domaines. La déconnexion conserve
les profils locaux ; la réinitialisation conserve l'identité et les préférences.
Les erreurs de stockage sont signalées dans l'espace apprenant. Ce stockage
et les cookies de démonstration ne doivent pas être utilisés pour des données sensibles.

Le logo affiché est `public/images/cyberpingo-transparent.png`. L'original reste
inchangé. `scripts/remove-logo-background.ps1` recrée l'alpha à partir du fond
noir et protège la silhouette sombre de la mascotte fournie. Ce masque est propre
à cette illustration, pas un détourage universel. L'animation d'arrivée dure moins
de deux secondes, s'affiche une fois par onglet, se ferme à la première interaction
et respecte `prefers-reduced-motion`, sans bloquer le chargement de la page.

Vérifications des règles de progression et des références de contenu :

```powershell
node --test tests\learning.test.cjs
npx tsc --noEmit
```

## Prochaines étapes suggérées

- Brancher `services/` sur l'API NestJS réelle
- Ajouter l'authentification (Auth.js ou JWT)
- Remplacer les données mockées de `data/` par des appels API
- Configurer le fournisseur Gemini du mentor et les règles de traitement des données
- Ajouter un transport de contact, une communauté et une synchronisation réelle
