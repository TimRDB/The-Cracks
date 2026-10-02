"""Build the Bluestar room and player-depth foreground from its unused master."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/unused/bluestar-store-source-v2.png"
USED = ROOT / "assets/used"


def layer(scene: Image.Image, name: str, polygons: list[list[tuple[int, int]]]) -> None:
    mask = Image.new("L", scene.size)
    draw = ImageDraw.Draw(mask)
    for polygon in polygons:
        draw.polygon(polygon, fill=255)
    foreground = Image.new("RGBA", scene.size)
    foreground.paste(scene, (0, 0), mask)
    foreground.save(USED / f"bluestar-{name}-foreground-v2.png", optimize=True)


def main() -> None:
    with Image.open(SOURCE) as original:
        scene = original.convert("RGB")
    if scene.size != (1672, 941):
        raise ValueError(f"Bluestar master must be 1672 x 941, got {scene.size}")
    scene.save(USED / "bluestar-store-bg-v2.png", optimize=True)

    # Every layer carries pixels from the same master. The masks include only
    # fixtures whose front face should cover a player walking behind them.
    layer(scene, "counter", [
        [(24,471),(348,447),(488,577),(489,805),(447,834),(23,804)],
        [(347,416),(383,359),(432,271),(534,253),(534,526),(489,582),(348,457)],
    ])
    layer(scene, "shelves", [
        [(719,220),(843,222),(874,391),(817,664),(627,664),(627,381)],
        [(1010,220),(1104,220),(1157,395),(1154,692),(970,692),(955,385)],
        [(1212,204),(1321,222),(1386,395),(1387,666),(1178,666),(1163,375)],
    ])
    layer(scene, "freezer", [
        [(1437,550),(1639,550),(1640,812),(1511,810),(1438,659)],
    ])


if __name__ == "__main__":
    main()
