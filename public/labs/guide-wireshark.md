# Lire une capture : les filtres qui servent vraiment

Ces filtres fonctionnent dans Wireshark (gratuit). La visionneuse de CyberPingo propose une recherche plus simple par texte.

| Je cherche | Filtre Wireshark |
|---|---|
| Les échanges d’une machine | `ip.addr == 192.168.10.23` |
| Les requêtes et réponses DNS | `dns` |
| Les échanges ARP | `arp` |
| Les ouvertures de connexion TCP (SYN seul) | `tcp.flags.syn == 1 && tcp.flags.ack == 0` |
| Les connexions refusées (RST) | `tcp.flags.reset == 1` |
| Un port précis | `tcp.port == 8080` |

## Les drapeaux TCP à connaître

- **SYN** : « je veux ouvrir une connexion ».
- **SYN-ACK** : « d’accord, j’ouvre aussi de mon côté ».
- **ACK** : « bien reçu ».
- **RST** : « refus ou rupture immédiate ».
- **FIN** : « j’ai fini d’envoyer ».

## Trois réflexes

1. Une réponse RST signifie que la machine est joignable mais que le port est fermé.
2. Un SYN répété sans aucune réponse suggère un filtrage (pare-feu) ou une machine arrêtée.
3. Beaucoup de SYN vers des ports différents depuis une même source, avec le même port source, ressemble à un scan.
