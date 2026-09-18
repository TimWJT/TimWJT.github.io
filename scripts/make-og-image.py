#!/usr/bin/env python3
"""Generate public/og-image.png, the 1200x630 social preview card.

Run after changing the tagline, headline stat, or the Moonlit palette:

    pip install pillow
    python scripts/make-og-image.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "public" / "og-image.png"

W, H = 1200, 630
PAD = 90

# Moonlit palette (src/data/palettes.js)
BG = (10, 10, 12)
TEXT = (232, 230, 227)
MUTED = (138, 136, 132)
ACCENT = (107, 159, 255)
GRID = (20, 20, 24)

EYEBROW = "SOFTWARE DEVELOPER  \u00b7  USYD STUDENT"
NAME = "Tim Wang"
TAGLINE = ["Building games, running communities,", "solving problems."]
URL = "timwjt.github.io"
FOOTER = "1st of 94 teams \u00b7 Bot Battle 2026   |   github.com/TimWJT"

FONT_DIRS = [
    "/usr/share/fonts/truetype/dejavu",
    "/Library/Fonts",
    "C:/Windows/Fonts",
]


def font(size, bold=False):
    names = ["DejaVuSans-Bold.ttf", "Arialbd.ttf"] if bold else ["DejaVuSans.ttf", "Arial.ttf"]
    for directory in FONT_DIRS:
        for name in names:
            path = Path(directory) / name
            if path.exists():
                return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def main():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    for x in range(0, W, 60):
        d.line([(x, 0), (x, H)], fill=GRID, width=1)
    for y in range(0, H, 60):
        d.line([(0, y), (W, y)], fill=GRID, width=1)

    # Favicon motif: concentric circles bleeding off the top-right corner.
    d.ellipse([W - 260, -110, W + 110, 260], outline=(30, 45, 80), width=2)
    d.ellipse([W - 190, -40, W + 40, 190], fill=(16, 24, 44))
    d.ellipse([W - 150, 0, W, 150], fill=(24, 38, 70))

    d.text((PAD, 150), EYEBROW, font=font(20), fill=ACCENT)
    d.text((PAD, 200), NAME, font=font(104, bold=True), fill=TEXT)
    for i, line in enumerate(TAGLINE):
        d.text((PAD, 340 + i * 46), line, font=font(34), fill=MUTED)

    d.line([(PAD, 470), (PAD + 90, 470)], fill=ACCENT, width=3)
    d.text((PAD, 500), URL, font=font(24), fill=TEXT)
    d.text((PAD, 540), FOOTER, font=font(20), fill=MUTED)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, optimize=True)
    print(f"wrote {OUT} ({img.width}x{img.height})")


if __name__ == "__main__":
    main()
