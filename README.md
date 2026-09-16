# The Cracks - Apartment

Open `index.html` in a modern browser. No server, package manager, or build step is required.

The game starts directly in the bedroom, with closed curtains and an ordinary barefoot character in a T-shirt and boxer shorts. The workshop level has been removed.

- Click open floor to walk. In the living room, clicks on the central couch are redirected to its nearest walkable edge.
- Click the curtains or the **Open curtains / Close curtains** control to walk over and toggle them. Both the fabric and the room lighting animate together, including when reversing mid-transition.
- Select **Look at**, **Open**, **Close**, or **Use**, then click an object. The lamp, TV/console and alarm can be toggled; other furniture and possessions have contextual interactions.
- Click the bedroom door with **Walk to**, **Open**, or **Use** to enter the living room and kitchen. The left door returns to the bedroom; the back-right two-panel frosted-glass door opens into the playable bathroom, whose matching interior door returns to the living room. The original transition is preserved: the door opens, the character enters it, the destination appears, and the character walks out. The closing panel uses the destination door's clean artwork with the departing room's swing direction, so it appears to shut behind the character without reversing its panels, moving its handle, or carrying nearby furniture into the animation.
- The compact bathroom is framed by black negative space and has a lightly worn white linoleum floor, bath/shower and curtain, left-side toilet, bath mat, basin cupboard and mirrored medicine cabinet.
- The bathroom doorway keeps its outer frame and jamb static; only the inner two-panel glass door leaf participates in the opening and closing animation.
- The bedroom's small bookshelf beside the lamp table is interactive. In the living room, the TV sits along the living side so the full kitchen remains visible, while the couch and coffee table stay central.
- The lit lamp and its embedded painted glow are kept above the curtain-controlled room dimmer using an exactly aligned copy of the original bedroom pixels with a broad feathered edge. This keeps their brightness constant without a visible mask boundary. A small neutral brightness lift sits above the dimmer too. Switching the lamp off hides both layers and swaps to the genuine lamp-off background.
- **Use** the living room TV to toggle power and its channel box to cycle three channels. Explore the appliances, plant, key hooks, entry drawers and other furnishings with the action verbs. The apartment exit opens onto darkness and closes again; an exterior level is not included.
- **Save** and **Load** preserve the current room, player position, bedroom lighting and apartment interaction state. Old bedroom saves remain supported. **Reset** and fresh launches start in the dark bedroom; loading is explicit.
- Front/back movement is selected within 30 degrees of vertical, measured in screen pixels, and uses corrected four-frame walking cycles with exactly two legs per pose. Other movement uses the side-view walk frames. The bedroom applies a slightly larger character scale to match its bed, drawers and door perspective.
- The scene keeps its 16:9 proportions and fits the remaining viewport height above compact controls.
- Bedroom lighting is present at its saved curtain-dependent level on the first painted frame and snaps to that level behind room-transition fades, avoiding brightness flashes while retaining the visible curtain-lighting animation during normal play.
- Curtain lighting now animates with a separate opacity-based darkness layer rather than filtering the room bitmap, keeping poster edges, the window frame and the exterior view pixel-stable throughout and after the curtain animation.

## Files

- `game.js`: movement, door animations, room interactions, and save/load
- `rooms.js`: living room/kitchen and bathroom objects and door connections
- `style.css`: responsive layout, curtains, lighting, and sprite rendering
- `assets/bedroom_bg.png`: room background
- `assets/bedroom_bg_lamp_off.png`: matching bedroom background with the lamp and its baked wall glow switched off
- `assets/bedroom_player.png`: 5-by-3 sheet of idle and walking poses
- `assets/bedroom-art-notes.md`: ImageGen prompts and source notes
- `assets/apartment-art-notes.md`: new room artwork prompts and implementation notes

The curtain geometry is independent of the background art. The image contains unobstructed glass; the cloth panels cover it by default and compress toward the rail ends when opened.
