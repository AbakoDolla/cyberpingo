# Projet final : concevoir et documenter le réseau de Kora

Kora regroupe ses équipes dans un nouveau bâtiment et te confie la conception de son réseau. Ce cahier des charges décrit le besoin ; les tâches du laboratoire vérifient ton plan d’adressage et ta lecture critique d’une documentation existante.

## 1. Espace d’adressage

- Bloc IPv4 attribué à Kora : 10.80.0.0/22
- Préfixe IPv6 délégué : 2001:db8:4b00::/48. Pour chaque VLAN, le quatrième groupe de l’adresse reprend le numéro du VLAN écrit en hexadécimal (VLAN 10 : 000a, VLAN 20 : 0014...), et chaque VLAN reçoit un /64.

## 2. Besoins par service (adresses utilisables, passerelle comprise)

| Service | VLAN | Besoin |
|---|---|---|
| Employés | 20 | 110 adresses utilisables |
| Administration | 10 | 45 adresses utilisables |
| Invités | 30 | 28 adresses utilisables |
| Serveurs | 40 | 12 adresses utilisables |
| Gestion | 99 | 5 adresses utilisables |

Règle d’allocation : du plus grand besoin au plus petit, en commençant au début du bloc, sans trou entre deux sous-réseaux. La passerelle de chaque VLAN est la première adresse utilisable.

## 3. Services

- DHCP pour les employés : les dix premières adresses utilisables sont réservées à des équipements fixes et exclues du service ; le reste du sous-réseau constitue la plage DHCP.
- Les serveurs ont des adresses fixes.
- Un seul routeur relie Kora à Internet avec une seule adresse publique : les VLAN sortent par traduction d’adresse avec ports (PAT).
- Le lien vers l’opérateur est le réseau 192.0.2.0/30 : l’opérateur prend l’adresse 192.0.2.1 et Kora l’adresse 192.0.2.2, qui est son unique adresse publique. Tout ce que le routeur ne connaît pas part vers l’opérateur par une route par défaut.

## 4. Filtrage

- Les invités n’accèdent qu’à Internet.
- Les employés accèdent aux serveurs, pas à l’administration ni à la gestion.
- Seul le VLAN de gestion administre les équipements.

## 5. Ce que tu produis

1. Le plan d’adressage IPv4 et IPv6 (les tâches du laboratoire en vérifient les valeurs).
2. La documentation du réseau, avec le modèle fourni.
3. Facultatif : la maquette dans Packet Tracer, pour tester tes choix.
4. La relecture de l’inventaire existant (fichier « documentation à vérifier ») : il contient des incohérences à repérer.
