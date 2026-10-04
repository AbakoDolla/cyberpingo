# Guide de méthode

> Cadre et limites : tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite. Les exemples de ce guide utilisent des valeurs inventées, pas celles du laboratoire.

## 1. Qualifier un constat
Relis d’abord la lettre de mission, puis la grille. Quand un constat vient d’un scanner, cherche toujours une preuve qui le confirme ou le contredit dans un autre fichier. Quand un constat vient d’une revue de code, pointe la ligne et nomme le risque sans extrapoler.

### Exemple bash
```bash
cat > constats-exemple.csv <<'EOF'
id;source;certitude;actif
X01;revue;démontrée;api-resa
X02;scanner;scanner;api-resa
X03;journal+revue;confirmée;front-web
EOF
grep '^X' constats-exemple.csv | cut -d';' -f1,2,3
```

### Exemple PowerShell
```powershell
@'
id;source;certitude;actif
X01;revue;démontrée;api-resa
X02;scanner;scanner;api-resa
X03;journal+revue;confirmée;front-web
'@ | Set-Content -Encoding UTF8 constats-exemple.csv
Import-Csv -Delimiter ';' -Encoding UTF8 constats-exemple.csv | Select-Object id, source, certitude
```

## 2. Recalculer une note CVSS 3.1
Travaille avec la table de la grille. Copie le vecteur, reporte chaque valeur, calcule ISS, impact, exploitabilité, puis applique l’arrondi supérieur. Quand tu annonces une note, garde aussi le vecteur comme justification.

```bash
cat > vecteur-exemple.txt <<'EOF'
CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:N
EOF
grep 'CVSS:3.1' vecteur-exemple.txt
```

```powershell
@'
CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:N
'@ | Set-Content -Encoding UTF8 vecteur-exemple.txt
Get-Content -Encoding UTF8 vecteur-exemple.txt
```

## 3. Prioriser sans inventer
La priorité n’est pas un sentiment. Relève la note de base, la criticité de l’actif et la certitude, puis multiplie. Si deux constats semblent proches, vérifie d’abord qu’ils parlent bien du même actif et du même niveau de preuve.

```bash
cat > priorite-exemple.csv <<'EOF'
id;note;criticite;certitude
X01;6.3;4;3
X02;5.2;2;1
EOF
awk -F';' 'NR>1 { printf "%s %.1f\n", $1, $2*$3*$4 }' priorite-exemple.csv
```

```powershell
@'
id;note;criticite;certitude
X01;6.3;4;3
X02;5.2;2;1
'@ | Set-Content -Encoding UTF8 priorite-exemple.csv
Import-Csv -Delimiter ';' -Encoding UTF8 priorite-exemple.csv | ForEach-Object { "{0} {1}" -f $_.id, ([double]$_.note * [int]$_.criticite * [int]$_.certitude) }
```

## 4. Rester factuel dans le rapport
Un résumé de direction dit ce qui est prouvé, l’impact probable et la priorité de correction. Il n’annonce ni compromission générale ni exfiltration sans preuve explicite. Une recommandation vaut mieux qu’un slogan si elle est testable et rattachée à une ligne de code, un en-tête ou un composant.
