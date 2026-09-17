# Bedroom artwork

Final assets generated with the built-in ImageGen tool:
- `bedroom_bg.png`: the revised bedroom with bed on the left, drawers at its foot, TV/couch on the right, near-side bedside table, wardrobe and closed door.
- `bedroom_player.png`: an ordinary adult man with short hair and faint stubble, charcoal T-shirt, navy boxer shorts, bare legs and feet. Fifteen full-body drawings in a 5-by-3 grid: profile, front and back, each with idle and four walk poses. All poses use identical rendering brightness.

The background deliberately contains bare window glass. CSS supplies opaque pleated curtain panels over it and animates their width together with scene lighting; closed is the default. The character uses a solid-green source background removed by the shared SVG color key.

## Final room prompt

Rearrange this pixel-art bedroom game background while preserving its moody worn domestic look, muted colours, scuffed walls, ordinary single-man possessions, carpet, detailed pixel-art style, 16:9 camera view. NEW REQUIRED FURNITURE LAYOUT: single bed SIDEWAYS against LEFT part of back wall, long side horizontal, head/pillow at far LEFT, foot pointing RIGHT into middle of room. Bed occupies roughly x7%-43%, y44%-69%. Chest of drawers immediately at the FOOT (right end) of the bed, around x44%-55%, y43%-71%. Bedside table on the FRONT / NEAR SIDE of bed, x18%-26%, y60%-77%, with BOTH alarm clock and table lamp clearly visible on top, near viewer rather than tucked behind bed. Window above bed left of center, exact rectangular outer frame x20%-41%, y12%-39%, with pale overcast rooftops outside. Bare glass unobstructed: NO curtain cloth or blinds baked into picture because game will draw interactive closed curtains over it. Curtain rail from x18%-43% above frame. On RIGHT side of room, worn compact couch around x62%-80%, y56%-77%, angled toward television next to RIGHT WALL x86%-99%, y33%-70%, with low TV stand, gaming console and controller visible. TV next to right wall, couch on right, NO TV or couch on left. Open cupboard with hangers and clothes on back wall near middle-right x56%-67%. CLOSED bedroom door on back wall toward RIGHT x70%-82%, y18%-65%, not hidden by TV. Guitar leaning beside wardrobe, a few books, mug and personal items neatly messy, carpet slightly worn. Broad unobstructed foreground carpet y79%-100%, and a gap around center x32%-60% for walking character. Ordinary room of a single adult man, not overly messy, not fantasy. Soft moody overcast light for OPEN-CURTAIN state, no strong painted sunbeam; small warm lamp light. No people, characters, UI, labels, text, logos or watermarks. Full 16:9 composition.

## Final passing-pose edit prompt

Precisely edit this 5x3 sprite sheet, preserving its 1619x971 canvas, all character identities, charcoal T-shirt, navy boxer shorts underwear, bare legs and feet, short brown hair and faint stubble. TOP ROW COLUMN3 and COLUMN5 must be true WALK PASSING poses, not wide split strides: one foot directly beneath body bearing weight, other foot lifted behind it with bent knee, feet horizontally close together. Column3 supporting near leg, column5 supporting far leg. Keep whole body side view facing RIGHT; natural small relaxed barefoot steps, arms gently crossing torso. Keep top row column2 and4 as opposite contact poses and column1 standing. Keep all FRONT and BACK views in lower rows unchanged, with precisely two arms/legs. Maintain original positioning, scale, lighting, detailed pixel art. Clean truly TRANSPARENT alpha background with no red/yellow/green fringes or stray pixels. No checkerboard or colored background. Only change the two specified passing poses and clean edge halos. No cropping or shifting; all 15 complete figures in equal cells.

## Final sprite background prompt

Background replacement ONLY. In this exact 1619x971 5x3 sprite sheet replace EVERY grey checkerboard/background pixel with flat solid pure bright green RGB(0,255,0), hex #00FF00. Output OPAQUE PNG with solid green background, not transparent. Keep ALL fifteen character drawings EXACTLY unchanged, including positions, scale, poses, clothes, face, hands, feet, edges, shading. Do not regenerate people. No checkerboard texture remains anywhere, no grey halos, no red edge halos. Uniform pure green between characters and between limbs, including enclosed spaces. Do not add shadows, labels, lines, or change any body pixel. Exact same canvas and grid. Green screen asset for chroma-key rendering.

## Vertical walk-cycle cleanup

The built-in ImageGen edit workflow replaced `bedroom_player.png` while retaining its 5-by-3 green-screen layout. The four front-facing and four rear-facing walking cells were cleaned so each contains exactly two coherent legs with no duplicated or ghosted limbs. Runtime rendering once again cycles those frames during movement toward or away from the camera.

### Vertical walk-cycle edit prompt

Use case: precise-object-edit. Correct only the legs in the middle-row and bottom-row walking frames so every frame contains exactly two anatomically coherent legs, with no duplicated, ghosted, translucent, extra or overlapping limbs. Keep a clear four-frame alternating walk cycle in both directions. Preserve the 5-by-3 grid, pure bright-green background, character identity, clothing, scale, cell placement, foot anchors, entire side-view row and all idle cells. No shadows, text, grid lines or transparency.

## Lamp-off background

The built-in ImageGen edit workflow created `bedroom_bg_lamp_off.png`, a 1672 x 941 alternate background that retains the room layout and ambient window lighting while removing the lamp's baked wall glow and lampshade illumination. The game swaps between this asset and `bedroom_bg.png` at the moment the lamp state changes, replacing the earlier CSS darkening mask.

The current `bedroom_bg_reversed_door.png` and `bedroom_bg_lamp_off_reversed_door.png` keep those two lighting states while moving the bedroom-side door handle to the left and hinges to the right. The reciprocal living-room face has its handle on the right. The bathroom door artwork is unchanged.

### Lamp-off edit prompt

Use case: lighting-weather. Create an otherwise identical lamp-off version of the bedroom. Remove only the warm illumination projected onto the wall and the light within the complete lampshade, bulb area and edges. Render the same lamp switched off under the room's existing cool ambient light, reconstructing the worn wall texture and nearby furniture naturally. Preserve the exact 1672 x 941 canvas, camera, crop, object placement, window light and every other room element. No masking, global relighting, people, text or new objects.
