# TP 3 : relier trois sites avec des routes statiques

Ce guide t’accompagne si tu utilises Cisco Packet Tracer. Les tâches se valident dans CyberPingo, avec ou sans le logiciel : certaines portent sur les commandes à écrire, d’autres sur la table de routage fournie (relevée sur R-Siege).

## Le besoin

Kora ouvre deux agences et veut que les trois sites communiquent. Le siège (réseau 10.60.0.0/24) est relié à l’agence Nord (10.60.4.0/24) par la liaison 172.20.0.0/30, et à l’agence Sud (10.60.5.0/24) par la liaison 172.20.0.4/30. Chaque routeur de liaison prend, côté siège, la première adresse utilisable du /30 ; l’agence prend la seconde. Les agences ne sont reliées qu’au siège.

## Matériel à placer

- 3 routeurs (2911 avec carte série HWIC-2T) : R-Siege, R-Nord, R-Sud
- 1 PC par agence (PC-Nord, PC-Sud), reliés à leur routeur
- Câbles série (DCE côté siège) entre R-Siege et chaque agence

## Exemple pour une liaison

```
! R-Siege, liaison vers l’agence Nord
interface Serial0/0/0
 ip address 172.20.0.1 255.255.255.252
 clock rate 64000
 no shutdown

! R-Nord, de l’autre côté
interface Serial0/0/0
 ip address 172.20.0.2 255.255.255.252
 no shutdown
```

## Étapes

1. Configure toutes les interfaces, puis vérifie avec `show ip interface brief`. À ce stade, chaque routeur ne connaît que ses réseaux directement connectés.
2. Ajoute les routes statiques nécessaires pour que chaque site joigne les deux autres. Une agence n’a qu’une sortie : le siège.
3. Vérifie la table avec `show ip route` et teste avec `ping` et `tracert` entre PC-Nord et PC-Sud (ou `traceroute` depuis un routeur).
4. Compare avec la table de routage de R-Siege fournie : elle a été relevée sur un réseau dont un test échoue.

## Rendre ton travail

Réponds aux tâches du laboratoire. Garde les captures de tes `show ip route` si tu veux les ajouter à ton portfolio.
