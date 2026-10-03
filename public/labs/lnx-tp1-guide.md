# Guide du TP 1 : explorer l’arborescence et chercher dans les fichiers

> Cadre et limites
>
> Toutes les données de ce laboratoire sont fictives et figées.
> Tu travailles sur des exports fournis, pas sur un vrai serveur.
> Ne lance jamais un script téléchargé sans l’avoir lu, et ne teste rien sur un système important.

## Lire l’export d’arborescence

L’export reprend le style de « ls -lR --time-style=long-iso ». Chaque section commence par un chemin, puis « total », puis les lignes du contenu direct de ce dossier. Les dates sont en UTC.

## Suivre un historique de « cd »

Pour retrouver un répertoire final, pars du répertoire de départ donné dans l’énoncé puis rejoue chaque « cd » dans l’ordre. Pense aux cas particuliers : « .. », « ~ » et « cd - ».

## Bash ou Git Bash

```bash
cat > demo-arbo.txt <<'EOF'
/home/demo:
total 12
-rw-r--r--  1 demo demo  120 2025-11-02 09:00 rapport.txt
-rw-r--r--  1 demo demo   88 2025-11-02 09:01 .token
drwxr-xr-x  2 demo demo 4096 2025-11-02 09:02 .config
EOF
hidden_demo=$(awk 'BEGIN{n=0; insec=0} /^\/home\/demo:$/ {insec=1; next} insec && /^$/ {print n; exit} insec && $0 ~ / \.[^[:space:]]+$/ {n++}' demo-arbo.txt)
cat > demo-adh.csv <<'EOF'
identifiant;nom;ville;formule
X-001;Ada;Atelier-Bleu;alpha
X-002;Benoit;Atelier-Bleu;beta
EOF
city_demo=$(awk -F';' 'NR>1 && $3=="Atelier-Bleu" {n++} END{print n+0}' demo-adh.csv)
printf 'Démo arborescence prête pour compter les entrées cachées : %s résultat(s).\nDémo CSV prête pour filtrer une ville inventée : %s ligne(s).\n' "$hidden_demo" "$city_demo"
```

## PowerShell 5.1

Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.

```powershell
@'
/home/demo:
total 12
-rw-r--r--  1 demo demo  120 2025-11-02 09:00 rapport.txt
-rw-r--r--  1 demo demo   88 2025-11-02 09:01 .token
drwxr-xr-x  2 demo demo 4096 2025-11-02 09:02 .config
'@ | Set-Content -Encoding UTF8 demo-arbo.txt
$tree = Get-Content -Encoding UTF8 "demo-arbo.txt"
$homeStart = [Array]::IndexOf($tree, '/home/demo:')
$hiddenCount = 0
for ($i = $homeStart + 2; $i -lt $tree.Length -and $tree[$i] -ne ''; $i++) { if ($tree[$i] -match '^[dl-].*\s\.[^\s]+$') { $hiddenCount++ } }
@'
identifiant;nom;ville;formule
X-001;Ada;Atelier-Bleu;alpha
X-002;Benoit;Atelier-Bleu;beta
'@ | Set-Content -Encoding UTF8 demo-adh.csv
$cityCount = (Import-Csv "demo-adh.csv" -Delimiter ';' | Where-Object { $_.ville -eq 'Atelier-Bleu' }).Count
"Démo arborescence prête pour compter les entrées cachées : $hiddenCount résultat(s)."
"Démo CSV prête pour filtrer une ville inventée : $cityCount ligne(s)."
```

## Visionneuse du site

Dans la visionneuse, tape un mot ou un nombre pour ne garder que les lignes qui le contiennent. Tu peux tester avec des exemples génériques comme « error », « sudo » ou « accepted », puis relire calmement la structure des lignes visibles.

## Méthode utile

- Pour un plus gros fichier, compare la colonne de taille d’un même dossier.
- Pour un chemin absolu, résous chaque segment du chemin relatif depuis le dossier de départ.
- Pour un CSV, compte après avoir choisi la bonne colonne et le bon séparateur « ; ».