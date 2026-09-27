# The Cracks - Apartment

Open `index.html` in a modern browser. No server, package manager, or build step is required.

The title screen's New Game button begins with the character asleep under the covers. A bedside alarm rings and a graphic close-up shows 6:00, then disappears. The scene fades to black and back into the existing standing bedroom pose, with closed curtains. Skip intro or Escape goes straight to gameplay.

- Press **~** on the title screen or during play to open **Developer Tools**, which pauses the game (walking, door animations, the wake-up intro and any CSS animations). **Scene Select** teleports to the start of any scene with the world reset to its new-game state. **Character Stats** opens an intentionally empty panel reserved for the later stat system. **Highlight Objects** toggles dotted outlines around every interactable item in the current scene. **Back**, Escape or ~ again resumes exactly where you were. From the title screen, choosing a scene skips the menu and starts there, while Back returns to the title. The wake-up reveal fades in over 1.25 seconds.
- Click open floor to walk at any time; walking no longer occupies an action slot. The living-room rug, bath mat, empty parking bay and lawn also accept direct walking clicks. In the living room, clicks on the central couch are redirected to its nearest walkable edge. The living-room floor also runs up the recessed hallway to the front door and behind the TV cabinet, out to the cabinet's right edge; routes go around the couch and cabinet, and a traced cutout of the TV and cabinet is drawn over the character whenever they stand behind the cabinet's front ground line.
- The five action buttons are **Pick up**, **Place**, **Look at**, **Use** and **Talk to**. With no verb selected, doors show **Open ...**, while switches and the bedside lamp show **Turn on ...** or **Turn off ...**. The character walks within reach before operating any switch or the lamp. **Use** performs the normal action and then clears itself. **Look at** makes the character approach a door, switch, lamp or curtain and display its description without changing its state. Look At remains selected afterward. On switches and doors, **Talk to** replies that you do not feel like talking to that, **Pick up** says power tools would be required, and **Place** says it is already there. Clicking open ground during an approach cancels the pending action. The small **X** button beside **Talk to** also clears the selected action.
- Curtains are contextual too: hover them to see **Open curtains** or **Close curtains**, then click to walk over and toggle them. The separate curtain/state tracker has been removed from the bottom bar.
- Every scene hotspot accepts all five actions and returns an object-appropriate response. Standalone hover labels and inventory object names capitalize the first word; object names following an action command use normal sentence casing. Existing character dialogue is kept separate from these object responses.
- Select an action, then click an object. The lamp and wall switches act contextually; the TV/console, alarm, furniture and possessions respond to their supported actions.
- Click the bedroom door to walk through it into the living room and kitchen. The left door returns to the bedroom; the back-right two-panel frosted-glass door opens into the playable bathroom, whose matching interior door returns to the living room. The bedroom door stays attached to its right-hand hinges, opens inward into the bedroom, and closes from inside the bedroom behind the character in either direction.
- The bathroom now enters at the far left and runs through basket/towel, sink cabinet and mirror, toilet and picture, then the bath/shower and curtain at the far right. The living-room entrance sits at the end of a short recessed hallway, keeping the floor plan believable.
- The bathroom doorway keeps its outer frame and jamb static; only the inner two-panel glass door leaf participates in the opening and closing animation.
- The bedroom's small bookshelf beside the lamp table is interactive. In the living room, the TV sits along the living side so the full kitchen remains visible, while the couch and coffee table stay central.
- Every apartment lighting combination is a complete native 1672 x 941 PNG selected directly by state: eight bedroom states (curtains, bedside lamp and main light), 16 living-room states (curtains, main, bench and hallway lights), and four bathroom states (curtains and main light). Fixtures, switches, reflected light, daylight and localized spill are baked into those full backgrounds. There are no runtime dimmers, radial glow masks, blend modes or CSS light clouds.
- Main lights produce the broadest illumination; the bench, hallway and bedside lights remain localized to their painted sources. Bathroom illumination is written only inside the compact room boundary, leaving every pixel of the black surround untouched. The mirror's window/curtain reflection is also baked into each bathroom state.
- The bedroom has an overhead light switch beside its door. The living room has independent main, bench and hallway circuits, with switches beside the bedroom door, left of the bathroom door and beside the shortened key rack. The floor lamp and its circuit have been removed completely. The bathroom has a main-light switch beside its entrance. Every light toggles immediately when clicked and reports its current on/off action on hover.
- The living room and bathroom have off-screen front-wall windows. Their invisible upper-edge curtain hotspots display **Open curtains** or **Close curtains** when hovered and toggle directly when clicked. The bathroom mirror changes between reflected closed curtains and an open daylight window without animating unseen fabric.
- **Use** the living room TV to toggle power and its channel box to cycle three channels. **Pick up** the toaster or apartment keys to add them to Inventory. Inventory shows each item graphic and description; choose **Use**, then an item, to form **Use [item] with _**, or choose **Place** and put it back or store it in a supported drawer or container. The toaster returns to its kitchen **bench**, so placement text reads **Place toaster on bench**. Opening Inventory pauses all world motion without changing the room state.
- The apartment exit leads onto the right-hand concrete patio in the exterior forecourt. Click its front door to return inside. The two neighbouring apartments to the left are reachable but locked.
- Exterior walking follows the patios and five stair treads, then becomes free-form across the shared footpath, the empty parking bay, the gaps either side of the silver car, and the clear foreground asphalt. Beside the burgundy car the walkable edge is its painted parking line, so the character cannot squeeze in against the car. Clicked positions on open ground are retained exactly, while routes automatically avoid the occupied parking spaces. Stair travel slows down and adds a small footfall lift and lean. A per-pixel cutout of the three cars is drawn over the character whenever they stand behind the cars' ground line, so only car pixels (never road, kerb or grass) cover them.
- Character size is controlled by one multi-anchor perspective table for every room. Every painted door has a measured threshold anchor, so the bedroom, bathroom, living-room doors, recessed hallway entrance and exterior doors all produce the same believable character-to-door ratio. Outdoors he grows continuously from 10.2% scene width at the patios to 22.4% at car depth. That foreground anchor makes his painted height approximately `1.8 / 1.4` times a car's height, matching a 1.8-metre person beside a 1.4-metre car. Both ends are clamped.
- Four parking spaces contain three locked cars: a blue Lonza Experience hatchback, burgundy Arven Vale sedan and silver Veyra Solis estate. The game makes no claim about who owns them. A young tree and a mature tree stand beside the lawn.
- Saves also support the exterior, including positions partway along a staircase.
- **Save** and **Load** preserve the current room, player position, every curtain and light circuit, inventory contents, item locations and apartment interaction state. Older saves remain supported. **Reset** deletes the stored save and restores every world value to the fresh dark-bedroom defaults; loading is explicit.
- Front/back movement is selected within 30 degrees of vertical, measured in screen pixels, and uses corrected four-frame walking cycles with exactly two legs per pose. Other movement uses the side-view walk frames. The bedroom applies a slightly larger character scale to match its bed, drawers and door perspective.
- The scene keeps its 16:9 proportions and fits the remaining viewport height above compact controls.
- Scene changes are atomic: walking out of the alley, street or forecourt, going through a door, loading a save or using Scene Select waits until the destination's background and its overlays (the car cutout, the alley man, the street doors) are all decoded, then switches background, overlays and character in the same frame. Each room also pre-loads the rooms it connects to, so this wait is normally zero. Doors hold on their fully black frame if the next room is still decoding.
- The correct complete background is selected before each painted frame from the saved curtain and light state, avoiding brightness flashes during room transitions. The visible bedroom curtain cloth remains a separate animation; its daylight change is part of the selected background.

## Files

- `game.js`: movement, door animations, room interactions, and save/load
- `rooms.js`: living room/kitchen, bathroom and exterior objects and door connections
- `outside.js`: artwork-aligned paths, stair treads, free parking-lot regions (including the slanted parking line beside the burgundy car) and obstacle-avoiding route selection
- `assets/outside-cars-foreground-v1.png`: transparent cutout of the three parked cars, built by `scripts/build-outside-car-foreground.py` from `assets/outside_bg.png` using OpenCV GrabCut guided by the traced outlines in `scripts/outside-car-hints.json` (requires `pip install opencv-python-headless numpy`)
- `scripts/build-living-tv-outline.py`: traces the living-room TV and cabinet outline (`livingTvSilhouette` in `rooms.js`) from `assets/lighting/living-master-v2.png` with OpenCV GrabCut, trimmed to the measured painted edges and rounded at the corners (requires `pip install opencv-python-headless numpy`)
- `assets/outside_bg.png`: exterior background; generation prompt in `assets/outside-art-notes.md`
- `tests/outside-browser.cjs`: optional headless Chrome smoke check; captures patio and stairs into `output/`
- `style.css`: responsive layout, curtains, lighting, and sprite rendering
- `assets/bedroom_bg.png`: room background
- `assets/bedroom_bg_lamp_off.png`: matching bedroom background with the lamp and its baked wall glow switched off
- `assets/bedroom_player.png`: green-screen master of the 5-by-3 sheet of idle and walking poses
- `assets/player-sheet-keyed-v1.png`: the displayed transparent sheet, built from the master by `scripts/build-player-keyed-sheet.ps1` with the former runtime chroma-key rule, so the character needs no live filter
- `assets/bedroom-art-notes.md`: ImageGen prompts and source notes
- `assets/apartment-art-notes.md`: new room artwork prompts and implementation notes
- `assets/lighting/hard-states-v7/`: 28 versioned, native-resolution hard-rendered room backgrounds and a SHA-256 manifest; the versioned path prevents stale browser-cached lighting art
- `assets/lighting/bedroom-source-states/`: four full-frame bedroom paintings for every bedside-lamp/main-light combination, with the ceiling fixture and left-of-door switch baked into the artwork
- `assets/lighting/bedroom-master-v14.png`: authoritative high-resolution bedroom master with the final right-hinged door, left-side switch, lowered couch and ceiling fixture
- `assets/lighting/bedroom-source-v14/`: four open-curtain electrical-light variants derived from the v14 master without geometry changes
- `assets/lighting/bedroom-states-v14/`: eight native master-derived bedroom states, retaining the proven curtain layer and exact existing chair
- `assets/lighting/bedroom-door-states/`: eight lighting-matched native 1672-by-941 clean plates used to sample the inner door with exactly the same full-canvas mapping as the correctly aligned living-room side; only the couch-concealed leaf pixels differ
- `assets/lighting/living-master-v2.png`: the fresh, sharp, floor-lamp-free living-room master shared by every circuit state
- `assets/lighting/living-light-fields-v2/`: three averaged low-frequency illumination fields for the main, bench and hallway circuits
- `assets/lighting/living-source-states-v2/`: eight native full-frame source states produced from the same fixed-geometry master
- `assets/lighting/toaster-clean-patches-v2/`: eight lighting-matched 82-by-82 counter patches with only the toaster removed
- `assets/lighting/toaster-states-v2/`: 16 exact state-matched toaster-area crops used by the pick-up/put-back prop
- `assets/lighting/bathroom-source-states/`: two full-frame bathroom paintings with the ceiling light genuinely off/on and one lower embedded switch
- `scripts/build-lighting-states.ps1`: deterministically rebuilds every lighting state from the protected masters and isolated source fixtures without resampling the room art
- `scripts/build-bedroom-door-states.ps1`: deterministically rebuilds the complete isolated bedroom-door leaves from the native lighting states
- `scripts/build-bedroom-v14-states.ps1`: composites the existing chair and derives both curtain-light levels from the four v14 master-matched electrical states
- `scripts/build-living-v2-sources.ps1`: rebuilds all eight living circuit sources from the one fixed master and three illumination fields
- `scripts/verify-toaster-pixels.ps1`: rebuilds and proves that every toaster-free background differs from its original render only inside the approved 82-by-82 counter rectangle
- `assets/lighting/`: isolated source fixtures and generation notes in `assets/lighting-art-notes.md`
- `assets/living_bg_hallway_fidelity.png`: preserved historical living-room reference; the active master is `assets/lighting/living-master-v2.png`
- `assets/living_bg_hallway_glass_reversed.png`: preserved prior living-room master with only the bathroom door's two glass-pane interiors reversed
- `assets/bathroom_bg_reversed_master.png`: exact reversed derivative of the original compact bathroom master, with a left-side door and the bath/shower on the right
- `assets/background-masters.json`: hashes and dimensions for immutable approved background masters
- `scripts/build-background-patch.ps1`: builds derived backgrounds from a master plus a localized patch without overwriting either input

## Safe background edits

Do not regenerate or overwrite an approved master background. Make the requested visual change as a separate same-size patch image, then build a new derived asset with `scripts/build-background-patch.ps1`. Point `rooms.js` at that new filename only after visual review. The automated tests verify every master against `assets/background-masters.json`, so an accidental overwrite fails immediately.

For apartment circuit changes, edit or replace the matching bedroom or bathroom source, or rebuild the living sources with `scripts/build-living-v2-sources.ps1`, then run `scripts/build-lighting-states.ps1`. The living source builder applies illumination without spatial transforms, ensuring furniture, switches, the cutting board, towels and toaster geometry remain identical in every state. The game displays complete generated full-frame PNGs; do not add CSS filters, opacity dimmers, radial gradients or blend-mode lighting at runtime. The toaster is the deliberate movable prop: full backgrounds use a tightly feathered clean plate, while two synchronized state layers display an exact crop of the toaster and crossfade with the room.

Example:

```powershell
.\scripts\build-background-patch.ps1 -Base .\assets\living_bg.png -Patch .\assets\living_bg_hallway.png -Output .\assets\living_bg_hallway_master.png
```

The curtain geometry is independent of the background art. The image contains unobstructed glass; the cloth panels cover it by default and compress toward the rail ends when opened.

## Laundry & Bluestar street

Leave the apartment forecourt to the right along the footpath to reach the wider street scene. Return at its left edge. The smaller player follows the gently sloping pavement and can explore the alley beside Bluestar. The road contains three parallel-parked cars and a fire hydrant; each labelled waste bin is interactive.

Click the Laundry glass door once to walk over, open it and step through. Bluestar’s centre-opening glass doors open on proximity and close when you leave; approaching never moves you inside automatically. Click its doorway to cross the threshold. Entry currently extends just inside each visible doorway, without separate interior rooms. Save/load preserves the street position and Laundry door.

- `street.js`: routing, shop interactions and automatic-door sensor.
- `assets/street_bg_counter_v2.png`: active street background with screened counter; the original `assets/street_bg.png` is preserved.
- `assets/street_doors_open.png`: original opening plate, still used for Laundry. Bluestar uses a stationary `assets/bluestar-interior-v2.png` behind transparent `assets/bluestar-door-left-v2.png` and `assets/bluestar-door-right-v2.png` frame layers.
- `assets/street-art-notes.md`: complete built-in image-generation prompts and layout notes.
- `tests/street-browser.cjs`: real-browser travel, door, save/load, and alley checks, with screenshots in `output/`.
- `tests/clicks-browser.cjs`: real mouse clicks on floor items, beside the burgundy car and on the alley man.

The Bluestar counter and tall coffee unit obscure the future cashier position from outside. The automatic door frames and faint glass sheen slide independently of the fixed interior. The counter change preserves every original pixel outside the two edited window panes, including the milk poster. Run `node tests/bluestar-browser.cjs` followed by `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-bluestar-pixels.ps1` for visual and pixel checks.

## Bluestar alley

Click the alley beside Bluestar to enter a separate view looking back toward the wet street. Walking is free-form across the concrete between the dumpster and the building line: clicks on open ground are kept exactly, other clicks stop at the nearest edge, and routes bend around the bins, shelter, door steps, bags and crate. The walkable area ends along a straight line from the dumpster's wheels across to the bushes. The player enters between the fence and the street opening. Their scale is calibrated so a 1.8-metre figure matches the wheelie bins, the seated man, and about 86% of the service door when standing at the foot of its steps, then grows further toward the foreground along a smooth curve. Click the visible street opening to return beside Bluestar. Arriving in either scene, the player faces the camera: into the alley, or out toward the road. A player standing at either opening turns around to face it before crossing. On the street, the alley is entered beside the front end of its wooden fence. A separately rendered, two-frame seated NPC sprite rests on the cardboard beside the wall and supports walk-up dialogue. Its body remains pixel-identical while the eyes briefly close.

- `alley.js`: walkable outline and routing, reciprocal street entrance and object hit areas.
- `assets/alley-bg-npc-v2.png`: active native 1672 x 941 alley background.
- `assets/alley-bg-v1.png`: preserved original alley render.
- `assets/alley-man-sprite-v6.png`: two-frame transparent seated NPC sheet; the body is identical between frames and only the eye pixels change for a brief blink.
- `scripts/build-alley-man-v6.ps1`: removes edge-connected green plus enclosed and shadowed pockets of pure green-screen hue (the olive jacket has less green than red, so it is never touched), and builds the eye-only blink frame. `scripts/validate-alley-man-v6.ps1` rejects any remaining green-screen pixels or large holes.
- `scripts/validate-alley-man-v6.ps1`: verifies eye-only frame changes and rejects internal transparent holes.
- `scripts/build-alley-npc-background.ps1`: deterministic localized builder for the active background.
- `assets/alley-art-notes.md`: background provenance and integrity notes.

## Opening wake-up sequence

Edit `wakeupConfig.time` at the top of `wakeup.js` to change the alarm time; stage durations are beside it. The LED digits are drawn separately from the high-resolution alarm artwork. The sleeping pose is a localized native-resolution bed composite: every pixel outside its pillow/bedding matte is unchanged, and normal play restores the original bedroom art. Source prompts, exact pixel counts, rebuilding and checks are in `assets/wakeup-art-notes.md`.
