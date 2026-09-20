# Native-resolution apartment lighting

The apartment lighting system never regenerates, filters or resamples room art at runtime. `scripts/build-lighting-states.ps1` creates 28 complete native 1672 x 941 PNG backgrounds in `assets/lighting/hard-states-v7/`, plus a SHA-256 manifest. The game selects one of those full-frame files directly from the saved curtain and circuit booleans. The versioned directory deliberately forces browsers to discard older cached lighting artwork after a render revision.

No scene-wide dimmer, radial-gradient glow, blend mode, CSS reflection or source-splash overlay is used. Illumination, fixtures, switches, wall and ceiling reflections, localized spill and the bathroom mirror reflection are baked into the full background. The deterministic builder starts with the protected master pixels on every run, so repeated adjustments do not compound compression, blur or generational changes.

The living room was rerendered from scratch as one crisp 1672 x 941 master in `assets/lighting/living-master-v2.png`. It contains the fixed furniture, three wall switches, low power outlet, shortened four-key rack, one toaster, one cutting board behind the dish rack and only the oven-door towel. It contains no floor lamp or secondary bench towel. `scripts/build-living-v2-sources.ps1` applies three averaged low-frequency illumination fields to that one master without moving or resampling any source geometry. Consequently every circuit source has identical object silhouettes and positions; only RGB illumination changes.

The toaster is a persistent pick-up/put-back prop. Eight rerendered 82 x 82 clean-counter patches in `assets/lighting/toaster-clean-patches-v2/` replace only coordinates x=742..823 and y=276..357, with a four-pixel smooth edge blend, before each full background is rendered. The 16 files in `assets/lighting/toaster-states-v2/` are exact crops from the matching original renders, including the same toaster design, geometry and contact shadow under every light state. Two synchronized layers crossfade with the room background, so lighting changes cannot make the toaster pop or flash.

`scripts/verify-toaster-pixels.ps1` reconstructs all 16 toaster-present living-room renders and performs an RGBA comparison against the clean backgrounds. It fails if any changed pixel lies outside the approved 82 x 82 toaster rectangle.

The bedroom uses four complete source paintings in `assets/lighting/bedroom-source-states/`: lamp off/main off, lamp on/main off, lamp off/main on and lamp on/main on. Its aged brass and cream ceiling fixture is part of every source painting, dark in both main-off sources and naturally illuminating the ceiling, walls, furniture and floor in both main-on sources. The single wall switch is also painted into every source to the left of the bedroom door. The builder does not composite the former bedroom fixture sprite or any bedroom switch sprite.

The bedroom door system begins with eight corrected native backgrounds in `assets/lighting/bedroom-states-v8/`. `scripts/build-bedroom-door-states.ps1` removes the three-pixel painted sideways step from the upper and lower hinge bands using a feathered repair confined to x=1358..1394 and y=132..533; every pixel outside that doorframe rectangle is copied unchanged. Eight full-canvas clean plates in `assets/lighting/bedroom-door-states/` are then derived from those corrected backgrounds. Native-pixel measurements fix the moving leaf to x=1226..1378 and y=132..533, excluding every jamb and frame pixel while reaching the threshold. The leaf uses the same full-canvas sampling method as the correctly aligned reciprocal living-room door. At runtime a tightly clipped foreground follows the measured couch edge, so the complete door swings behind the unmoving couch corner.

A compact stool sprite is composited in a fixed position immediately left of the couch before each bedroom state receives its curtain/daylight level. This leaves every source painting unchanged while keeping the stool identical in placement and naturally responsive to the baked state brightness.

The bathroom uses two complete source paintings in `assets/lighting/bathroom-source-states/`. Its ceiling fixture, wall and surface response are painted genuinely off or on, and its single switch is embedded lower on the wall between the door and towel. The builder adds no bathroom switch sprite, fixture-darkening circle, wall-repair circle, emitter circle, glow or main-light mask. Curtain state still selects the established front-window reflection inside the mirror and applies a restrained whole-room daylight level; black surround pixels remain untouched.

The living room has 16 combinations of front-wall curtains, main light, kitchen-bench lights and hallway light. The floor lamp, its circuit, state flag, hotspot, art asset and old rendered states have been removed. The bedroom has eight combinations of curtains, bedside lamp and overhead light. The bathroom has four combinations of its invisible front-wall curtains and main light.

State names use `c` for curtains, `m` for main, `b` for bench and `h` for hall, with `0` meaning off/closed and `1` meaning on/open. For example, `living-c0-m1-b0-h1.png` is closed curtains, main on, bench off and hall on.

## Living-room full-frame circuit sources

The built-in ImageGen workflow created one new maximum-detail master from the historical composition reference. The final prompt fixed every door, switch, kitchen appliance and furniture location; required the cutting board behind the dish rack; prohibited the floor lamp and secondary towel; and explicitly rejected blur, low-resolution texture and painterly haze. The eight `living-m{main}-b{bench}-h{hall}.png` files are deterministic color-lighting derivatives of that master rather than independent generative rerenders.

## Retained transparent assets

The old reusable wall-switch sprite is retained only as unused historical source material; all living-room switches are embedded in the fixed master. The bedroom and bathroom switches are likewise embedded in their complete source paintings. The old isolated bedroom ceiling fixture file is also retained only as unused historical source material.

### Bedroom ceiling fixture prompt

Use case: stylized-concept. Asset type: transparent sprite for a 1990s point-and-click adventure game interior. Create one small worn apartment ceiling pendant with a short dark cord, aged dark-bronze shallow shade and small unlit warm-white bulb. Crisp detailed hand-painted pixel-edged style, muted grey-brown palette. Exactly one complete fixture, transparent background, no room, wall, ceiling, text, people, glow or external shadow.

### Wall switch prompt

Use case: stylized-concept. Asset type: transparent reusable wall-switch sprite. Create one old-fashioned straight-on apartment rocker switch: slightly yellowed off-white plate, two small screws, narrow cream rocker and subtly worn edges. Crisp hand-painted pixel-edged style. Exactly one isolated switch, transparent background, no wall, room, text, symbols, people, halo or external shadow.
