# Bluestar alley artwork

`alley-bg-npc-v2.png` is the active native 1672 x 941 PNG. It contains the empty cardboard shelter, sleeping bag and bags, with no runtime character layer.

The background is rebuilt by `scripts/build-alley-npc-background.ps1` from the preserved original `alley-bg-v1.png` and the clean source `alley-clean-source-v1.png`. The script keeps the original canvas dimensions and performs no spatial resizing or resampling. Pixels outside the localized reconstruction polygon are copied directly from the original.

The alley player perspective uses four anchors: 12.4% scene width at the street/bin plane, 13.2% beside the fence and bins, 15% at the service-door and shelter plane, and 23% in the foreground.

## Stable transparent NPC v6

`alley-man-open-source-v6.png` is the single lower-detail master pose generated against flat green using the player sheet as the strict style reference. `scripts/build-alley-man-v6.ps1` flood-fills only green pixels connected to the canvas edges, converts that exterior region to alpha, and leaves all enclosed olive jacket pixels opaque.

The attached `bedroom_player.png` sheet was the strict style reference: simplified softly modeled game art, restrained texture, clean silhouettes, smooth skin shading and medium-low detail at gameplay scale. The NPC prompt explicitly rejected photographic, hyperrealistic and promotional-render treatment.

The builder duplicates the transparent master into two 1374 x 1145 cells. Frame two differs only inside the two small eye regions used to draw closed lids; the rest of the character is pixel-identical. Runtime animation shows the closed-eye frame briefly once every six seconds. No full-body redraws, transform animation or green-key filter are used. `scripts/validate-alley-man-v6.ps1` verifies that all frame differences stay inside the eye regions and that no enclosed fully transparent holes exist.
