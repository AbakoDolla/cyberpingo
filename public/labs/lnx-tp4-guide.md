# Guide du TP 4 : réseau, SSH et pare-feu

> Cadre et limites
>
> Toutes les données de ce laboratoire sont fictives.
> Tu lis des exports déjà produits sur srv-web01, sans toucher à un vrai serveur.
> Ne modifie jamais un vrai fichier sshd_config, ne lance pas de vraie ouverture de port et n’essaie aucun mot de passe sur un système qui n’est pas le tien.

## Méthode

1. Dans le fichier réseau, pars de la route par défaut, puis relève l’interface, l’adresse locale et le préfixe du réseau.
2. Dans la configuration SSH concaténée, applique la règle « première valeur obtenue = valeur effective » pour les options globales. Ensuite, seulement si un bloc Match s’applique, lis ses options dans l’ordre. L’ordre d’affichage d’un grep ne prouve donc pas l’ordre de lecture de sshd.
3. Dans auth.log, distingue les réussites légitimes par clé des échecs par mot de passe. Pour retrouver la première réussite par mot de passe, trie mentalement par heure et ignore les clés publiques.
4. Dans le pare-feu, la première règle qui correspond décide du verdict. Une règle générale placée plus bas ne change rien si une règle plus haute a déjà tranché.
5. Pour les clés SSH, applique des règles générales : une clé RSA de moins de 3072 bits est trop courte pour l’administration et une clé d’administration exposée sans restriction « from= » mérite d’être revue.

## Visionneuse du site

- Dans la visionneuse, tape un mot ou un nombre pour ne garder que les lignes qui le contiennent, par exemple « Failed password », « Accepted », « ALLOW » ou « DENY ».
- Pour une configuration, filtre sur le nom général d’une directive ou d’une famille d’options, puis relis quelques lignes avant et après pour comprendre le contexte.

## Exemples de commandes (données inventées)

```bash
cat > demo-reseau.txt <<'EOF'
default via 192.168.50.1 dev enp0s3
192.168.50.0/27 dev enp0s3 proto kernel scope link src 192.168.50.12
EOF
grep -E '^default via|^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+' demo-reseau.txt

cat > demo-sshd.txt <<'EOF'
# ===== /etc/ssh/sshd_config =====
Include /etc/ssh/sshd_config.d/*.conf
# ===== /etc/ssh/sshd_config.d/10-demo.conf =====
Port 2222
PermitRootLogin forced-commands-only
Match User demo
    PasswordAuthentication no
EOF
grep -nE '^(Port|PermitRootLogin|PasswordAuthentication|Match )' demo-sshd.txt

cat > demo-auth.log <<'EOF'
Jun 17 06:11:00 lab sshd[1201]: Failed password for invalid user test from 192.168.60.8 port 41000 ssh2
Jun 17 06:11:11 lab sshd[1202]: Failed password for demo from 192.168.60.8 port 41010 ssh2
Jun 17 06:12:00 lab sshd[1203]: Accepted password for demo from 192.168.60.9 port 41020 ssh2
EOF
top_ip=$(grep 'Failed password' demo-auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -nr | head -n 1 | awk '{print $2}')
success_line=$(grep 'Accepted password' demo-auth.log | head -n 1)
printf 'Démo auth prête pour compter les échecs par adresse : %s.\nDémo auth prête pour relire une réussite par mot de passe : %s.\n' "$top_ip" "$success_line"

cat > demo-ufw.txt <<'EOF'
[ 1] 2222/tcp ALLOW IN 192.168.50.0/26
[ 2] 22/tcp DENY IN Anywhere
EOF
grep -nE '^\[[[:space:]]*[0-9]+\]' demo-ufw.txt

cat > demo-keys.txt <<'EOF'
from="192.168.50.10" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest demo-ed25519 | bits=256 | SHA256:AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdeFG
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDemo demo-rsa | bits=2048 | SHA256:QwErTyUiOpAsDfGhJkLzXcVbNm1234567890qwertYU
EOF
grep -E 'from=|bits=|SHA256:' demo-keys.txt
```

## Exemples de commandes PowerShell 5.1 (données inventées)

```powershell
$demoReseau = @(
  'default via 192.168.50.1 dev enp0s3',
  '192.168.50.0/27 dev enp0s3 proto kernel scope link src 192.168.50.12'
)
Set-Content -Encoding UTF8 "demo-reseau.txt" $demoReseau
Get-Content -Encoding UTF8 "demo-reseau.txt" | Select-String 'default via|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+'

$demoSsh = @(
  '# ===== /etc/ssh/sshd_config =====',
  'Include /etc/ssh/sshd_config.d/*.conf',
  '# ===== /etc/ssh/sshd_config.d/10-demo.conf =====',
  'Port 2222',
  'PermitRootLogin no',
  'Match User demo',
  '    PasswordAuthentication no'
)
Set-Content -Encoding UTF8 "demo-sshd.txt" $demoSsh
Get-Content -Encoding UTF8 "demo-sshd.txt" | Select-String '^(Port|PermitRootLogin|PasswordAuthentication|Match )'

$demoAuth = @(
  'Jun 17 06:11:00 lab sshd[1201]: Failed password for invalid user test from 192.168.60.8 port 41000 ssh2',
  'Jun 17 06:11:11 lab sshd[1202]: Failed password for demo from 192.168.60.8 port 41010 ssh2',
  'Jun 17 06:12:00 lab sshd[1203]: Accepted password for demo from 192.168.60.9 port 41020 ssh2'
)
Set-Content -Encoding UTF8 "demo-auth.log" $demoAuth
$topIp = Get-Content -Encoding UTF8 "demo-auth.log" | Select-String 'Failed password' | ForEach-Object { ($_ -split ' ')[-4] } | Group-Object | Sort-Object Count -Descending | Select-Object -First 1
$successLine = Get-Content -Encoding UTF8 "demo-auth.log" | Select-String 'Accepted password' | Select-Object -First 1
"Démo auth prête pour compter les échecs par adresse : $($topIp.Name)."
"Démo auth prête pour relire une réussite par mot de passe : $($successLine.Line)."

$demoUfw = @(
  '[ 1] 2222/tcp ALLOW IN 192.168.50.0/26',
  '[ 2] 22/tcp DENY IN Anywhere'
)
Set-Content -Encoding UTF8 "demo-ufw.txt" $demoUfw
Get-Content -Encoding UTF8 "demo-ufw.txt" | Select-String '^\[[ ]*[0-9]+\]'

$demoKeys = @(
  'from="192.168.50.10" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest demo-ed25519 | bits=256 | SHA256:AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdeFG',
  'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDemo demo-rsa | bits=2048 | SHA256:QwErTyUiOpAsDfGhJkLzXcVbNm1234567890qwertYU'
)
Set-Content -Encoding UTF8 "demo-keys.txt" $demoKeys
Get-Content -Encoding UTF8 "demo-keys.txt" | Select-String 'from=|bits=|SHA256:'
```

Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.

## Sur un vrai serveur, seulement si tu l’administres vraiment

```bash
# hors-test
ss -tulpn | grep sshd
sshd -T | grep -E 'port|permitrootlogin|passwordauthentication'
sudo ufw status numbered
```
