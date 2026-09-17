# The Cracks - Apartment

Open `index.html` in a modern browser. No server, package manager, or build step is required.

The title screen's New Game button leads into the bedroom, with closed curtains and an ordinary barefoot character in a T-shirt and boxer shorts.

- Click open floor to walk. In the living room, clicks on the central couch are redirected to its nearest walkable edge.
- Click the curtains or the **Open curtains / Close curtains** control to walk over and toggle them. Both the fabric and the room lighting animate together, including when reversing mid-transition.
- Select **Look at**, **Open**, **Close**, or **Use**, then click an object. The lamp, TV/console and alarm can be toggled; other furniture and possessions have contextual interactions.
- Click the bedroom door with **Walk to**, **Open**, or **Use** to enter the living room and kitchen. The left door returns to the bedroom; the back-right two-panel frosted-glass door opens into the playable bathroom, whose matching interior door returns to the living room. The original transition is preserved: the door opens, the character enters it, the destination appears, and the character walks out. The closing panel uses the destination door's clean artwork with the departing room's swing direction, so it appears to shut behind the character without reversing its panels, moving its handle, or carrying nearby furniture into the animation.
- The bathroom now enters at the far left and runs through basket/towel, sink cabinet and mirror, toilet and picture, then the bath/shower and curtain at the far right. The living-room entrance sits at the end of a short recessed hallway, keeping the floor plan believable.
- The bathroom doorway keeps its outer frame and jamb static; only the inner two-panel glass door leaf participates in the opening and closing animation.
- The bedroom's small bookshelf beside the lamp table is interactive. In the living room, the TV sits along the living side so the full kitchen remains visible, while the couch and coffee table stay central.
- The lit lamp and its embedded painted glow are kept above the curtain-controlled room dimmer using an exactly aligned copy of the original bedroom pixels with a broad feathered edge. This keeps their brightness constant without a visible mask boundary. A small neutral brightness lift sits above the dimmer too. Switching the lamp off hides both layers and swaps to the genuine lamp-off background.
- **Use** the living room TV to toggle power and its channel box to cycle three channels. Explore the appliances, plant, key hooks, entry drawers and other furnishings with the action verbs.
- The apartment exit leads onto the right-hand concrete patio in the exterior forecourt. Click its front door to return inside. The two neighbouring apartments to the left are reachable but locked.
- Exterior walking follows the patios and five stair treads, then becomes free-form across the shared footpath, empty parking bay, all three visible gaps between cars, and the clear foreground asphalt. Clicked positions on open ground are retained exactly, while routes automatically avoid the occupied parking spaces. Stair travel slows down and adds a small footfall lift and lean. Parked-car foreground masks place the character behind the cars at the rear depth plane and in front of them near the camera.
- Character size is controlled by one multi-anchor perspective table for every room. Every painted door has a measured threshold anchor, so the bedroom, bathroom, living-room doors, recessed hallway entrance and exterior doors all produce the same believable character-to-door ratio. Outdoors he grows continuously from 10.2% scene width at the patios to 22.4% at car depth. That foreground anchor makes his painted height approximately `1.8 / 1.4` times a car's height, matching a 1.8-metre person beside a 1.4-metre car. Both ends are clamped.
- Four parking spaces contain three locked cars: a blue Lonza Experience hatchback, burgundy Arven Vale sedan and silver Veyra Solis estate. The game makes no claim about who owns them. A young tree and a mature tree stand beside the lawn.
- Saves also support the exterior, including positions partway along a staircase.
- **Save** and **Load** preserve the current room, player position, bedroom lighting and apartment interaction state. Old bedroom saves remain supported. **Reset** and fresh launches start in the dark bedroom; loading is explicit.
- Front/back movement is selected within 30 degrees of vertical, measured in screen pixels, and uses corrected four-frame walking cycles with exactly two legs per pose. Other movement uses the side-view walk frames. The bedroom applies a slightly larger character scale to match its bed, drawers and door perspective.
- The scene keeps its 16:9 proportions and fits the remaining viewport height above compact controls.
- Bedroom lighting is present at its saved curtain-dependent level on the first painted frame and snaps to that level behind room-transition fades, avoiding brightness flashes while retaining the visible curtain-lighting animation during normal play.
- Curtain lighting now animates with a separate opacity-based darkness layer rather than filtering the room bitmap, keeping poster edges, the window frame and the exterior view pixel-stable throughout and after the curtain animation.

## Files

- `game.js`: movement, door animations, room interactions, and save/load
- `rooms.js`: living room/kitchen, bathroom and exterior objects and door connections
- `outside.js`: artwork-aligned paths, stair treads, free parking-lot regions and obstacle-avoiding route selection
- `assets/outside_bg.png`: exterior background; generation prompt in `assets/outside-art-notes.md`
- `tests/outside-browser.cjs`: optional headless Chrome smoke check; captures patio and stairs into `output/`
- `style.css`: responsive layout, curtains, lighting, and sprite rendering
- `assets/bedroom_bg.png`: room background
- `assets/bedroom_bg_lamp_off.png`: matching bedroom background with the lamp and its baked wall glow switched off
- `assets/bedroom_player.png`: 5-by-3 sheet of idle and walking poses
- `assets/bedroom-art-notes.md`: ImageGen prompts and source notes
- `assets/apartment-art-notes.md`: new room artwork prompts and implementation notes
- `assets/living_bg_hallway_glass_reversed.png`: active living-room background with only the bathroom door's two glass-pane interiors reversed
- `assets/bathroom_bg_reversed_master.png`: exact reversed derivative of the original compact bathroom master, with a left-side door and the bath/shower on the right
- `assets/background-masters.json`: hashes and dimensions for immutable approved background masters
- `scripts/build-background-patch.ps1`: builds derived backgrounds from a master plus a localized patch without overwriting either input

## Safe background edits

Do not regenerate or overwrite an approved master background. Make the requested visual change as a separate same-size patch image, then build a new derived asset with `scripts/build-background-patch.ps1`. Point `rooms.js` at that new filename only after visual review. The automated tests verify every master against `assets/background-masters.json`, so an accidental overwrite fails immediately.

Example:

```powershell
.\scripts\build-background-patch.ps1 -Base .\assets\living_bg.png -Patch .\assets\living_bg_hallway.png -Output .\assets\living_bg_hallway_master.png
```

The curtain geometry is independent of the background art. The image contains unobstructed glass; the cloth panels cover it by default and compress toward the rail ends when opened.
