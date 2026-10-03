# Guide du TP 5 : mises à jour, disques et sauvegardes

> Cadre et limites
>
> Les sorties et le script fournis sont fictifs.
> Tu interprètes des exports déjà produits sur srv-fichiers01.
> N’exécute jamais un script téléchargé sur une machine importante sans l’avoir lu et adapté à ton propre contexte.

## Méthode

1. Dans l’export apt, compte seulement les lignes de paquets. Les mises à jour de sécurité portent le suffixe « -security » dans la provenance.
2. Pour les disques, sépare l’occupation en blocs de l’occupation en inodes. Un disque presque plein et un disque presque à court d’inodes ne racontent pas la même chose.
3. Pour fstab et findmnt, applique la règle du guide : un point de montage temporaire, comme un dossier de travail temporaire, ne devrait pas permettre l’exécution directe.
4. Dans le journal de sauvegarde, seuls les statuts SUCCESS comptent comme nuits réellement réussies.
5. Pour les instantanés, applique exactement la politique donnée dans l’énoncé : dans ce labo, chaque instantané porte une seule étiquette qui dit à quelle règle de conservation il appartient, et tu retiens les plus récents de chaque catégorie sans inventer d’autres règles.
6. Pour le script, cherche d’abord les lignes qui manipulent des chemins avec des espaces ou qui suppriment sans étape de vérification.

## Visionneuse du site

- Dans la visionneuse, saisis un mot qui se répète dans le type de ligne que tu cherches, par exemple « security », « fail » ou « backup ».
- Pour vérifier une option de montage ou un tag de rétention, filtre sur un mot général comme « defaults », « nodev », « daily » ou « monthly », puis relis les lignes restantes.

## Exemples de commandes (données inventées)

```bash
cat > demo-maj.txt <<'EOF'
openssl/demo-security 3.1 all
openssh-server/demo-updates 9.9 amd64
curl/demo-security 8.8 amd64
EOF
grep -E 'openssh-server|security' demo-maj.txt

cat > demo-disques.txt <<'EOF'
/dev/vda1 40G 35G 5G 88% /
tmpfs 2.0G 20M 2.0G 1% /work
EOF
grep -E '^/dev|^tmpfs' demo-disques.txt

cat > demo-fstab.txt <<'EOF'
tmpfs /work tmpfs rw,nosuid,nodev 0 0
EOF
grep -n 'tmpfs' demo-fstab.txt

cat > demo-backup.log <<'EOF'
2026-06-01T02:00:00Z | SUCCESS | taille=2.0G
2026-06-02T02:00:00Z | FAIL | erreur=repository locked
EOF
grep 'FAIL' demo-backup.log

cat > demo-snaps.txt <<'EOF'
snap-a daily /data
snap-b weekly /data
snap-c monthly /data
EOF
grep -E 'daily|weekly|monthly' demo-snaps.txt | head -n 2

cat > demo-script.sh <<'EOF'
#!/usr/bin/env bash
restic backup "$HOME/demo"
restic forget --keep-last 3
EOF
grep -nE 'restic|backup' demo-script.sh
```

## Exemples de commandes PowerShell 5.1 (données inventées)

```powershell
$demoMaj = @(
  'openssl/demo-security 3.1 all',
  'openssh-server/demo-updates 9.9 amd64',
  'curl/demo-security 8.8 amd64'
)
Set-Content -Encoding UTF8 "demo-maj.txt" $demoMaj
Get-Content -Encoding UTF8 "demo-maj.txt" | Select-String 'openssh-server|security'

$demoDisques = @(
  '/dev/vda1 40G 35G 5G 88% /',
  'tmpfs 2.0G 20M 2.0G 1% /work'
)
Set-Content -Encoding UTF8 "demo-disques.txt" $demoDisques
Get-Content -Encoding UTF8 "demo-disques.txt" | Select-String '^/dev|^tmpfs'

Set-Content -Encoding UTF8 "demo-fstab.txt" 'tmpfs /work tmpfs rw,nosuid,nodev 0 0'
Get-Content -Encoding UTF8 "demo-fstab.txt" | Select-String 'tmpfs'

$demoBackup = @(
  '2026-06-01T02:00:00Z | SUCCESS | taille=2.0G',
  '2026-06-02T02:00:00Z | FAIL | erreur=repository locked'
)
Set-Content -Encoding UTF8 "demo-backup.log" $demoBackup
Get-Content -Encoding UTF8 "demo-backup.log" | Select-String 'FAIL'

$demoSnaps = @(
  'snap-a daily /data',
  'snap-b weekly /data',
  'snap-c monthly /data'
)
Set-Content -Encoding UTF8 "demo-snaps.txt" $demoSnaps
Get-Content -Encoding UTF8 "demo-snaps.txt" | Select-String 'daily|weekly|monthly' | Select-Object -First 2

$demoScript = @(
  '#!/usr/bin/env bash',
  'restic backup "$HOME/demo"',
  'restic forget --keep-last 3'
)
Set-Content -Encoding UTF8 "demo-script.sh" $demoScript
Get-Content -Encoding UTF8 "demo-script.sh" | Select-String 'restic|backup'
```

Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.

## Sur un vrai serveur, seulement si tu l’administres vraiment

```bash
# hors-test
apt list --upgradable
df -h
restic snapshots
```

## Règles générales à appliquer

- Politique de rétention pour ce TP : conserver au plus 7 instantanés daily, 4 weekly et 2 monthly.
- Dans la vraie commande « restic forget », un même instantané peut satisfaire plusieurs règles de conservation. Pour cet exercice, nous utilisons une version simplifiée où chaque instantané porte une seule étiquette et compte dans une seule catégorie.
- Règle 3-2-1 : trois copies au total, production comprise, sur au moins deux supports différents, dont une hors site.
- Une copie ne compte que si son statut est actif et si sa dernière synchronisation date de moins de 8 jours à la date d’audit.
- Sur un point de montage temporaire, l’absence de « noexec » reste un signal de risque.
