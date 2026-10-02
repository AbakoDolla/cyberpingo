# Guide de lecture des journaux

Ce guide sert aux laboratoires d’analyse de journaux et d’investigation. Utilise le champ de filtre du lecteur : plusieurs termes se combinent (ET), et un terme précédé de - est exclu.

## Journaux d’authentification SSH (auth.log)

| Motif | Signification |
|---|---|
| Failed password for X from IP | échec de mot de passe |
| Invalid user X from IP | compte inexistant, souvent un balayage automatique |
| Accepted password / publickey for X | connexion réussie |
| sudo: X : COMMAND=... | commande lancée avec les droits de root |
| useradd, usermod | création ou modification de compte |

Une attaque par force brute suit souvent la même suite : des comptes inconnus, puis un compte réel, puis un succès. Cherche la première ligne Accepted venant de l’IP qui échoue.

## Journaux web (format combiné d’Apache)

```
IP - - [date] "MÉTHODE /chemin HTTP/1.1" statut taille "referer" "agent"
```

- Une rafale de statuts 404 sur des chemins courants (admin, .env, backup) indique un scan.
- UNION SELECT, OR 1=1 ou une apostrophe dans l’URL indiquent une injection SQL.
- Un fichier .php dans un dossier d’envoi, appelé avec ?cmd= ou ?c=, est presque toujours un webshell.
- L’agent utilisateur (Nikto, sqlmap) nomme souvent l’outil de l’attaquant.

## Journaux consolidés (SIEM)

Chaque ligne commence par une date ISO 8601 en UTC, puis la machine et le service. La date permet de remettre en ordre des événements venus de sources différentes. Les motifs FAILED, SUCCESS, ALLOW et DENY sont colorés dans le lecteur.

## Réflexes

- Filtrer d’abord par IP, puis par compte, puis par heure.
- Distinguer le bruit (visiteurs, tâches planifiées) de l’attaque.
- Écrire la chronologie au fur et à mesure : heure, source, action, preuve.
