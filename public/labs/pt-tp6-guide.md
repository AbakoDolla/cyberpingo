# Guide du TP 6 : relire un journal de mission proprement

> Cadre et limites : tu analyses uniquement des fichiers fournis et fictifs ; ne teste jamais un système réel sans autorisation écrite.
> Les exemples ci-dessous utilisent des valeurs inventées, pas celles du labo.

## 1. Ce qu’il faut vérifier

Une relecture de mission répond à trois questions : les règles d’engagement ont-elles été respectées, les preuves sont-elles suffisantes, et le nettoyage final est-il cohérent avec le journal ?
Travaille toujours dans cet ordre : règles, preuves, nettoyage, puis note de clôture.

## 2. Règles d’engagement : compter sans inventer

Lis d’abord les clauses qui donnent une définition observable : fenêtre horaire, action interdite, quota, notification préalable.
Compte un écart une seule fois par ligne de journal. Une action hors fenêtre reste un écart aux règles d’engagement, pas un hors-périmètre.

## 3. Visionneuse du site

Dans la visionneuse, cherche d’abord « notification= », puis « exception= », puis les actions rares comme « export- » ou « création- ».
Pour une première heure, trie mentalement les lignes par horodatage UTC plutôt que de faire confiance à l’ordre d’affichage.

## 4. Exemple Bash : trouver des écarts observables

```bash
cat > guide-journal-exemple.log <<'EOF'
G01 | 2026-03-10T07:58:00Z | Awa | lecture-config-etendue | demo.example | UTC=2026-03-10T07:58:00Z ; cible=demo.example ; extrait=entete ; commande=curl -I | notification=NOTIF-1
G02 | 2026-03-10T09:12:00Z | Awa | creation-compte-test | demo.example | UTC=2026-03-10T09:12:00Z ; cible=demo.example ; extrait=compte ; commande=note | notification=absente ; compte=demo-user-a
G03 | 2026-03-10T09:18:00Z | Awa | export-integral-donnees | demo.example | UTC=2026-03-10T09:18:00Z ; cible=demo.example ; extrait=lot ; commande=revue | notification=NOTIF-2
G04 | 2026-03-10T18:45:00Z | Awa | export-integral-donnees | demo.example | UTC=2026-03-10T18:45:00Z ; cible=demo.example ; extrait=entete ; commande=curl -I | notification=NOTIF-3
EOF
awk -F' \| ' '{ print $2 "|" $4 "|" $7 }' guide-journal-exemple.log | while IFS='|' read -r horo action commentaire; do
  heure=${horo#*T}
  heure=${heure%Z}
  if [ "$heure" < "08:00:00" ] || [ "$heure" > "18:30:00" ]; then echo "fenetre:$heure"; fi
  case "$action" in export-integral-donnees) echo "interdit:$action" ;; esac
  case "$commentaire" in *"notification=absente"*) echo "notification" ;; esac
done
```

## 5. Exemple PowerShell : la même logique

```powershell
@(
  'G01 | 2026-03-10T07:58:00Z | Awa | lecture-config-etendue | demo.example | UTC=2026-03-10T07:58:00Z ; cible=demo.example ; extrait=entete ; commande=curl -I | notification=NOTIF-1',
  'G02 | 2026-03-10T09:12:00Z | Awa | creation-compte-test | demo.example | UTC=2026-03-10T09:12:00Z ; cible=demo.example ; extrait=compte ; commande=note | notification=absente ; compte=demo-user-a',
  'G03 | 2026-03-10T09:18:00Z | Awa | export-integral-donnees | demo.example | UTC=2026-03-10T09:18:00Z ; cible=demo.example ; extrait=lot ; commande=revue | notification=NOTIF-2',
  'G04 | 2026-03-10T18:45:00Z | Awa | export-integral-donnees | demo.example | UTC=2026-03-10T18:45:00Z ; cible=demo.example ; extrait=entete ; commande=curl -I | notification=NOTIF-3'
) | Set-Content -Encoding UTF8 guide-journal-exemple.log
$ecarts = 0
Get-Content -Encoding UTF8 guide-journal-exemple.log | ForEach-Object {
  $parties = $_ -split ' \| '
  $heure = $parties[1].Substring(11, 8)
  $action = $parties[3]
  $commentaire = $parties[6]
  if ($heure -lt '08:00:00' -or $heure -gt '18:30:00') { $ecarts++ }
  if ($action -eq 'export-integral-donnees') { $ecarts++ }
  if ($commentaire -like '*notification=absente*') { $ecarts++ }
}
$ecarts
```

## 6. Preuves insuffisantes

Classe une preuve comme insuffisante si elle ne contient pas d’horodatage « UTC=... », si elle n’indique pas la cible « cible=... », ou si elle donne une « capture=... » sans « commande=... ».
Le but n’est pas d’avoir une preuve spectaculaire, mais une preuve défendable et vérifiable.

```bash
cat > guide-preuves-exemple.log <<'EOF'
K01 | 2026-03-10T10:00:00Z | Koffi | revue-entete-http | demo.example | cible=demo.example ; extrait=entete ; commande=curl -I | ticket=1
K02 | 2026-03-10T10:05:00Z | Koffi | revue-portail | demo.example | UTC=2026-03-10T10:05:00Z ; cible=demo.example ; capture=ecran-connexion | ticket=2
EOF
awk -F' \| ' '{ print $1 "|" $6 }' guide-preuves-exemple.log | while IFS='|' read -r ident preuve; do
  if [[ "$preuve" != *"UTC="* ]] || [[ "$preuve" != *"cible="* ]] || { [[ "$preuve" == *"capture="* ]] && [[ "$preuve" != *"commande="* ]]; }; then
    echo "$ident"
  fi
done | wc -l
```

## 7. Nettoyage et exception de re-test

Dans le tableau des artefacts, commence par filtrer « doit être supprimé=oui ». Ensuite distingue trois cas : supprimé, oublié, ou à révoquer.
Un artefact laissé pour re-test n’est acceptable que si la règle d’exception l’autorise et si le journal nomme clairement l’artefact, la notification et la date de retrait prévue.

```powershell
@(
  'identifiant;artefact;emplacement;doit_etre_supprime;statut;justification',
  'A01;note-temporaire;/tmp/note.txt;oui;supprime;fermee',
  'A02;token-demo-77;/tmp/token.txt;oui;a_revoquer;encore actif',
  'A03;marqueur-retest;/tmp/retest.flag;non;laisse-pour-retest;exception documentée'
) | Set-Content -Encoding UTF8 guide-artefacts-exemple.csv
$restants = Import-Csv -Path guide-artefacts-exemple.csv -Delimiter ';' -Encoding UTF8 | Where-Object { $_.doit_etre_supprime -eq 'oui' }
$restants.Count
```

## 8. Lire le modèle de clôture

Le modèle de clôture sert à ordonner l’information : identité de mission, synthèse, preuves conservées, artefacts restants autorisés, nettoyage, suivi.
Quand un artefact est conservé à titre d’exception, écris d’abord ce qui permet de le retirer sans ambiguïté : nom, emplacement, justification, responsable et date prévue de retrait.