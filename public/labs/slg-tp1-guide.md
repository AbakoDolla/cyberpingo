# Guide du TP 1 : lire, normaliser et dater des journaux de formats différents

> Cadre et limites
>
> Toutes les données de ce laboratoire sont fictives et figées.
> Tu travailles sur des exports en lecture seule.
> Ne lance jamais une commande de démonstration sur un système qui ne t’appartient pas.

## Reconnaître un format

- Un syslog traditionnel ressemble à « Mar 10 08:15:00 hôte programme: message » : il n’a ni année ni fuseau.
- Un fichier JSON lignes contient un objet JSON par ligne.
- Un journal web nginx combined met la requête entre guillemets et le code juste après.
- Un journal RFC 5424 commence par « <PRI>1 » et porte un horodatage complet en UTC.

## Aligner les heures en UTC

Quand l’énoncé dit qu’un syslog est écrit en UTC+01:00, retranche une heure pour le comparer à un journal déjà en UTC. Fais toujours ce calcul avant de compter ou d’ordonner des événements.

## Bash ou Git Bash

```bash
cat > demo-syslog.log <<'EOF'
Nov 02 09:01:05 demo-host sshd[101]: Failed password for invalid user test from 198.51.100.9 port 51011 ssh2
Nov 02 09:02:15 demo-host sshd[102]: Failed password for invalid user test from 198.51.100.9 port 51021 ssh2
Nov 02 09:03:55 demo-host cron[201]: (root) CMD (run-parts /etc/cron.hourly)
EOF
sshd_demo=$(grep -c ' sshd' demo-syslog.log)
cat > demo-app.jsonl <<'EOF'
{"ts":"2025-11-02T08:01:00Z","level":"error","user":"awa","action":"auth.login.failed"}
{"ts":"2025-11-02T08:02:00Z","level":"info","user":"awa","action":"booking.view"}
EOF
errors_demo=$(grep -c '"level":"error"' demo-app.jsonl)
printf 'Démo syslog prête pour compter un programme : %s ligne(s).\nDémo JSON prête pour compter un niveau : %s ligne(s).\n' "$sshd_demo" "$errors_demo"
```

## PowerShell 5.1

Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.

```powershell
@'
Nov 02 09:01:05 demo-host sshd[101]: Failed password for invalid user test from 198.51.100.9 port 51011 ssh2
Nov 02 09:02:15 demo-host sshd[102]: Failed password for invalid user test from 198.51.100.9 port 51021 ssh2
Nov 02 09:03:55 demo-host cron[201]: (root) CMD (run-parts /etc/cron.hourly)
'@ | Set-Content -Encoding UTF8 demo-syslog.log
$syslogDemo = Get-Content -Encoding UTF8 "demo-syslog.log"
$sshdDemo = @($syslogDemo | Where-Object { $_ -match ' sshd\[' }).Count
@'
{"ts":"2025-11-02T08:01:00Z","level":"error","user":"awa","action":"auth.login.failed"}
{"ts":"2025-11-02T08:02:00Z","level":"info","user":"awa","action":"booking.view"}
'@ | Set-Content -Encoding UTF8 demo-app.jsonl
$errorDemo = @(Get-Content -Encoding UTF8 "demo-app.jsonl" | Where-Object { $_ -match '"level":"error"' }).Count
"Démo syslog prête pour compter un programme : $sshdDemo ligne(s)."
"Démo JSON prête pour compter un niveau : $errorDemo ligne(s)."
```

## Visionneuse du site

Dans la visionneuse, filtre d’abord sur des mots génériques comme « error », « failed », « accepted » ou « 404 », puis relis les colonnes utiles sans sauter l’horodatage ni le fuseau.