"""Copy the native Laundry painting into the game without pixel processing."""

from pathlib import Path
from shutil import copyfile


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/unused/laundry-room-source-v6.png"
DESTINATION = ROOT / "assets/used/laundry-room-bg-v3.png"


def main() -> None:
    data = SOURCE.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Laundry source must be a PNG")
    if (int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")) != (1672, 941):
        raise ValueError("Laundry source must be 1672 x 941")
    copyfile(SOURCE, DESTINATION)


if __name__ == "__main__":
    main()
