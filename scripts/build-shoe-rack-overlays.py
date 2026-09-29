"""Cuts the parts of the living-room shoe rack that stand in front of the two
removable pairs out of the rack art, so the pairs appear to sit inside the rack.

The rack element stacks: the rack, the sneakers on the middle shelf, the rack
parts in front of the sneakers (the whole top shelf above them, the front post
and the middle shelf's front lip), the work shoes on the top shelf, then the
rack parts in front of the work shoes (the front post and the top shelf's front
lip). Each overlay is a copy of the rack art keeping only those pixels, so it
lines up exactly with the rack beneath and is invisible when no pair is there.

The shelf edges are straight lines measured from the art (image pixels): each
shelf plate's back edge, and each front lip from its bright top highlight down
to its bottom edge. Right of the front post, a shelf's visible end is its side
lip, the bottom LIP_DEPTH pixels of the shelf there.

Also prints each pair's CSS placement: sized to match the painted pairs (the
tan sneakers on the bottom shelf are 397 px wide, the brown shoes 369 px), with
the pair's right end just behind the front post and its sole line just behind
the shelf's lip, which covers the bottom of the soles where they come closest.

Requires: pip install pillow numpy
Usage:    python scripts/build-shoe-rack-overlays.py
"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
USED = os.path.join(ROOT, "assets", "used")
RACK = "living-shoe-rack-v3.png"
OVER_SNEAKERS = "living-shoe-rack-v3-over-sneakers.png"
OVER_WORK = "living-shoe-rack-v3-over-work.png"

POST = (795, 833)      # the front-right post, full height
LIP_DEPTH = 26         # front lip, from 2 px above its highlight
# Straight shelf edges, y = y0 + slope * (x - 600).
TOP_BACK = (343, .489)
TOP_HIGHLIGHT = (553, .525)
TOP_BOTTOM = (576, .528)
MIDDLE_HIGHLIGHT = (887, .567)
MIDDLE_BACK = (638, .544)
# (icon, visible width in rack pixels, right end x, lip highlight, sole below highlight)
PAIRS = {
    "work": ("work-shoes-icon-v2.png", 375, 860, TOP_HIGHLIGHT, 6),
    "sneakers": ("sneakers-icon-v2.png", 395, 865, MIDDLE_HIGHLIGHT, 10),
}


def line(edge, x):
    return edge[0] + edge[1] * (x - 600)


def side_lip(opaque, x, back, y_limit):
    """Bottom LIP_DEPTH rows of the shelf run that starts near its back edge."""
    column = opaque[:, x]
    y = int(back) - 3
    while y < y_limit and not column[y]:
        y += 1
    end = y
    while end < column.size - 1 and column[end + 1]:
        end += 1
    return max(y, end - LIP_DEPTH), end


def masks(opaque):
    height, width = opaque.shape
    ys = np.arange(height)[:, None]
    xs = np.arange(width)[None, :]
    post = (xs >= POST[0]) & (xs <= POST[1]) & (ys >= 320)
    left = xs < POST[0]
    top_shelf = (ys >= line(TOP_BACK, xs) - 2) & (ys <= line(TOP_BOTTOM, xs) + 2)
    top_lip = left & (ys >= line(TOP_HIGHLIGHT, xs) - 2) & (ys <= line(TOP_BOTTOM, xs) + 2)
    middle_lip = left & (ys >= line(MIDDLE_HIGHLIGHT, xs) - 2) & (ys <= line(MIDDLE_HIGHLIGHT, xs) + LIP_DEPTH)
    for x in range(POST[1] + 1, width):
        for edge, lip in ((TOP_BACK, top_lip), (MIDDLE_BACK, middle_lip)):
            start, end = side_lip(opaque, x, line(edge, x), line(edge, x) + 60)
            lip[start:end + 1, x] = True
    return {
        OVER_SNEAKERS: (top_shelf | post | middle_lip) & opaque,
        OVER_WORK: (post | top_lip) & opaque,
    }


def placement(icon, visible_width, right, highlight, below):
    """Left, top and width of the pair in rack pixels: the whole sole line stays
    behind the lip, reaching `below` pixels under its highlight at the closest point."""
    alpha = np.array(Image.open(os.path.join(USED, icon)))[..., 3] > 128
    height, width = alpha.shape
    ys, xs = np.where(alpha)
    scale = visible_width / (xs.max() - xs.min() + 1)
    left = right - xs.max() * scale
    columns = np.where(alpha.any(axis=0))[0]
    soles = np.array([np.where(alpha[:, c])[0].max() for c in columns])
    top = np.min(line(highlight, left + columns * scale) + below - soles * scale)
    return left, top, width * scale


def main():
    rack = Image.open(os.path.join(USED, RACK)).convert("RGBA")
    pixels = np.array(rack)
    opaque = pixels[..., 3] > 0
    for name, mask in masks(opaque).items():
        layer = pixels.copy()
        layer[~mask] = 0
        Image.fromarray(layer, "RGBA").save(os.path.join(USED, name))
        print(f"{name}: {int(mask.sum())} px")
    width, height = rack.size
    for name, spec in PAIRS.items():
        left, top, pair_width = placement(*spec)
        print(f".shoe-rack-{name} {{ left:{left / width * 100:.2f}%; top:{top / height * 100:.2f}%; width:{pair_width / width * 100:.2f}%; }}")


if __name__ == "__main__":
    main()
