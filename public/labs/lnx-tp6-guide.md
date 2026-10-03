# Guide du TP 6 : lire, tester et corriger des scripts shell

> Cadre et limites
>
> Les quatre scripts et les deux jeux de données sont fictifs.
> Tu testes uniquement les fichiers du labo, dans un répertoire temporaire ou dans la visionneuse.
> Ne lance jamais un script téléchargé sur un système important sans l’avoir lu, compris et isolé.

## Méthode

1. Lis chaque script du haut vers le bas avant de l’exécuter. Repère les variables d’entrée, les fonctions, les boucles et les commandes de suppression.
2. Vérifie d’abord la syntaxe avec « bash -n », puis l’exécution réelle avec les données du labo.
3. Quand un chemin peut contenir des espaces, toute variable de chemin doit être protégée par des guillemets.
4. Une ligne du type « eval » ou une commande reconstruite depuis l’entrée demande une validation stricte de l’argument.
5. Pour raisonner sur un script dangereux, regarde aussi ce qui se passerait si une variable devenait vide ou inattendue.

## Visionneuse du site

- Dans la visionneuse, filtre avec des mots généraux vus dans les leçons, comme « usage », « total », « error » ou « failed », puis relis les lignes restantes.
- Pour un script, filtre d’abord sur un mot de structure comme « function », « while », « eval » ou « rm » avant de relire les quelques lignes affichées.

## Exemples de commandes (données inventées)

```bash
cat > demo-check.sh <<'EOF'
#!/usr/bin/env bash
name="${1:-demo}"
printf 'bonjour %s\n' "$name"
EOF
bash -n demo-check.sh && echo 'syntaxe-ok'
bash -x demo-check.sh alize 2>&1 | head -n 4

cat > demo-inventaire.sh <<'EOF'
#!/usr/bin/env bash
awk -F';' 'NR>1 {print $1 ";" $2}' demo-comptes.csv
EOF
cat > demo-comptes.csv <<'EOF'
compte;type
poste-a;local
svc-demo;service
EOF
grep -nE 'awk -F|print' demo-inventaire.sh
```

## Exemples de commandes PowerShell 5.1 (données inventées)

```powershell
$demoScript = @(
  '#!/usr/bin/env bash',
  'name="${1:-demo}"',
  'printf ''bonjour %s\n'' "$name"'
)
Set-Content -Encoding Ascii "demo-check.sh" $demoScript
& "C:\Program Files\Git\bin\bash.exe" -n "demo-check.sh"; Write-Output 'syntaxe-ok'
Set-Content -Encoding Ascii "demo-run.sh" 'bash -x demo-check.sh alize 2>&1 | head -n 4'
& "C:\Program Files\Git\bin\bash.exe" "demo-run.sh"

$demoInventory = @(
  '#!/usr/bin/env bash',
  'awk -F'';'' ''NR>1 {print $1 ";" $2}'' demo-comptes.csv'
)
$demoCsv = @(
  'compte;type',
  'poste-a;local',
  'svc-demo;service'
)
Set-Content -Encoding Ascii "demo-inventaire.sh" $demoInventory
Set-Content -Encoding Ascii "demo-comptes.csv" $demoCsv
Get-Content -Encoding UTF8 "demo-inventaire.sh" | Select-String 'awk -F|print'
```

Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.

## Rappels utiles

- Un défaut de variable non protégée dans un chemin peut être détecté automatiquement par ShellCheck.
- La leçon sur les scripts fiables présente l’option de « set » qui arrête l’exécution dès la première commande en échec.
- Avant toute suppression large, il faut vérifier que le chemin n’est ni vide, ni inattendu, ni hors du dossier prévu, et que le motif cible seulement les fichiers voulus.
