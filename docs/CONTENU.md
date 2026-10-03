# Contenu pédagogique : produire, contrôler, publier

Ce guide s'adresse à l'équipe qui rédige les cours. Il décrit la chaîne qui transforme des leçons écrites en contenu publié, la grille qui décide qu'un cours est terminé, et l'état réel des six parcours. Rien n'est déclaré à la main : l'état se mesure avec `npm run content:report`.

## Principe

Le contenu est écrit en TypeScript, vérifié par des règles, puis converti en SQL idempotent. Il n'est jamais saisi directement dans la base. Une fois publié, un administrateur peut l'éditer dans `/admin` : les graines ne remplacent jamais une modification faite dans la console.

```
supabase/seed/content/path-kit.ts            gabarit, aides d'écriture, références vérifiées
supabase/seed/content/<parcours>*.ts          leçons, quiz, labs, compétences, badges
scripts/lab-scenarios-*.cjs                   fichiers de laboratoire et faits (réponses calculées)
scripts/seed-path-builder.cjs                 constructeur du SQL idempotent
supabase/seed/0N_<parcours>.sql               fichier généré, à charger dans l'ordre
```

Les réponses attendues des laboratoires ne sont jamais écrites à la main : elles viennent des mêmes valeurs que celles qui figurent dans les fichiers téléchargés par l'apprenant. Les tests les recalculent à partir des fichiers.

## Gabarit d'une leçon

Chaque leçon suit les dix étapes du modèle pédagogique. Les blocs sont reconnus par leur premier mot et affichés avec leur étiquette (`lib/lesson-content.ts`, `parseCallout`).

| Étape du modèle | Bloc dans la leçon |
|---|---|
| 1. Objectifs d'apprentissage | `goals(...)` : « Objectifs : » |
| 2. Prérequis | `prerequisites(...)` : « Prérequis : » |
| 3. Introduction contextualisée | `scenario(...)` : « Mise en situation : » |
| 4. Vidéo de cours | `videoSlot(...)` : « Vidéo à venir : titre », affichée comme « Vidéo en préparation », jamais comme un faux lecteur |
| 5. Cours détaillé | trois blocs `text` au moins, `schema`, `example` (exemple corrigé) |
| 6. Démonstration guidée | un `text` « Démonstration guidée : » suivi d'un `code` avec la sortie d'exemple |
| 7. Erreurs fréquentes et sécurité | `mistakes(...)`, `safety(...)` |
| 8. À retenir | `takeaway(...)` |
| 9. Exercice, TP, évaluation | `practice(...)` désigne le laboratoire ; le quiz de la leçon (quatre questions, trois niveaux de difficulté) suit |
| 10. Références | deux ou trois `reference("clé")` en fin de leçon, tirées de la liste vérifiée de `path-kit.ts` |

Un quiz corrige chaque réponse : l'explication dit pourquoi la bonne réponse est juste et pourquoi la plus tentante des autres est fausse. Une compétence n'est jamais validée sur un quiz seul : elle exige la leçon, le quiz, un laboratoire d'entraînement et une évaluation pratique.

## Grille de publication

`scripts/content-quality.cjs` traduit la liste de contrôle de publication en règles. Elle est appliquée pendant la rédaction (`node scripts/check-path-part.cjs <fichier>`) et à tout ce que les graines publient (`tests/content-quality.test.cjs`).

- Leçon : objectifs en premier bloc, cours assez détaillé, un exemple, un schéma ou un code, un espace vidéo, un « À retenir », au moins une référence, quiz de trois questions au moins avec des corrections de 50 caractères au moins. Les leçons rédigées avec le gabarit complet ajoutent : prérequis, mise en situation, erreurs fréquentes, renvoi vers le laboratoire, 2 400 caractères au moins, deux références au moins, mélange de difficultés, bonne réponse jamais toujours à la même place.
- Texte : apostrophe typographique, aucun tiret cadratin, aucun accent grave (le texte n'est pas interprété comme du Markdown), aucun texte provisoire.
- Références : seules les adresses de la liste vérifiée de `path-kit.ts` sont acceptées. Chacune a répondu 200 au moment de la constitution de la liste.
- Laboratoire : briefing, contraintes, outils, indices, durée, fichiers, au moins cinq étapes (huit pour une évaluation), chaque étape avec indice, format de réponse et correction. Un laboratoire Packet Tracer demande un guide et un schéma de topologie.
- Module : « Critères de réussite : » dans sa description.
- Cours : un cours n'est « terminé » que si toutes ses leçons sont conformes, s'il a une évaluation pratique et s'il couvre les modules prévus.

Les cours qui ne passent pas encore la grille sont listés par titre dans `KNOWN_DEBT` (`tests/content-quality.test.cjs`). La liste ne peut que rétrécir : le test échoue si une leçon en dette est améliorée sans sortir de la liste, ou si une leçon nouvelle y entre.

### Fichiers de laboratoire : ne jamais livrer la réponse

Un guide de laboratoire enseigne la méthode avec des commandes et des exemples génériques. Il ne contient jamais une valeur du scénario, un résultat de calcul ni la bonne option d'un choix : l'apprenant doit les trouver dans les fichiers. `tests/fondamentaux-guides.test.cjs` vérifie que, pour chaque laboratoire du parcours Fondamentaux, aucune réponse acceptée ne figure dans un guide, dans le briefing ou dans l'énoncé d'une autre tâche, qu'aucun caractère de contrôle ne s'est glissé dans un fichier et que toute commande d'un guide est dans un bloc de code.

## Migration sans perte

Les cours déjà publiés se réorganisent sans jamais rien supprimer (`scripts/seed-path-builder.cjs`) :

- un module est renommé et repositionné seulement tant qu'il porte son titre d'origine ;
- une leçon est déplacée vers son nouveau module et sa nouvelle position, avec son quiz ;
- une leçon de départ est remplacée par sa version complète seulement si son contenu est encore, octet pour octet, celui de départ ; sinon elle est conservée et seule sa position change ;
- les références ajoutées à une leçon le sont une seule fois ;
- le quiz que garde une leçon de départ peut être complété (`quizExtension`) : ses explications trop courtes sont remplacées seulement tant qu'elles portent encore le texte de départ, et des questions sont ajoutées après les existantes, sans toucher aux réponses déjà données ;
- la durée affichée d'un cours devient la somme de ses leçons.

Les identifiants des modules, leçons et quiz ne changent jamais : la progression, les tentatives de quiz et les compétences des apprenants sont conservées. Rejouer une graine ne change rien.

## Commandes

| Commande | Rôle |
|---|---|
| `node scripts/check-path-part.cjs <fichier.ts>` | contrôle une partie de parcours pendant la rédaction |
| `node scripts/generate-lab-assets.cjs` | écrit les fichiers de laboratoire dans `public/labs/` |
| `node scripts/generate-reseaux-programme-seed.cjs` | génère `supabase/seed/05_reseaux_programme.sql` |
| `node scripts/generate-fondamentaux-seed.cjs` | génère `supabase/seed/06_fondamentaux_programme.sql` |
| `npm run content:report` | état réel du contenu, cours par cours |
| `npm test` | toute la suite, dont `programme.test.cjs` et `content-quality.test.cjs` |

Pour publier un parcours : déployer le code (les laboratoires pointent vers des fichiers de `public/labs/`), puis charger la graine dans la base de production (voir `docs/DEPLOYMENT.md`).

## État des six parcours

| Parcours | Modules écrits / prévus | Laboratoires | État |
|---|---|---|---|
| Réseaux informatiques | 10 / 9 | 9 dont 3 évaluations, 91 étapes | Terminé selon la grille : 31 leçons conformes, 16 compétences, 6 badges propres au programme |
| Fondamentaux de la cybersécurité | 8 / 8 | 7 dont 2 évaluations, 88 étapes | Terminé selon la grille : 24 leçons conformes, 8 compétences, 6 badges propres au programme |
| Administration Linux | 3 / 9 | 1 | À construire (4 leçons, dont 2 détaillées) |
| Sécurité Web | 2 / 10 | aucun | À construire (3 leçons de départ courtes) |
| Introduction au Pentest | 2 / 10 | aucun | À construire (3 leçons de départ courtes) |
| Analyse de logs | 3 / 10 | 3 dont 1 évaluation | À construire (6 leçons, dont 3 détaillées) |

Le nombre de modules prévus vient de la spécification des six parcours. L'ordre de construction recommandé après le Réseaux et les Fondamentaux : Linux, Analyse de logs, Sécurité Web, Pentest. Chaque parcours repart du même modèle : leçons au gabarit, une évaluation pratique, des compétences reliées, un laboratoire d'entraînement par compétence.

## Ce que l'équipe doit encore fournir

- **Vidéos** : chaque leçon du Réseaux et des Fondamentaux annonce sa vidéo (« Vidéo en préparation »). Elles s'ajoutent depuis l'éditeur de cours, par un bloc vidéo.
- **Fichiers Packet Tracer** (`.pkt`) : facultatifs pour les TP 1 à 3 et le projet final. Les laboratoires se valident sans le logiciel ; un fichier réel s'ajoute comme ressource du laboratoire.
- **Relecture par une personne du métier** : la grille demande que le contenu soit relu et testé par une personne compétente. Les contrôles faits ici sont automatiques (règles, recalcul des réponses depuis les fichiers, absence de réponse dans les guides, parcours complet d'un apprenant), complétés par des relectures techniques indépendantes, une vérification des affirmations des leçons contre des sources officielles et une résolution en aveugle de chaque laboratoire par des apprenants simulés qui ne voyaient que le sujet et les fichiers. Ces contrôles ont corrigé de nombreuses erreurs, mais une relecture par un formateur reste à faire avant de présenter un parcours comme validé.
- **Voix humaines** : voir `docs/DEPLOYMENT.md`.
