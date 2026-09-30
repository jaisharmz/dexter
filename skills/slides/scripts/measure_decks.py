"""Measure how a person builds slides, from PDF exports of their own decks.

    sheets   DECK.pdf ... --out DIR       contact sheets, 16 numbered pages per image, to look at
    measure  DECK.pdf ... [--json FILE]   fonts, sizes, colors, boxes and banners, per deck and overall

Run it without installing anything:

    uv run --no-project --with pymupdf --with pillow python measure_decks.py measure decks/*.pdf

Every length is in inches and every size in points on a 10-inch-wide slide (Google Slides'
16:9 default), whatever size the PDF was exported at, so decks compare directly. The title
slide (page 1) is measured on its own, because it follows different rules from the rest.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

try:
    import pymupdf
except ImportError:  # older PyMuPDF only ships the `fitz` name
    import fitz as pymupdf  # type: ignore[no-redef]

SLIDE_W = 10.0
BULLET_GLYPHS = set("●○■□▪▫★☆•◦–-➢➤✓✔")
BOLD_FLAG, ITALIC_FLAG = 16, 2


def _hex(color: int | tuple | list | None) -> str | None:
    if color is None:
        return None
    if isinstance(color, int):
        return f"{color:06X}"
    return "".join(f"{round(c * 255):02X}" for c in color[:3])


def _bold(span: dict) -> bool:
    return bool(span["flags"] & BOLD_FLAG) or "bold" in span["font"].lower()


def _italic(span: dict) -> bool:
    return bool(span["flags"] & ITALIC_FLAG) or "italic" in span["font"].lower()


def _page(page: pymupdf.Page) -> dict:
    """Spans, filled shapes and images on one page, in slide inches and points."""
    scale = SLIDE_W / page.rect.width  # PDF points -> inches on a 10 in slide
    spans = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for s in line["spans"]:
                text = s["text"].strip()
                if not text:
                    continue
                x0, y0, x1, y1 = (v * scale for v in s["bbox"])
                spans.append({
                    "text": text, "font": s["font"].split("+")[-1], "size": round(s["size"] * scale * 72, 1),
                    "color": _hex(s["color"]), "bold": _bold(s), "italic": _italic(s),
                    "x": round(x0, 2), "y": round(y0, 2), "x1": round(x1, 2), "y1": round(y1, 2),
                })
    shapes = []
    for d in page.get_drawings():
        r = d["rect"]
        w, h = r.width * scale, r.height * scale
        fill, stroke = _hex(d.get("fill")), _hex(d.get("color"))
        if w * h < 0.02 and max(w, h) < 0.3:
            continue
        shapes.append({"fill": fill, "stroke": stroke, "width_pt": round((d.get("width") or 0) * scale * 72, 2),
                       "x": round(r.x0 * scale, 2), "y": round(r.y0 * scale, 2), "w": round(w, 2), "h": round(h, 2)})
    area = page.rect.width * page.rect.height
    images = [info["bbox"] for info in page.get_image_info()]
    image_share = sum(pymupdf.Rect(b).get_area() for b in images) / area if images else 0.0
    return {"spans": spans, "shapes": shapes, "images": len(images), "image_share": round(min(image_share, 1.0), 2)}


def _title(spans: list[dict]) -> tuple[dict | None, dict | None]:
    """The largest span near the top, and the line directly under it if it looks like a subtitle."""
    top = [s for s in spans if s["y"] < 1.0 and s["size"] >= 20]
    if not top:
        return None, None
    title = max(top, key=lambda s: (s["size"], -s["y"]))
    below = [s for s in spans
             if title["y"] + 0.1 < s["y"] < title["y"] + 0.8 and abs(s["x"] - title["x"]) < 0.3
             and s["size"] < title["size"] and s["size"] >= 14]
    return title, (min(below, key=lambda s: s["y"]) if below else None)


def _near(value: float, step: float = 0.05) -> float:
    """Round a position so that slides a hair apart vote together."""
    return round(round(value / step) * step, 2)


def _inside(span: dict, shape: dict) -> bool:
    return (shape["x"] - 0.05 <= span["x"] and span["x1"] <= shape["x"] + shape["w"] + 0.05
            and shape["y"] - 0.05 <= span["y"] and span["y1"] <= shape["y"] + shape["h"] + 0.05)


def measure_deck(path: Path) -> dict:
    doc = pymupdf.open(path)
    pages = [_page(p) for p in doc]
    out: dict = {"deck": path.name, "pages": len(pages)}

    first = pages[0]["spans"]
    if first:
        big = max(first, key=lambda s: s["size"])
        rest = sorted((s for s in first if s is not big and s["y"] > big["y"]), key=lambda s: s["y"])
        out["title_slide"] = {
            "title": {k: big[k] for k in ("font", "size", "color", "x", "y")},
            "centered": abs((big["x"] + big["x1"]) / 2 - SLIDE_W / 2) < 0.6,
            "next_line": ({k: rest[0][k] for k in ("font", "size", "color")} if rest else None),
        }

    titles, subs, body, colors, bold_fonts, bullets = Counter(), Counter(), Counter(), Counter(), Counter(), Counter()
    fills, banners, arrows, untitled_image_slides = Counter(), [], Counter(), 0
    for number, page in enumerate(pages[1:], start=2):
        spans, shapes = page["spans"], page["shapes"]
        title, sub = _title(spans)
        if title:
            titles[(title["font"], title["size"], _near(title["x"]), _near(title["y"]), title["color"])] += 1
        elif page["image_share"] > 0.4:
            untitled_image_slides += 1
        if sub:
            subs[(sub["font"], sub["size"], sub["italic"], _near(sub["y"] - title["y"]))] += 1
        for shape in shapes:
            if shape["fill"] and shape["fill"] not in ("FFFFFF", "000000"):
                if shape["w"] > 5 and 0.3 <= shape["h"] <= 1.2:
                    inside = [s for s in spans if _inside(s, shape)]
                    banners.append({"page": number, "fill": shape["fill"], "x": shape["x"], "y": shape["y"],
                                    "w": shape["w"], "h": shape["h"],
                                    "text_size": max((s["size"] for s in inside), default=None),
                                    "text_color": inside[0]["color"] if inside else None,
                                    "text_font": inside[0]["font"] if inside else None})
                elif shape["w"] * shape["h"] > 0.15:
                    fills[(shape["fill"], shape["stroke"], shape["width_pt"])] += 1
            elif not shape["fill"] and shape["stroke"] and min(shape["w"], shape["h"]) < 0.05:
                arrows[(shape["stroke"], shape["width_pt"])] += 1
        banner_boxes = [b for b in banners if b["page"] == number]
        for s in spans:
            if s is title or s is sub:
                continue
            n = len(s["text"])
            if s["text"] in BULLET_GLYPHS:
                bullets[s["text"]] += 1
                continue
            in_banner = any(s["y"] >= b["y"] - 0.05 and s["y1"] <= b["y"] + b["h"] + 0.05 for b in banner_boxes)
            if not in_banner:
                body[(s["font"], s["size"])] += n
                colors[s["color"]] += n
            if s["bold"]:
                bold_fonts[s["font"]] += n

    def top(counter: Counter, k: int = 6) -> list:
        return [[list(key) if isinstance(key, tuple) else key, n] for key, n in counter.most_common(k)]

    out.update({
        "title": top(titles, 3), "subtitle": top(subs, 3), "body_font_size": top(body, 8),
        "text_colors": top(colors, 8), "bold_fonts": top(bold_fonts, 4), "bullet_glyphs": top(bullets, 5),
        "box_fills": top(fills, 8), "lines": top(arrows, 4), "banners": banners[:6],
        "banner_pages": len({b["page"] for b in banners}), "untitled_image_slides": untitled_image_slides,
    })
    return out


def summarize(decks: list[dict]) -> dict:
    """What holds across decks: the mode of each measurement, weighted by how often it appears."""
    def vote(key: str, depth: int = 1) -> list:
        c: Counter = Counter()
        for d in decks:
            for value, n in d.get(key, [])[:depth]:
                c[json.dumps(value)] += n
        return [[json.loads(v), n] for v, n in c.most_common(5)]

    fills: Counter = Counter()
    for d in decks:
        for b in d["banners"]:
            fills[(b["fill"], b["text_color"], b["text_size"], round(b["h"], 1))] += 1
    return {
        "decks": len(decks),
        "title": vote("title"), "subtitle": vote("subtitle"), "body_font_size": vote("body_font_size", 3),
        "text_colors": vote("text_colors", 4), "bold_fonts": vote("bold_fonts", 2), "bullet_glyphs": vote("bullet_glyphs", 3),
        "box_fills": vote("box_fills", 4), "banners": [[list(k), n] for k, n in fills.most_common(4)],
        "decks_with_banners": sum(1 for d in decks if d["banner_pages"]),
        "title_slides": [d.get("title_slide") for d in decks if d.get("title_slide")][:6],
    }


def sheets(paths: list[Path], out: Path, per_sheet: int = 16, cols: int = 4, width: int = 360) -> list[Path]:
    from PIL import Image, ImageDraw

    out.mkdir(parents=True, exist_ok=True)
    written = []
    for path in paths:
        doc = pymupdf.open(path)
        thumbs = []
        for page in doc:
            zoom = width / page.rect.width
            pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
            thumbs.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
        for start in range(0, len(thumbs), per_sheet):
            chunk = thumbs[start:start + per_sheet]
            h = max(t.height for t in chunk)
            rows = (len(chunk) + cols - 1) // cols
            sheet = Image.new("RGB", (cols * (width + 8) + 8, rows * (h + 22) + 8), (150, 150, 150))
            draw = ImageDraw.Draw(sheet)
            for i, t in enumerate(chunk):
                x, y = 8 + (i % cols) * (width + 8), 8 + (i // cols) * (h + 22)
                sheet.paste(t, (x, y))
                draw.text((x + 2, y + h + 4), str(start + i + 1), fill=(0, 0, 0))
            target = out / f"{path.stem[:40]}-{start // per_sheet + 1}.png"
            sheet.save(target)
            written.append(target)
    return written


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    s = sub.add_parser("sheets", help="contact sheets to look at every page")
    s.add_argument("decks", nargs="+", type=Path)
    s.add_argument("--out", type=Path, required=True)
    m = sub.add_parser("measure", help="fonts, sizes, colors, boxes and banners")
    m.add_argument("decks", nargs="+", type=Path)
    m.add_argument("--json", type=Path, help="write per-deck numbers and the summary here")
    args = parser.parse_args(argv)

    if args.command == "sheets":
        for path in sheets(args.decks, args.out):
            print(path)
        return 0

    decks = []
    for path in args.decks:
        try:
            decks.append(measure_deck(path))
        except Exception as error:  # one broken export should not stop the rest
            print(f"skipped {path.name}: {error}", file=sys.stderr)
    if not decks:
        return 1
    result = {"summary": summarize(decks), "decks": decks}
    if args.json:
        args.json.write_text(json.dumps(result, indent=1))
    summary = result["summary"]
    print(f"{summary['decks']} decks")
    for key in ("title", "subtitle", "body_font_size", "text_colors", "bold_fonts", "bullet_glyphs", "box_fills", "banners"):
        print(f"{key:15} {summary[key][:4]}")
    print(f"{'banner decks':15} {summary['decks_with_banners']} of {summary['decks']}")
    for d in decks:
        print(f"  {d['deck'][:44]:44} title {d['title'][:1]}  banners on {d['banner_pages']} pages  "
              f"image-only slides {d['untitled_image_slides']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
