"""Traces the living-room TV, its stand and cabinet out of
assets/used/lighting/living-master-v2.png and writes the outline into rooms.js as
livingTvSilhouette (scene percentages). The outline clips the copy of the room
drawn over the player behind the TV, and shapes the TV hotspot.

The shape is segmented with OpenCV GrabCut, guided by the rough outline below
(image pixels): pixels well inside it are certainly TV/cabinet, pixels well
outside are certainly floor or wall, and GrabCut decides the band between, so
the result follows the painted outline. The largest region is kept and holes
are filled. GrabCut still takes in anti-aliased edge pixels and the shadow under
the cabinet, so at 4x resolution the shape is then trimmed to the painted
outline lines measured below (each keeps the dark outline pixel and removes
everything beyond it), and a small opening rounds its corners like the
painting's before it is traced at sub-pixel precision.

Requires: pip install opencv-python-headless numpy
Usage:    python scripts/build-living-tv-outline.py [--preview out.png]
"""
import os
import re
import sys

import cv2
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SOURCE = os.path.join(ROOT, "assets", "used", "lighting", "living-master-v2.png")
ROOMS = os.path.join(ROOT, "rooms.js")

# Hand-traced outline, accurate to a few pixels.
ROUGH = [(1405.6, 387), (1588, 423), (1590, 597.5), (1650.6, 611.2), (1650.6, 628), (1645.5, 630),
         (1645.3, 780), (1641, 798), (1611, 798), (1610, 788), (1558, 794), (1558, 810),
         (1531, 810), (1530, 792), (1354.6, 684), (1353.3, 548), (1351.5, 539.5), (1405.6, 532)]
BAND = 7  # pixels either side of the rough outline that GrabCut decides
SCALE = 4
CORNER_RADIUS = 2.5  # image pixels


# Bottom of the front plinth: the row of its dark outline pixel, measured
# column by column. Everything below is shadowed carpet.
PLINTH_X = [1363, 1390, 1450, 1530]
PLINTH_Y = [680, 696, 732, 784]
# Top row of the TV's dark top outline.
TV_TOP_X = [1400, 1406, 1410, 1420, 1590]
TV_TOP_Y = [388, 388, 387, 389, 427.25]


# Measured painted edges, in image pixels. Each entry is (region, pixels to
# remove); x and y are coordinate grids. Every trim keeps the outline pixel.
def trims(x, y):
    return [
        # Shadowed carpet under the cabinet's front plinth and left leg.
        ((x >= 1363) & (x <= 1531), y > np.interp(x, PLINTH_X, PLINTH_Y) + 1),
        ((x >= 1340) & (x < 1363), y > 690),
        # Drawers and floor left of the TV: the TV's grey frame starts at 1406
        # and the dark pixel at 1405 is shared by both outlines.
        ((y >= 380) & (y < 534), x < 1405.5),
        # Wall and hallway floor above the TV's top edge.
        ((x >= 1400) & (x <= 1590), y < np.interp(x, TV_TOP_X, TV_TOP_Y)),
        # Floor above the cabinet's back edge right of the TV.
        ((x > 1590) & (x <= 1655), y < 593 + 0.4 * (x - 1595)),
        # Floor right of the side panel, below the top's overhang.
        ((y >= 631) & (y <= 800), x > 1644),
        # Floor left of the side panel and the top's rounded left end.
        ((y >= 551) & (y <= 690), x < 1356),
        ((y >= 530) & (y < 551), x < 1352),
        # Floor above the top's back edge left of the TV.
        ((x >= 1345) & (x <= 1406), y < 537.2 - 0.1 * (x - 1365)),
    ]


# Regions certainly inside those edges, kept even where GrabCut hesitates over
# the dark outline pixels.
FILLS = [
    # TV screen and frame.
    [(1405.6, 389), (1406.2, 388.2), (1410, 387.2), (1420, 389.2), (1589.9, 427.5), (1589.9, 598), (1405.6, 598)],
    # Cabinet top left of the TV, and the left side panel.
    [(1352.4, 541), (1355, 538.2), (1405.6, 534.2), (1405.6, 560), (1360, 560), (1360, 686), (1356.4, 686), (1356.4, 551), (1352.4, 548)],
    # Cabinet top right of the TV, its overhang and the right side panel.
    [(1590, 593.4), (1640, 612.4), (1648.5, 616), (1649.5, 620), (1649.5, 627), (1643.6, 631), (1643.6, 780), (1600, 780), (1590, 600)],
]


def segment(image):
    height, width = image.shape[:2]
    rough = np.zeros((height, width), np.uint8)
    cv2.fillPoly(rough, [np.round(np.array(ROUGH) * 4).astype(np.int32)], 255, cv2.LINE_8, 2)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * BAND + 1, 2 * BAND + 1))
    inner = cv2.erode(rough, kernel)
    outer = cv2.dilate(rough, kernel)
    mask = np.full((height, width), cv2.GC_BGD, np.uint8)
    mask[outer > 0] = cv2.GC_PR_BGD
    mask[rough > 0] = cv2.GC_PR_FGD
    mask[inner > 0] = cv2.GC_FGD
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(image, mask, None, bgd, fgd, 10, cv2.GC_INIT_WITH_MASK)
    result = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(result, 8)
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    result = np.where(labels == largest, 255, 0).astype(np.uint8)
    contours, _ = cv2.findContours(result, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    filled = np.zeros_like(result)
    cv2.drawContours(filled, contours, -1, 255, cv2.FILLED)
    return filled


def fill(big):
    for polygon in FILLS:
        cv2.fillPoly(big, [np.round((np.array(polygon) * SCALE - .5) * 16).astype(np.int32)], 255, cv2.LINE_8, 4)


def trace(mask):
    # Work at 4x resolution so the traced edge is sub-pixel and free of stair steps.
    big = cv2.resize(mask, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_LINEAR)
    big = cv2.GaussianBlur(big, (0, 0), SCALE * .75)
    _, big = cv2.threshold(big, 127, 255, cv2.THRESH_BINARY)
    ys, xs = np.mgrid[0:big.shape[0], 0:big.shape[1]]
    x, y = (xs + .5) / SCALE, (ys + .5) / SCALE
    fill(big)
    for region, remove in trims(x, y):
        big[region & remove] = 0
    radius = int(CORNER_RADIUS * SCALE)
    disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * radius + 1, 2 * radius + 1))
    big = cv2.morphologyEx(big, cv2.MORPH_OPEN, disk)
    # The fills' own corners follow the painting (the TV's are nearly square).
    fill(big)
    contours, _ = cv2.findContours(big, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    contour = max(contours, key=cv2.contourArea)
    contour = cv2.approxPolyDP(contour, SCALE * .3, True)
    # Contour points are pixel centres at 4x; convert to image coordinates.
    return [((x + .5) / SCALE, (y + .5) / SCALE) for [[x, y]] in contour]


def main():
    image = cv2.imread(SOURCE)
    height, width = image.shape[:2]
    mask = segment(image)
    points = trace(mask)
    percent = [(round(x / width * 100, 2), round(y / height * 100, 2)) for x, y in points]
    literal = "[" + ",".join(f"[{x:g},{y:g}]" for x, y in percent) + "]"
    source = open(ROOMS, encoding="utf-8").read()
    source, count = re.subn(r"const livingTvSilhouette = \[.*?\];", f"const livingTvSilhouette = {literal};", source, flags=re.S)
    assert count == 1, "livingTvSilhouette not found in rooms.js"
    open(ROOMS, "w", encoding="utf-8", newline="\n").write(source)
    print(f"{len(points)} points, {int((mask > 0).sum())} px written to rooms.js")
    if "--preview" in sys.argv:
        preview = image.copy()
        cv2.polylines(preview, [np.round(np.array(points) * 4).astype(np.int32)], True, (255, 0, 255), 1, cv2.LINE_AA, 2)
        crop = preview[370:830, 1330:1672]
        cv2.imwrite(sys.argv[sys.argv.index("--preview") + 1], cv2.resize(crop, None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST))


if __name__ == "__main__":
    main()
