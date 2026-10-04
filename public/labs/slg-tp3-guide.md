# Guide du TP 3 : pare-feu, DNS et proxy : trouver la machine qui balise

> Cadre et limites
>
> Toutes les données de ce laboratoire sont fictives et figées.
> Tu analyses des exports en lecture seule.
> Ne lance jamais un test réseau actif contre un système réel sans autorisation explicite.

## Lire les trois sources

- Le pare-feu raconte qui parle à qui et sur quel port.
- Le DNS montre quels noms sont cherchés et si la réponse existe.
- Le proxy mesure qui sort, vers quelle URL et avec combien d’octets.

## Indices généraux

- Un balayage de ports combine une même source et beaucoup de ports de destination différents sur un temps court.
- Un balisage se voit par des intervalles très réguliers vers le même domaine ou la même URL.
- Un service légitime périodique n’est pas automatiquement suspect : compare sa régularité et son volume à ceux des autres sources.

## Bash ou Git Bash

```bash
cat > demo-dns.log <<'EOF'
Nov 04 09:00:01 dns-demo dnsmasq[612]: query[A] demo-sync.example from 172.16.5.10
Nov 04 09:00:01 dns-demo dnsmasq[612]: reply demo-sync.example is 198.51.100.7
Nov 04 09:07:01 dns-demo dnsmasq[612]: query[A] demo-sync.example from 172.16.5.10
Nov 04 09:07:01 dns-demo dnsmasq[612]: reply demo-sync.example is 198.51.100.7
EOF
queries_demo=$(grep -c 'query\[A\]' demo-dns.log)
cat > demo-proxy.log <<'EOF'
1762246800.000    188 172.16.5.10 TCP_MISS/200 4200 GET http://demo-sync.example/pixel.gif - HIER_DIRECT/198.51.100.7 image/gif
1762247220.000    190 172.16.5.10 TCP_MISS/200 4300 GET http://demo-sync.example/pixel.gif - HIER_DIRECT/198.51.100.7 image/gif
EOF
bytes_demo=$(awk '$7 ~ /demo-sync.example/ {sum += $5} END {print sum+0}' demo-proxy.log)
printf 'Démo DNS prête pour compter des requêtes : %s ligne(s).\nDémo proxy prête pour sommer des octets : %s octets.\n' "$queries_demo" "$bytes_demo"
```

## PowerShell 5.1

Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.

```powershell
@'
Nov 04 09:00:01 dns-demo dnsmasq[612]: query[A] demo-sync.example from 172.16.5.10
Nov 04 09:00:01 dns-demo dnsmasq[612]: reply demo-sync.example is 198.51.100.7
Nov 04 09:07:01 dns-demo dnsmasq[612]: query[A] demo-sync.example from 172.16.5.10
Nov 04 09:07:01 dns-demo dnsmasq[612]: reply demo-sync.example is 198.51.100.7
'@ | Set-Content -Encoding UTF8 demo-dns.log
$dnsDemo = Get-Content -Encoding UTF8 "demo-dns.log"
$queryDemo = ($dnsDemo | Where-Object { $_ -match 'query\[A\]' }).Count
@'
1762246800.000    188 172.16.5.10 TCP_MISS/200 4200 GET http://demo-sync.example/pixel.gif - HIER_DIRECT/198.51.100.7 image/gif
1762247220.000    190 172.16.5.10 TCP_MISS/200 4300 GET http://demo-sync.example/pixel.gif - HIER_DIRECT/198.51.100.7 image/gif
'@ | Set-Content -Encoding UTF8 demo-proxy.log
$sumDemo = 0
Get-Content -Encoding UTF8 "demo-proxy.log" | ForEach-Object {
  $parts = $_ -split '\s+'
  if ($parts[6] -match 'demo-sync\.example') { $sumDemo += [int]$parts[4] }
}
"Démo DNS prête pour compter des requêtes : $queryDemo ligne(s)."
"Démo proxy prête pour sommer des octets : $sumDemo octets."
```

## Visionneuse du site

Dans la visionneuse, filtre d’abord sur des mots génériques comme « query », « NXDOMAIN », « TCP_DENIED » ou « UFW BLOCK », puis relis la ligne entière pour garder l’adresse, le port et le domaine ensemble.