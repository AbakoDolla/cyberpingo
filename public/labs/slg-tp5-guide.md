# Guide du TP 5 : règles de détection, seuils et faux positifs

> Exemple avec des valeurs inventées, pas celles du labo.

- Lis d’abord la définition exacte de la fenêtre et du regroupement.
- Ne mélange pas une alerte et un événement brut : ici une alerte est toujours rattachée à la ligne qui fait franchir le seuil.
- Calcule les pourcentages après avoir compté VP, FP et FN.

## Bash ou Git Bash

```bash
cat > demo-evenements.csv <<'EOF'
TimeUtc;SourceIp;Account;Result;Truth
2025-11-03T08:00:00Z;10.60.0.8;awa;failure;normal
2025-11-03T08:00:20Z;10.60.0.8;awa;failure;normal
2025-11-03T08:00:40Z;10.60.0.8;awa;failure;attaque
2025-11-03T08:01:00Z;10.60.0.8;awa;failure;attaque
2025-11-03T08:01:20Z;10.60.0.8;awa;failure;attaque
EOF
alertes_demo=$(awk -F';' 'NR>1 {t=$1; n[$2]++} END{for (ip in n) print ip, n[ip]}' demo-evenements.csv | awk '$2>=5 {print $1}' | wc -l)
printf 'Demo detection prete : %s groupe(s) atteignent un seuil invente.\n' "$alertes_demo"
```

## PowerShell 5.1

```powershell
@'
TimeUtc;SourceIp;Account;Result;Truth
2025-11-03T08:00:00Z;10.60.0.8;awa;failure;normal
2025-11-03T08:00:20Z;10.60.0.8;awa;failure;normal
2025-11-03T08:00:40Z;10.60.0.8;awa;failure;attaque
2025-11-03T08:01:00Z;10.60.0.8;awa;failure;attaque
2025-11-03T08:01:20Z;10.60.0.8;awa;failure;attaque
'@ | Set-Content -Encoding UTF8 demo-evenements.csv
$rows = Import-Csv demo-evenements.csv -Delimiter ';'
$groupCount = ($rows | Group-Object SourceIp | Where-Object { $_.Count -ge 5 }).Count
"Demo detection prete : $groupCount groupe(s) atteignent un seuil invente."
```
