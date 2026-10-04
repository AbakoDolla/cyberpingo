# Guide de l’évaluation : incident sur un serveur web Linux

> Cadre et limites
>
> Toutes les données de ce labo sont fictives.
> Tu analyses des exports figés et tu ne touches à aucun vrai serveur.
> Ne télécharge jamais un script trouvé dans un journal sans l’avoir lu et ne l’exécute jamais sur un système important.

## Méthode

1. Commence par l’ordre chronologique : requêtes web, traces SSH, puis indices de persistance.
2. Pour chaque étape sensible, confirme ton hypothèse avec une deuxième preuve dans un autre export.
3. Les heures sont en UTC dans tous les fichiers. Quand une question demande une durée, relève d’abord les deux horodatages exacts.
4. Pour les questions de confinement et d’ordre des actions, appuie-toi sur la leçon de réponse à incident : l’ordre des gestes compte autant que les gestes eux-mêmes.

## Variante visionneuse du site

Dans la visionneuse, tape un mot ou un nombre pour ne garder que les lignes qui le contiennent. Tu peux tester avec des exemples génériques comme « failed », « accepted », « sudo » ou « error », puis relire les lignes restantes par famille de preuve.

## Commandes utiles avec Git Bash

```bash
cat > demo-auth.log <<'EOF'
Jun 14 08:15:00 lab sshd[1201]: Failed password for invalid user demo from 192.168.70.8 port 41000 ssh2
Jun 14 08:16:10 lab sshd[1202]: Accepted password for demo from 192.168.70.9 port 41010 ssh2
Jun 14 08:20:00 lab sudo[1210]: demo : TTY=pts/0 ; PWD=/home/demo ; USER=root ; COMMAND=/usr/bin/id
EOF
auth_demo=$(grep -nE 'Failed password|Accepted password|sudo' demo-auth.log | wc -l)
cat > demo-acces.log <<'EOF'
192.168.70.9 - - [14/Jun/2026:08:15:10 +0000] "POST /centre/upload.php HTTP/1.1" 200 312 "-" "DemoAgent/1.0"
192.168.70.9 - - [14/Jun/2026:08:16:00 +0000] "GET /centre/outils.php?cmd=id HTTP/1.1" 200 81 "-" "DemoAgent/1.0"
EOF
web_demo=$(grep -nE 'POST /centre/upload.php|cmd=' demo-acces.log | wc -l)
printf 'Démo incident prête pour relier des événements auth : %s ligne(s).\nDémo incident prête pour relier un upload et un appel web : %s ligne(s).\n' "$auth_demo" "$web_demo"
```

## Commandes utiles avec Windows PowerShell

```powershell
@'
Jun 14 08:15:00 lab sshd[1201]: Failed password for invalid user demo from 192.168.70.8 port 41000 ssh2
Jun 14 08:16:10 lab sshd[1202]: Accepted password for demo from 192.168.70.9 port 41010 ssh2
Jun 14 08:20:00 lab sudo[1210]: demo : TTY=pts/0 ; PWD=/home/demo ; USER=root ; COMMAND=/usr/bin/id
'@ | Set-Content -Encoding UTF8 demo-auth.log
$authDemo = (Get-Content -Encoding UTF8 "demo-auth.log" | Select-String 'Failed password|Accepted password|sudo').Count
@'
192.168.70.9 - - [14/Jun/2026:08:15:10 +0000] "POST /centre/upload.php HTTP/1.1" 200 312 "-" "DemoAgent/1.0"
192.168.70.9 - - [14/Jun/2026:08:16:00 +0000] "GET /centre/outils.php?cmd=id HTTP/1.1" 200 81 "-" "DemoAgent/1.0"
'@ | Set-Content -Encoding UTF8 demo-acces.log
$webDemo = (Get-Content -Encoding UTF8 "demo-acces.log" | Select-String 'POST /centre/upload.php|cmd=').Count
"Démo incident prête pour relier des événements auth : $authDemo ligne(s)."
"Démo incident prête pour relier un upload et un appel web : $webDemo ligne(s)."
```

## Exemple générique, avec des valeurs inventées et sans rapport avec ce labo

```bash
echo $(( ($(date -u -d "2026-06-14T10:05:00Z" +%s) - $(date -u -d "2026-06-14T08:15:00Z" +%s)) / 60 ))
```

```powershell
(New-TimeSpan -Start ([datetime]'2026-06-14T08:15:00Z') -End ([datetime]'2026-06-14T10:05:00Z')).TotalMinutes
```

## Repères

Un fichier ajouté dans l’arborescence web et un fichier du site dont l’empreinte change ne racontent pas la même chose. Le premier décrit le point d’entrée visible ; le second documente l’altération du site existant.
