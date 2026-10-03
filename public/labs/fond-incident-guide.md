# Guide de l’incident : un compte de messagerie compromis

> Cadre et limites
>
> Toutes les données de cet incident sont fictives.
> Tu mènes une analyse documentaire, pas une chasse active.
> Ne te connecte à aucun vrai compte, ne bloques aucune vraie adresse et ne colles jamais de vrai mot de passe dans un site.

# Méthode

1. Reconstitue la séquence dans le journal de connexions : cherche le premier succès anormal du compte touché, puis les opérations dans le journal de boîte.
2. La prise de connaissance officielle est l’heure du signalement indiquée dans le scénario ou dans la main courante.
3. La double authentification est considérée absente si les connexions réussies du compte compromis n’utilisent qu’une méthode basée sur le mot de passe.
4. Une notification devient nécessaire si l’accès a probablement exposé des données personnelles ou des pièces jointes contenant des informations sur des personnes.
5. Pour un confinement initial, privilégie l’action qui coupe l’accès actif de l’attaquant tout de suite tout en conservant les traces utiles à l’enquête.

# Commandes utiles

```powershell
Select-String -Path "fond-incident-connexions-messagerie.log" -Pattern 'yao.kouassi@soleil.example'
Select-String -Path "fond-incident-audit-boite-*.log" -Pattern 'regle_transfert|pieces_jointes_telechargees|messages_supprimes'
```

```bash
grep -n 'yao.kouassi@soleil.example' fond-incident-connexions-messagerie.log
grep -nE 'regle_transfert|pieces_jointes_telechargees|messages_supprimes' fond-incident-audit-boite-*.log
```

## Exemples génériques hors labo, avec des valeurs inventées

```bash
debut="2026-06-14T08:15:00Z"; fin="2026-06-14T10:05:00Z"
echo $(( ($(date -u -d "$fin" +%s) - $(date -u -d "$debut" +%s)) / 60 ))
```

```powershell
$signalement = [datetime]'2026-06-14T09:30:00Z'
$signalement.AddHours(72).ToString('yyyy-MM-dd HH:mm:ss')
```

# Repères

Quand une règle de transfert externe est créée, la fenêtre d’exposition ne se ferme qu’au moment où cette règle est retirée.
