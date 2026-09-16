# Apartment room artwork

Generated with built-in ImageGen using `bedroom_bg.png` as the style reference. Final copied assets: `living_bg.png` and `bathroom_bg.png`, both 1672 x 941. No new player sheet: all three rooms share the existing ordinary-man idle and directional walking sheet.

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
