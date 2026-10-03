# Guide du TP 3 : auditer l’hygiène d’un parc de postes

> Cadre et limites
>
> Toutes les données de ce labo sont fictives.
> Tu travailles hors production, sur des exportations figées.
> N’essaie rien sur un vrai poste, ne modifies aucun vrai antivirus et ne lances jamais de commande de chiffrement sur une machine qui ne t’appartient pas.

# Objectif

Tu dois repérer les retards de mise à jour, les définitions antivirus trop anciennes, les oublis de chiffrement et les trous dans la sauvegarde du parc du Centre Numérique Soleil.

# Méthode

1. Vérifie si un système est encore supporté en comparant la date de fin de support à la date d’audit du labo.
2. Calcule les retards en jours entre la date d’audit et la dernière mise à jour, la date des signatures antivirus et la dernière sauvegarde.
3. Pour le poste le plus à risque, utilise ce score de pénalité :
   - +3 si le système est hors support
   - +2 si le retard de mise à jour dépasse 30 jours
   - +2 si les signatures antivirus ont plus de 7 jours de retard
   - +2 si le disque n’est pas chiffré
   - +1 par compte administrateur local au-delà du premier
   - +2 si la dernière sauvegarde réussie date de plus de 7 jours
4. Pour le pourcentage de conformité global, compte 6 contrôles par poste : système supporté, mise à jour de 30 jours ou moins, antivirus de 7 jours ou moins, disque chiffré, un seul administrateur local, sauvegarde de 7 jours ou moins. Formule : contrôles conformes / 72 × 100, arrondi à l’entier.
5. Pour la règle 3-2-1, l’original compte pour une copie : il faut donc trois copies au total, sur au moins deux supports différents, dont une copie hors site. Si un seul point manque, réponds avec sa lettre.

# Commandes utiles

## Sur les exports du labo avec Windows PowerShell

```powershell
Import-Csv -Delimiter ([char]9) -Path "fond-tp3-inventaire-postes.tsv" | Sort-Object derniere_maj | Select-Object -First 5 poste,systeme,derniere_maj
Import-Csv -Delimiter ([char]9) -Path "fond-tp3-support-systemes.tsv" | Sort-Object fin_support | Select-Object systeme,fin_support
Get-Content "fond-tp3-sauvegarde-30j.log" | Select-String 'SUCCESS|FAIL|WARNING|RESTORE_OK'
```

## Sur les exports du labo avec Git Bash ou Linux

```bash
awk -F'\t' 'NR==1 || $4 < "2026-02-15"' fond-tp3-inventaire-postes.tsv
grep -E 'SUCCESS|FAIL|WARNING|RESTORE_OK' fond-tp3-sauvegarde-30j.log
```

## Sur ton propre poste, hors labo

```powershell
# hors-test
Get-MpComputerStatus | Select-Object AntivirusSignatureLastUpdated,AntivirusEnabled
Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 5 Description,HotFixID,InstalledOn
manage-bde -status C:
```

# Repères

La plus longue série de jours sans sauvegarde réussie se lit dans le journal, pas dans l’inventaire. Seules les lignes SUCCESS comptent comme sauvegardes nocturnes réussies. Les lignes WARNING et RESTORE_OK servent à l’analyse mais ne ferment pas une série d’échec.
