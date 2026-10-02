# Packet Tracer : le plan d’adressage de l’atelier Kora

Ce guide t’accompagne si tu utilises Cisco Packet Tracer. Les tâches du laboratoire se valident dans CyberPingo, avec ou sans le logiciel : tu peux aussi répondre par le calcul.

Packet Tracer s’exécute sur ton ordinateur. CyberPingo ne l’exécute pas et ne lit pas tes fichiers .pkt : tu y saisis tes résultats.

## Matériel à placer

- 1 routeur (modèle 2911) nommé R1
- 3 commutateurs (modèle 2960) nommés S1, S2, S3
- 3 PC nommés PC-Direction, PC-Atelier, PC-Comptabilité
- Câbles cuivre droits : R1 vers chaque commutateur, puis chaque commutateur vers son PC

## Plan d’adressage

Réseau de l’entreprise : 192.168.20.0/24, découpé en 4 sous-réseaux /26 (masque 255.255.255.192).
La passerelle reçoit la première adresse utilisable de chaque sous-réseau. Les PC prennent les adresses suivantes.

| Sous-réseau | Adresse réseau | Passerelle (R1) | PC |
|---|---|---|---|
| Direction | 192.168.20.0/26 | 192.168.20.1 | 192.168.20.2 |
| Atelier | 192.168.20.64/26 | 192.168.20.65 | 192.168.20.66 |
| Comptabilité | 192.168.20.128/26 | 192.168.20.129 | 192.168.20.130 |
| Invités | à calculer | à calculer | non câblé |

## Configurer le routeur

```
enable
configure terminal
interface GigabitEthernet0/0
 ip address 192.168.20.1 255.255.255.192
 no shutdown
exit
interface GigabitEthernet0/1
 ip address 192.168.20.65 255.255.255.192
 no shutdown
exit
interface GigabitEthernet0/2
 ip address 192.168.20.129 255.255.255.192
 no shutdown
end
show ip interface brief
```

## Configurer les PC

Dans l’onglet Desktop, puis IP Configuration, choisis « Static » et renseigne l’adresse IP, le masque 255.255.255.192 et la passerelle de son sous-réseau.

## Tester

Depuis PC-Direction, ouvre Command Prompt et lance `ping 192.168.20.66` : les paquets traversent R1. Si le ping échoue, vérifie le masque, la passerelle et l’état des interfaces (`show ip interface brief`).

## Rendre ton travail

1. Enregistre ton fichier .pkt.
2. Fais une capture d’écran de `show ip interface brief` et d’un ping réussi.
3. Remplis le modèle de rapport, puis dépose ton rapport ou le lien vers tes captures dans CyberPingo. Un formateur le relit.
