# The Cracks

## Object labels

Store ordinary object names in lower case so action labels read naturally, for example `Look at top drawer`. When an object name appears on its own, capitalise its first letter using `displayName`, for example `Top drawer` or `Bottom drawer`. Preserve proper names and acronyms.

Use sentence case for multiword object and item labels: only the first ordinary word is capitalised when standing alone. Action labels have no terminal full stop and leave ordinary object names lower case (`Pick up toaster`). Preserve normal capitals within proper names, brands, places and acronyms (`Look at Dollar Laundry`, `Living room TV`). Description sentences, inventory descriptions and worn-item descriptions retain full stops or other appropriate sentence punctuation.

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

## Portable items and messages

Portable items default to placement only at `itemDefinitions[id].source`. The extension cord's drawer shortcut applies only to the living-room entryway chest and its four drawers. Kitchen drawers and the bedroom chest are not valid targets. Rejected placements keep the item in inventory and selected.

Place hovers name the hovered destination even when that destination will reject the item. Choose `in` for containers and `on` for surfaces, with `placementPreposition` overrides where necessary. `itemPlacementDestination` is the acceptance check; do not use hover prepositions to decide whether an item can leave inventory. Placement must verify inventory ownership before changing item state.

Invalid placements choose a fresh random entry from `placementRefusals`: "That's not where it goes.", "It doesn't go there.", or "You don't want to put it there." This applies to every portable item and invalid target, including worn items. The message catalogue lists every possible refusal without consuming random numbers.

`object-interactions.js` records each reviewed object by room and target with an explicit physical kind, authored Use replies where needed, and suitable pickup, placement, open and close replies. Keep that review up to date when adding or removing objects. Stateful game handlers continue to own travel, lights, clothing, TVs and item transfers. Selected inventory Use/Place must be handled before contextual doors and switches; an unsuitable inventory target must not activate those controls. The tests audit every reviewed object and every portable-item placement target.

Developer Tools → Message List is rebuilt by `message-catalog.js` from live room/item definitions and the loaded functions' display expressions. There is no separate list of message text to edit or regenerate. After changing source files, reload the game and reopen Message List. Keep message displays in named game functions (including the initial message), and store object descriptions/responses with their objects. Character objects should declare `speaker` and their handler flag so dialogue attribution is derived. The catalog parses code without executing interaction handlers; it lists variable output as templates and shows branch conditions. Extend its expression resolver when introducing a new form of message generation, and test additions, edits, removals, categories and game-state preservation.
