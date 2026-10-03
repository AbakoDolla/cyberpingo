# TP 1 : construire le réseau d’une maison

Ce guide t’accompagne si tu utilises Cisco Packet Tracer. Les tâches se valident dans CyberPingo, avec ou sans le logiciel : tu peux aussi raisonner à la main à partir du cahier des charges et de la sortie fournie.

## Le besoin

Une famille veut relier un PC, un portable et une imprimante à Internet. Le réseau local est 192.168.50.0/24. Le routeur R-Maison est la passerelle (première adresse utilisable). Il attribue les adresses par DHCP dans la plage de 192.168.50.100 à 192.168.50.150 (les adresses plus basses et plus hautes sont réservées à des équipements fixes). L’imprimante a une adresse fixe, 192.168.50.20.

Le fournisseur d’accès délègue le préfixe IPv6 2001:db8:5a00::/56. Le réseau local utilise le deuxième sous-réseau /64 de cette délégation, et les PC se configurent seuls (autoconfiguration).

## Matériel à placer

- 1 routeur (modèle 2911) nommé R-Maison
- 1 commutateur (modèle 2960) nommé SW-Maison
- 2 PC (PC-Salon, Laptop) et 1 imprimante (ou un troisième PC nommé Imprimante)
- Câbles cuivre droits : R-Maison Gi0/0 vers SW-Maison, puis chaque appareil vers le commutateur

## Étapes

1. Place et câble les équipements comme sur la topologie.
2. Configure l’interface du routeur côté réseau local (adresse IPv4, masque, `no shutdown`) :

```
enable
configure terminal
hostname R-Maison
ipv6 unicast-routing
interface GigabitEthernet0/0
 ip address 192.168.50.1 255.255.255.0
 ipv6 address 2001:db8:5a00:1::1/64
 no shutdown
exit
```

3. Crée le service DHCP. L’adresse de l’imprimante et celles des équipements fixes sont exclues du service :

```
ip dhcp excluded-address 192.168.50.1 192.168.50.99
ip dhcp excluded-address 192.168.50.151 192.168.50.254
ip dhcp pool MAISON
 network 192.168.50.0 255.255.255.0
 default-router 192.168.50.1
 dns-server 192.168.50.1
```

4. Sur chaque PC, choisis « DHCP » pour l’IPv4 et « Automatic » pour l’IPv6 (onglet Desktop, IP Configuration). Donne à l’imprimante son adresse fixe.
5. Partage l’adresse publique : l’interface Gi0/1 de R-Maison, côté fournisseur d’accès, porte l’unique adresse publique du foyer. Configure la traduction d’adresse pour que tous les appareils sortent avec cette adresse :

```
interface GigabitEthernet0/0
 ip nat inside
interface GigabitEthernet0/1
 ip nat outside
access-list 1 permit 192.168.50.0 0.0.0.255
ip nat inside source list 1 interface GigabitEthernet0/1 ...
```

   Complète la dernière commande avec le mot-clé qui permet à plusieurs appareils de partager une seule adresse publique : il fait l’objet d’une tâche du laboratoire.
6. Vérifie : `ipconfig /all` sur un PC, puis `ping` vers la passerelle et vers l’imprimante.

## Tester

- `ping 192.168.50.1` : la passerelle répond.
- `ping 192.168.50.20` : l’imprimante répond.
- `show ip dhcp binding` sur le routeur : les adresses attribuées et les adresses MAC.

## Rendre ton travail

Réponds aux tâches du laboratoire : elles portent sur le plan d’adressage, sur la sortie `ipconfig /all` fournie (relevée sur PC-Salon), sur le plan IPv6 et sur la traduction d’adresse. Si tu le souhaites, garde des captures d’écran de tes tests pour ton portfolio.
