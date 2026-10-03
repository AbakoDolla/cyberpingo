# Guide du projet final : auditer la sécurité du Centre Numérique Soleil

> Cadre et limites
>
> Toutes les notes et tous les risques de ce projet sont fictifs.
> Tu rédiges un audit pédagogique.
> N’utilise rien ici pour juger une vraie association sans vérification sur place.

# Grille et calculs

1. Statuts : conforme = 1, partiel = 0,5, non = 0.
2. Score d’un domaine = somme(poids × statut) / somme(poids) × 100.
3. Score global = somme(poids × statut) / somme(poids) × 100, arrondi à l’entier.
4. Action prioritaire : trie d’abord par score de risque décroissant, puis par effort croissant.
5. Gain rapide : effort 1 et score de risque au moins égal à 6.
6. Délai réglementaire de notification d’une violation de données : 72 heures après la prise de connaissance.
7. La sensibilisation prioritaire cible les personnes qui ont cliqué pendant la simulation.

# Commandes utiles

```powershell
Select-String -Path "fond-projet-notes-terrain.md" -Pattern '^- C[0-9]+'
Import-Csv -Delimiter ([char]9) -Path "fond-projet-risques.tsv" | Select-Object action,vraisemblance,impact,effort
Import-Csv -Delimiter ([char]9) -Path "fond-projet-postes.tsv" | Select-Object poste,systeme
Import-Csv -Delimiter ([char]9) -Path "fond-projet-support-systemes.tsv" | Select-Object systeme,fin_support
Import-Csv -Delimiter ([char]9) -Path "fond-projet-acces-mfa.tsv" | Select-Object personne,mfa
Import-Csv -Delimiter ([char]9) -Path "fond-projet-conformite-donnees.tsv" | Select-Object document,etat
Import-Csv -Delimiter ([char]9) -Path "fond-projet-simulation-phishing.tsv" | Select-Object personne,a_clique
```

```bash
grep -E '^- C[0-9]+' fond-projet-notes-terrain.md
awk -F'\t' 'NR>1 {print $1, $4 * $5, $6}' fond-projet-risques.tsv
awk -F'\t' 'NR==FNR && NR>1 {support[$1]=$2; next} NR>1 && support[$2] < "2026-03-31" {count += 1} END {print count}' fond-projet-support-systemes.tsv fond-projet-postes.tsv
awk -F'\t' 'NR>1 {print $1, $3}' fond-projet-acces-mfa.tsv
awk -F'\t' 'NR>1 {print $1, $2}' fond-projet-conformite-donnees.tsv
awk -F'\t' 'NR>1 && $2 == "oui" {count += 1} END {print count}' fond-projet-simulation-phishing.tsv
```

## Exemples génériques hors labo, avec des valeurs inventées

```powershell
$debut = [datetime]'2026-06-14T00:00:00Z'
$fin = [datetime]'2026-06-21T00:00:00Z'
(New-TimeSpan -Start $debut -End $fin).Days
```

```bash
debut="2026-06-14"; fin="2026-06-21"
echo $(( ($(date -u -d "$fin" +%s) - $(date -u -d "$debut" +%s)) / 86400 ))
```

# Repères

Le fichier de notes sert à justifier le constat, la grille sert à noter, et le fichier de risques sert à prioriser. Ne mélange pas les trois niveaux.
