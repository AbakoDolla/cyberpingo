# Guide de l’évaluation

> Cadre et limites
>
> Toutes les données de ce projet sont fictives.
> Tu analyses des exports figés et tu ne te connectes à aucune machine du scénario.
> Ne rejoue jamais une commande vue dans un journal sur un système réel qui ne t’appartient pas.

## Méthode

1. Lis d’abord la grille de triage. Elle fixe les trois qualifications, la valeur de certitude, la formule de priorité et les bornes.
2. Pour chaque alerte, cherche au moins un fait direct, puis une corroboration dans une autre source si tu veux conclure à un vrai positif.
3. Quand deux formats utilisent des horodatages différents, convertis-les d’abord en UTC avant de trier la chronologie.
4. Distingue toujours les faits, les hypothèses et les décisions de confinement dans ton rapport.

## Variante visionneuse du site

Tape des mots génériques comme `failed`, `accepted`, `connect`, `query`, `post`, `404` ou `encoded` pour réduire le bruit, puis relis les lignes voisines dans la même source.

## Commandes utiles avec Git Bash

```bash
cat > demo-alertes.csv <<'EOF'
AlertId;Source;Value
A-01;dns;demo-sync.example
A-02;proxy;demo-sync.example:8443
A-03;web;POST /upload.php
EOF
cat > demo-web.log <<'EOF'
198.51.100.10 - - [01/Jun/2026:08:00:00 +0000] "POST /upload.php HTTP/1.1" 200 210 "-" "Demo/1.0"
198.51.100.10 - - [01/Jun/2026:08:01:00 +0000] "GET /upload.php?cmd=id HTTP/1.1" 200 81 "-" "Demo/1.0"
EOF
cross_demo=$(grep -c 'demo-sync.example' demo-alertes.csv)
web_demo=$(grep -c 'cmd=' demo-web.log)
printf 'Demo recoupement pret : %s fait(s).\nDemo execution web preparee : %s ligne(s).\n' "$cross_demo" "$web_demo"
```

```powershell
@'
AlertId;Source;Value
A-01;dns;demo-sync.example
A-02;proxy;demo-sync.example:8443
A-03;web;POST /upload.php
'@ | Set-Content -Encoding UTF8 demo-alertes.csv
@'
198.51.100.10 - - [01/Jun/2026:08:00:00 +0000] "POST /upload.php HTTP/1.1" 200 210 "-" "Demo/1.0"
198.51.100.10 - - [01/Jun/2026:08:01:00 +0000] "GET /upload.php?cmd=id HTTP/1.1" 200 81 "-" "Demo/1.0"
'@ | Set-Content -Encoding UTF8 demo-web.log
$crossDemo = (Get-Content -Encoding UTF8 demo-alertes.csv | Select-String 'demo-sync.example').Count
$webDemo = (Get-Content -Encoding UTF8 demo-web.log | Select-String 'cmd=').Count
"Demo recoupement pret : $crossDemo fait(s)."
"Demo execution web preparee : $webDemo ligne(s)."
```

## Calculer une priorité sur des données inventées

```bash
awk 'BEGIN { gravite=3; criticite=4; certitude=2; print gravite * criticite * certitude }'
```

```powershell
$gravite = 3
$criticite = 4
$certitude = 2
$gravite * $criticite * $certitude
```

## Repère

Une alerte peut être bruyante sans être confirmée. L’objectif du triage est de prouver ce qui est arrivé, pas d’empiler les soupçons.
