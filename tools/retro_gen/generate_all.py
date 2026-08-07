#!/usr/bin/env python3
"""
Generate retro (pixel) assets for cycling-chase-game per:
  docs/retro-asset-spec.md
  docs/retro-scene-props-spec.md (v2: 48px road height, 48px character cells)

Output root: assets/retro/
"""
from __future__ import annotations

import math
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2] / "assets" / "retro"
CELL = 48

# ── Palette (spec base + accents) ─────────────────────────
P = {
    "void": (0, 0, 0, 0),
    "ink": (0x1A, 0x1C, 0x2C, 255),
    "shadow": (0x5D, 0x57, 0x6B, 255),
    "midgray": (0x8B, 0x86, 0x99, 255),
    "lightgray": (0xC4, 0xC1, 0xCC, 255),
    "white": (0xFC, 0xFC, 0xFC, 255),
    "navy": (0x20, 0x38, 0xEC, 255),
    "cyan": (0x3C, 0xBC, 0xFC, 255),
    "deeproad": (0x0C, 0x14, 0x44, 255),
    "alert": (0xAD, 0x1D, 0x3A, 255),
    "fire": (0xE4, 0x00, 0x58, 255),
    "orange": (0xE4, 0x5C, 0x10, 255),
    "peach": (0xF8, 0x78, 0x58, 255),
    "gold": (0xF8, 0xB8, 0x00, 255),
    "cream": (0xFC, 0xE4, 0xA8, 255),
    "green": (0x4A, 0x7C, 0x23, 255),
    "lime": (0x80, 0xD0, 0x10, 255),
    "pine": (0x34, 0x65, 0x24, 255),
    "brown": (0x5C, 0x3A, 0x21, 255),
    "pink": (0xF8, 0x38, 0xA0, 255),
    "purple": (0x7C, 0x18, 0xA8, 255),
    "metal": (0x74, 0x74, 0x74, 255),
    "sky1": (0x0A, 0x0C, 0x14, 255),
    "sky2": (0x14, 0x18, 0x28, 255),
    "sky3": (0x1E, 0x24, 0x38, 255),
    "asphalt_d": (0x2A, 0x33, 0x48, 255),
    "asphalt_l": (0x3D, 0x46, 0x5C, 255),
    "stone": (0x5C, 0x65, 0x78, 255),
    "stone_l": (0x8B, 0x92, 0xA4, 255),
    "moss": (0x4A, 0x7C, 0x23, 255),
}


def new(w: int, h: int) -> Image.Image:
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def put(im: Image.Image, x: int, y: int, c: tuple) -> None:
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), c)


def fill(im: Image.Image, x: int, y: int, w: int, h: int, c: tuple) -> None:
    for j in range(h):
        for i in range(w):
            put(im, x + i, y + j, c)


def outline(im: Image.Image, x: int, y: int, w: int, h: int, c: tuple) -> None:
    for i in range(w):
        put(im, x + i, y, c)
        put(im, x + i, y + h - 1, c)
    for j in range(h):
        put(im, x, y + j, c)
        put(im, x + w - 1, y + j, c)


def ellipse(im: Image.Image, cx: int, cy: int, rx: int, ry: int, c: tuple) -> None:
    for j in range(-ry, ry + 1):
        for i in range(-rx, rx + 1):
            if (i * i) / max(1, rx * rx) + (j * j) / max(1, ry * ry) <= 1.0:
                put(im, cx + i, cy + j, c)


def line(im: Image.Image, x0: int, y0: int, x1: int, y1: int, c: tuple) -> None:
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    while True:
        put(im, x0, y0, c)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy


def save(im: Image.Image, rel: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    print("  ", path.relative_to(ROOT.parent.parent))


# ── Shared tiles (road height 48) ─────────────────────────

def make_road_body(w: int = 64, h: int = 48) -> Image.Image:
    im = new(w, h)
    for y in range(h):
        for x in range(w):
            n = ((x * 17 + y * 31) ^ (x * 7 + y * 3)) & 7
            c = P["asphalt_l"] if n > 5 else P["asphalt_d"]
            if n == 0:
                c = P["stone"]
            if y < 2:
                c = P["stone_l"] if y == 0 else P["asphalt_l"]
            if y >= h - 2:
                c = P["ink"] if y == h - 1 else P["deeproad"]
            put(im, x, y, c)
    # center groove hint
    for x in range(w):
        put(im, x, h // 2, P["deeproad"] if x % 3 else P["asphalt_d"])
    return im


def make_road_dash() -> Image.Image:
    im = new(24, 4)
    fill(im, 0, 0, 16, 4, P["gold"])
    fill(im, 0, 1, 16, 2, P["cream"])
    return im


def make_shoulder(kind: str = "grass") -> Image.Image:
    im = new(64, 16)
    for y in range(16):
        for x in range(64):
            n = (x * 13 + y * 19) & 7
            if kind == "sand":
                c = P["cream"] if n < 3 else P["peach"]
            elif kind == "dirt":
                c = P["brown"] if n < 4 else P["shadow"]
            elif kind == "soil":
                c = P["brown"] if n % 2 else P["pine"]
            else:
                c = P["pine"] if n < 3 else P["green"]
                if y < 2:
                    c = P["brown"] if n < 4 else P["pine"]
            put(im, x, y, c)
    if kind == "grass":
        for x in range(0, 64, 7):
            put(im, x + 2, 1, P["lime"])
    return im


def make_sky_night() -> Image.Image:
    w, h = 128, 96
    im = new(w, h)
    for y in range(h):
        t = y / max(1, h - 1)
        c = P["sky1"] if t < 0.4 else (P["sky2"] if t < 0.7 else P["sky3"])
        for x in range(w):
            put(im, x, y, c)
    for sx, sy in [
        (11, 9), (27, 18), (43, 7), (59, 22), (71, 12), (88, 28),
        (97, 8), (113, 19), (20, 35), (50, 40), (80, 33), (105, 45),
    ]:
        put(im, sx % w, sy % h, P["white"])
    return im


def make_moon() -> Image.Image:
    im = new(16, 16)
    ellipse(im, 8, 8, 6, 6, P["cream"])
    ellipse(im, 8, 8, 5, 5, P["white"])
    put(im, 6, 7, P["cream"])
    put(im, 10, 9, P["cream"])
    return im


def make_edge_top() -> Image.Image:
    im = new(64, 8)
    for x in range(64):
        put(im, x, 3, P["stone_l"])
        put(im, x, 4, P["asphalt_l"])
        put(im, x, 5, P["asphalt_d"])
    return im


def make_edge_bot() -> Image.Image:
    im = new(64, 8)
    for x in range(64):
        put(im, x, 2, P["asphalt_d"])
        put(im, x, 3, P["ink"])
    return im


# ── Character sheets 288×96 ───────────────────────────────

def paste_cell(sheet: Image.Image, cell: Image.Image, col: int, row: int) -> None:
    sheet.paste(cell, (col * CELL, row * CELL), cell)


def draw_bike(im: Image.Image, ox: int, oy: int, frame: int, frame_c=None, rim=None) -> None:
    frame_c = frame_c or P["alert"]
    rim = rim or P["metal"]
    bob = [0, -1, 0, 1, 0, -1][frame % 6]
    cx0, cy0 = ox + 8, oy + 14 + bob
    cx1, cy1 = ox + 28, oy + 14 + bob
    for cx, cy in ((cx0, cy0), (cx1, cy1)):
        ellipse(im, cx, cy, 6, 6, P["ink"])
        ellipse(im, cx, cy, 4, 4, rim)
        ellipse(im, cx, cy, 2, 2, P["ink"])
    line(im, cx0, cy0 - 2, ox + 18, oy + 2 + bob, frame_c)
    line(im, ox + 18, oy + 2 + bob, cx1, cy1 - 2, frame_c)
    line(im, ox + 18, oy + 2 + bob, ox + 14, oy + 10 + bob, frame_c)
    line(im, ox + 14, oy + 10 + bob, cx0, cy0 - 2, frame_c)
    fill(im, ox + 12, oy + 1 + bob, 6, 2, P["ink"])
    line(im, cx1 - 2, cy1 - 8, ox + 30, oy + bob, frame_c)


def make_rider_sheet() -> Image.Image:
    sheet = new(CELL * 6, CELL * 2)

    def cell(frame: int, nervous: bool) -> Image.Image:
        im = new(CELL, CELL)
        bob = [0, -1, 0, 1, 0, -1][frame % 6]
        ped = [0, 1, 2, 1, 0, -1][frame % 6]
        draw_bike(im, 6, 24 + bob, frame)
        jersey = P["cyan"] if not nervous else P["alert"]
        fill(im, 16, 12 + bob, 8, 10, jersey)
        outline(im, 16, 12 + bob, 8, 10, P["ink"])
        ellipse(im, 22, 8 + bob, 5, 5, P["peach"])
        fill(im, 17, 3 + bob, 10, 5, P["alert"])
        fill(im, 18, 4 + bob, 8, 3, P["fire"])
        put(im, 24, 7 + bob, P["ink"])
        if nervous:
            put(im, 25, 9 + bob, P["cyan"])
            put(im, 20, 10 + bob, P["cyan"])
        line(im, 20, 14 + bob, 30, 12 + bob, P["peach"])
        line(im, 18, 22 + bob, 14, 28 + bob + ped, P["navy"])
        line(im, 20, 22 + bob, 22, 30 + bob - ped, P["navy"])
        fill(im, 12, 30 + bob + ped, 4, 2, P["ink"])
        fill(im, 20, 32 + bob - ped, 4, 2, P["ink"])
        return im

    for f in range(6):
        paste_cell(sheet, cell(f, False), f, 0)
        paste_cell(sheet, cell(f, True), f, 1)
    return sheet


def chaser_sheet(draw_fn) -> Image.Image:
    sheet = new(CELL * 6, CELL * 2)
    for f in range(6):
        paste_cell(sheet, draw_fn(f, False), f, 0)
    for f in range(3):
        paste_cell(sheet, draw_fn(f, True), f, 1)
    return sheet


def draw_shiba(frame: int, attack: bool) -> Image.Image:
    im = new(CELL, CELL)
    bob = [0, -1, 0, 1, 0, -1][frame % 6]
    legs = [
        ((10, 36), (18, 36), (26, 38), (32, 36)),
        ((12, 38), (16, 34), (28, 36), (30, 38)),
        ((10, 36), (18, 38), (26, 34), (32, 36)),
        ((12, 34), (16, 38), (28, 38), (30, 34)),
        ((10, 36), (18, 36), (26, 38), (32, 36)),
        ((12, 38), (16, 34), (28, 36), (30, 38)),
    ][frame % 6]
    for lx, ly in legs:
        fill(im, lx, ly + bob, 3, 6, P["orange"])
        fill(im, lx, ly + 5 + bob, 3, 2, P["cream"])
    ellipse(im, 22, 28 + bob, 12, 8, P["orange"])
    ellipse(im, 18, 30 + bob, 5, 4, P["cream"])
    ellipse(im, 34, 22 + bob, 8, 7, P["orange"])
    ellipse(im, 36, 24 + bob, 4, 3, P["cream"])
    fill(im, 30, 14 + bob, 3, 6, P["orange"])
    fill(im, 38, 14 + bob, 3, 6, P["orange"])
    put(im, 36, 21 + bob, P["ink"])
    put(im, 39, 21 + bob, P["ink"])
    if attack:
        fill(im, 38, 25 + bob, 5, 3, P["ink"])
        put(im, 39, 26 + bob, P["white"])
    put(im, 10, 20 + bob, P["orange"])
    put(im, 9, 18 + bob, P["orange"])
    put(im, 12, 15 + bob, P["cream"])
    return im


def draw_bear(frame: int, attack: bool) -> Image.Image:
    im = new(CELL, CELL)
    bob = [0, -1, 0, 1, 0, -1][frame % 6]
    draw_bike(im, 4, 26 + bob, frame, P["metal"], P["shadow"])
    ellipse(im, 22, 18 + bob, 14, 12, P["brown"])
    ellipse(im, 22, 18 + bob, 11, 9, P["shadow"])
    ellipse(im, 34, 12 + bob, 8, 7, P["brown"])
    put(im, 36, 11 + bob, P["ink"])
    put(im, 39, 11 + bob, P["ink"])
    ellipse(im, 30, 6 + bob, 3, 3, P["brown"])
    ellipse(im, 38, 6 + bob, 3, 3, P["brown"])
    if attack:
        fill(im, 36, 14 + bob, 6, 3, P["ink"])
        line(im, 28, 20 + bob, 40, 16 + bob, P["cream"])
    return im


def draw_godzilla(frame: int, attack: bool) -> Image.Image:
    im = new(CELL, CELL)
    bob = [0, -1, 0, 1, 0, -1][frame % 6]
    draw_bike(im, 4, 28 + bob, frame)
    ellipse(im, 20, 20 + bob, 12, 10, P["green"])
    ellipse(im, 32, 14 + bob, 9, 7, P["green"])
    for i, fx in enumerate([12, 16, 20, 24]):
        h = 4 + (i % 2)
        fill(im, fx, 8 + bob - h, 3, h + 2, P["lime"])
    put(im, 34, 13 + bob, P["ink"])
    put(im, 37, 13 + bob, P["ink"])
    if attack:
        fill(im, 36, 16 + bob, 6, 3, P["orange"])
        fill(im, 40, 15 + bob, 4, 2, P["gold"])
    line(im, 8, 22 + bob, 2, 16 + bob, P["green"])
    return im


def draw_person(
    frame: int,
    attack: bool,
    body,
    hair,
    extra: str | None = None,
) -> Image.Image:
    im = new(CELL, CELL)
    bob = [0, -1, 0, 1, 0, -1][frame % 6]
    ped = [0, 1, 2, 1, 0, -1][frame % 6]
    draw_bike(im, 6, 26 + bob, frame)
    fill(im, 16, 14 + bob, 8, 10, body)
    outline(im, 16, 14 + bob, 8, 10, P["ink"])
    if extra == "alien":
        ellipse(im, 22, 8 + bob, 7, 6, P["lime"])
        put(im, 20, 8 + bob, P["ink"])
        put(im, 25, 8 + bob, P["ink"])
        if attack:
            put(im, 20, 8 + bob, P["cyan"])
            put(im, 25, 8 + bob, P["cyan"])
    else:
        ellipse(im, 22, 10 + bob, 5, 5, P["peach"])
        fill(im, 17, 5 + bob, 10, 4, hair)
        if extra == "longhair":
            fill(im, 15, 8 + bob, 3, 10, hair)
            fill(im, 28, 8 + bob, 2, 8, hair)
        if extra == "helmet_pink":
            fill(im, 17, 4 + bob, 10, 5, P["pink"])
        if extra == "jiangshi":
            fill(im, 20, 2 + bob, 4, 5, P["cream"])
            put(im, 21, 4 + bob, P["alert"])
        if extra == "bikini":
            fill(im, 16, 14 + bob, 8, 4, P["alert"])
            fill(im, 18, 20 + bob, 5, 3, P["alert"])
        put(im, 24, 10 + bob, P["ink"])
    line(im, 20, 16 + bob, 30, 14 + bob, P["peach"])
    line(im, 18, 24 + bob, 14, 32 + bob + ped, P["navy"])
    line(im, 20, 24 + bob, 24, 32 + bob - ped, P["navy"])
    if attack:
        line(im, 24, 12 + bob, 34, 10 + bob, P["peach"])
    if extra == "box":
        fill(im, 8, 12 + bob, 8, 8, P["pink"])
        outline(im, 8, 12 + bob, 8, 8, P["ink"])
    return im


def _draw_foodpanda(frame: int, attack: bool) -> Image.Image:
    im = draw_person(frame, attack, P["pink"], P["ink"], "helmet_pink")
    bob = [0, -1, 0, 1, 0, -1][frame % 6]
    fill(im, 8, 12 + bob, 8, 8, P["pink"])
    outline(im, 8, 12 + bob, 8, 8, P["ink"])
    put(im, 10, 14 + bob, P["white"])
    return im


def draw_vehicle(frame: int, attack: bool, kind: str) -> Image.Image:
    im = new(CELL, CELL)
    bob = [0, 0, -1, 0, 0, 1][frame % 6]
    if kind == "dumptruck":
        ellipse(im, 12, 38 + bob, 5, 5, P["ink"])
        ellipse(im, 36, 38 + bob, 5, 5, P["ink"])
        fill(im, 6, 18 + bob, 28, 16, P["orange"])
        outline(im, 6, 18 + bob, 28, 16, P["ink"])
        for rx, ry in [(10, 20), (16, 22), (22, 20)]:
            put(im, rx, ry + bob, P["stone"])
        fill(im, 32, 20 + bob, 12, 14, P["gold"])
        outline(im, 32, 20 + bob, 12, 14, P["ink"])
        fill(im, 34, 22 + bob, 6, 5, P["cyan"])
        put(im, 36, 28 + bob, P["ink"])
        put(im, 40, 28 + bob, P["ink"])
        if attack:
            fill(im, 8, 10 + bob, 24, 8, P["orange"])  # raised bed hint
            put(im, 44, 26 + bob, P["gold"])
    elif kind == "ambulance":
        ellipse(im, 12, 38 + bob, 5, 5, P["ink"])
        ellipse(im, 34, 38 + bob, 5, 5, P["ink"])
        fill(im, 6, 16 + bob, 36, 18, P["white"])
        outline(im, 6, 16 + bob, 36, 18, P["ink"])
        fill(im, 6, 24 + bob, 36, 3, P["fire"])
        fill(im, 20, 18 + bob, 8, 2, P["fire"])
        fill(im, 23, 16 + bob, 2, 6, P["fire"])
        fill(im, 32, 18 + bob, 8, 6, P["cyan"])
        if attack:
            put(im, 10, 14 + bob, P["fire"])
            put(im, 40, 14 + bob, P["cyan"])
    elif kind == "firetruck":
        ellipse(im, 10, 38 + bob, 5, 5, P["ink"])
        ellipse(im, 24, 38 + bob, 5, 5, P["ink"])
        ellipse(im, 38, 38 + bob, 5, 5, P["ink"])
        fill(im, 4, 18 + bob, 40, 16, P["fire"])
        outline(im, 4, 18 + bob, 40, 16, P["ink"])
        fill(im, 6, 20 + bob, 10, 6, P["cyan"])
        fill(im, 18, 14 + bob, 22, 3, P["metal"])
        if attack:
            fill(im, 8, 10 + bob, 4, 6, P["orange"])
            fill(im, 9, 8 + bob, 2, 4, P["gold"])
    return im


def make_all_chasers() -> None:
    mapping = {
        "shiba": lambda f, a: draw_shiba(f, a),
        "bear": lambda f, a: draw_bear(f, a),
        "godzilla": lambda f, a: draw_godzilla(f, a),
        "redlady": lambda f, a: draw_person(f, a, P["alert"], P["ink"], "longhair"),
        "jiangshi": lambda f, a: draw_person(f, a, P["cyan"], P["ink"], "jiangshi"),
        "alien": lambda f, a: draw_person(f, a, P["lime"], P["lime"], "alien"),
        "dumptruck": lambda f, a: draw_vehicle(f, a, "dumptruck"),
        "foodpanda": lambda f, a: _draw_foodpanda(f, a),
        "grandma": lambda f, a: draw_person(f, a, P["cream"], P["shadow"]),
        "ambulance": lambda f, a: draw_vehicle(f, a, "ambulance"),
        "firetruck": lambda f, a: draw_vehicle(f, a, "firetruck"),
        "bikini": lambda f, a: draw_person(f, a, P["peach"], P["brown"], "bikini"),
    }
    for tid, fn in mapping.items():
        save(chaser_sheet(fn), f"chasers/{tid}.png")


# ── Mid strips ────────────────────────────────────────────

def mid_hills() -> Image.Image:
    w, h = 256, 48
    im = new(w, h)
    for x in range(w):
        y1 = int(22 + 8 * math.sin(2 * math.pi * x / w) + 4 * math.sin(4 * math.pi * x / w))
        y2 = int(30 + 6 * math.sin(2 * math.pi * x / w + 1.2))
        for y in range(y1, h):
            put(im, x, y, P["sky3"])
        for y in range(y2, h):
            put(im, x, y, P["ink"])
    return im


def mid_powerline() -> Image.Image:
    im = new(192, 48)
    for x in range(0, 192, 48):
        fill(im, x + 20, 10, 3, 38, P["metal"])
        fill(im, x + 14, 10, 14, 2, P["metal"])
        put(im, x + 16, 12, P["cream"])  # insulator
        put(im, x + 26, 12, P["cream"])
    for x in range(192):
        put(im, x, 12, P["ink"])
    return im


def mid_pine() -> Image.Image:
    w, h = 256, 80
    im = new(w, h)
    for i, x0 in enumerate(range(0, w, 28)):
        hgt = 36 + (i * 11) % 28
        fill(im, x0 + 12, h - 18, 4, 18, P["brown"])
        outline(im, x0 + 12, h - 18, 4, 18, P["ink"])
        for k, yy in enumerate([h - 18 - hgt, h - 28 - hgt // 2, h - 38]):
            if yy < 0:
                continue
            ww = 18 - k * 4
            for dx in range(-ww, ww):
                for dy in range(12):
                    if abs(dx) < ww - dy // 2:
                        put(im, x0 + 14 + dx, yy + dy, P["pine"] if (dx + dy) & 1 else P["green"])
    return im


def mid_fog() -> Image.Image:
    im = new(128, 24)
    for y in range(24):
        for x in range(128):
            a = 40 + (y * 3) + ((x // 4) % 3) * 8
            put(im, x, y, (0xC4, 0xC1, 0xCC, min(120, a)))
    return im


def mid_skyline() -> Image.Image:
    w, h = 256, 96
    im = new(w, h)
    buildings = [(0, 50), (28, 72), (52, 40), (78, 84), (110, 55), (138, 76), (168, 45), (198, 68), (228, 52)]
    for x0, bh in buildings:
        bw = 26
        y0 = h - bh
        fill(im, x0, y0, bw, bh, P["sky3"])
        outline(im, x0, y0, bw, bh, P["ink"])
        for wy in range(y0 + 4, h - 4, 6):
            for wx in range(x0 + 3, x0 + bw - 3, 5):
                on = ((wx * 3 + wy * 5) % 7) > 2
                put(im, wx, wy, P["gold"] if on else P["sky1"])
                put(im, wx + 1, wy, P["cream"] if on else P["sky1"])
    return im


def mid_neon() -> Image.Image:
    im = new(192, 32)
    colors = [P["pink"], P["cyan"], P["purple"], P["gold"], P["fire"]]
    for i, x in enumerate(range(8, 180, 28)):
        fill(im, x, 8, 18, 10, colors[i % len(colors)])
        outline(im, x, 8, 18, 10, P["ink"])
    return im


def mid_columbarium() -> Image.Image:
    """Taiwanese columbarium strip — readable niches + door + walls."""
    w, h = 256, 96
    im = new(w, h)
    # ground wall base
    for y in range(50, h):
        for x in range(w):
            put(im, x, y, P["stone"] if (x // 4 + y // 4) % 2 == 0 else P["shadow"])
    # fence tops seamless
    for x in range(w):
        put(im, x, 48, P["metal"])
        if x % 6 == 0:
            fill(im, x, 40, 2, 10, P["metal"])
            put(im, x, 39, P["ink"])

    def tower(x0: int, tw: int, floors: int = 3) -> None:
        th = floors * 16 + 14
        y0 = h - th - 6
        fill(im, x0, y0, tw, th, P["stone_l"])
        outline(im, x0, y0, tw, th, P["ink"])
        # roof / parapet
        fill(im, x0 - 2, y0 - 5, tw + 4, 5, P["stone"])
        outline(im, x0 - 2, y0 - 5, tw + 4, 5, P["ink"])
        # niches
        for fl in range(floors):
            yy = y0 + 6 + fl * 16
            for i in range(max(3, tw // 10)):
                xx = x0 + 4 + i * max(8, tw // 5)
                if xx + 6 >= x0 + tw - 2:
                    break
                fill(im, xx, yy, 6, 8, P["sky1"])
                outline(im, xx, yy, 6, 8, P["ink"])
                if (i + fl) % 3 == 0:
                    put(im, xx + 2, yy + 3, P["gold"])
        # door
        dw = 8
        fill(im, x0 + tw // 2 - dw // 2, h - 28, dw, 20, P["sky1"])
        outline(im, x0 + tw // 2 - dw // 2, h - 28, dw, 20, P["gold"])

    tower(40, 52, 3)
    tower(120, 36, 2)
    tower(175, 40, 3)
    # gate pillars edges for seamless
    fill(im, 0, 52, 12, 44, P["stone"])
    fill(im, 244, 52, 12, 44, P["stone"])
    fill(im, 0, 48, 12, 5, P["gold"])
    fill(im, 244, 48, 12, 5, P["gold"])
    # moss
    for x in (45, 90, 150, 200):
        put(im, x, h - 8, P["moss"])
    return im


def mid_village() -> Image.Image:
    w, h = 256, 80
    im = new(w, h)
    for x0, bh, bw in [(10, 50, 40), (60, 42, 50), (120, 55, 45), (180, 48, 55)]:
        y0 = h - bh
        fill(im, x0, y0, bw, bh, P["shadow"])
        outline(im, x0, y0, bw, bh, P["ink"])
        # roof
        fill(im, x0 - 2, y0 - 6, bw + 4, 6, P["brown"])
        # broken windows
        fill(im, x0 + 8, y0 + 12, 8, 8, P["sky1"])
        fill(im, x0 + 22, y0 + 20, 6, 10, P["sky1"])
        put(im, x0 + 10, y0 + 14, P["cream"])  # candle
    return im


def mid_field() -> Image.Image:
    w, h = 256, 48
    im = new(w, h)
    for y in range(h):
        for x in range(w):
            c = P["pine"] if (x // 3 + y) % 5 < 3 else P["green"]
            if (x + y * 2) % 17 == 0:
                c = P["lime"]  # weird glow crop
            put(im, x, y, c)
    return im


def mid_crop_circle() -> Image.Image:
    im = new(64, 32)
    fill(im, 0, 0, 64, 32, P["green"])
    for a in range(0, 360, 8):
        rad = math.radians(a)
        x = int(32 + 20 * math.cos(rad))
        y = int(16 + 10 * math.sin(rad))
        put(im, x, y, P["cream"])
        put(im, x, y + 1, P["lime"])
    return im


def mid_cliff() -> Image.Image:
    w, h = 256, 64
    im = new(w, h)
    for y in range(h):
        for x in range(w):
            n = (x // 8 + y // 4) % 3
            put(im, x, y, [P["brown"], P["shadow"], P["stone"]][n])
    # strata lines
    for y in range(8, h, 10):
        for x in range(w):
            put(im, x, y, P["ink"])
    return im


def mid_arcade() -> Image.Image:
    w, h = 256, 96
    im = new(w, h)
    fill(im, 0, 70, w, 26, P["shadow"])
    for x in range(0, w, 32):
        fill(im, x + 4, 28, 6, 52, P["stone_l"])
        outline(im, x + 4, 28, 6, 52, P["ink"])
        for a in range(8):
            put(im, x + 8 + a, 28 - a // 2, P["stone"])
            put(im, x + 24 - a, 28 - a // 2, P["stone"])
        fill(im, x + 12, 45, 18, 25, P["sky2"])
        outline(im, x + 12, 45, 18, 25, P["ink"])
        fill(im, x + 14, 34, 12, 8, P["pink"] if (x // 32) % 2 == 0 else P["cyan"])
        put(im, x + 7, 40, P["gold"])
    return im


def mid_hospital() -> Image.Image:
    w, h = 256, 96
    im = new(w, h)
    fill(im, 20, 18, 200, 78, P["lightgray"])
    outline(im, 20, 18, 200, 78, P["ink"])
    for wy in range(26, 80, 12):
        for wx in range(28, 210, 14):
            fill(im, wx, wy, 8, 8, P["cyan"])
            outline(im, wx, wy, 8, 8, P["ink"])
    fill(im, 110, 28, 20, 6, P["fire"])
    fill(im, 117, 21, 6, 20, P["fire"])
    fill(im, 40, 70, 36, 16, P["fire"])
    return im


def mid_sea() -> Image.Image:
    w, h = 256, 48
    im = new(w, h)
    for y in range(h):
        for x in range(w):
            if y < 14:
                c = P["sky2"]
            elif y < 22:
                c = P["navy"]
            else:
                wave = math.sin(2 * math.pi * (x / 32) + y * 0.3)
                c = P["cyan"] if wave > 0.25 else P["navy"]
            put(im, x, y, c)
    for x in range(w):
        put(im, x, 14, P["stone_l"])
    return im


def mid_burnt() -> Image.Image:
    w, h = 256, 64
    im = new(w, h)
    for x0, bh in [(10, 50), (50, 40), (100, 55), (150, 35), (200, 48)]:
        y0 = h - bh
        fill(im, x0, y0, 30, bh, P["ink"])
        fill(im, x0 + 4, y0 + 8, 8, 8, P["orange"] if x0 % 40 == 10 else P["sky1"])
    for x in range(0, w, 3):
        put(im, x, h - 4, P["shadow"])
    return im


# ── Props ─────────────────────────────────────────────────

def prop_tomb(kind: str = "stele") -> Image.Image:
    im = new(24 if kind != "double" else 40, 40)
    if kind == "stele":
        fill(im, 4, 28, 16, 10, P["stone"])
        outline(im, 4, 28, 16, 10, P["ink"])
        fill(im, 6, 6, 12, 24, P["stone"])
        outline(im, 6, 6, 12, 24, P["ink"])
        fill(im, 8, 4, 8, 3, P["stone_l"])
        for y in range(10, 26, 3):
            fill(im, 10, y, 4, 1, P["ink"])
        put(im, 7, 27, P["moss"])
    elif kind == "round":
        fill(im, 4, 28, 16, 8, P["stone"])
        ellipse(im, 12, 16, 9, 12, P["stone"])
        outline(im, 4, 28, 16, 8, P["ink"])
        for y in range(12, 22, 3):
            fill(im, 10, y, 4, 1, P["ink"])
    elif kind == "double":
        fill(im, 2, 28, 36, 8, P["stone"])
        fill(im, 4, 8, 14, 22, P["stone"])
        fill(im, 20, 8, 14, 22, P["stone"])
        outline(im, 4, 8, 14, 22, P["ink"])
        outline(im, 20, 8, 14, 22, P["ink"])
        line(im, 18, 8, 18, 30, P["ink"])
    elif kind == "broken":
        fill(im, 6, 28, 12, 8, P["stone"])
        fill(im, 8, 14, 10, 16, P["stone"])
        put(im, 14, 14, P["void"])
        put(im, 15, 15, P["void"])
    return im


def prop_mound(w: int = 40, h: int = 20) -> Image.Image:
    im = new(w, h)
    for y in range(h):
        for x in range(w):
            nx = (x - w / 2) / (w * 0.45)
            ny = (y - h * 0.7) / (h * 0.4)
            if nx * nx + ny * ny <= 1 and y > h // 3:
                n = (x + y) & 3
                c = P["brown"] if n < 2 else P["shadow"]
                if y < h // 2:
                    c = P["cream"] if n == 0 else P["brown"]
                put(im, x, y, c)
    fill(im, w // 2 - 2, 4, 4, 6, P["stone"])
    return im


def prop_lamp() -> Image.Image:
    im = new(16, 48)
    fill(im, 7, 12, 2, 34, P["metal"])
    fill(im, 7, 12, 7, 2, P["metal"])
    fill(im, 11, 10, 5, 5, P["gold"])
    put(im, 12, 11, P["cream"])
    put(im, 13, 12, P["white"])
    return im


def prop_cone() -> Image.Image:
    im = new(12, 16)
    for y in range(14):
        ww = 1 + y // 2
        c = P["orange"] if y % 4 < 2 else P["white"]
        fill(im, 6 - ww, y + 1, ww * 2, 1, c)
    return im


def prop_tree(w: int = 32, h: int = 56) -> Image.Image:
    im = new(w, h)
    fill(im, w // 2 - 2, h - 16, 4, 16, P["brown"])
    outline(im, w // 2 - 2, h - 16, 4, 16, P["ink"])
    for k in range(3):
        yy = h - 20 - k * 12
        ww = 12 - k * 2
        for dx in range(-ww, ww):
            for dy in range(10):
                if abs(dx) < ww - dy // 2:
                    put(im, w // 2 + dx, max(0, yy + dy), P["green"] if (dx + dy) & 1 else P["pine"])
    return im


def prop_censer() -> Image.Image:
    im = new(16, 16)
    fill(im, 4, 10, 8, 4, P["stone"])
    fill(im, 6, 6, 4, 5, P["metal"])
    put(im, 7, 4, P["orange"])
    put(im, 8, 3, P["gold"])
    return im


def prop_lantern() -> Image.Image:
    im = new(16, 28)
    fill(im, 5, 20, 6, 8, P["stone"])
    fill(im, 4, 10, 8, 10, P["stone_l"])
    fill(im, 6, 12, 4, 4, P["gold"])
    fill(im, 3, 8, 10, 3, P["stone"])
    return im


def prop_fence() -> Image.Image:
    im = new(32, 24)
    for x in range(0, 32, 4):
        fill(im, x, 4, 2, 18, P["metal"])
        put(im, x, 3, P["ink"])
    fill(im, 0, 10, 32, 2, P["metal"])
    return im


def prop_dead_tree() -> Image.Image:
    im = new(32, 48)
    fill(im, 14, 28, 4, 20, P["brown"])
    line(im, 16, 28, 6, 12, P["brown"])
    line(im, 16, 24, 26, 8, P["brown"])
    line(im, 10, 16, 4, 10, P["shadow"])
    line(im, 22, 14, 28, 6, P["shadow"])
    return im


def prop_scooter() -> Image.Image:
    im = new(28, 20)
    fill(im, 4, 12, 20, 4, P["metal"])
    fill(im, 8, 6, 12, 8, P["pink"])
    outline(im, 8, 6, 12, 8, P["ink"])
    ellipse(im, 8, 16, 3, 3, P["ink"])
    ellipse(im, 20, 16, 3, 3, P["ink"])
    return im


def prop_lighthouse() -> Image.Image:
    im = new(20, 48)
    for y in range(40):
        ww = max(2, 6 - y // 12)
        c = P["white"] if y % 8 < 6 else P["fire"]
        fill(im, 10 - ww, 8 + y, ww * 2, 1, c)
    fill(im, 6, 4, 8, 6, P["gold"])
    return im


def prop_hydrant() -> Image.Image:
    im = new(12, 16)
    fill(im, 4, 6, 4, 10, P["fire"])
    fill(im, 2, 8, 8, 3, P["fire"])
    fill(im, 5, 4, 2, 3, P["gold"])
    return im


def prop_pole() -> Image.Image:
    im = new(12, 56)
    fill(im, 5, 0, 2, 56, P["metal"])
    fill(im, 2, 8, 8, 2, P["metal"])
    put(im, 3, 10, P["cream"])
    put(im, 8, 10, P["cream"])
    return im


def prop_reflector() -> Image.Image:
    im = new(12, 16)
    fill(im, 4, 0, 4, 16, P["metal"])
    fill(im, 3, 2, 6, 4, P["alert"])
    fill(im, 3, 8, 6, 4, P["white"])
    return im


def prop_stump() -> Image.Image:
    im = new(20, 16)
    fill(im, 4, 6, 12, 8, P["brown"])
    outline(im, 4, 6, 12, 8, P["ink"])
    ellipse(im, 10, 6, 6, 3, P["cream"])
    return im


def prop_mushroom() -> Image.Image:
    im = new(12, 12)
    fill(im, 5, 6, 2, 5, P["cream"])
    ellipse(im, 6, 5, 5, 3, P["orange"])
    put(im, 4, 5, P["white"])
    put(im, 7, 4, P["white"])
    return im


def prop_scarecrow() -> Image.Image:
    im = new(24, 40)
    fill(im, 11, 16, 2, 20, P["brown"])
    fill(im, 4, 18, 16, 2, P["brown"])
    fill(im, 8, 8, 8, 8, P["cream"])
    outline(im, 8, 8, 8, 8, P["ink"])
    put(im, 10, 11, P["ink"])
    put(im, 13, 11, P["ink"])
    return im


def prop_sign_shop() -> Image.Image:
    im = new(24, 16)
    fill(im, 2, 2, 20, 12, P["pink"])
    outline(im, 2, 2, 20, 12, P["ink"])
    fill(im, 5, 5, 14, 2, P["white"])
    fill(im, 5, 9, 10, 2, P["white"])
    return im


def prop_iron_door() -> Image.Image:
    im = new(24, 40)
    fill(im, 4, 4, 16, 34, P["green"])
    outline(im, 4, 4, 16, 34, P["ink"])
    for y in range(8, 34, 4):
        fill(im, 6, y, 12, 1, P["pine"])
    put(im, 16, 20, P["gold"])
    return im


def prop_clothes() -> Image.Image:
    im = new(28, 24)
    fill(im, 2, 4, 24, 2, P["metal"])
    fill(im, 6, 6, 6, 10, P["cyan"])
    fill(im, 14, 8, 6, 8, P["pink"])
    fill(im, 20, 6, 5, 9, P["cream"])
    return im


def prop_cross() -> Image.Image:
    im = new(16, 16)
    fill(im, 6, 2, 4, 12, P["fire"])
    fill(im, 2, 6, 12, 4, P["fire"])
    return im


def prop_barrier() -> Image.Image:
    im = new(24, 20)
    for i in range(0, 24, 4):
        c = P["orange"] if (i // 4) % 2 == 0 else P["white"]
        fill(im, i, 4, 4, 12, c)
    outline(im, 0, 4, 24, 12, P["ink"])
    return im


def prop_scorch() -> Image.Image:
    im = new(32, 12)
    for y in range(12):
        for x in range(32):
            if (x - 16) ** 2 / 200 + (y - 6) ** 2 / 30 < 1:
                put(im, x, y, P["ink"] if (x + y) % 3 else P["shadow"])
    return im


# ── FX ────────────────────────────────────────────────────

def fx_frames(n: int, size: int, drawer) -> Image.Image:
    im = new(size * n, size)
    for i in range(n):
        cell = new(size, size)
        drawer(cell, i)
        im.paste(cell, (i * size, 0), cell)
    return im


def draw_flame(cell: Image.Image, i: int) -> None:
    s = cell.width
    cols = [P["alert"], P["orange"], P["gold"], P["white"]]
    hh = s - 2 - (i % 3)
    for y in range(hh):
        ww = max(1, s // 2 - y // 2 + (i % 2))
        for x in range(-ww, ww):
            put(cell, s // 2 + x, s - 2 - y, cols[min(3, y * 4 // max(1, hh))])


def draw_dust(cell: Image.Image, i: int) -> None:
    for k in range(4 + i):
        x = 2 + (k * 3 + i * 2) % (cell.width - 4)
        y = 2 + (k * 5) % (cell.height - 4)
        put(cell, x, y, P["stone_l"])
        put(cell, x + 1, y, P["metal"])


def draw_joss(cell: Image.Image, i: int) -> None:
    fill(cell, 3 + i % 2, 3, 6, 5, P["cream"])
    put(cell, 4 + i % 2, 4, P["gold"])
    put(cell, 6 + i % 2, 5, P["orange"])


def draw_wisp(cell: Image.Image, i: int) -> None:
    c = P["cyan"] if i % 2 == 0 else P["lime"]
    ellipse(cell, 4, 4, 3 + i % 2, 3, c)


def draw_smoke(cell: Image.Image, i: int) -> None:
    for k in range(3):
        ellipse(cell, 8 + k, 16 - i * 2 - k * 3, 5 - k, 4, P["midgray"] if k else P["shadow"])


def draw_sweat(cell: Image.Image, i: int) -> None:
    fill(cell, 6, 4 + i, 3, 4, P["cyan"])
    put(cell, 7, 3 + i, P["cyan"])


# ── Orchestrate ───────────────────────────────────────────

def main() -> None:
    print("=== Shared tiles (road h=48) ===")
    save(make_road_body(64, 48), "tiles/shared/road-body.png")
    save(make_road_body(96, 48), "tiles/shared/road-body-96.png")
    save(make_road_dash(), "tiles/shared/road-dash.png")
    save(make_shoulder("grass"), "tiles/shared/shoulder.png")
    save(make_sky_night(), "tiles/shared/sky-night.png")
    save(make_moon(), "tiles/shared/moon.png")
    save(make_edge_top(), "tiles/shared/road-edge-top.png")
    save(make_edge_bot(), "tiles/shared/road-edge-bot.png")

    print("=== Theme shoulders / roads ===")
    save(make_shoulder("grass"), "tiles/shiba/shoulder.png")
    save(make_shoulder("dirt"), "tiles/redlady/shoulder-dirt.png")
    save(make_shoulder("soil"), "tiles/alien/shoulder-soil.png")
    save(make_shoulder("sand"), "tiles/bikini/shoulder-sand.png")
    save(make_road_body(64, 48), "tiles/dumptruck/road-dirt.png")  # recolor-ish via same gen for now
    # dirt-tint road
    dirt = make_road_body(64, 48)
    px = dirt.load()
    for y in range(dirt.height):
        for x in range(dirt.width):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = (min(255, r + 20), max(0, g - 10), max(0, b - 20), a)
    save(dirt, "tiles/dumptruck/road-dirt.png")

    print("=== Characters ===")
    save(make_rider_sheet(), "characters/rider.png")
    make_all_chasers()

    print("=== Mid strips ===")
    save(mid_hills(), "mid/shiba/hills-strip.png")
    save(mid_powerline(), "mid/shiba/powerline-strip.png")
    save(mid_pine(), "mid/bear/pine-strip.png")
    save(mid_fog(), "mid/bear/fog-band.png")
    save(mid_skyline(), "mid/godzilla/skyline-strip.png")
    save(mid_neon(), "mid/godzilla/neon-strip.png")
    save(mid_columbarium(), "mid/redlady/columbarium-strip.png")
    save(mid_village(), "mid/jiangshi/village-strip.png")
    save(mid_field(), "mid/alien/field-strip.png")
    save(mid_crop_circle(), "mid/alien/crop-circle-hint.png")
    save(mid_cliff(), "mid/dumptruck/cliff-strip.png")
    save(mid_arcade(), "mid/foodpanda/arcade-strip.png")
    save(mid_arcade(), "mid/grandma/alley-strip.png")  # reuse structure
    save(mid_hospital(), "mid/ambulance/hospital-strip.png")
    save(mid_burnt(), "mid/firetruck/burnt-street-strip.png")
    save(mid_sea(), "mid/bikini/sea-strip.png")
    # wave 2f
    wave = new(256, 16)
    for i, phase in enumerate((0, 1.2)):
        cell = new(128, 16)
        for x in range(128):
            y = int(8 + 3 * math.sin(2 * math.pi * x / 32 + phase))
            put(cell, x, y, P["white"])
            put(cell, x, y + 1, P["cyan"])
        wave.paste(cell, (i * 128, 0), cell)
    save(wave, "mid/bikini/wave-strip-2f.png")

    print("=== Props redlady ===")
    save(prop_tomb("stele"), "props/redlady/tomb-stele-a.png")
    save(prop_tomb("stele"), "props/redlady/tomb-stele-b.png")
    save(prop_tomb("round"), "props/redlady/tomb-round-a.png")
    save(prop_tomb("double"), "props/redlady/tomb-double.png")
    save(prop_tomb("broken"), "props/redlady/tomb-broken.png")
    save(prop_mound(40, 20), "props/redlady/mound-a.png")
    save(prop_mound(48, 22), "props/redlady/mound-b.png")
    save(prop_mound(32, 18), "props/redlady/mound-c.png")
    save(prop_censer(), "props/redlady/censer.png")
    save(prop_lantern(), "props/redlady/stone-lantern.png")
    save(prop_fence(), "props/redlady/iron-fence.png")
    save(prop_dead_tree(), "props/redlady/dead-tree.png")
    save(prop_lamp(), "props/redlady/gate-pillar.png")
    path = new(24, 8)
    for x in range(24):
        fill(path, x, 2, 1, 4, P["stone"] if x % 3 else P["stone_l"])
    save(path, "props/redlady/path-stone.png")
    save(prop_censer(), "props/redlady/joss-stick.png")  # tiny variant ok

    print("=== Props other themes ===")
    save(prop_lamp(), "props/shiba/lamp.png")
    save(prop_pole(), "props/shiba/utility-pole.png")
    save(prop_reflector(), "props/shiba/reflector.png")
    grass = new(16, 12)
    for x in range(0, 16, 3):
        put(grass, x + 1, 8, P["green"])
        put(grass, x, 6, P["lime"])
    save(grass, "props/shiba/grass-tuft.png")
    sign = new(20, 24)
    fill(sign, 8, 10, 4, 14, P["metal"])
    fill(sign, 2, 2, 16, 12, P["gold"])
    outline(sign, 2, 2, 16, 12, P["ink"])
    save(sign, "props/shiba/sign-curve.png")
    mile = new(12, 16)
    fill(mile, 2, 4, 8, 12, P["stone"])
    fill(mile, 3, 6, 6, 2, P["white"])
    save(mile, "props/shiba/mile-stone.png")

    save(prop_tree(32, 56), "props/bear/tree-a.png")
    save(prop_tree(28, 48), "props/bear/tree-b.png")
    save(prop_stump(), "props/bear/stump.png")
    save(prop_mushroom(), "props/bear/mushroom.png")
    rock = new(20, 12)
    ellipse(rock, 10, 8, 8, 4, P["stone"])
    put(rock, 8, 6, P["moss"])
    save(rock, "props/bear/rock-a.png")
    log = new(28, 12)
    fill(log, 2, 4, 24, 6, P["brown"])
    outline(log, 2, 4, 24, 6, P["ink"])
    save(log, "props/bear/log.png")
    fern = new(16, 16)
    for i in range(5):
        line(fern, 8, 14, 2 + i * 3, 4, P["green"])
    save(fern, "props/bear/fern.png")

    save(prop_lamp(), "props/godzilla/street-lamp.png")
    bld = new(40, 72)
    fill(bld, 4, 8, 32, 64, P["sky3"])
    outline(bld, 4, 8, 32, 64, P["ink"])
    for wy in range(14, 64, 8):
        for wx in range(8, 32, 7):
            put(bld, wx, wy, P["gold"])
            put(bld, wx + 1, wy, P["cream"])
    save(bld, "props/godzilla/building-a.png")
    save(prop_sign_shop(), "props/godzilla/sign-shop.png")
    wreck = new(32, 16)
    fill(wreck, 2, 6, 28, 8, P["metal"])
    ellipse(wreck, 8, 14, 3, 2, P["ink"])
    ellipse(wreck, 24, 14, 3, 2, P["ink"])
    save(wreck, "props/godzilla/wreck-car.png")
    save(prop_hydrant(), "props/godzilla/hydrant.png")
    rubble = new(24, 12)
    for x, y in [(4, 6), (10, 8), (16, 5), (12, 4)]:
        fill(rubble, x, y, 4, 3, P["stone"])
    save(rubble, "props/godzilla/rubble.png")

    ruin = new(48, 40)
    fill(ruin, 4, 10, 40, 30, P["shadow"])
    outline(ruin, 4, 10, 40, 30, P["ink"])
    fill(ruin, 2, 6, 44, 6, P["brown"])
    fill(ruin, 12, 16, 8, 10, P["sky1"])
    save(ruin, "props/jiangshi/house-ruin.png")
    wall = new(32, 24)
    fill(wall, 0, 4, 32, 20, P["brown"])
    fill(wall, 12, 10, 10, 14, P["void"])
    save(wall, "props/jiangshi/wall-broken.png")
    gate = new(24, 32)
    fill(gate, 2, 4, 20, 28, P["shadow"])
    fill(gate, 8, 16, 8, 16, P["sky1"])
    save(gate, "props/jiangshi/gate-old.png")
    pile = new(16, 12)
    for i in range(6):
        fill(pile, 2 + i * 2, 8 - i % 3, 3, 2, P["cream"])
    save(pile, "props/jiangshi/joss-paper-pile.png")
    candle = new(8, 12)
    fill(candle, 3, 4, 2, 7, P["cream"])
    put(candle, 3, 2, P["orange"])
    put(candle, 4, 1, P["gold"])
    save(candle, "props/jiangshi/candle.png")
    tal = new(8, 12)
    fill(tal, 2, 1, 4, 10, P["cream"])
    put(tal, 3, 4, P["alert"])
    put(tal, 4, 6, P["alert"])
    save(tal, "props/jiangshi/talisman.png")
    well = new(20, 16)
    ellipse(well, 10, 10, 8, 4, P["stone"])
    fill(well, 6, 4, 8, 6, P["stone_l"])
    save(well, "props/jiangshi/well.png")

    save(prop_scarecrow(), "props/alien/scarecrow.png")
    crop = new(16, 24)
    fill(crop, 6, 10, 4, 12, P["green"])
    fill(crop, 4, 4, 8, 8, P["lime"])
    save(crop, "props/alien/crop-a.png")
    ufo = new(40, 20)
    ellipse(ufo, 20, 12, 16, 5, P["metal"])
    ellipse(ufo, 20, 10, 8, 4, P["cyan"])
    put(ufo, 12, 12, P["lime"])
    put(ufo, 28, 12, P["gold"])
    save(ufo, "props/alien/ufo-wreck.png")
    weird = new(16, 24)
    fill(weird, 6, 8, 4, 14, P["purple"])
    ellipse(weird, 8, 6, 6, 5, P["lime"])
    save(weird, "props/alien/weird-plant.png")
    fence = new(32, 16)
    for x in range(0, 32, 6):
        fill(fence, x + 2, 2, 2, 12, P["brown"])
    fill(fence, 0, 4, 32, 2, P["brown"])
    save(fence, "props/alien/fence-wood.png")
    light = new(12, 36)
    fill(light, 5, 4, 2, 30, P["metal"])
    fill(light, 2, 2, 8, 6, P["lime"])
    save(light, "props/alien/light-pole.png")

    rail = new(32, 16)
    fill(rail, 0, 6, 32, 3, P["metal"])
    for x in range(0, 32, 8):
        fill(rail, x + 2, 4, 2, 10, P["metal"])
    save(rail, "props/dumptruck/guardrail.png")
    save(prop_barrier(), "props/dumptruck/barrier.png")
    save(prop_cone(), "props/dumptruck/cone.png")
    pile = new(28, 16)
    for x, y in [(4, 8), (10, 6), (16, 9), (12, 10)]:
        fill(pile, x, y, 5, 4, P["stone"])
    save(pile, "props/dumptruck/rubble-pile.png")
    save(prop_mound(36, 18), "props/dumptruck/dirt-mound.png")
    wsign = new(20, 20)
    fill(wsign, 2, 2, 16, 12, P["orange"])
    outline(wsign, 2, 2, 16, 12, P["ink"])
    fill(wsign, 8, 14, 4, 6, P["metal"])
    save(wsign, "props/dumptruck/sign-work.png")
    barrel = new(12, 16)
    fill(barrel, 2, 2, 8, 12, P["orange"])
    outline(barrel, 2, 2, 8, 12, P["ink"])
    save(barrel, "props/dumptruck/barrel.png")

    save(prop_sign_shop(), "props/foodpanda/shop-a.png")
    # overwrite shop as building face
    shop = new(40, 40)
    fill(shop, 2, 8, 36, 30, P["sky2"])
    fill(shop, 2, 4, 36, 8, P["pink"])
    fill(shop, 8, 16, 24, 18, P["metal"])
    save(shop, "props/foodpanda/shop-a.png")
    vsign = new(12, 28)
    fill(vsign, 2, 2, 8, 24, P["cyan"])
    outline(vsign, 2, 2, 8, 24, P["ink"])
    save(vsign, "props/foodpanda/sign-vert.png")
    hsign = new(28, 12)
    fill(hsign, 2, 2, 24, 8, P["pink"])
    outline(hsign, 2, 2, 24, 8, P["ink"])
    save(hsign, "props/foodpanda/sign-horiz.png")
    save(prop_scooter(), "props/foodpanda/scooter.png")
    save(prop_scooter(), "props/foodpanda/scooter-b.png")
    pot = new(12, 16)
    fill(pot, 3, 8, 6, 6, P["orange"])
    fill(pot, 4, 4, 4, 6, P["green"])
    save(pot, "props/foodpanda/plant-pot.png")
    tl = new(12, 24)
    fill(tl, 4, 2, 4, 18, P["ink"])
    put(tl, 5, 4, P["fire"])
    put(tl, 5, 8, P["gold"])
    put(tl, 5, 12, P["lime"])
    save(tl, "props/foodpanda/traffic-light.png")

    save(prop_iron_door(), "props/grandma/iron-door.png")
    cage = new(20, 20)
    fill(cage, 2, 2, 16, 16, P["cyan"])
    for i in range(2, 18, 3):
        line(cage, i, 2, i, 18, P["metal"])
        line(cage, 2, i, 18, i, P["metal"])
    save(cage, "props/grandma/window-cage.png")
    save(prop_clothes(), "props/grandma/clothes-rack.png")
    save(pot, "props/grandma/pot-plant.png")
    save(prop_scooter(), "props/grandma/scooter-old.png")
    mail = new(12, 12)
    fill(mail, 2, 3, 8, 7, P["metal"])
    put(mail, 5, 6, P["alert"])
    save(mail, "props/grandma/mailbox.png")
    brick = new(32, 24)
    for y in range(0, 24, 4):
        for x in range(0, 32, 8):
            ox = (y // 4 % 2) * 4
            fill(brick, x + ox, y, 7, 3, P["alert"])
            outline(brick, x + ox, y, 7, 3, P["ink"])
    save(brick, "props/grandma/brick-wall.png")
    table = new(20, 16)
    fill(table, 2, 6, 16, 4, P["brown"])
    fill(table, 4, 10, 2, 5, P["brown"])
    fill(table, 14, 10, 2, 5, P["brown"])
    save(table, "props/grandma/bai-bai-table.png")

    er = new(28, 16)
    fill(er, 2, 2, 24, 12, P["fire"])
    outline(er, 2, 2, 24, 12, P["ink"])
    fill(er, 6, 6, 16, 3, P["white"])
    save(er, "props/ambulance/er-sign.png")
    save(prop_cross(), "props/ambulance/cross-sign.png")
    save(prop_barrier(), "props/ambulance/barrier-red.png")
    entrance = new(32, 40)
    fill(entrance, 2, 16, 28, 24, P["lightgray"])
    fill(entrance, 0, 12, 32, 6, P["metal"])
    fill(entrance, 10, 22, 12, 18, P["sky1"])
    save(entrance, "props/ambulance/entrance.png")
    blamp = new(12, 20)
    fill(blamp, 5, 4, 2, 14, P["metal"])
    fill(blamp, 3, 2, 6, 5, P["cyan"])
    save(blamp, "props/ambulance/lamp-blue.png")
    stretch = new(24, 12)
    fill(stretch, 2, 4, 20, 4, P["white"])
    ellipse(stretch, 6, 10, 2, 2, P["ink"])
    ellipse(stretch, 18, 10, 2, 2, P["ink"])
    save(stretch, "props/ambulance/stretcher.png")

    save(prop_hydrant(), "props/firetruck/hydrant.png")
    save(prop_scorch(), "props/firetruck/scorch.png")
    debris = new(24, 12)
    for x, y in [(3, 5), (10, 7), (16, 4)]:
        fill(debris, x, y, 5, 4, P["shadow"])
    save(debris, "props/firetruck/debris.png")
    hose = new(28, 10)
    ellipse(hose, 10, 5, 8, 4, P["alert"])
    fill(hose, 16, 3, 10, 4, P["fire"])
    save(hose, "props/firetruck/hose.png")
    save(prop_cone(), "props/firetruck/cone.png")

    save(prop_lighthouse(), "props/bikini/lighthouse.png")
    rock = new(24, 16)
    ellipse(rock, 12, 10, 10, 5, P["stone"])
    put(rock, 8, 8, P["stone_l"])
    save(rock, "props/bikini/rock.png")
    rockb = new(20, 12)
    ellipse(rockb, 10, 8, 8, 4, P["shadow"])
    save(rockb, "props/bikini/rock-b.png")
    umb = new(20, 20)
    fill(umb, 9, 8, 2, 12, P["metal"])
    ellipse(umb, 10, 8, 8, 4, P["pink"])
    save(umb, "props/bikini/umbrella.png")
    save(rail, "props/bikini/rail.png")
    buoy = new(12, 12)
    ellipse(buoy, 6, 6, 5, 5, P["fire"])
    ellipse(buoy, 6, 6, 3, 3, P["white"])
    save(buoy, "props/bikini/lifebuoy.png")
    chair = new(16, 12)
    fill(chair, 2, 4, 12, 3, P["cyan"])
    fill(chair, 3, 7, 2, 4, P["metal"])
    fill(chair, 11, 7, 2, 4, P["metal"])
    save(chair, "props/bikini/beach-chair.png")

    print("=== Shared props ===")
    save(prop_lamp(), "props/shared/lamp-street.png")
    save(prop_cone(), "props/shared/cone.png")
    save(prop_hydrant(), "props/shared/hydrant.png")
    save(rail, "props/shared/guardrail.png")
    save(make_moon(), "props/shared/moon.png")

    print("=== FX ===")
    save(fx_frames(4, 16, draw_flame), "fx/firetruck/flame-4f.png")
    save(fx_frames(4, 24, draw_smoke), "fx/firetruck/smoke-4f.png")
    def _ember(c, i):
        put(c, 3 + i, 3, P["gold"])
        put(c, 4, 2 + i, P["orange"])
    save(fx_frames(2, 8, _ember), "fx/firetruck/ember-2f.png")
    save(fx_frames(4, 16, draw_dust), "fx/dumptruck/dust-4f.png")
    save(fx_frames(4, 12, draw_joss), "fx/redlady/joss-paper-4f.png")
    save(fx_frames(2, 8, draw_wisp), "fx/redlady/will-o-wisp-2f.png")
    save(fx_frames(4, 12, draw_joss), "fx/jiangshi/joss-paper-4f.png")
    save(fx_frames(2, 8, lambda c, i: fill(c, 3, 2 + i, 2, 4, P["orange"])), "fx/jiangshi/candle-flicker-2f.png")
    save(fx_frames(2, 8, lambda c, i: ellipse(c, 4, 4, 3 + i, 3, P["lime"])), "fx/alien/ufo-glow-2f.png")
    save(fx_frames(2, 8, lambda c, i: put(c, 2 + i, 2, P["gold"]) or put(c, 5, 4 + i, P["cream"])), "fx/godzilla/window-blink-2f.png")
    save(fx_frames(2, 4, lambda c, i: put(c, 1, 1 + i, P["gold"])), "fx/bear/firefly-2f.png")
    save(fx_frames(4, 8, lambda c, i: put(c, 2 + i % 3, 3 + i % 2, P["orange"])), "fx/bear/leaf-4f.png")
    save(fx_frames(2, 8, lambda c, i: fill(c, 2, 2, 4, 4, P["pink"] if i else P["cyan"])), "fx/foodpanda/neon-flicker-2f.png")
    save(fx_frames(2, 8, lambda c, i: put(c, 2, 2 + i, P["fire"]) or put(c, 5, 2 + (1 - i), P["cyan"])), "fx/ambulance/beacon-2f.png")
    save(fx_frames(2, 8, lambda c, i: put(c, 3 + i, 4, P["white"])), "fx/bikini/sparkle-2f.png")
    save(fx_frames(2, 4, lambda c, i: put(c, 1, 1, P["cream"])), "fx/shared/moth-2f.png")
    save(fx_frames(4, 16, draw_sweat), "fx/sweat.png")

    # unit for columbarium
    unit = new(48, 64)
    fill(unit, 4, 8, 40, 52, P["stone_l"])
    outline(unit, 4, 8, 40, 52, P["ink"])
    for fl in range(3):
        for i in range(3):
            fill(unit, 8 + i * 12, 14 + fl * 14, 8, 10, P["sky1"])
            outline(unit, 8 + i * 12, 14 + fl * 14, 8, 10, P["ink"])
    fill(unit, 18, 48, 12, 12, P["sky1"])
    outline(unit, 18, 48, 12, 12, P["gold"])
    save(unit, "props/redlady/columbarium-unit.png")

    n = sum(1 for _ in ROOT.rglob("*.png"))
    print(f"\n=== DONE: {n} PNG files under assets/retro ===")


if __name__ == "__main__":
    main()
