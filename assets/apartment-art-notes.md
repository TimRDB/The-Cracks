# Apartment room artwork

Generated with built-in ImageGen using `bedroom_bg.png` as the style reference. Final copied assets: `living_bg.png` and `bathroom_bg.png`, both 1672 x 941. No new player sheet: all three rooms share the existing ordinary-man idle and directional walking sheet.

## Interior front-door mail slot

The built-in ImageGen edit workflow added an aged brass mail slot to the inside face of the far-right apartment exit. To keep every established hotspot and animated door sample aligned, only the generated mail-slot region was feather-composited onto the unchanged source artwork. The aligned version places the plate at the same normalized lintel-to-threshold position as the exterior slot. `living_bg_reciprocal_doors.png` gives the far-left bedroom door a right-side handle and the former flush front door a left-side handle, while leaving the middle bathroom door unchanged. It is also the high-fidelity base for the current hallway scene.

The doors are painted closed in the backgrounds. The game copies the corresponding image rectangle onto a hinged CSS panel with a dark opening behind it. A cancellable animation opens the panel, walks the character to the threshold, fades to the connected room, and walks the character out exactly as before. The closing overlay uses the destination door's tightly cropped artwork but retains the departing side's swing direction, so it reads as closing on the far side without mirrored glass, handle jumps, or surrounding furniture being sampled onto the panel. The living room foreground masks the character behind the chair beside the bedroom door. TV channel content is a separate overlay. Hit areas follow the final artwork, rather than the requested prompt coordinates.

## Living room final prompt

Create a NEW background for the next room in this pixel-art point-and-click game. Match reference's detailed hand-painted pixel art, worn grey brown palette, moody slightly run-down single man's apartment, elevated straight-on adventure-game perspective. Wide 16:9 image, no people, no text, no UI. Living room and kitchen. Very important layout: BACK WALL has three clearly visible closed wooden doors: bedroom return door at far LEFT (x5-14%), bathroom door at back RIGHT (x73-81%), apartment exit door at far RIGHT (x88-97%). Doors face camera, vertical rectangular. Kitchen stretches across back wall x27-68%, fridge/freezer, oven with stove, microwave, sink, countertop cooking area and drawers, coffee machine, drooping potted plant on bench, kettle, dishes, chopping board. Living area at LEFT: TV with separate channel switching set-top box on low cabinet x16-29%, bookshelf near left wall, worn couch along left edge foreground and armchair beside it. Modest coffee table with mug near couch. Small chest of drawers with keys hanging on hooks ABOVE it between right doors. Worn rug centered on a LARGE EMPTY WALKABLE FLOOR across foreground (x30-95%, y68-97%). Keep furniture out of this floor and all three doors accessible. Slight clutter of books, blanket and possessions, not excessive. Entire room fits uncropped inside image. Soft dim daylight and warm kitchen light, readable moody interior.

## Bathroom final prompt

New background for same moody pixel-art point-and-click apartment game as reference. Small worn bathroom, elevated straight-on view, 16:9 uncropped full room, no people or UI or text. Grey chipped tiles, bathtub with shower and partly gathered shower curtain on left, toilet back left-center, small washbasin vanity and mirror center, toothbrush cup, soap, towels, laundry basket, radiator, bathmat, toilet paper. Clearly visible closed rectangular wooden return door on RIGHT of back wall x77-89%, top15% bottom60%, facing camera. Broad empty walkable tiled floor foreground y65-98%, modest muted warm ceiling light, slightly neglected but believable single man's apartment. Match reference detailed painted pixel artwork and perspective.

## Validation

Generated backgrounds visually inspected. Automated Node tests cover reciprocal travel, animation timing and input locking, reset/load cancellation, state preservation, TV channels, prior bedroom lighting and directional movement. Live browser animation inspection was unavailable in this session.

## September 2026 furniture and plant revision

The built-in ImageGen edit workflow replaced all three project backgrounds. The living room now groups its TV, coffee table and couch in the center, with clear paths at the sides. It has the game's sole plant beside the bookshelf. The bedroom and bathroom have no plants. Interactive hit areas, the TV screen overlay, couch foreground occlusion and the couch's blocked floor footprint were realigned to the final art.

### Living room edit prompt

Use case: precise-object-edit. Preserve the pixel-art style, exact camera, room shell, three doors, complete kitchen, rug, bookshelf, chair, lighting, worn materials, and 1672x941 framing. Reorganize the living-room furniture into a clear central seating area: television and low media cabinet with set-top box around x38%-50%, couch in the middle foreground around x50%-70% facing the TV, and coffee table between them around x45%-60%. Keep the three pieces distinct and reachable, with floor paths around the group and approaches to every door. Remove every plant except one modest, slightly drooping houseplant beside the living-room bookshelf. Preserve all doors, key hooks, entry drawers, appliances, chair, bookshelf and rug. No people, text, labels, logos or UI.

### Bedroom edit prompt

Use case: precise-object-edit. Remove every plant and plant pot from the bedroom, including foliage at the far-left shelves and bedside area, on the drawers, around the wardrobe, beside the TV and at the far-right edge. Restore the wall, floor or furniture beneath them. Preserve the exact framing, camera, pixel-art style, lighting, unobstructed window, furniture, door, possessions and game layout. No plants, people, text, labels, logos or UI.

### Bathroom edit prompt

Use case: precise-object-edit. Remove every plant, all foliage and all plant pots from the bathroom, including those near the bathtub, toilet and upper-right shelves. Restore the tile, fixtures, shelving and floor beneath them. Preserve the exact framing, camera, pixel-art style, lighting, bath, toilet, sink, mirror, laundry, towels, radiator, bathmat and return door. No plants, people, text, labels, logos or UI.

## Bedroom bookshelf and living TV revision

The built-in ImageGen edit workflow replaced `bedroom_bg.png` and `living_bg.png`. The bedroom gained a narrow interactive bookshelf beside the lamp table. The living television and its set-top box moved to the left living area, exposing the oven, sink, counters and lower kitchen cabinets. The TV overlay and related hit areas were moved to the final artwork positions.

### Bedroom bookshelf edit prompt

Use case: precise-object-edit. Add one small, narrow, floor-standing wooden bookshelf on the left side of the bedroom directly beside the existing bedside table and lamp, against the far-left wall around x0%-4.5%, y48%-68%. Make it waist-high or lower, with a few ordinary paperbacks and worn dark wood matching the table. Keep it separate from the table and do not block the lamp or alarm. Preserve the exact 1672x941 framing, camera, pixel-art style, lighting, window, bed and all other room elements. Keep the room free of plants. No people, text, labels, logos or UI.

### Living TV edit prompt

Use case: precise-object-edit. Move only the television and complete low media cabinet/set-top box from the center of the kitchen view to the left living-room side around x7%-17%, y34%-59%, near the bookshelf and angled slightly toward the central couch. Adjust the armchair modestly if necessary. Keep the couch and coffee table central. Make the refrigerator/freezer, oven and stove, lower oven door, sink, counters, cupboards, drawers, microwave, coffee machine, dishes and preparation area fully visible. Reconstruct the kitchen behind the old TV position. Preserve the exact 1672x941 framing, camera, style, lighting, doors, furnishings and sole plant beside the bookshelf. No people, text, labels, logos or UI.

## Right-side angled TV revision

The built-in ImageGen edit workflow replaced `living_bg.png` again. The TV, media cabinet and channel box now stand immediately to the right of the central couch, with the screen angled left toward the seating area. The former TV space at the left was reconstructed, and the full kitchen remains exposed. The game now treats both the couch and TV cabinet as obstacles while preserving a narrow interaction path between them.

### Final right-side TV edit prompt

Use case: precise-object-edit. Move the television, low media cabinet and set-top channel box from the left wall to immediately right of the central couch, in the right foreground around x75%-87%, y55%-78%. Turn the complete unit at a convincing three-quarter angle so its screen faces diagonally left toward the couch. Reconstruct the left wall and floor where the TV previously stood. Keep the central couch and coffee table fixed, the full kitchen visible, door approaches usable, and the TV below the entry area. Preserve the exact 1672x941 framing, camera, style, lighting, doors, kitchen, rug, bookshelf, armchair, keys, drawers and sole plant. No people, text, labels, logos or UI.

## Compact bathroom and matching glass door revision

The built-in ImageGen edit workflow replaced `bathroom_bg.png` and `living_bg.png`. The bathroom is now a smaller stage surrounded by black negative space, with lightly worn white linoleum, a bath/shower and curtain, left-side toilet, bath mat, basin cupboard, mirrored medicine cabinet, and a two-panel fogged-glass door. The living room's middle bathroom door was changed to the matching exterior side. Both reciprocal portals use the same animated glass-door treatment in code.

The glass-door portals define separate hotspot and moving-panel rectangles. Their broad outer areas remain easy to click, while the animation crops only the inner door leaf so the surrounding white jamb and wall frame remain stationary.

### Bathroom edit prompt

Use case: precise-object-edit. Rework the bathroom into a compact, lightly worn room in the existing painterly adventure-game style. Preserve the straight-on 16:9 camera but surround the smaller room with substantial pure black space. Include a bathtub with shower and curtain, bath mat, toilet on the left, sink with cupboard below, mirrored medicine cabinet above, and a right-side hinged door with exactly two vertically stacked fogged-glass panels in a slim white powder-coated stainless-steel frame. Replace the tiled floor with subtly scuffed white linoleum. No character, interface or text.

### Living-room bathroom-door edit prompt

Use case: precise-object-edit. Change only the middle bathroom door, immediately right of the kitchen, into the matching living-room side of the bathroom's door: exactly two vertically stacked fogged-glass panels, slim white powder-coated stainless-steel frame, handle and hinges. Preserve every other living-room element, crop and lighting exactly. No character, interface or text.

## Living-room door handedness revision

The built-in ImageGen edit workflow replaced `living_bg.png` while preserving its 1672 x 941 framing. The bedroom and bathroom doors now have handles on the left and hinges on the right, opposite their bedroom/bathroom faces. The apartment exit now has its handle on the right and hinges on the left. Runtime door animation uses matching per-side hinge directions.

### Door handedness edit prompt

Use case: precise-object-edit. Reverse the hinge and handle side of all three living-room doors while preserving the complete room. Put the left bedroom door and middle two-panel fogged-glass bathroom door handles on the left with hinges on the right. Put the far-right apartment-exit handle on the right with hinges on the left. Change only handles, hinges, latches and minimal door-edge details; preserve every other object, the crop, lighting and style exactly. No character, UI or text.

## Recessed entrance hallway and left-entry bathroom

The bathroom now runs left-to-right as entrance, basket/towel, sink cabinet and mirror, toilet and picture, then bath/shower and curtain. Its reciprocal frosted-glass door is on the far left. The living room now has a short recessed hallway at the far right, with the front door at its far end, so the bathroom volume no longer overlaps the front entrance in the apartment plan.

The first full hallway generation softened details across the whole living room because generative editing resynthesized pixels outside the requested change. The shipping `living_bg_hallway_master.png` therefore starts from the earliest untouched `living_bg.png`, keeps its composition through the first 80% of the frame, feather-blends between 80% and 84.5%, and uses the generated hallway only in the far-right architectural zone. A restrained deterministic edge-restoration pass is applied once to the derived output. The source master is never overwritten.

Approved background masters are recorded by SHA-256 hash and dimensions in `background-masters.json`; the Node tests fail if any are overwritten. Future changes must create a same-size patch and a newly named derived asset using `scripts/build-background-patch.ps1` instead of sending the full approved scene through another generative edit.

### Recessed hallway prompt

Use case: precise-object-edit. Remodel only the far-right entrance zone so the apartment front door is no longer flush with the living-room back wall. Replace that far-right door recess and the tiny adjacent entry area with a short, narrow hallway that visibly runs backward into the image, with converging side walls and a little floor leading to the front door at the far end. The cream four-panel front door is closed, smaller with depth but readable and clickable, with its brass lever handle on the left edge, hinges on the right, centered peephole, and horizontal brass mail slot. Preserve the far-left bedroom door, central frosted-glass bathroom door, kitchen, furniture, TV, couch, table, rug, bookshelf, lighting, perspective, framing and resolution. Match the painterly pixel-edged adventure-game look. No people, text or extra doors.

### Left-entry bathroom prompt

Create a compact 16:9 apartment bathroom in the same painterly pixel-edged adventure-game style, with muted blue-grey walls, off-white tile, worn pale vinyl floor and warm dim lighting. In exact left-to-right order: one closed two-panel frosted-glass entrance door at the far left with its handle on the right and hinges on the left; a woven laundry basket and towel; a ceramic sink with cabinet storage below and mirror above; a toilet with a small framed landscape; and a bathtub/shower with a partly open curtain at the far right. Keep a continuous clear walking strip across the foreground. Exactly one of each fixture, no people, labels, windows, UI or extra doors.

## Original-style bathroom restoration

`bathroom_bg_restored_left_entry.png` replaces the compact interim bathroom. It restores the original spacious tiled-floor composition, peeling blue-grey wall, warm ceiling light, dark shower curtain, worn fixtures and detailed painterly finish while reversing the room flow. The player now enters at the left, followed by the laundry basket/towel, wooden sink cabinet and mirror, toilet and picture, with the bath/shower at the right. The generated candidate's door hardware was mirrored in a tightly bounded door-leaf rectangle so the bathroom face has hinges on the left and its handle on the right; no other pixels were reprocessed in that correction.

The active `bathroom_bg_restored_compact.png` retains that corrected artwork but crops and scales it into a 960 x 650 near-square room stage centered at `(356, 145)` on the unchanged 1672 x 941 canvas. Black surrounds the room, and a 28-pixel rounded mask gives the boundary the slightly softened diorama shape shown in the later reference. This framing step is deterministic and does not regenerate the bathroom.

### Final restored bathroom prompt

Use case: precise-object-edit. Asset type: 16:9 point-and-click adventure game bathroom background matching the supplied original screenshot. Restore the exact original bathroom aesthetic and reverse the room's functional direction so the player enters from the left. Required left-to-right layout: one closed return door on the left; immediately after it a woven laundry basket and hanging towels; then the same wooden sink vanity with storage below and large mirror above; then the toilet with framed picture; finally the bathtub and shower with tiled surround and dark curtain at the far right. Preserve the screenshot's crisp detailed painterly rendering, worn grey tile, peeling blue-grey wall, warm ceiling light, deep shadows, large tiled foreground, muted palette and elevated straight-on camera. Keep the reciprocal door face physically correct with hinges left and handle right. Background only: no player, UI, labels, borders or text; exactly one of each fixture; no plants, windows, extra fixtures, compact black-box staging, soft focus or simplified textures.

## Exact reversed bathroom master

The active `bathroom_bg_reversed_master.png` is built directly from the user-selected `bathroom_bg.png`, superseding the generated reconstruction. The complete source bitmap is reversed horizontally, producing the exact requested order: left door, laundry and towel, basin cabinet and mirror, toilet and picture, then bath/shower at the right. The door rectangle alone is reversed a second time in place so its handle remains on the right and hinges on the left, matching the reciprocal doorway. No generative repainting, resampling, scaling, cropping or compression is applied; the original 1672 x 941 pixels, compact rounded stage and black surround are preserved.

## Living-room bathroom-door glass reversal

`living_bg_hallway_glass_reversed.png` derives directly from `living_bg_hallway_master.png`. Only the interiors of the upper pane `(1164,155,93,158)` and lower pane `(1164,339,93,113)` are reversed horizontally. The door frame, rails, handle, hinges and all other room pixels remain unchanged. A pixel-level comparison recorded 24,914 changed pixels inside those two rectangles and zero changes outside them. No generative model, resampling or full-frame render was used.

## High-fidelity living-room restoration

`living_bg_hallway_fidelity.png` is a fresh full-frame 1672 x 941 render made with the built-in image-generation tool. The active hallway scene was the exact composition and geometry target, while the untouched `living_bg.png` supplied the sharper painterly detail and material reference. The render preserves the established three-door layout, recessed entrance hallway, kitchen, seating group, television, rug and walkable floor closely enough to retain the existing hotspots, obstacles, perspective anchors and door-panel rectangles without changing game behavior. The earlier approved assets remain untouched, and the new active render is checksum-protected in `background-masters.json`.
