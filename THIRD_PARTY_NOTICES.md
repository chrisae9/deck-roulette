# Third-party notices

DeckRoulette's frontend bundle includes:

- [Decky Loader API (`@decky/api`)](https://github.com/SteamDeckHomebrew/loader-api) by SteamDeckHomebrew, licensed under LGPL 2.1. The license is included in `dist/licenses/decky-api-LICENSE.txt`.
- [React Icons](https://github.com/react-icons/react-icons), copyright 2018 kamijin_fanta, licensed under MIT. The license is included in `dist/licenses/react-icons-LICENSE.txt`.
- [Perspective dice 6 faces random](https://game-icons.net/1x1/delapouite/perspective-dice-six-faces-random.html) by Delapouite, from Game-icons.net, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Cog, filter, and thumbtack from [Font Awesome Free 5](https://github.com/FortAwesome/Font-Awesome/tree/5.15.4) by Fonticons, Inc., licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The icons are distributed as React components with styling applied by DeckRoulette.

## Rebuild with a modified Decky API

The plugin package includes `dist/licenses/frontend-source.tar.gz` with the frontend source, the lockfile and build scripts, and the exact Decky API source from the installed dependency. From the plugin directory, extract it and install the locked dependencies with Node.js and pnpm:

```sh
mkdir deckroulette-source
tar -xzf dist/licenses/frontend-source.tar.gz -C deckroulette-source
cd deckroulette-source
pnpm install --frozen-lockfile --package-import-method=copy
```

Edit `decky-api/src/`, then copy it into the local dependency, compile it, and rebuild:

```sh
cp -R decky-api/src/. node_modules/@decky/api/src/
pnpm exec tsc --noCheck --target ES2020 --module ESNext --declaration --removeComments \
  --outDir node_modules/@decky/api/dist node_modules/@decky/api/src/index.ts
pnpm run build
```

The resulting `dist/index.js` is the frontend bundle. To run it with Decky, replace the installed plugin's `dist/` directory with the rebuilt one and restart Decky Loader.
