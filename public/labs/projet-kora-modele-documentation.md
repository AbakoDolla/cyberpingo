# Documentation réseau : modèle

Nom du réseau : 
Auteur : 
Date et version : 

## 1. Contexte et périmètre
Qui utilise le réseau, où, avec quels besoins.

## 2. Schéma
Joins le schéma logique (VLAN, routeur, services) et, si possible, le schéma physique (câblage, ports).

## 3. Plan d’adressage IPv4
| Service | VLAN | Réseau | Masque | Passerelle | Plage utilisable | Diffusion |
|---|---|---|---|---|---|---|

## 4. Plan d’adressage IPv6
| Service | VLAN | Préfixe /64 | Passerelle |
|---|---|---|---|

## 5. Services
DHCP (plages, exclusions), DNS, traduction d’adresse, heure (NTP), journaux.

## 6. Règles de filtrage
| Source | Destination | Service | Décision | Raison |
|---|---|---|---|---|

## 7. Inventaire des équipements
| Équipement | Rôle | VLAN | Adresse IP | Emplacement |
|---|---|---|---|---|

## 8. Tests de validation
Les tests réalisés (ping, traceroute, accès aux services) et leurs résultats.

## 9. Sauvegardes et changements
Où se trouvent les sauvegardes de configuration ; journal des modifications.

## 10. Risques et améliorations
Ce qui reste fragile et ce que tu ferais ensuite.

Rappel : aucun mot de passe ni clé secrète dans ce document.
