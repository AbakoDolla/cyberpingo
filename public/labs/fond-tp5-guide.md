# Guide du TP 5 : construire un registre de risques

> Cadre et limites
>
> Toutes les situations décrites ici sont fictives.
> Tu raisonnes sur un atelier pédagogique.
> Ne testes aucun accès réel et n’essaie pas de reproduire un incident sur une vraie boîte mail ou un vrai partage.

# Méthode

1. Pour un scénario, calcule le score avec la formule : vraisemblance × impact.
2. Niveaux : faible de 1 à 3, moyen de 4 à 6, élevé de 8 à 9, critique de 12 à 16.
3. Pour le traitement :
   - score faible : accepter
   - score moyen ou élevé : réduire
   - score critique sur un actif facultatif : éviter
   - score critique sur un actif indispensable : réduire
   - si la mesure existante est un contrat d’assurance ou d’infogérance, tu peux transférer
4. Pour le moindre privilège, garde seulement les droits nécessaires au rôle réel de la personne.

# Commandes utiles

```powershell
Import-Csv -Delimiter ([char]9) -Path "fond-tp5-scenarios.tsv" | Select-Object id,actif,vraisemblance,impact
Import-Csv -Delimiter ([char]9) -Path "fond-tp5-actifs.tsv" | Where-Object donnees_personnelles -eq "oui" | Measure-Object
```

```bash
awk -F'\t' 'NR>1 {print $1, $5 * $6}' fond-tp5-scenarios.tsv
awk -F'\t' 'NR>1 && $4 == "oui" {count += 1} END {print count}' fond-tp5-actifs.tsv
```

# Repères

Quand plusieurs scénarios touchent le même actif, additionne leurs scores pour savoir où concentrer les efforts. Pour les incidents passés, choisis la propriété la plus directement touchée : confidentialité, intégrité ou disponibilité.
