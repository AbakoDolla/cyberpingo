# Guide de l’évaluation : auditer un serveur Linux et rédiger le rapport

> Cadre et limites
>
> Toutes les preuves de ce projet sont fictives.
> Tu travailles en lecture seule sur des exports déjà collectés.
> N’applique jamais une recommandation de ce guide sur un système réel sans validation préalable.

## Méthode

1. Lis d’abord la grille « lnx-proj-grille-audit.md » : c’est elle qui fixe les seuils, les poids, la priorité et la maturité.
2. Note toi-même les 24 contrôles à partir des preuves. Ne suppose rien : chaque statut doit être justifié par une ligne ou par un calcul issu des exports.
3. Calcule ensuite les scores du domaine demandé puis le score global. Les actions prioritaires ne se choisissent qu’après avoir identifié les contrôles partiels ou non conformes.

## Variante visionneuse du site

Tape un mot ou un nombre pour ne garder que les lignes qui le contiennent. Tu peux tester avec des exemples génériques comme « security », « restore », « failed » ou « default », puis relire les colonnes utiles dans les lignes restantes.

## Commandes utiles avec Git Bash

```bash
cat > demo-systeme.txt <<'EOF'
openssh-server/demo-security 9.9 amd64 [upgradable from: 9.8]
tmpfs /work tmpfs rw,nosuid,nodev 0 0
net.ipv4.ip_forward = 0
EOF
system_demo=$(grep -nE 'demo-security|tmpfs /work|ip_forward' demo-systeme.txt | wc -l)
cat > demo-risques.txt <<'EOF'
id;controle;vraisemblance;impact;effort
R-1;journalisation;3;4;1
R-2;restauration;2;3;2
EOF
risk_demo=$(awk -F';' 'NR>1 {print $1, $2, $3 * $4, $5}' demo-risques.txt | wc -l)
printf 'Démo audit prête pour filtrer des preuves techniques : %s ligne(s).\nDémo audit prête pour calculer un risque : %s ligne(s).\n' "$system_demo" "$risk_demo"
```

## Commandes utiles avec Windows PowerShell

```powershell
@'
openssh-server/demo-security 9.9 amd64 [upgradable from: 9.8]
tmpfs /work tmpfs rw,nosuid,nodev 0 0
net.ipv4.ip_forward = 0
'@ | Set-Content -Encoding UTF8 demo-systeme.txt
$systemDemo = (Get-Content -Encoding UTF8 "demo-systeme.txt" | Select-String 'demo-security|tmpfs /work|ip_forward').Count
@'
id;controle;vraisemblance;impact;effort
R-1;journalisation;3;4;1
R-2;restauration;2;3;2
'@ | Set-Content -Encoding UTF8 demo-risques.txt
$riskDemo = (Import-Csv -Delimiter ';' -Path "demo-risques.txt" | Select-Object id,controle,vraisemblance,impact,effort).Count
"Démo audit prête pour filtrer des preuves techniques : $systemDemo ligne(s)."
"Démo audit prête pour calculer un risque : $riskDemo ligne(s)."
```

## Exemple générique, avec des valeurs inventées et sans rapport avec ce labo

```bash
awk 'BEGIN { p=13.5; w=20; print int((p / w) * 100 + 0.5) }'
```

```powershell
[math]::Floor(((13.5 / 20) * 100) + 0.5)
```

## Repères

La grille te donne les seuils ; les exports te donnent les faits. Si un score semble surprenant, reviens d’abord aux preuves du contrôle concerné avant de recalculer le domaine entier.
