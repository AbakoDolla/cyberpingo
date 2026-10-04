# Guide du TP 2 : journaux Windows : sessions, comptes et PowerShell

> Cadre et limites
>
> Toutes les données de ce laboratoire sont fictives et figées.
> Tu analyses des exports en lecture seule.
> Ne lance jamais une commande PowerShell venue d’un journal sans l’avoir comprise et sans autorisation.

## Repères utiles

- 4624 = ouverture de session réussie, 4625 = échec, 4720 = compte créé, 4732 = membre ajouté à un groupe, 4740 = compte verrouillé, 1102 = journal effacé.
- Types de session utiles : 2 interactive locale, 3 réseau, 4 batch, 5 service, 10 session distante.
- SousStatus fréquents pour 4625 : 0xC0000064 nom d’utilisateur inexistant, 0xC000006A bon identifiant mais mot de passe incorrect, 0xC0000234 compte verrouillé.
- Une commande après « -EncodedCommand » est en Base64 UTF-16LE.

## Bash ou Git Bash

```bash
cat > demo-securite.csv <<'EOF'
TimeCreatedUtc;EventId;Computer;TargetUserName;LogonType;IpAddress;SubStatus
2025-11-03T08:01:00Z;4625;pc-demo01;awa;10;198.51.100.9;0xC000006A
2025-11-03T08:02:00Z;4624;pc-demo01;awa;10;198.51.100.9;
EOF
fail_demo=$(awk -F';' 'NR>1 && $2==4625 {n++} END{print n+0}' demo-securite.csv)
cat > demo-powershell.jsonl <<'EOF'
{"EventId":4104,"ScriptBlockText":"powershell.exe -EncodedCommand QQB3AGEA"}
EOF
ps_demo=$(grep -c 'EncodedCommand' demo-powershell.jsonl)
printf 'Démo sécurité prête pour compter un type d’événement : %s ligne(s).\nDémo PowerShell prête pour repérer une commande encodée : %s ligne(s).\n' "$fail_demo" "$ps_demo"
```

## PowerShell 5.1

Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.

```powershell
@'
TimeCreatedUtc;EventId;Computer;TargetUserName;LogonType;IpAddress;SubStatus
2025-11-03T08:01:00Z;4625;pc-demo01;awa;10;198.51.100.9;0xC000006A
2025-11-03T08:02:00Z;4624;pc-demo01;awa;10;198.51.100.9;
'@ | Set-Content -Encoding UTF8 demo-securite.csv
$demoRows = Import-Csv "demo-securite.csv" -Delimiter ';'
$failDemo = @($demoRows | Where-Object { $_.EventId -eq '4625' }).Count
@'
{"EventId":4104,"ScriptBlockText":"powershell.exe -EncodedCommand QQB3AGEA"}
'@ | Set-Content -Encoding UTF8 demo-powershell.jsonl
$encodedDemo = @(Get-Content -Encoding UTF8 "demo-powershell.jsonl" | Where-Object { $_ -match 'EncodedCommand' }).Count
"Démo sécurité prête pour compter un type d’événement : $failDemo ligne(s)."
"Démo PowerShell prête pour repérer une commande encodée : $encodedDemo ligne(s)."
```

## Visionneuse du site

Dans la visionneuse, filtre d’abord sur des mots génériques comme « 4625 », « powershell », « dns » ou « 1102 », puis relis le contexte complet de chaque ligne retenue.