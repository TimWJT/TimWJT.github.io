"""Remove busy background and place portrait on a minimal gradient."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter
from rembg import remove

SRC = Path(
    r"C:\Users\Tim\.cursor\projects\c-Users-Tim-Documents-Coding-Web-Development-Personal-Website\assets\c__Users_Tim_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_me-592f1d7d-54ee-407c-80ea-119e56752131.png"
)
OUT = Path(__file__).resolve().parent.parent / "public" / "tim-portrait.png"

SIZE = 640


def gradient_bg(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / size
        r = int(18 + (28 - 18) * t)
        g = int(20 + (32 - 20) * t)
        b = int(28 + (48 - 28) * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    return img


def main() -> None:
    raw = Image.open(SRC).convert("RGBA")
    cutout = remove(raw)

    # Tight crop around non-transparent pixels
    bbox = cutout.getbbox()
    if not bbox:
        raise RuntimeError("Background removal produced empty image")
    subject = cutout.crop(bbox)

    # Trim stray pixels from edges (e.g. background people)
    trim_x = max(0, int(subject.width * 0.06))
    trim_y = max(0, int(subject.height * 0.02))
    subject = subject.crop(
        (trim_x, trim_y, subject.width - trim_x // 2, subject.height - trim_y)
    )

    # Scale subject to ~78% of canvas height
    target_h = int(SIZE * 0.78)
    scale = target_h / subject.height
    target_w = int(subject.width * scale)
    subject = subject.resize((target_w, target_h), Image.Resampling.LANCZOS)

    canvas = gradient_bg(SIZE)

    # Soft accent glow behind subject
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = SIZE // 2, int(SIZE * 0.46)
    glow_draw.ellipse(
        (cx - 170, cy - 200, cx + 170, cy + 200),
        fill=(107, 159, 255, 42),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(28))
    canvas = Image.alpha_composite(canvas, glow)

    x = (SIZE - subject.width) // 2
    y = int(SIZE * 0.12)
    canvas.paste(subject, (x, y), subject)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT, optimize=True)
    print(f"Saved {OUT}")


if __name__ == "__main__":
    main()
