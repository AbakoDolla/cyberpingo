# TP 2 : VLAN, trunk et routage inter-VLAN pour la PME Kora

Ce guide t’accompagne si tu utilises Cisco Packet Tracer. Les tâches se valident dans CyberPingo, avec ou sans le logiciel : certaines portent sur les sorties `show` fournies (relevées sur SW1), d’autres sur les commandes à écrire.

## Le besoin

Kora loue des locaux et veut séparer trois services sur un seul commutateur : l’administration (VLAN 10), les employés (VLAN 20) et les invités (VLAN 30). Un VLAN de gestion (99) sert à administrer les équipements ; c’est aussi le VLAN natif du trunk. Chaque VLAN a son réseau /24 dans 10.40.0.0/16 : le réseau d’un VLAN porte son numéro dans le troisième octet. La passerelle de chaque VLAN est la première adresse utilisable.

Les invités ne doivent pas atteindre le réseau d’administration, mais peuvent aller vers Internet. Pour cela, une liste de contrôle d’accès numérotée 110 est appliquée sur la sous-interface du VLAN des invités.

## Matériel à placer

- 1 routeur (2911) nommé R1, 1 commutateur (2960) nommé SW1
- 3 PC : PC-Direction (VLAN 10), PC-Compta (VLAN 20), Borne-Invités (VLAN 30)
- Un seul câble entre R1 (Gi0/0) et SW1 (Gi0/1) : c’est le trunk

## Exemple de configuration pour le VLAN 10

À toi de répéter la démarche pour les autres VLAN en adaptant le numéro, le nom et le réseau.

```
! Commutateur SW1
vlan 10
 name Administration
interface range FastEthernet0/1 - 8
 switchport mode access
 switchport access vlan 10

! Routeur R1 (routeur sur un bras)
interface GigabitEthernet0/0
 no shutdown
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 10.40.10.1 255.255.255.0
```

## Étapes

1. Crée les VLAN sur SW1, affecte les ports d’accès (voir `show vlan brief` fourni pour la répartition attendue) et configure Gi0/1 en trunk.
2. Crée une sous-interface par VLAN sur R1, avec la bonne encapsulation 802.1Q et la bonne adresse.
3. Configure chaque PC en IP statique : adresse dans son VLAN, masque 255.255.255.0, passerelle du VLAN.
4. Teste : un ping entre PC-Direction et PC-Compta doit réussir (le routeur relie les VLAN). Applique ensuite l’ACL 110 et vérifie que la borne invités ne joint plus PC-Direction.
5. Vérifie avec `show vlan brief`, `show interfaces trunk` et `show access-lists`.

## Rendre ton travail

Réponds aux tâches du laboratoire. Garde les captures de tes `show` si tu veux les ajouter à ton portfolio.
