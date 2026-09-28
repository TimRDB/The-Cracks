"""Traces the bedroom couch, its blanket and the cushion on its right-hand seat out
of the bedroom artwork to the pixel, and writes the outline into game.js as
bedroomCouchSilhouette (scene percentages). The outline clips the copy of the room
drawn over the player whenever they stand behind the couch, and shapes the couch
hotspot. Every bedroom lighting state shares the same geometry, so one outline
serves them all.

The top of the couch is found column by column in the brightest lighting state:
the couch fabric, its lit rim and the blanket are olive or blue-grey, while the
carpet behind them is pink-brown, so each column's top edge is the first run of
couch-coloured pixels near the guide line below. The cushion's lit top can't be
told from carpet or TV-stand wood by colour, and the base can't be told from its
own shadow on the carpet, so those follow lines measured from the painting, as
does the left arm's edge. The top edge is then smoothed into one continuous line
that sits just inside the couch, so the fabric's tufts leave no crags or carpet in
it, and the outline is built directly from that line (a CSS mask image would be
softer, but Chrome blocks mask images on pages opened from disk).

Requires: pip install opencv-python-headless numpy
Usage:    python scripts/build-bedroom-couch-outline.py [--preview out.png]
"""
import os
import re
import sys

import cv2
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SOURCE = os.path.join(ROOT, "assets", "used", "lighting", "bedroom-states-v14", "bedroom-c1-l1-m1.png")
GAME = os.path.join(ROOT, "game.js")

# Guide to the top of the couch in scene percentages, accurate to about a
# percent: the left arm, the backrest's rounded left end and lit rim, the backrest
# top (with the blanket over it), then the cushion and far arm on the right-hand
# seat. Each column's top edge is found within WINDOW of this line.
TOP_GUIDE = [(70.33, 64.9), (71.1, 64.9), (71.2, 61.0), (71.5, 60.0), (72.5, 59.3), (73.5, 58.9), (76, 61.3), (78, 62.5),
             (80.5, 63.3), (84, 64.6), (86.4, 66.2), (88, 67.2), (89.0, 67.9), (89.3, 67.5), (90.5, 67.2),
             (92, 66.8), (93.3, 66.3), (95, 65.6), (97, 66.0), (98.5, 67.1), (100, 67.6)]
WINDOW = (-1.5, 1.0)
RUN = 3  # consecutive couch-coloured pixels that mark the top edge
BLUE_GREY_FROM = 76  # the blanket and cushion lie right of this
# Smoothing of the top edge, in image pixels: the rolling window and percentile
# that drop single tufts and gaps, and the Gaussian that rounds the line.
SMOOTH_WINDOW, SMOOTH_PERCENTILE, SMOOTH_SIGMA = 9, 50, 2.5
SIMPLIFY = .15  # outline points are dropped where the line stays within this
# The painting's anti-aliased edge pixels are half couch and half carpet, so they
# fail the colour test; the top line is moved out by this many pixels to take them in.
OUTSET = 1.0
# The cushion's lit top overlaps both carpet and TV-stand wood in colour, so from its
# left tip to the right edge the top is this measured line: the cushion, rising to
# its peak, then the far arm.
TOP_TRACED = [(88.75, 68.1), (89.0, 68.15), (89.2, 67.95), (89.5, 67.6), (90, 67.35), (90.5, 67.15), (91, 67.0), (91.5, 66.9),
              (92, 66.75), (92.5, 66.5), (93, 66.3), (93.5, 66.1), (94, 65.9), (94.5, 65.6), (94.85, 65.2),
              (95.1, 65.35), (95.5, 65.9), (96, 66.4), (96.4, 66.8), (97.2, 66.7), (98, 66.55), (99, 66.45),
              (100, 66.4)]
# Painted edges, in scene percentages. Everything beyond them is floor.
ARM_LEFT = 70.33             # left face of the left arm at its foot
ARM_LEFT_TOP = 70.42         # left face of the left arm at its top
ARM_TOP = 65.05              # top of the left arm, left of the backrest
ARM_CORNER = 5               # radius of the arm's rounded top-left corner, in image pixels
BACKREST_LEFT = 71.16        # left end of the backrest, above the arm
BASE = [(70.3, 80.35), (70.8, 81.1), (70.72, 82.4), (71.5, 83.35), (72.5, 83.95), (73.6, 84.2),
        (74, 83.75), (92.2, 100.25)]  # arm corner, wooden leg, then the base's dark contact line


def couch_coloured(image):
    """Olive fabric and its lit rim, or the blue-grey blanket and cushion. The carpet
    is pink-brown and the TV stand's wood strongly red, so neither qualifies. Deep
    shadow by the guitar is also neutral, so blue-grey only counts where the blanket
    and cushion are."""
    b, g, r = [image[..., i].astype(np.int32) for i in range(3)]
    lightness = (r + g + b) / 3
    olive = ((g - b) - (r - g) >= -8) & (lightness >= 45)
    blue_grey = (r - b <= 12) & (lightness < 120)
    blue_grey[:, :int(BLUE_GREY_FROM / 100 * image.shape[1])] = False
    return olive | blue_grey


def smooth(values, window, percentile, sigma):
    """A rolling percentile removes single tufts and gaps; a Gaussian then rounds the
    line. A percentile above 50 keeps the line just inside the couch, so no carpet
    between tufts is included."""
    half = window // 2
    padded = np.pad(values, half, mode="edge")
    rolled = np.percentile(np.lib.stride_tricks.sliding_window_view(padded, window), percentile, axis=1)
    radius = int(3 * sigma)
    kernel = np.exp(-.5 * (np.arange(-radius, radius + 1) / sigma) ** 2)
    return np.convolve(np.pad(rolled, radius, mode="edge"), kernel / kernel.sum(), mode="valid")


def top_edge(image):
    """The smoothed top of the couch, as image-pixel y for each column from the
    backrest's left end to the right edge of the picture."""
    height, width = image.shape[:2]
    coloured = couch_coloured(image)
    guide_x = [x / 100 * width for x, _ in TOP_GUIDE]
    guide_y = [y / 100 * height for _, y in TOP_GUIDE]
    start, traced_from = int(BACKREST_LEFT / 100 * width), int(TOP_TRACED[0][0] / 100 * width)
    columns = np.arange(start, width)
    top = np.interp(columns + .5, [x / 100 * width for x, _ in TOP_TRACED], [y / 100 * height for _, y in TOP_TRACED])
    for x in range(start, traced_from):
        centre = np.interp(x + .5, guide_x, guide_y)
        first, last = int(centre + WINDOW[0] / 100 * height), int(centre + WINDOW[1] / 100 * height)
        run = [y for y in range(first, last) if coloured[y:y + RUN, x].all()]
        top[x - start] = run[0] if run else last
    return columns, smooth(top, SMOOTH_WINDOW, SMOOTH_PERCENTILE, SMOOTH_SIGMA) - OUTSET


def outline(image):
    """The couch's outline in image coordinates: the left arm, the backrest's left
    end, the smoothed top, the picture's right and bottom edges, then the base."""
    height, width = image.shape[:2]
    px = lambda points: [(x / 100 * width, y / 100 * height) for x, y in points]
    columns, top = top_edge(image)
    arm_left, arm_top, backrest_left = ARM_LEFT_TOP / 100 * width, ARM_TOP / 100 * height, BACKREST_LEFT / 100 * width
    # The arm's top-left corner is rounded in the painting.
    angles = np.linspace(np.pi, 1.5 * np.pi, 7)
    corner = [(arm_left + ARM_CORNER * (1 + np.cos(a)), arm_top + ARM_CORNER * (1 + np.sin(a))) for a in angles]
    curve = [(float(x), float(y)) for x, y in zip(columns[::2], top[::2])] + [(float(width), float(top[-1]))]
    points = [*corner, (backrest_left, arm_top), *curve, (float(width), float(height)),
              *reversed(px(BASE)), (ARM_LEFT / 100 * width, BASE[0][1] / 100 * height)]
    simplified = cv2.approxPolyDP(np.array(points, np.float32), SIMPLIFY, True)
    return [(float(x), float(y)) for [[x, y]] in simplified]


def main():
    image = cv2.imread(SOURCE)
    height, width = image.shape[:2]
    points = outline(image)
    percent = [(round(x / width * 100, 2), round(y / height * 100, 2)) for x, y in points]
    literal = "[" + ",".join(f"[{x:g},{y:g}]" for x, y in percent) + "]"
    source = open(GAME, encoding="utf-8").read()
    source, count = re.subn(r"const bedroomCouchSilhouette = \[.*?\];", f"const bedroomCouchSilhouette = {literal};", source, flags=re.S)
    assert count == 1, "bedroomCouchSilhouette not found in game.js"
    open(GAME, "w", encoding="utf-8", newline="\n").write(source)
    print(f"{len(points)} points written to game.js")
    if "--preview" in sys.argv:
        traced = np.zeros((height, width), np.uint8)
        cv2.fillPoly(traced, [np.round(np.array(points) * 16).astype(np.int32)], 255, cv2.LINE_AA, 4)
        tinted = image.copy()
        tinted[traced > 127] = tinted[traced > 127] * .6 + np.array([255, 0, 255]) * .4
        crop = np.hstack([image, tinted])[int(height * .55):height]
        cv2.imwrite(sys.argv[sys.argv.index("--preview") + 1], crop)


if __name__ == "__main__":
    main()
