# Extension Hub

Catalogue automatique d'extensions TurboWarp, PenguinMod, SharkPool et Mistium.

## Fonctionnement

Le site est statique. GitHub Actions lance `scripts/sync.mjs` toutes les heures, récupère les dépôts officiels, reconstruit `data/catalog.json`, puis commit les changements. Le site lit ensuite ce catalogue.

Sources intégrées :
- TurboWarp — dépôt `TurboWarp/extensions`
- PenguinMod — dépôt `PenguinMod/PenguinMod-ExtensionsGallery`
- SharkPool — dépôt `SharkPool-SP/SharkPools-Extensions`
- Mistium — dépôt `Mistium/extensions.mistium`

## Installation

1. Crée un dépôt GitHub.
2. Envoie tous les fichiers de ce projet.
3. Active GitHub Actions si nécessaire.
4. Lance `Synchroniser les extensions` une première fois depuis l'onglet Actions.
5. Publie le dépôt avec GitHub Pages, Vercel ou Netlify.

Le workflow synchronise ensuite le catalogue chaque heure.

## Ajouter une autre galerie

Ajoute une fonction source dans `scripts/sync.mjs`, puis ajoute cette fonction au tableau final :
`for (const fn of [turboWarp,penguinMod,sharkPool,mistium,maNouvelleSource])`

## Remarque

Les formats internes des galeries peuvent évoluer. Le synchroniseur ignore une source qui devient momentanément incompatible plutôt que de supprimer tout le catalogue.
