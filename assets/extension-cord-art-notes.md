# Extension cord inventory graphic

Current selected asset: `assets/used/extension-cord-icon-v15.png`. It refines the compact stacked pile with thinner cable. Earlier versions remain under `assets/unused/`. Generated with the built-in image tool, copied without pixel changes into unused assets, then promoted by the asset sorter.

## Thinner cable (selected v15)

Use case: precise-object-edit. Reduce the insulated cable diameter by approximately forty percent throughout the four-turn compact pile and both leads. Preserve connector body sizes and details, continuous winding, one entry per connector, compact smooth male rear entry, angled view, cream plastic, worn painted texture, lighting, sharpness and transparency. Close the stacking proportionally so the thinner turns continue to touch, without large gaps. No added turns, separate closed rings, tails, branches, fittings, text, scenery or props.

## Compact stacked coil (v14)

`scripts/build-extension-cord-pile-guide.py` draws a new open four-turn helix with constant oval radius and pitch equal to the cable diameter, joined to one lead at each end. The reference is saved to `assets/unused/extension-cord-pile-guide-v1.png` and is not loaded by the game.

Prompt: Use case: sketch-to-render. Image 1 supplies a continuous four-turn compact stacked cable pile, same-diameter turns closely touching vertically. Image 2 supplies only the cream material, worn realistic painted texture and angled connector appearance. Preserve the guide's single open helix: male lead into the lower coil, successive turns progress upward with smooth side transitions, upper lead crosses over the front to the socket. Neighbouring turns touch with contact shading, one central opening, no large concentric gaps. Exactly two cable endpoints attached to connectors, one entry each, compact smooth male plug without projecting rear fitting. Realistic painted inventory icon at an oblique side angle, sharp detail, mild wear and warm light. Transparent square canvas, generous margins, no isolated rings, extra tails, branches, text, logos, scenery or props.

## Additional bottom turn (v13)

Use case: precise-object-edit. Add one connected oval turn below the existing lowest/front coil turn, making four turns. Route the male plug's single lead into this added lower turn and smoothly into the original winding. Retain the outgoing inner diagonal socket lead over the front turns, a single continuous cable with exactly two endpoints and one entry per connector. Preserve the angled view, compact smooth male plug with flush rear entry, socket, cable thickness, cream plastic, sharp worn painted detail, lighting, transparent square canvas and padding. No isolated rings, branches, extra tails or fittings.

## Single-path guide render (v12)

The new topology reference `assets/unused/extension-cord-continuity-guide-v1.png` is drawn by `scripts/build-extension-cord-guide.py`. It uses one open sampled spiral curve over three revolutions, joined to one lead at each endpoint. It does not edit existing artwork and is not loaded by the game.

Prompt: Use case: sketch-to-render. Image 1 is the geometry master: preserve its exact single spiral path, three turns, two leads, gaps, crossovers and inward progression. Image 2 supplies only the cream material, realistic worn painted texture, lighting and connector appearance; do not copy its winding. Smooth the guide's edges into a crisp painted game icon without moving, duplicating, disconnecting or closing cable segments. Add contact shadows at the outgoing diagonal lead's crossings so they read as separate portions of the same cable, not junctions. Preserve the angled connectors, three male pins, single socket and compact smooth male rear entry. Exactly two endpoints, one cable entry per connector. Transparent square canvas, full item with padding, no guide marks, text, scenery or extra objects.

## Three-turn refinement (v11, superseded)

Use case: precise-object-edit. Add one complete turn to v10, producing exactly three oval turns of one continuous planar open spiral. Trace the cable from the male plug through the outer turn, inward transition, middle turn, inward transition, inner turn and the diagonal front crossover lead to the female socket. Exactly two endpoints, one lead entering each connector; no isolated closed rings, extra turns, branches, gaps, spare tails or external right-hand lead. Preserve the angled view, cable thickness, cream material, worn painted texture, lighting, compact smooth male plug with flush rear entry, socket details, transparent square canvas and padding.

## Continuous two-turn winding (v10)

Use case: precise-object-edit. Make the two oval turns one visibly continuous open spiral. The cable flows from the lower-left male plug through the outer turn, an inward transition at the upper right, the inner turn and a diagonal lead crossing over the front to the lower-right female socket. Exactly two endpoints, one cable entering each connector, no separate closed rings, branches, gaps or extra outside lead around the right edge. Preserve the two turns, angled side view, compact smooth male plug, cream plastic, sharp painted texture, lighting and transparent square canvas. The final refinement removes the draft's duplicated outer right-hand socket lead while retaining the inner crossover lead.

## Two-loop refinement (v8)

Use case: precise-object-edit. Remove one complete oval turn from v7 so the coil has exactly two aligned loops, with two cable strands along both the near and far edges. Preserve the angled side view, cable thickness, oval diameter, single continuous cable and two leads, smooth compact male plug with a flush rear collar, right female socket, cream colour, worn painted detail, warm lighting, sharpness and transparent square canvas. Change only loop count and adjacent routing; no additional fittings, tails, text, scenery or shadows.

Earlier versions are preserved under `assets/unused/`: v1 has too many turns, v2 and v3 have an erroneous extra plug lead, v4 has correct leads but a frontal view, v5 is a rejected angle edit with a duplicate plug fitting, and v6 has a projecting ribbed rear sleeve removed at the user's request in v7. The icon is displayed with `background-size: contain`.

## Prompt

Use case: stylized-concept. Asset type: adventure game inventory icon. One five metre household extension cord, loosely coiled into a compact tidy oval, with both ends clearly visible: one moulded three-pin New Zealand/Australian plug and one matching single female socket connector. Detailed realistic painted game item, gently worn off-white plastic cable and connectors, muted natural colours, crisp defined edges and subtle warm lighting. Centered isolated object, slight overhead three-quarter view, compact clear silhouette readable in a 68 pixel inventory thumbnail, ample transparent padding, square canvas. Genuinely transparent background. No scenery, table, hands, people, multi-outlet power strip, text, labels, logo, frame, watermark, glow, or cast shadow outside the object.

## Shorter coil refinement

Use case: precise-object-edit. Make the extension cord clearly look five metres long: only three loose complete oval loops, approximately forty centimetres across in real-world scale, and two short tails to the plug and female socket. A thin bundle with a large open centre, without a dense stack or reel. Keep the worn off-white cable, single plug and matching socket, sharp painted texture, warm light, overhead three-quarter view, square canvas and genuine transparency. Full object visible with ample padding; no text, labels, logos, scenery, extra objects or cast shadow. Render with the built-in image generation tool.

## Cable continuity correction (v4)

Use case: stylized-concept. A new transparent game inventory icon of one five-metre off-white extension cord. Three aligned loose oval turns in the upper half, with two separate short leads extending down across a clear gap to a male plug at lower left and matching single female socket at lower right. Each connector faces down, with its one ribbed rear strain relief pointing up. Exactly one cable enters the centre tip of each rear strain relief; no cable touches the sides of the connector bodies. One unbranched continuous cable, exactly two endpoints, no extra tails, forks or disconnected rings. Preserve gently worn cream plastic, sharp realistic painted texture, subtle warm lighting, compact silhouette and transparent square canvas. Full item visible with padding; no text, logo, scenery, hands, extra objects or cast shadow.

## Angled view with corrected connections (v6)

Use case: stylized-concept. A transparent inventory icon of one five-metre cream extension cord at an oblique overhead side angle. Three aligned loose oval turns, two short leads, one male plug at lower left and one female socket at lower right. Both connector cylinders point diagonally toward lower left with their sides visible. Each has exactly one ribbed strain relief opposite its front face; its only cable enters the centre of that rear fitting. No side fittings, second strain relief, extra projections, branches or dangling ends. Clear space between the connector bodies and coil. Preserve sharp realistic painted texture, gently worn plastic, warm light, compact silhouette, square canvas and transparency. Full object visible with padding; no text, logo, scenery, hands, extra objects or external shadow.

## Remove projecting plug sleeve (v7)

Use case: precise-object-edit. Remove the long protruding ribbed plastic extension from the rear of the lower-left male plug. Use a compact smooth cylindrical plug with one cable entering its rear through a tiny flush collar, no projecting sleeve or spare stub. Keep the three aligned oval loops, single continuous cable, right female socket, diagonal side view, cream colour, worn painted texture, three metal pins, object layout, sharpness and transparent square canvas. Change only the plug's rear protrusion and immediate cable join.
