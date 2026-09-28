# The Cracks

## Assets: used vs unused

All graphics live in one of two folders:

- `assets/used/` holds only files the game currently loads (from `index.html`, the root `*.js` files or `style.css`).
- `assets/unused/` holds everything else: source masters, green-screen keys, patches, references, superseded versions and experiments.

Both folders mirror the same subpaths (for example `assets/used/lighting/bedroom-states-v14/` and `assets/unused/lighting/bedroom-source-v14/`). Art notes (`assets/*-art-notes.md`) and `assets/background-masters.json` stay at the `assets/` root.

When producing or changing graphics:

1. Save newly generated or built graphics to `assets/unused/` (sources, keys, drafts and candidates all go here).
2. When the game starts using a graphic, reference it as `assets/used/<path>` in the game code and move the file into `assets/used/`.
3. When a graphic is replaced, point the game at the new file and move the old one to `assets/unused/`. Never delete superseded art.
4. Build scripts should read sources from `assets/unused/` and write game-ready output straight to `assets/used/` when the game loads it.
5. Finish by running `node scripts/sort-assets.cjs`. It moves any misplaced file into the right folder based on what the game references. `node scripts/sort-assets.cjs --check` only reports. `tests/assets.test.cjs` fails if the folders drift.

Run the unit tests with `node --test tests/bedroom.test.cjs tests/assets.test.cjs`.
