# Grille de triage SOC de la PME

## Qualification

- `vp` : vrai positif. L’alerte est confirmée par un fait direct dans une source, puis corroborée par au moins un deuxième fait dans une autre source.
- `fp` : faux positif. L’alerte correspond à une activité explicitement attendue ci-dessous et aucune deuxième source ne montre un effet malveillant.
- `sv` : à surveiller. Un fait suspect existe, mais le corpus ne montre ni action malveillante aboutie ni deuxième source de confirmation.

## Fait, hypothèse, certitude

- Un fait est une ligne horodatée directement observable dans un fichier fourni.
- Une hypothèse est une explication plausible qui n’est pas encore soutenue par deux faits convergents.
- Valeur de certitude : `vp = 4`, `sv = 2`, `fp = 1`.

## Priorité

- Formule : `priorité = gravité annoncée × criticité machine × certitude`.
- Bornes : `1 à 7 = basse`, `8 à 23 = moyenne`, `24 à 39 = haute`, `40 à 64 = critique`.
- On traite d’abord la priorité la plus haute. Si deux alertes avaient exactement la même priorité, il faudrait une information supplémentaire, mais le corpus de cette évaluation n’en a pas besoin.

## Repères bénins autorisés

- `adm-pc02` exécute chaque jeudi vers 22:10 UTC une synchronisation d’inventaire avec `inventaire.palmier-or.example`. Les indices attendus sont : parent `taskeng.exe`, utilisateur `ksow`, puis trafic mandataire vers ce domaine.
- Une série de `4625` suivie, en moins de 120 secondes, d’un `4624` sur le même poste, pour le même compte et la même adresse interne, sans événement privilégié associé, correspond à un oubli de mot de passe.

## Liste ATT&CK utile pour ce sujet

- `T1110` : force brute.
- `T1078` : comptes valides.
- `T1505.003` : shell web.
- `T1071.001` : canal web sortant.

## Rapport

- Le résumé exécutif ne contient que des faits déjà démontrés.
- Un indicateur partagé à l’extérieur s’écrit sous forme désarmée, par exemple `exemple[.]org`.
