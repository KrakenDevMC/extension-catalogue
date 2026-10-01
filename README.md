# Extension Hub

Catalogue automatique d'extensions TurboWarp, PenguinMod, SharkPool, Mistium, TurboWarp Community, Fetch et Lime.

## Fonctionnement

Le site est statique. GitHub Actions lance `scripts/sync.mjs` toutes les heures, récupère les dépôts officiels, reconstruit `data/catalog.json`, puis commit les changements. Le site lit ensuite `data/catalog.json` et affiche les extensions.

Sources intégrées :
- **TurboWarp** — dépôt `TurboWarp/extensions`
- **TurboWarp Community** — dépôt `TurboWarp/community-extensions`
- **PenguinMod** — dépôt `PenguinMod/PenguinMod-ExtensionsGallery`
- **PenguinMod Editor** — extensions intégrées dans l'éditeur `PenguinMod/PenguinMod`
- **SharkPool** — dépôt `SharkPool-SP/SharkPools-Extensions`
- **Mistium** — dépôt `Mistium/extensions.mistium`
- **Fetch Extensions** — dépôt `Fetch-fetch/Extensions`
- **Lime Extensions** — dépôt `LimE-Modifier/lime-extensions`

## Installation

1. Crée un dépôt GitHub.
2. Envoie tous les fichiers de ce projet.
3. Active GitHub Actions si nécessaire.
4. Lance `Synchroniser les extensions` une première fois depuis l'onglet Actions.
5. Publie le dépôt avec GitHub Pages, Vercel ou Netlify.

Le workflow synchronise ensuite le catalogue chaque heure.

## Ajouter une autre galerie

Ajoute une fonction source dans `scripts/sync.mjs`, puis ajoute cette fonction au tableau final :
`for (const fn of [turboWarp,penguinMod,penguinModEditor,sharkPool,mistium,turboWarpCommunity,fetchExtensions,limeExtensions,maNouvelleSource])`

### Template de fonction source

```javascript
async function maNovelleSource() {
  try {
    const paths = await githubTree("owner", "repo", "branch");
    const js = paths.filter(p => p.endsWith(".js") && !p.includes("node_modules"));
    return (await Promise.all(js.map(async p => {
      try {
        const code = await raw(`${RAW}/owner/repo/branch/${p}`);
        let name = pick(code, "name");
        if (!name) name = p.split("/").pop().replace(/\.js$/, "").replace(/[-_]/g, " ");
        name = sanitizeName(name);
        if (!name) return null;
        const desc = pick(code, "description");
        return {
          id: `mysource:${p}`,
          name,
          description: desc || "Extension de MySource.",
          creator: "MySource",
          source: "MySource",
          tags: tags(name, desc),
          codeUrl: `${RAW}/owner/repo/branch/${p}`,
          url: "https://mysource.com"
        };
      } catch { return null; }
    }))).filter(Boolean);
  } catch (e) {
    console.error("Erreur MySource:", e.message);
    return [];
  }
}
```

## Remarque

Les formats internes des galeries peuvent évoluer. Le synchroniseur ignore une source qui devient momentanément incompatible plutôt que de supprimer tout le catalogue.
