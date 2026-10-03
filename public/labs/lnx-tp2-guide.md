# Guide du TP 2 : auditer les droits, les comptes et sudo

> Cadre et limites
>
> Les comptes et empreintes fournis ici sont fictifs.
> Tu audites des exports en lecture seule et tu ne modifies aucun vrai compte.
> N’essaie jamais un mot de passe ou une commande sudo sur une machine qui n’est pas la tienne.

## Repères utiles

- Dans « /etc/passwd », le troisième champ est l’UID et le septième le shell. Par convention, les comptes de personnes ont un UID de 1000 ou plus et un vrai shell de connexion ; les comptes système ont un UID plus bas ou le shell « nologin ».
- Dans « /etc/shadow », un champ vide signifie aucun mot de passe, « ! » ou « * » signifient un compte verrouillé.
- Préfixes utiles des empreintes : « $1$ » pour md5-crypt, « $5$ » pour sha256-crypt, « $6$ » pour sha512-crypt, « $y$ » pour yescrypt.
- Pour convertir un mode symbolique en octal, additionne 4 pour lecture, 2 pour écriture et 1 pour exécution dans chaque triplet.
- Liste de référence des SUID normaux de ce labo : /usr/bin/passwd, /usr/bin/su, /usr/bin/chfn, /usr/bin/chsh, /usr/bin/gpasswd, /usr/bin/mount, /usr/bin/umount, /usr/bin/newgrp, /usr/bin/sudo, /usr/lib/dbus-1.0/dbus-daemon-launch-helper, /usr/lib/polkit-1/polkit-agent-helper-1, /usr/lib/openssh/ssh-keysign.

## Bash ou Git Bash

```bash
cat > demo-shadow.txt <<'EOF'
demoapp::19810:0:90:7:::
svc-queue:!:19800:0:99999:7:::
analyste:$6$demo$abcdef:19811:0:90:7:::
EOF
empty_demo=$(awk -F: '$2=="" {print $1}' demo-shadow.txt | paste -sd ',' -)
cat > demo-perms.txt <<'EOF'
-rw-r--r-- 1 root root 1200 2025-11-10 09:00 appli.conf
-rw-rw-rw- 1 root root  320 2025-11-10 09:02 notes.tmp
EOF
world_demo=$(awk '/^-.*w..w..w./ {print $NF; exit}' demo-perms.txt)
printf 'Démo shadow prête pour un compte sans mot de passe : %s.\nDémo permissions prête pour un fichier modifiable par tous : %s.\n' "$empty_demo" "$world_demo"
```

## PowerShell 5.1

Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.

```powershell
@'
demoapp::19810:0:90:7:::
svc-queue:!:19800:0:99999:7:::
analyste:$6$demo$abcdef:19811:0:90:7:::
'@ | Set-Content -Encoding UTF8 demo-shadow.txt
$empty = Get-Content -Encoding UTF8 "demo-shadow.txt" | ForEach-Object { $p = $_ -split ':'; if ($p[1] -eq '') { $p[0] } }
@'
-rw-r--r-- 1 root root 1200 2025-11-10 09:00 appli.conf
-rw-rw-rw- 1 root root  320 2025-11-10 09:02 notes.tmp
'@ | Set-Content -Encoding UTF8 demo-perms.txt
$worldWritable = Get-Content -Encoding UTF8 "demo-perms.txt" | Where-Object {
  if ($_ -match '^[dl-][rwxst-]{9}') {
    $mode = ($_ -split '\s+')[0]
    $mode[2] -eq 'w' -and $mode[5] -eq 'w' -and $mode[8] -eq 'w'
  } else {
    $false
  }
} | Select-Object -First 1
$worldWritableName = if ($worldWritable) { ($worldWritable -split '\s+')[-1] } else { '' }
"Démo shadow prête pour un compte sans mot de passe : $($empty -join ',')."
"Démo permissions prête pour un fichier modifiable par tous : $worldWritableName."
```

## Visionneuse du site

Dans la visionneuse, tape une chaîne simple pour ne garder que les lignes qui la contiennent, par exemple « sudo », « bin/bash » ou « error ». Relis ensuite les colonnes utiles sans supposer que le premier résultat est le bon.