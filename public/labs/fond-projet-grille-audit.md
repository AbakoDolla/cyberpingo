# Grille d’audit

## Règles de score

- conforme = 1
- partiel = 0,5
- non = 0
- score d’un domaine = somme(poids × statut) / somme(poids) × 100
- score global = somme(poids × statut) / somme(poids) × 100
- pour l’intégrité des sauvegardes, seules les familles SHA-2 ou plus récentes sont acceptables ; les algorithmes plus anciens sont à éviter

| id | domaine | poids | statut | contrôle |
|---|---|---:|---|---|
| AU1 | authentification | 3 | non | Chaque personne a un mot de passe individuel. |
| AU2 | authentification | 3 | non | La double authentification couvre tous les comptes sensibles. |
| AU3 | authentification | 2 | partiel | Les comptes locaux partagés sont supprimés ou revus. |
| AU4 | authentification | 2 | non | Les sessions actives peuvent être révoquées selon une procédure. |
| PO1 | postes | 3 | non | Les systèmes sont encore supportés. |
| PO2 | postes | 3 | partiel | Les mises à jour sont appliquées en moins de 30 jours. |
| PO3 | postes | 2 | partiel | Les postes mobiles sont chiffrés. |
| PO4 | postes | 2 | non | Les administrateurs locaux sont limités au strict nécessaire. |
| SA1 | sauvegardes | 3 | partiel | Les sauvegardes réussissent chaque semaine sans trou important. |
| SA2 | sauvegardes | 3 | non | Une copie hors site est maintenue. |
| SA3 | sauvegardes | 2 | partiel | Un test de restauration récent est conservé. |
| SA4 | sauvegardes | 2 | non | Les archives sont contrôlées avec un algorithme robuste. |
| RE1 | réseau et wi-fi | 3 | non | Le mot de passe d’administration de la box a été changé. |
| RE2 | réseau et wi-fi | 3 | non | Le réseau invité est isolé du réseau interne. |
| RE3 | réseau et wi-fi | 2 | partiel | L’inventaire des équipements connectés est complet. |
| RE4 | réseau et wi-fi | 2 | partiel | Le suivi du certificat du site est en place. |
| DP1 | données personnelles | 3 | non | Un registre des traitements existe. |
| DP2 | données personnelles | 3 | non | Les dossiers papier sont verrouillés. |
| DP3 | données personnelles | 2 | partiel | Une durée de conservation est définie. |
| DP4 | données personnelles | 2 | partiel | Les jeux de données sont minimisés. |
| IN1 | gestion des incidents | 3 | non | Une procédure écrite d’incident existe. |
| IN2 | gestion des incidents | 2 | partiel | La sensibilisation est rejouée après une simulation. |
| IN3 | gestion des incidents | 2 | non | Un exercice d’escalade a été mené cette année. |
| IN4 | gestion des incidents | 2 | partiel | La liste de contacts d’urgence est testée. |
