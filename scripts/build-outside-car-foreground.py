"""Builds assets/outside-cars-foreground-v1.png: the three parked cars cut out
of assets/outside_bg.png with an exact per-pixel alpha, for occluding the
player when they walk behind the cars.

Each car is segmented with OpenCV GrabCut, guided by the hints in
scripts/outside-car-hints.json (image pixels):
  box         everything outside it is background
  foreground  polygons that are certainly car (bodies, tyres, mirrors)
  background  polygons traced 1-2 px outside the car's painted outline
The largest connected region of each result is kept and its enclosed holes
filled, so windows and dark trim stay part of the car.

Requires: pip install opencv-python-headless numpy
Usage:    python scripts/build-outside-car-foreground.py
"""
import json
import os

import cv2
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SOURCE = os.path.join(ROOT, "assets", "outside_bg.png")
HINTS = os.path.join(ROOT, "scripts", "outside-car-hints.json")
OUTPUT = os.path.join(ROOT, "assets", "outside-cars-foreground-v1.png")


def car_mask(image, car):
    height, width = image.shape[:2]
    x0, y0, x1, y1 = car["box"]
    mask = np.full((height, width), cv2.GC_BGD, np.uint8)
    mask[y0:y1, x0:x1] = cv2.GC_PR_BGD
    for polygon in car.get("background", []):
        cv2.fillPoly(mask, [np.array(polygon, np.int32)], cv2.GC_BGD)
    for polygon in car.get("foreground", []):
        cv2.fillPoly(mask, [np.array(polygon, np.int32)], cv2.GC_FGD)
    background_model = np.zeros((1, 65), np.float64)
    foreground_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(image, mask, None, background_model, foreground_model, 8, cv2.GC_INIT_WITH_MASK)
    result = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(result, 8)
    if count > 1:
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        result = np.where(labels == largest, 255, 0).astype(np.uint8)
    contours, _ = cv2.findContours(result, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    filled = np.zeros_like(result)
    cv2.drawContours(filled, contours, -1, 255, cv2.FILLED)
    return filled


def main():
    image = cv2.imread(SOURCE)
    cars = json.load(open(HINTS))["cars"]
    alpha = np.zeros(image.shape[:2], np.uint8)
    for name, car in cars.items():
        mask = car_mask(image, car)
        alpha = np.maximum(alpha, mask)
        print(f"{name}: {int((mask > 0).sum())} px")
    cutout = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
    cutout[:, :, 3] = alpha
    cutout[alpha == 0, :3] = 0
    cv2.imwrite(OUTPUT, cutout)
    print("wrote", os.path.relpath(OUTPUT, ROOT))


if __name__ == "__main__":
    main()
