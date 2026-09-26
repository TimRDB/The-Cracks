# Laundry & Bluestar street artwork

Generated with the built-in image generation tool. Style reference: assets/outside_bg.png. Existing master artwork was not changed.

Final background: assets/street_bg.png (1672 x 941).
Door clean plate: assets/street_doors_open.png. Only the two inner leaf rectangles are displayed from this image; all surrounding pixels come from the original street background.

## Generation prompt

Use case: stylized-concept. Asset type: finished 16:9 adventure-game background, no player or UI.
Use the supplied apartment forecourt artwork as STYLE REFERENCE: detailed painterly realistic pre-rendered game art, weathered brick, subdued grey overcast daylight, damp pavement and restrained autumn colours. Create a NEW adjacent street scene reached by walking right from that forecourt. Wider camera, more zoomed out: human height would occupy about 12% of frame height, shop doors about 16%. Entire shop buildings read at believable scale.
Composition: side-on, slightly elevated street view, very shallow perspective. A continuous broad clear footpath enters the LEFT edge about 60% down the frame and runs in ONE STRAIGHT LINE gently DOWN and RIGHT to about 73% down at the RIGHT edge. Buildings behind path; road across foreground bottom quarter. Far left 0-20%: the SIDE of the existing weathered red-brick apartment block juts out at left, cropped by left frame, with the path continuing past its corner. Centre-left 23-52%: a complete modest two-storey dollar laundry shop, large legible fascia 'Laundry', smaller '$1 WASH', washers visible in shop windows, a single CLOSED glass-panelled hinged entrance door unobstructed. Centre-right 53-84%: complete two-storey convenience store with clear blue fascia reading exactly 'Bluestar', star emblem, recognizable stocked shelves, drinks fridge, window price posters 'MILK $3', 'BREAD $2', 'OPEN'; CLOSED centre-opening double automatic glass entrance doors, clearly visible and unobstructed, straight vertical door jambs. Both entrance thresholds directly meet footpath. Three distinct bins beside shop at right labelled 'RUBBISH', 'RECYCLING', 'FOOD WASTE'. Far right 86-97%: a narrow readable alley recedes along the SIDE of convenience store. Enough room to show whole shopfronts and upper floors and roofline.
Foreground road: three ordinary parked cars parallel to curb, their roofs BELOW the clear pedestrian walking lane, a fire hydrant on curb away from entrance routes. Wet asphalt, small puddles, believable kerb stones. No people, no HUD, no decorative borders. Both shop names and entrances must read clearly. Cohesive architecture, straight gently sloped footpath, no fisheye or extreme perspective. Render wide 16:9 high-resolution production artwork.

## Final refinement prompt

Refine this street game background while preserving its excellent muted rainy painterly style, Laundry and Bluestar architecture and signage, bins, fire hydrant, apartment side at left and alley at right. Pull camera back about 25 percent so shop doors are only 16 percent of total picture height (human would be 12-13 percent), leaving more breathing room and complete properly scaled two-storey buildings. Keep broad clear footpath as ONE straight line gently down and right from left edge to right edge. Replace foreground parking lot with a STREET ROAD and three cars parallel parked along curb, seen from SIDE in shallow 3/4 view, not backed into perpendicular parking bays. No parking bay stripes. Cars below walking lane, don't obscure the path. Keep two distinct shop entrances clear: Laundry hinged closed glass-panel door and Bluestar closed centre-opening automatic double glass doors. Preserve exact readable signs and prices. Wide 16:9, no people, no UI.

## Door clean plate prompt

Use case: precise-object-edit. Edit this game background ONLY inside the two shop door openings. Preserve every other pixel and the framing, dimensions, geometry, lighting and all signage. Laundry single glass door: remove its moving inner leaf to reveal an open doorway with laundromat interior and continuous floor inside. Bluestar centre-opening double glass doors: slide both moving leaves entirely out of their central opening into side pockets, exposing a clear open entrance with shop shelves and floor visible. Keep all outer frames, top transoms and stationary window panes EXACTLY as original. No people. This is an animation clean plate, same 16:9 full frame as input.

## Gameplay

Exit the apartment forecourt to the right along its footpath; return via the street's left edge. Character scale is measured against the smaller shop doors. Routing follows the gently sloped straight footpath, the shop entrances, and the side alley. Cars and bins are kept outside the walkable routes.

The laundry door can open, close and be walked through. Bluestar's centre-opening leaves respond to proximity, without moving the player; clicking the doorway walks across the threshold. Both entrances have a small walkable area just inside the visible doorway. Full shop interior rooms are not part of this exterior scene. Laundry door state is saved; the automatic sensor is recomputed from player position.


## Counter and independent door layers (24 September 2026)

Built-in imagegen produced a localized high-resolution counter patch, preserved as `assets/street-counter-source-v2.png`. Active background: `assets/street_bg_counter_v2.png`. Exactly 10,811 counter-window pixels change; the other 1,562,541 pixels, including the MILK $3 poster, remain identical to `assets/street_bg.png`. No whole-frame resampling or sharpening was applied. The tall opaque coffee machine and counter return screen the cashier position from outside.

The stationary `assets/bluestar-interior-v2.png` is visible through both `assets/bluestar-door-left-v2.png` and `assets/bluestar-door-right-v2.png`. These transparent PNGs contain only the original metal and handle pixels. A faint CSS reflection represents the glass surface; no interior pixels move with the doors. Laundry still uses the original door clean plate.

Build: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-bluestar-layers.ps1`.
Verification: `node tests/bluestar-browser.cjs`, then `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-bluestar-pixels.ps1`. Native-resolution captures cover closed, half-open, open and entered states. Sampled interior pixels differ by mean 1.755 RGB levels and maximum 10 during opening, from the faint reflection only. Both moving panes have fully transparent glass.

### Counter generation prompt

Use case: precise-object-edit. This is an enlarged native-pixel crop of the Bluestar shopfront, supplied as an EDIT TARGET, not a new composition.
Change ONLY the shop interior seen through the two fixed window panes LEFT of the double automatic entrance doors (the pane with MILK $3 poster, and the narrow pane between that poster and the entrance).
Remove ALL shelving and goods within these two panes. Replace them with a convincingly rendered staffed shop counter: solid warm dark wood lower counter front across both panes, practical dark worktop, and a tall opaque commercial bean-to-cup coffee machine on the counter, its metal back and side facing the street. Put the large coffee machine in the narrow pane immediately to the RIGHT of the milk poster. Its top must be high enough to obscure a standing cashier's face and its wide opaque body must conceal the cashier's upper torso and work position. Add an opaque dark counter return / privacy backing behind this machine so the cashier position is also hidden when viewed diagonally through the open doorway. No visible cashier or person anywhere. This is intentional permanent visual screening for a future changeable cashier. Make it read as a real convenience-store checkout and coffee station, not another shelf of goods. Preserve exactly the MILK $3 poster itself.
Do not alter any door geometry, the milk poster text or pictures, window frames/mullions, ceiling lights, bread poster, right-side shop windows, bins, pavement, or perspective. Retain the exact crop composition. Make the replacement convincingly match the original detailed rain-grey painterly realistic adventure game artwork. Sharp edges, crisp fine texture, no softness, no bloom, no blur, no overall repaint or relighting. Produce high-resolution detail suitable for a small localized native-resolution composite. Output same wide aspect ratio as input, at least 1341 pixels wide.

### Tall-machine refinement prompt

Edit only the coffee machine in the narrow fixed pane immediately RIGHT of the MILK $3 poster and LEFT of the entrance. Replace the short espresso machine and the FRESH COFFEE sign behind it with ONE TALL OPAQUE COMMERCIAL SELF-SERVICE COFFEE VENDING TOWER with a dark matte side/back facing the street. Its top must reach almost to the horizontal window transom (about 17% from image top), its bottom stays on the counter (about 58% down), and it fills most of that narrow pane width. This tall solid machine permanently blocks the whole standing cashier position, INCLUDING THE CASHIER'S HEAD, so do not leave a gap above a short machine through which a head could appear. No cashier, no person, no human reflection. Retain the wood counter, original lighting, original crop, all exterior architecture, both doors, all glass, milk poster, bread poster and right shop area without any change. Crisp detailed materials, native sharpness, no blur.
