# TP 3 : lire des résultats Nmap sans deviner

> Cadre et limites : tu analyses uniquement des fichiers fournis ; ne lance jamais un scan sur un système réel sans autorisation écrite.
> Les exemples ci-dessous utilisent des données inventées, hors juin 2026, et ne reprennent aucun hôte du labo.

## 1. Ce que signifient les états

- `open` : un service répond sur le port.
- `closed` : l’hôte répond, mais aucun service n’écoute sur ce port.
- `filtered` : le port reste silencieux ou bloqué ; Nmap ne peut pas confirmer le service.
- Dans ce TP, un comptage de ports ne garde que l’état écrit dans la question.

## 2. Repères utiles avant de comparer

- `25` : SMTP.
- `143` : IMAP.
- `993` : IMAP avec chiffrement implicite.
- `5432` : PostgreSQL.
- `80` et `443` : surface web ; les ports de la plage 8000 à 8999 sont souvent des interfaces web alternatives.
- Pour ce dossier, le mémo classe `22`, `3306` et `5432` dans « administration ou données ».

## 3. Visionneuse du site

Dans la visionneuse, cherche d’abord « Host: », puis « Ports: », puis le nom d’hôte voulu. Dans le fichier greppable, les champs `Host:`, `Status:` et `Ports:` sont séparés par des tabulations. Pour la version XML, cherche `state="filtered"`, `tunnel="ssl"` ou `portid="5432"`. Pour l’heure de départ, cherche `Starting Nmap` dans la sortie normale ou `startstr=` dans le XML.

## 4. Exemple Bash : comparer un mémo et une sortie greppable inventés

```bash
cat > guide-services.txt <<'EOF'
demo-vpn.example | publics=443/https | internes=9443/https-alt | note=admin de secours
demo-mail.example | publics=25/smtp, 143/imap, 993/imap-tls-implicite | internes=aucun | note=messagerie
EOF
cat > guide-scan.gnmap <<'EOF'
Host: 192.0.2.10 (demo-vpn.example)  Status: Up
Host: 192.0.2.10 (demo-vpn.example)  Ports: 443/open/tcp//ssl|http/ExampleProxy 1.0/, 9443/open/tcp//ssl|http/Jetty 9.4/
EOF
grep '^demo-vpn.example ' guide-services.txt | grep 'internes=' | sed 's/.*internes=//; s/ | note=.*//' | tr ',' '\n' | sed 's/^ *//; s#/.*##' | while read -r p; do
  grep 'demo-vpn.example' guide-scan.gnmap | grep '/open/' | grep -q "${p}/open" && echo "demo-vpn.example:${p}"
done
```

## 5. Exemple PowerShell 5.1 : comparer le même cas inventé

```powershell
@(
  'demo-vpn.example | publics=443/https | internes=9443/https-alt | note=admin de secours',
  'demo-mail.example | publics=25/smtp, 143/imap, 993/imap-tls-implicite | internes=aucun | note=messagerie'
) | Set-Content -Encoding UTF8 guide-services.txt
@(
  'Host: 192.0.2.10 (demo-vpn.example)  Status: Up',
  'Host: 192.0.2.10 (demo-vpn.example)  Ports: 443/open/tcp//ssl|http/ExampleProxy 1.0/, 9443/open/tcp//ssl|http/Jetty 9.4/'
) | Set-Content -Encoding UTF8 guide-scan.gnmap
$line = Get-Content -Encoding UTF8 guide-services.txt | Select-String '^demo-vpn\.example ' | Select-Object -First 1
$internes = ($line.Line -split 'internes=')[1] -split ' \| note=' | Select-Object -First 1
$ports = $internes -split ',' | ForEach-Object { ($_ -split '/')[0].Trim() }
$scan = Get-Content -Encoding UTF8 guide-scan.gnmap
$ports | ForEach-Object { if ($scan -match ("{0}/open" -f $_)) { "demo-vpn.example:{0}" -f $_ } }
```

## 6. Exemple Bash : compter les ports filtered dans un XML inventé

```bash
cat > guide-scan.xml <<'EOF'
<nmaprun startstr="Sat Oct 11 06:12:00 2025"><host><status state="up"/><address addr="192.0.2.44" addrtype="ipv4"/><ports><port protocol="tcp" portid="22"><state state="filtered"/></port><port protocol="tcp" portid="443"><state state="open"/></port><port protocol="tcp" portid="9443"><state state="filtered"/></port><port protocol="tcp" portid="3389"><state state="filtered"/></port></ports></host></nmaprun>
EOF
grep -o 'state="filtered"' guide-scan.xml | wc -l
```

## 7. Exemple PowerShell 5.1 : compter les ports filtered dans le même XML inventé

```powershell
'<nmaprun startstr="Sat Oct 11 06:12:00 2025"><host><status state="up"/><address addr="192.0.2.44" addrtype="ipv4"/><ports><port protocol="tcp" portid="22"><state state="filtered"/></port><port protocol="tcp" portid="443"><state state="open"/></port><port protocol="tcp" portid="9443"><state state="filtered"/></port><port protocol="tcp" portid="3389"><state state="filtered"/></port></ports></host></nmaprun>' | Set-Content -Encoding UTF8 guide-scan.xml
((Get-Content -Encoding UTF8 guide-scan.xml -Raw) | Select-String 'state="filtered"' -AllMatches).Matches.Count
```

## 8. Exemple Bash : remettre l’heure de départ au format AAAA-MM-JJ HH:MM:SS

```bash
cat > guide-normal.txt <<'EOF'
# Nmap 7.94 scan initiated Sat Oct 11 06:12:00 2025 as: nmap -sV demo.example
EOF
grep 'scan initiated' guide-normal.txt | sed 's/^# Nmap [0-9.]* scan initiated //' | sed 's/ as:.*$//'
```

## 9. Exemple PowerShell 5.1 : relever cette même heure

```powershell
'# Nmap 7.94 scan initiated Sat Oct 11 06:12:00 2025 as: nmap -sV demo.example' | Set-Content -Encoding UTF8 guide-normal.txt
$line = Get-Content -Encoding UTF8 guide-normal.txt | Select-String 'scan initiated' | Select-Object -First 1
($line.Line -replace '^# Nmap [0-9.]+ scan initiated ', '') -replace ' as:.*$', ''
```

## 10. Méthode à retenir

Commence par identifier les hôtes actifs, puis lis les ports open, closed et filtered sans les mélanger. Croise ensuite le mémo et le scan pour distinguer « attendu », « inattendu » et « interne uniquement ». Quand plusieurs formats existent, le XML reste le plus robuste pour recompter proprement les états et les services grâce à ses balises explicites. La sortie greppable aide à recompter vite, mais seulement si tu respectes ses champs tabulés et ses sous-champs séparés par des slashs.