# Règles du TP 5

Toutes les définitions ci-dessous s’appliquent uniquement aux lignes dont la colonne `Result` vaut `failure`.
Fenêtre glissante : pour l’événement courant à l’instant t, on compte les lignes telles que horodatage > t - N minute(s) et horodatage <= t, où N est la valeur « Fenêtre » de la règle.
Pour ce TP, une alerte est émise sur chaque ligne d’échec qui atteint ou dépasse le seuil de sa règle.
Un vrai positif est une alerte dont la ligne déclencheuse porte `Truth=attaque`. Un faux positif est une alerte dont la ligne déclencheuse porte `Truth=normal`.
Un faux négatif est une ligne `failure` avec `Truth=attaque` qui ne déclenche aucune alerte de la règle.
Une exclusion (`Exclusions SourceIp` ou `Exclusions Account`) écarte les lignes concernées pour cette règle : elles ne déclenchent aucune alerte et ne comptent pas dans une fenêtre. Elles restent pourtant dans le jeu de données : une ligne exclue qui porte `Truth=attaque` est un faux négatif.
Précision = VP / (VP + FP). Rappel = VP / (VP + FN). Score F1 = 2 × précision × rappel / (précision + rappel).
Tous les pourcentages et le score F1 sont arrondis à l’entier le plus proche, 0,5 au supérieur.

## Règle 1
Regroupement : `SourceIp`
Seuil : au moins 5 échec(s)
Fenêtre : 5 minute(s)
`Exclusions SourceIp` :
`Exclusions Account` :
Pseudo-Sigma simple : `selection Result=failure ; group-by SourceIp ; condition count >= 5` sur 5 minutes glissantes.

## Règle 2
Regroupement : `Account`
Seuil : au moins 4 échec(s)
Fenêtre : 4 minute(s)
`Exclusions SourceIp` :
`Exclusions Account` :
Pseudo-Sigma simple : `selection Result=failure ; group-by Account ; condition count >= 4` sur 4 minutes glissantes.

## Règle 3
Regroupement : `SourceIp + Account`
Seuil : au moins 6 échec(s)
Fenêtre : 10 minute(s)
`Exclusions SourceIp` : 10.30.50.14, 198.51.100.210
`Exclusions Account` :
Pseudo-Sigma simple : `selection Result=failure ; group-by SourceIp + Account ; condition count >= 6` sur 10 minutes glissantes.
