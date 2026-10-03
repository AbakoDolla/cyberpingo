# Guide du TP 4 : intégrité, chiffrement et certificats

> Cadre et limites
>
> Tous les fichiers et certificats de ce laboratoire sont fictifs.
> Vérifie uniquement les fichiers fournis ici et ne remplace jamais une vraie vérification de sécurité par un exemple de labo.
> Si tu utilises un service web de décodage, n’y colle jamais une vraie donnée sensible.

## Vérifier une empreinte SHA-256

### Windows PowerShell

```powershell
Get-FileHash -Algorithm SHA256 fond-tp4-outil-*.txt
```

### Git Bash ou Linux avec sha256sum

```bash
sha256sum fond-tp4-outil-*.txt
```

### OpenSSL, utile si sha256sum n’est pas disponible

```bash
for fichier in fond-tp4-outil-*.txt; do openssl dgst -sha256 -r "$fichier"; done
```

## Décoder un message

### Base64 depuis le carnet du labo avec PowerShell

```powershell
$b64 = ((Select-String -Path "fond-tp4-messages-a-decoder.log" -Pattern '^message_base64 = ').Line -split ' = ')[1]
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64))
```

### Base64 depuis le carnet du labo avec Git Bash ou Linux

```bash
awk -F' = ' '/^message_base64 = / {print $2}' fond-tp4-messages-a-decoder.log | base64 -d
```

### Hexadécimal depuis le carnet du labo avec PowerShell

```powershell
$hex = ((Select-String -Path "fond-tp4-messages-a-decoder.log" -Pattern '^message_hex = ').Line -split ' = ')[1]
$bytes = New-Object byte[] ($hex.Length / 2)
for ($i = 0; $i -lt $hex.Length; $i += 2) { $bytes[$i / 2] = [Convert]::ToByte($hex.Substring($i, 2), 16) }
[Text.Encoding]::UTF8.GetString($bytes)
```

### Hexadécimal depuis le carnet du labo avec Git Bash ou Linux

```bash
awk -F' = ' '/^message_hex = / {print $2}' fond-tp4-messages-a-decoder.log | xxd -r -p
```

### César depuis le carnet du labo avec PowerShell

```powershell
$line = (Select-String -Path "fond-tp4-messages-a-decoder.log" -Pattern '^message_cesar_decalage_').Line
$shift = [int]([regex]::Match($line, 'decalage_(\d+)').Groups[1].Value)
$cipher = ($line -split ' = ')[1]
$out = -join ($cipher.ToCharArray() | ForEach-Object {
  if ($_ -ge 'a' -and $_ -le 'z') { [char]((((([int][char]$_) - 97 - $shift + 26) % 26) + 97)) } else { $_ }
})
$out
```

### César depuis le carnet du labo avec Git Bash ou Linux

```bash
awk -F' = ' '/^message_cesar_decalage_7 = / {print $2}' fond-tp4-messages-a-decoder.log | tr 'a-z' 't-zabcdefghijklmnopqrs'
```

### Dates et jours restants depuis le certificat du labo avec PowerShell

```powershell
$line = (Select-String -Path "fond-tp4-certificats.log" -Pattern 'Not After :').Line | Select-Object -First 1
$dateText = ($line -replace '.*Not After : ', '').Trim()
$expiry = [datetime]::ParseExact($dateText, 'MMM dd HH:mm:ss yyyy ''GMT''', [System.Globalization.CultureInfo]::InvariantCulture)
$reference = [datetime]'2026-03-16T00:00:00Z'
(New-TimeSpan -Start $reference -End $expiry).Days
```

### Dates et jours restants depuis le certificat du labo avec Git Bash ou Linux

```bash
date_text=$(awk '/Not After :/ {sub(/^.*Not After : /, ""); print; exit}' fond-tp4-certificats.log)
expiry=$(date -u -d "$date_text" +%F)
echo "$expiry"
echo $(( ($(date -u -d "$expiry" +%s) - $(date -u -d '2026-03-16' +%s)) / 86400 ))
```

## Mémo

- Une empreinte hexadécimale a une longueur fixe qui aide à reconnaître sa famille.
- Pour un certificat, vérifie séparément la date de fin, les SAN, l’algorithme de signature et la taille de clé.
- Un manifeste d’intégrité doit être comparé aux octets réellement téléchargés, pas à une copie supposée saine.