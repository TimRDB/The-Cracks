# Wake-up sequence artwork

Built-in imagegen created two new source assets. The approved bedroom backgrounds and sprite sheet were not overwritten.

- `assets/wakeup-sleeper-source-v1.png`: high-resolution localized bed edit, matching the existing main character.
- `assets/bedroom-wakeup-v1.png`: native 1672 x 941 sleeping composite used only during the intro.
- `assets/alarm-closeup-v1.png`: independent high-resolution clock close-up with a blank screen. Sharp SVG seven-segment digits are rendered by the game, so changing the time requires no image processing.

`wakeup.js` exposes `wakeupConfig.time` (currently `6:00`) and all timing values at the top. New Game preloads and decodes the images before revealing the sleeping frame. The sequence shows the bed, rings a synthesized three-pulse alarm while the close-up zooms out from the bedside position, dismisses the insert, fades fully to black, swaps back to the untouched normal bedroom and standing character, then fades in. Skip intro or Escape cancels the sequence and audio. Gameplay controls are restored after the reveal; intro state is never written into saves.

## Pixel preservation

`scripts/build-wakeup-bed.ps1` resamples only the new high-resolution bed source into its 630 x 220 working crop. It composites within a polygon confined to pillow/bedding, with a three-pixel inward matte edge. It never resamples, sharpens, blurs or filters the full bedroom. The final image has exactly 49,978 changed bed pixels and 1,523,374 pixels identical to the current starting-bedroom master. Everything outside the matte is checked pixel-for-pixel, including walls, furniture, bed frame, table, lamp and alarm clock. All source master files remain intact. During normal play the original bedroom image is shown directly, with no intro layer.

Base: `assets/lighting/bedroom-states-v14/bedroom-c0-l0-m0.png`. SHA-256 at creation: `CB527CB7DBA2129EAF7D4C69AF93FEDD7682D27DAD6814B3BAE417BA7F4CF355`.

## Rebuild and verify

- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-wakeup-bed.ps1`
- `node --test tests/bedroom.test.cjs`
- `node tests/wakeup-browser.cjs`

Browser captures are saved as `output/wakeup-{sleeping,alarm,black,standing}-preview.png`. The browser check clicks New Game, verifies audio is running with scheduled pulses, checks the black-frame swap, then confirms the standing pose, movement and safe skip behavior. Unit tests cover the full timeline, input lock, reset, skip and stale timer cancellation.

## Sleeping-pose prompt

Use case: precise-object-edit. Edit the LAST IMAGE, the enlarged bed crop. The first image is the bedroom lighting/style reference; the second image is the main character identity reference (short brown hair, light skin, faint stubble, ordinary adult male, charcoal T-shirt); the third/last image is the EXACT composition to edit.
Add this same adult man naturally asleep IN the bed under the existing navy duvet. His head rests heavily into the pillow at LEFT with believable pillow compression and contact shadows, eyes closed, relaxed face turned slightly toward the viewer. His body extends horizontally RIGHT down the bed, fully beneath the navy covers up to his neck, with a small glimpse of charcoal T-shirt at the collar. No bare torso, no exposed legs, no extra limbs. Show subtle, convincing shoulders, torso, hips and legs through the weight and contours of the duvet; do not make an oversized person or a floating pasted face. Head roughly 9% of total crop width, human body length around 75% of crop width, correct adult-to-single-bed proportions. Maintain exactly the original bed frame, perspective, pillow placement, navy fabric, duvet's outer hanging edge, window, wall, furniture, lamp and bedside alarm. Match the dim, cool pre-dawn lighting exactly: do not brighten the face unnaturally.
Keep the original framing and all geometry. Alter ONLY the pillow contact, sleeping person and nearby duvet folds needed for his body. Crisp detailed painterly game rendering, fine navy fabric folds and sharp wooden edges matching the reference. No softened repaint, blur, glow, noise removal or full-room re-render. Output the same wide aspect ratio as this bed crop, high detail at least 1260 pixels wide.

## Alarm close-up prompt

Use case: stylized-concept. Create a detailed close-up insert for this same game's early-morning alarm-clock sequence. The reference shows the exact room style and its small bedside alarm: a squat black rounded rectangular digital alarm clock on a worn dark wooden bedside table next to a plain off-white mug. Render a close-up of that ordinary black digital clock, almost straight-on with just enough top and side visible for depth. No people. Cool, dim bedroom lighting; lamp off; believable black plastic, little scratches, warm dark wood, crisp painterly realistic adventure-game detail matching the reference. The clock fills most of the image, with part of the off-white mug cropped at left, vague dark navy bed/pillow behind. The broad rectangular digital display is perfectly front-facing, horizontal, VERY DARK RED-BLACK, EMPTY (no digits, no letters, no time, no icons), so editable red LED numbers can be overlaid by the game. Make the blank display occupy approximately x24%-83%, y35%-65% of image. Rounded dark bezel outside that rectangle. Keep surrounding shadows restrained. A small snooze button may sit on top. No decorative graphics, no text, no UI borders. High-resolution 3:2 landscape close-up, crisp edges, no blur or film grain. This is a new high-resolution closeup, not an enlarged low-resolution crop.
