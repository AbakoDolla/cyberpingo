# Guide du TP 3 : processus, services et tâches planifiées

> Cadre et limites
>
> Les sorties de processus, de services et de ports sont des exports fictifs.
> Tu analyses des fichiers en lecture seule, sans lancer de commande système sur un vrai serveur.
> Une commande comme « systemctl » ou « ss » montrée ici sert à lire l’export, pas à piloter ta machine.

## Lire les processus

Dans « ps aux », la colonne RSS est en kilo-octets. Pour un parent, il faut la relation PID-PPID du second export. Les dates et heures des exports sont en UTC.

## Lire cron sans piège

Une expression cron se lit champ par champ. Quand le jour du mois et le jour de la semaine sont tous les deux restreints, cron déclenche si l’un OU l’autre correspond. Exemple avec des valeurs inventées, pas celles du labo : « 0 5 12 * 2 » se lance le 12 du mois à 05:00, mais aussi chaque mardi à 05:00.

## Bash ou Git Bash

```bash
cat > demo-ps.txt <<'EOF'
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
demo         101 12.5  0.4  10000  4200 ?        S    09:00   0:01 /usr/bin/demo-task
demo         204 87.0  0.8  14000  8600 ?        R    09:05   0:12 /tmp/demo-runner
EOF
top_demo=$(awk 'NR>1 {if ($3+0>max) {max=$3+0; pid=$2; cmd=substr($0, index($0, $11))}} END {printf "%s|%s", pid, cmd}' demo-ps.txt)
cat > demo-cron.txt <<'EOF'
*/15 8-10 * * 1-5 root /usr/local/bin/demo-collecte.sh
EOF
cron_demo=$(awk '/^\*\/15 / {print $0}' demo-cron.txt)
printf 'Démo processus prête pour repérer le plus gourmand : %s.\nDémo cron prête pour lire un pas et une plage : %s.\n' "$top_demo" "$cron_demo"
```

## PowerShell 5.1

Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.

```powershell
@'
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
demo         101 12.5  0.4  10000  4200 ?        S    09:00   0:01 /usr/bin/demo-task
demo         204 87.0  0.8  14000  8600 ?        R    09:05   0:12 /tmp/demo-runner
'@ | Set-Content -Encoding UTF8 demo-ps.txt
$processRows = Get-Content -Encoding UTF8 "demo-ps.txt" | Select-Object -Skip 1
$top = $processRows | Sort-Object { [double](($_ -split '\s+')[2]) } -Descending | Select-Object -First 1
$topParts = $top -split '\s+', 11
@'
*/15 8-10 * * 1-5 root /usr/local/bin/demo-collecte.sh
'@ | Set-Content -Encoding UTF8 demo-cron.txt
$cronLine = Get-Content -Encoding UTF8 "demo-cron.txt" | Where-Object { $_ -match '^\*/15 ' } | Select-Object -First 1
"Démo processus prête pour repérer le plus gourmand : $($topParts[1])|$($topParts[10])."
"Démo cron prête pour lire un pas et une plage : $cronLine."
```

## Visionneuse du site

Dans la visionneuse, tape un mot ou un nombre pour ne garder que les lignes qui le contiennent. Tu peux tester avec des exemples génériques comme « failed », « sudo », « accepted » ou « error », puis relire le format complet des colonnes utiles.