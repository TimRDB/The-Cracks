"""Finishes the crumpled and clean outfit sheets: rebuilds the side-view collars and
cleans the green-screen outline around every pose, then carries the rendered socks
over from the previous sock sheets.

Collars. The earlier builders pasted the canonical head over the regenerated outfit
and then erased every outfit pixel outside the head's silhouette, which cut a
stepped notch out of the collar, and painted dark jacket pixels over the neck. The
regenerated collar lines up with the canonical neck to within 1-2 pixels, so in the
five side-view poses (row 0), inside a band from the nape down past the collar,
each pixel is rebuilt: the regenerated garment (collar, shirt, jacket) is drawn over
the back of the neck, skin and hair come from the canonical head, and everything
else is transparent. Above the chin, the throat side is kept exactly as the
canonical head, because the regenerated jaw is slightly larger and its edge is
green-screen fringe.

Outlines. The regenerated art was keyed with a hard cut, leaving a dark olive-green
rim around most of the silhouette, where the underwear sheet has a warm dark outline
in its own colours. Single-pixel spurs and notches are smoothed out of the
silhouette, then every green-tinted pixel within two pixels of the edge keeps its
brightness but takes the colour of the garment just inside it. Pixels identical to
the underwear sheet (the canonical head) and a one-pixel ring around them are never
touched.

Socks. Each sock sheet differs from its barefoot sheet only in the lower-leg band,
so those pixels are carried over from the previous pair onto the new barefoot sheet
and cleaned the same way, inside the lower-leg band only.

Requires `pip install pillow numpy`.
"""
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
WIDTH, HEIGHT = 1619, 971
CANONICAL = "used/player-sheet-keyed-v1.png"
SOCK_BAND = 0.66  # sock composites only change rows below this fraction of each pose
OUTFITS = [
    {
        "source": "unused/player-crumpled-regenerated-key-v4.png",
        "previous": "unused/player-sheet-clothes-barefoot-v13.png",
        "previous_socks": "unused/player-sheet-clothes-socks-v16.png",
        "output": "used/player-sheet-clothes-barefoot-v14.png",
        "output_socks": "used/player-sheet-clothes-socks-v17.png",
    },
    {
        "source": "unused/player-clean-regenerated-key-v4.png",
        "previous": "unused/player-sheet-clean-barefoot-v15.png",
        "previous_socks": "unused/player-sheet-clean-socks-v18.png",
        "output": "used/player-sheet-clean-barefoot-v16.png",
        "output_socks": "used/player-sheet-clean-socks-v19.png",
    },
]


def load(path):
    return np.array(Image.open(os.path.join(ASSETS, path)).convert("RGBA"))[:HEIGHT, :WIDTH].astype(np.int32)


def save(image, path):
    Image.fromarray(image.astype(np.uint8), "RGBA").save(os.path.join(ASSETS, path))


def window_sum(mask, radius):
    """Number of set pixels in the square window of `radius` around each pixel."""
    padded = np.pad(mask.astype(np.int32), radius)
    out = np.zeros(mask.shape, np.int32)
    for dy in range(2 * radius + 1):
        for dx in range(2 * radius + 1):
            out += padded[dy:dy + mask.shape[0], dx:dx + mask.shape[1]]
    return out


def neighbours(mask, radius):
    """True where any pixel within `radius` (square window) is set."""
    return window_sum(mask, radius) > 0


def key(image):
    """The same green-screen key the PowerShell outfit builders use."""
    r, g, b = image[..., 0], image[..., 1], image[..., 2]
    other = np.maximum(r, b)
    removed = (g > 170) & (g - other > 78) & (g > r * 1.35) & (g > b * 1.35)
    edge = (g > 145) & (g - other > 58) & (g > r * 1.22) & (g > b * 1.22)
    for _ in range(2):
        removed |= edge & neighbours(removed, 1)
    keyed = image.copy()
    keyed[removed] = 0
    spill = (keyed[..., 3] > 0) & neighbours(keyed[..., 3] == 0, 2) & (g - other > 24)
    keyed[..., 1] = np.where(spill, np.minimum(g, other + 10), keyed[..., 1])
    return keyed


def skin(p):
    r, g, b, a = p[..., 0], p[..., 1], p[..., 2], p[..., 3]
    return (a > 0) & (r > 120) & (g > 50) & (r - g > 25) & (r - b > 35) & (g - b > 4)


def hair(p):
    r, g, a = p[..., 0], p[..., 1], p[..., 3]
    return (a > 0) & ~skin(p) & (r > g * 1.5) & (r < 200)


def remove_skin_specks(band):
    """Skin pixels with at most one skin neighbour are fringe specks: clear them at the
    silhouette edge, or fill them with the surrounding garment colour inside the collar."""
    band = band.copy()
    is_skin, clear = skin(band), band[..., 3] == 0
    garment = ~is_skin & ~clear & ~hair(band)
    for y, x in zip(*np.where(is_skin)):
        window = (slice(max(0, y - 1), y + 2), slice(max(0, x - 1), x + 2))
        if is_skin[window].sum() - 1 > 1:
            continue
        if clear[window].sum() >= 4:
            band[y, x] = 0
        elif garment[window].sum() >= 4:
            band[y, x] = np.round(band[window][garment[window]].mean(axis=0)).astype(band.dtype)
    return band


def rebuild_side_collars(sheet, raw, canonical):
    raw_skin, raw_hair = skin(raw), hair(raw)
    raw_garment = (raw[..., 3] > 0) & ~raw_skin & ~raw_hair
    canon_head = skin(canonical) | hair(canonical)
    fixed = sheet.copy()
    for col in range(5):
        x0, x1 = round(col * WIDTH / 5), round((col + 1) * WIDTH / 5)
        y0, y1 = 0, round(HEIGHT / 3)
        # Head columns: everything the canonical head occupies in the top fifth of the cell.
        top = canonical[y0:y0 + (y1 - y0) // 5, x0:x1, 3] > 0
        cols = np.where(top.any(axis=0))[0]
        hx0, hx1 = x0 + cols.min() - 12, x0 + cols.max() + 13
        # Band: from just above the nape (where the back of the canonical head turns from hair
        # to neck skin) to a few rows below the last neck skin.
        opaque, neck_skin = canonical[..., 3] > 0, skin(canonical)
        band_top = None
        for y in range(y0 + 30, y0 + 120):
            back = np.where(opaque[y, hx0:hx1])[0]
            if len(back) and neck_skin[y, hx0 + back[0]:hx0 + back[0] + 3].any():
                band_top = y - 4
                break
        window = slice(band_top, band_top + 45)
        neck_rows = np.where((raw_skin | neck_skin)[window, hx0:hx1].any(axis=1))[0]
        band_bottom = band_top + neck_rows.max() + 8
        ys, xs = slice(band_top, band_bottom), slice(hx0, hx1)
        # Keep the regenerated neck's shading but shift it onto the canonical skin tone.
        both = raw_skin[ys, xs] & skin(canonical)[ys, xs]
        shift = (canonical[ys, xs][both][:, :3].mean(axis=0) - raw[ys, xs][both][:, :3].mean(axis=0)) if both.any() else np.zeros(3)
        shifted = raw[ys, xs].copy()
        shifted[..., :3] = np.clip(shifted[..., :3] + np.round(shift).astype(np.int32), 0, 255)
        band = np.zeros_like(sheet[ys, xs])
        band = np.where(raw_skin[ys, xs][..., None], shifted, band)
        band = np.where(raw_hair[ys, xs][..., None], raw[ys, xs], band)
        band = np.where(canon_head[ys, xs][..., None], canonical[ys, xs], band)
        # The collar covers the canonical neck from behind.
        band = np.where(raw_garment[ys, xs][..., None], raw[ys, xs], band)
        band = remove_skin_specks(band)
        # Above the chin, the throat side is face, and any regenerated pixels there are
        # green-screen fringe from the slightly larger regenerated jaw, so it is kept
        # exactly as the canonical head. The shirt collar starts below the chin, where
        # the front of the canonical silhouette steps back to the throat.
        front = np.array([np.where(opaque[y, hx0:hx1])[0].max(initial=0) for y in range(band_top, band_bottom)])
        steps = np.where(front[:-1] - front[1:] >= 4)[0]
        chin = steps[0] + 1 if len(steps) else len(front)
        neck_x = np.where(skin(canonical)[ys, xs], np.arange(hx1 - hx0), np.nan)
        centre = np.nanmean(np.where(np.isnan(neck_x).all(axis=1, keepdims=True), 0, neck_x), axis=1, keepdims=True)
        throat_side = np.arange(hx1 - hx0)[None, :] > centre
        face = throat_side & (np.arange(band_bottom - band_top) < chin)[:, None]
        band = np.where(face[..., None], canonical[ys, xs], band)
        fixed[ys, xs] = band
    return fixed


def clean_outline(sheet, protected, editable):
    """Smooths single-pixel spurs and notches, then recolours green-tinted rim pixels with
    the garment colour just inside them. Only `editable` pixels outside `protected` change."""
    out = sheet.copy()
    allowed = editable & ~protected
    opaque = out[..., 3] > 0
    count = window_sum(opaque, 1) - opaque
    spurs = allowed & opaque & (count <= 2)
    notches = allowed & ~opaque & (count >= 6)
    out[spurs] = 0
    opaque = out[..., 3] > 0
    for y, x in zip(*np.where(notches)):
        window = (slice(y - 1, y + 2), slice(x - 1, x + 2))
        out[y, x] = np.round(out[window][opaque[window]].mean(axis=0)).astype(out.dtype)

    opaque = out[..., 3] > 0
    clear = ~opaque
    rim = opaque & neighbours(clear, 2)
    interior = opaque & ~neighbours(clear, 2) & ~protected
    colour = out[..., :3].astype(np.float64)
    radius = 4
    total = np.zeros(colour.shape)
    for c in range(3):
        total[..., c] = window_sum_values(colour[..., c] * interior, radius)
    samples = window_sum(interior, radius)
    reference = total / np.maximum(samples, 1)[..., None]
    r, g, b = colour[..., 0], colour[..., 1], colour[..., 2]
    rr, rg, rb = reference[..., 0], reference[..., 1], reference[..., 2]
    greenness = g - np.maximum(r, b)
    reference_greenness = rg - np.maximum(rr, rb)
    fringe = allowed & rim & (greenness >= 0) & (greenness > reference_greenness + 4)
    lum = colour.mean(axis=2)
    reference_lum = np.maximum(reference.mean(axis=2), 1)
    recoloured = np.clip(np.round(reference * (lum / reference_lum)[..., None]), 0, 255)
    has_reference = samples > 0
    neutral = colour.copy()
    neutral[..., 1] = np.minimum(g, np.maximum(r, b))
    new = np.where(has_reference[..., None], recoloured, neutral)
    out[..., :3] = np.where(fringe[..., None], new, out[..., :3]).astype(out.dtype)
    return out


def window_sum_values(values, radius):
    padded = np.pad(values, radius)
    out = np.zeros(values.shape)
    for dy in range(2 * radius + 1):
        for dx in range(2 * radius + 1):
            out += padded[dy:dy + values.shape[0], dx:dx + values.shape[1]]
    return out


def lower_leg_band():
    # Same boundary as CheckSocks in validate-player-regenerated-wardrobe-v11.ps1.
    row_height = HEIGHT / 3
    y = np.arange(HEIGHT)
    local = y - np.floor(y / row_height) * row_height
    return np.repeat((local >= row_height * SOCK_BAND)[:, None], WIDTH, axis=1)


def main():
    canonical = load(CANONICAL)
    everywhere = np.ones((HEIGHT, WIDTH), bool)
    for outfit in OUTFITS:
        barefoot = rebuild_side_collars(load(outfit["previous"]), key(load(outfit["source"])), canonical)
        # The canonical head (and anything else identical to the underwear sheet) and a
        # one-pixel ring around it are never smoothed or recoloured.
        protected = neighbours((barefoot == canonical).all(axis=2) & (canonical[..., 3] > 0), 1)
        barefoot = clean_outline(barefoot, protected, everywhere)
        save(barefoot, outfit["output"])
        # Carry the rendered socks over from the previous sock sheet.
        previous, previous_socks = load(outfit["previous"]), load(outfit["previous_socks"])
        sock_pixels = (previous_socks != previous).any(axis=2)
        socks = np.where(sock_pixels[..., None], previous_socks, barefoot)
        socks = clean_outline(socks, protected, lower_leg_band())
        save(socks, outfit["output_socks"])
        print(f"{outfit['output']} and {outfit['output_socks']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
