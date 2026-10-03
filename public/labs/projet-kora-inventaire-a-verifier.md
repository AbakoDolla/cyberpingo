# Kora : inventaire existant à vérifier

Cet inventaire a été saisi à la main par un ancien administrateur. Il contient des incohérences par rapport au plan d’adressage de Kora. Ta mission est de les repérer, pas de les corriger dans ce fichier.

Plan en vigueur :

| Service | VLAN | Réseau | Masque | Passerelle |
|---|---|---|---|---|
| Employés | 20 | 10.80.0.0/25 | 255.255.255.128 | 10.80.0.1 |
| Administration | 10 | 10.80.0.128/26 | 255.255.255.192 | 10.80.0.129 |
| Invités | 30 | 10.80.0.192/27 | 255.255.255.224 | 10.80.0.193 |
| Serveurs | 40 | 10.80.0.224/28 | 255.255.255.240 | 10.80.0.225 |
| Gestion | 99 | 10.80.0.240/29 | 255.255.255.248 | 10.80.0.241 |

Inventaire :

| Équipement | VLAN | Adresse IP | Masque | Passerelle |
|---|---|---|---|---|
| Routeur-Kora | 99 | 10.80.0.241 | 255.255.255.248 | sans objet (c’est la passerelle) |
| Switch-Etage1 | 99 | 10.80.0.242 | 255.255.255.248 | 10.80.0.241 |
| NAS-Sauvegarde | 99 | 10.80.0.243 | 255.255.255.248 |  |
| Serveur-Fichiers | 40 | 10.80.0.226 | 255.255.255.240 | 10.80.0.225 |
| Serveur-Impression | 40 | 10.80.0.226 | 255.255.255.240 | 10.80.0.225 |
| AP-Invités | 30 | 10.80.0.150 | 255.255.255.224 | 10.80.0.193 |
| PC-Direction | 10 | 10.80.0.140 | 255.255.255.192 | 10.80.0.129 |
| PC-Compta | 20 | 10.80.0.20 | 255.255.255.128 | 10.80.0.1 |
