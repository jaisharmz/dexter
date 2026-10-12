#!/usr/bin/env python3
"""Icons for slides: Lucide outline icons recolored to the deck's palette, as PNG or as a short
Manim clip of the icon drawing itself.

    uv run --no-project --with resvg-py python icon.py rocket search settings --color 223AE6 --out icons/
    ... icon.py rocket --circle E6E9FC                 icon centered in a filled disc
    ... icon.py rocket --circle 223AE6 --color FFFFFF  white icon on an accent disc
    ... icon.py rocket --animate                       also icons/rocket.mp4 (needs manim, see below)

Names are Lucide's (https://lucide.dev/icons): rocket, search, settings, shield-check, users,
chart-line, database, file-text, brain, target, flask-conical, workflow, layers, zap, clock,
dollar-sign, globe, lock, lightbulb, cpu, server, git-branch, message-square, check-circle.
Every icon is from one family, drawn on a 24 px grid with round caps, so a row of them matches.

--animate writes a 1.5 s mp4 on a white background with Manim (Community edition), which needs
Homebrew's cairo, pango, pkg-config and ffmpeg. Point MANIM at its binary if it is not on PATH.
Google Slides plays a clip only when it is inserted as a Drive video (Insert > Video > Google
Drive), not one embedded in the .pptx."""
import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request

LUCIDE = "https://unpkg.com/lucide-static@0.460.0/icons/{}.svg"  # ISC license


def fetch(name, cache):
    path = os.path.join(cache, f"{name}.svg")
    if not os.path.exists(path):
        try:
            with urllib.request.urlopen(LUCIDE.format(name), timeout=20) as r:
                data = r.read().decode()
        except Exception as e:
            sys.exit(f"{name}: not found in Lucide ({e}); browse https://lucide.dev/icons for the name")
        os.makedirs(cache, exist_ok=True)
        with open(path, "w") as f:
            f.write(data)
    with open(path) as f:
        return f.read()


def styled(svg, color, stroke, circle):
    """Recolor and restroke the icon; with a circle, put it at 56% size in a filled disc."""
    svg = re.sub(r"<!--.*?-->", "", svg, flags=re.S)
    svg = svg.replace("currentColor", f"#{color}")
    svg = re.sub(r'stroke-width="[\d.]+"', f'stroke-width="{stroke}"', svg)
    if not circle:
        return svg
    inner = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S).group(1)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'
            f'<circle cx="12" cy="12" r="12" fill="#{circle}"/>'
            f'<g transform="translate(5.28 5.28) scale(0.56)" fill="none" stroke="#{color}" '
            f'stroke-width="{stroke / 0.56:.2f}" stroke-linecap="round" stroke-linejoin="round">{inner}</g></svg>')


def to_png(svg, size, out):
    import resvg_py
    png = resvg_py.svg_to_bytes(svg_string=svg, width=size, height=size)
    with open(out, "wb") as f:
        f.write(bytes(png))


SCENE = '''
from manim import *
config.background_color = "#FFFFFF"
class Icon(Scene):
    def construct(self):
        icon = SVGMobject(r"{svg}", stroke_color="#{color}", stroke_width={width}, fill_opacity=0).set_height(6)
        self.play(Create(icon), run_time=1.2, rate_func=smooth)
        self.wait(0.3)
'''


def to_mp4(svg_path, color, stroke, out):
    manim = os.environ.get("MANIM") or shutil.which("manim")
    if not manim:
        sys.exit("--animate needs manim on PATH or MANIM=/path/to/manim")
    with tempfile.TemporaryDirectory() as tmp:
        scene = os.path.join(tmp, "icon_scene.py")
        with open(scene, "w") as f:
            f.write(SCENE.format(svg=svg_path, color=color, width=stroke * 18))
        subprocess.run([manim, "-qh", "--media_dir", tmp, "-o", "icon", scene, "Icon"], check=True,
                       stdout=subprocess.DEVNULL)
        for root, _, files in os.walk(tmp):
            if "icon.mp4" in files:
                shutil.copy(os.path.join(root, "icon.mp4"), out)
                return
    sys.exit("manim ran but wrote no icon.mp4")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("names", nargs="+")
    ap.add_argument("--color", default="223AE6", help="stroke color, hex without #")
    ap.add_argument("--stroke", type=float, default=1.5, help="Lucide's default is 2; 1.5 reads cleaner at slide size")
    ap.add_argument("--circle", help="fill color of a disc behind the icon")
    ap.add_argument("--size", type=int, default=512, help="PNG side in pixels; 512 is sharp up to ~2 in on a slide")
    ap.add_argument("--out", default="icons")
    ap.add_argument("--animate", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    cache = os.path.join(a.out, ".svg")
    for name in a.names:
        svg = styled(fetch(name, cache), a.color, a.stroke, a.circle)
        png = os.path.join(a.out, f"{name}.png")
        to_png(svg, a.size, png)
        print("wrote", png)
        if a.animate:
            plain = os.path.join(cache, f"{name}.plain.svg")
            with open(plain, "w") as f:
                f.write(styled(fetch(name, cache), a.color, a.stroke, None))
            mp4 = os.path.join(a.out, f"{name}.mp4")
            to_mp4(os.path.abspath(plain), a.color, a.stroke, mp4)
            print("wrote", mp4)


if __name__ == "__main__":
    main()
