# Guide du TP 4 : sessions, jetons JWT et mots de passe

> Cadre et limites
>
> Toutes les données de ce laboratoire sont fictives et figées.
> Tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.
> Les exemples ci-dessous utilisent des valeurs inventées, pas celles du labo.

## Lire un JWT sans le confondre avec un secret

Un JWT signé en JWS contient trois parties séparées par des points : en-tête, charge utile, signature. Les deux premières parties sont simplement encodées en base64url. Elles sont lisibles ; elles ne chiffrent rien.

## Calculer une signature HMAC sur un exemple inventé

```bash
cat > demo-jwt.txt <<'EOF'
X-01;eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJhdWQiOiJkZW1vLWFwaSIsImlhdCI6MTc2MjQxNjQwMCwiZXhwIjoxNzYyNDE3MDAwfQ.n9lbSXI8fNfn73uQYxCyeK7Q5jpcFviwoTq1yRCLqbA
EOF
header=$(cut -d';' -f2 demo-jwt.txt | cut -d'.' -f1 | tr '_-' '/+' | awk '{ pad=(4-length($0)%4)%4; printf "%s", $0; for(i=0;i<pad;i++) printf "=" }' | base64 -d)
body=$(cut -d';' -f2 demo-jwt.txt | cut -d'.' -f1-2)
sig=$(printf '%s' "$body" | openssl dgst -sha256 -binary -hmac 'secret-guide-demo' | openssl base64 -A | tr '+/' '-_' | tr -d '=')
printf 'Démo JWT prête : %s partie(s), signature calculée sur un exemple inventé.\n' "$(printf '%s' "$body.$sig" | awk -F'.' '{print NF}')"
printf 'En-tête décodé : %s\n' "$header"
```

```powershell
@'
X-01;eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJhdWQiOiJkZW1vLWFwaSIsImlhdCI6MTc2MjQxNjQwMCwiZXhwIjoxNzYyNDE3MDAwfQ.n9lbSXI8fNfn73uQYxCyeK7Q5jpcFviwoTq1yRCLqbA
'@ | Set-Content -Encoding UTF8 demo-jwt.txt
$jwt = (Get-Content -Encoding UTF8 demo-jwt.txt).Split(';')[1]
$parts = $jwt.Split('.')
$padded = $parts[0].Replace('-', '+').Replace('_', '/')
while (($padded.Length % 4) -ne 0) { $padded += '=' }
$header = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($padded))
$body = "$($parts[0]).$($parts[1])"
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [Text.Encoding]::UTF8.GetBytes('secret-guide-demo')
$sigBytes = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body))
$sig = [Convert]::ToBase64String($sigBytes).TrimEnd('=').Replace('+','-').Replace('/','_')
"Démo JWT prête : $($parts.Count) partie(s), signature calculée sur un exemple inventé."
"En-tête décodé : $header"
```

## Lire un journal de sessions

Quand tu relis « sessions.log », trie les événements par identifiant de session puis regarde trois points : l’identifiant change-t-il à la connexion, y a-t-il encore des requêtes acceptées après « logout », et un trou de plus de 15 minutes est-il pourtant accepté ?

## Lire un stockage de mots de passe

Repère d’abord les préfixes et les paramètres numériques. Un format qui paraît moderne peut pourtant devenir non conforme si son coût ou son nombre d’itérations est trop faible.

## Visionneuse du site

Filtre d’abord sur des mots génériques comme « logout », « login », « alg », « aud », « exp » ou « pbkdf2 », puis relis la ligne entière avant de conclure.
