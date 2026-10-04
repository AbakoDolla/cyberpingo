# Guide du TP 4 : corréler trois sources et dresser la chronologie

> Exemple avec des valeurs inventées, pas celles du labo.
>
> Le journal d’authentification de ce TP est en heure locale UTC+01:00. Convertis-le en UTC avant de comparer les sources.
> Pour les baux DHCP, applique la règle du TP : début inclus, fin exclue.

## Méthode

- Commence par choisir un événement rare visible dans deux journaux pour mesurer un décalage d’horloge.
- Convertis ensuite tous les horodatages en UTC avant de dresser une chronologie unique.
- Pour relier une adresse IP à une machine, cherche le bail dont l’heure de début est inférieure ou égale au fait et dont l’heure de fin est strictement supérieure au fait.
- Dans une chronologie, note la source, l’heure UTC, le fait et la preuve.

## Bash ou Git Bash

```bash
cat > demo-access.log <<'EOF'
10.50.0.21 - - [01/Nov/2025:09:14:00 +0000] "GET /inventaire HTTP/1.1" 200 812 "-" "DemoBrowser/1.0"
EOF
cat > demo-proxy.log <<'EOF'
1761988200.000    141 10.50.0.21 TCP_MISS/200 812 GET http://atelier.example/inventaire - HIER_DIRECT/10.60.0.12 text/html
EOF
cat > demo-baux.csv <<'EOF'
IpAddress;MacAddress;Hostname;LeaseStartUtc;LeaseEndUtc
10.50.0.21;00:aa:bb:cc:dd:21;pc-demo01;2025-11-01T08:00:00Z;2025-11-01T11:00:00Z
EOF
access_time=$(awk -F'[][]' 'NR==1 {print $2}' demo-access.log | cut -d: -f2-4)
proxy_epoch=$(awk 'NR==1 {print $1}' demo-proxy.log)
proxy_time=$(date -u -d @${proxy_epoch%.*} +%H:%M:%S)
host_demo=$(awk -F';' 'NR>1 && $1=="10.50.0.21" && $4<="2025-11-01T09:14:00Z" && "2025-11-01T09:14:00Z"<$5 {print $3}' demo-baux.csv)
printf 'Heure acces inventee : %s\nHeure proxy inventee : %s\nMachine inventee : %s\n' "$access_time" "$proxy_time" "$host_demo"
```

## PowerShell 5.1

```powershell
@'
10.50.0.21 - - [01/Nov/2025:09:14:00 +0000] "GET /inventaire HTTP/1.1" 200 812 "-" "DemoBrowser/1.0"
'@ | Set-Content -Encoding UTF8 demo-access.log
@'
1761988200.000    141 10.50.0.21 TCP_MISS/200 812 GET http://atelier.example/inventaire - HIER_DIRECT/10.60.0.12 text/html
'@ | Set-Content -Encoding UTF8 demo-proxy.log
@'
IpAddress;MacAddress;Hostname;LeaseStartUtc;LeaseEndUtc
10.50.0.21;00:aa:bb:cc:dd:21;pc-demo01;2025-11-01T08:00:00Z;2025-11-01T11:00:00Z
'@ | Set-Content -Encoding UTF8 demo-baux.csv
$accessLine = @(Get-Content -Encoding UTF8 demo-access.log)[0]
$start = $accessLine.IndexOf('[') + 1
$end = $accessLine.IndexOf(']')
$stamp = $accessLine.Substring($start, $end - $start)
$accessTime = $stamp.Substring(12, 8)
$proxyEpoch = [double]((@(Get-Content -Encoding UTF8 demo-proxy.log)[0]).Split(' ')[0])
$proxyTime = [DateTimeOffset]::FromUnixTimeSeconds([int][math]::Floor($proxyEpoch)).UtcDateTime.ToString('HH:mm:ss')
$lease = Import-Csv demo-baux.csv -Delimiter ';' | Where-Object { $_.IpAddress -eq '10.50.0.21' -and $_.LeaseStartUtc -le '2025-11-01T09:14:00Z' -and '2025-11-01T09:14:00Z' -lt $_.LeaseEndUtc } | Select-Object -First 1
"Heure acces inventee : $accessTime"
"Heure proxy inventee : $proxyTime"
"Machine inventee : $($lease.Hostname)"
```
