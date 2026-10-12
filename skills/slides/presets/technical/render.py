# Renders every block in tex/snippets.tex to img/<id>.png and writes img/manifest.json with the
# size each image takes on the slide. A block is typeset in a minipage of (w / s) inches at 12 pt,
# so placing it at w inches wide makes the type 12 * s pt on the slide.
#
#   python3 render.py            every block
#   python3 render.py id1 id2    only these blocks
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEX = HERE / "tex"
IMG = HERE / "img"
BUILD = TEX / "build"
DPI = 300

PREAMBLE = r"""\documentclass[12pt,border=%(border)s]{standalone}
\usepackage[T1]{fontenc}
\usepackage{times}
\usepackage{amsmath,amssymb}
\usepackage{xcolor}
\usepackage{enumitem}
\definecolor{ans}{HTML}{0000FF}
\definecolor{note}{HTML}{595959}
\definecolor{bad}{HTML}{980000}
\newcommand{\ans}[1]{{\color{ans}#1}}
\newcommand{\why}[1]{{\color{note}\;[\text{#1}]}}
\setlength{\parindent}{0pt}
\setlength{\parskip}{4pt}
\raggedright
\definecolor{boxgrey}{HTML}{EFEFEF}
%(page)s
\begin{document}
\begin{minipage}{%(width).4fin}
%(body)s
\end{minipage}
\end{document}
"""


def parse():
    text = (TEX / "snippets.tex").read_text()
    blocks = {}
    for match in re.finditer(r"^%%% id=(\S+) w=([\d.]+) s=([\d.]+)\n(.*?)(?=^%%% id=|\Z)", text, re.S | re.M):
        name, width, scale, body = match.group(1), float(match.group(2)), float(match.group(3)), match.group(4)
        blocks[name] = {"w": width, "s": scale, "body": body.strip()}
        # A question also gets a grey-background copy at 80% type, for the top of its solution slide.
        if re.search(r"_q\d*$", name):
            blocks[name + "_g"] = {"w": width, "s": round(scale * 0.8, 3), "body": body.strip(), "grey": True}
    return blocks


def pdf_size_pt(pdf):
    info = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
    w, h = re.search(r"Page size:\s+([\d.]+) x ([\d.]+) pts", info).groups()
    return float(w), float(h)


def render(name, block):
    BUILD.mkdir(parents=True, exist_ok=True)
    tex = BUILD / f"{name}.tex"
    grey = block.get("grey", False)
    tex.write_text(PREAMBLE % {"width": block["w"] / block["s"], "body": block["body"],
                               "border": "6pt" if grey else "1pt", "page": r"\pagecolor{boxgrey}" if grey else ""})
    run = subprocess.run(["pdflatex", "-interaction=nonstopmode", "-halt-on-error", tex.name],
                         cwd=BUILD, capture_output=True, text=True)
    if run.returncode != 0:
        errors = [line for line in run.stdout.splitlines() if line.startswith("!") or "Error" in line]
        raise SystemExit(f"{name}: pdflatex failed\n" + "\n".join(errors[:8]))
    overfull = [line for line in run.stdout.splitlines() if line.startswith("Overfull \\hbox")]
    if overfull:
        print(f"  WARNING {name}: {len(overfull)} overfull box(es): {overfull[0]}")
    pdf = BUILD / f"{name}.pdf"
    w_pt, h_pt = pdf_size_pt(pdf)
    subprocess.run(["pdftoppm", "-r", str(DPI), "-png", "-singlefile", str(pdf), str(IMG / name)], check=True)
    # Placed size on the slide: the PDF's natural size times the scale.
    return {"file": f"img/{name}.png", "w": round(w_pt / 72 * block["s"], 4), "h": round(h_pt / 72 * block["s"], 4),
            "pt": round(12 * block["s"], 1)}


def main():
    IMG.mkdir(exist_ok=True)
    blocks = parse()
    wanted = sys.argv[1:] or list(blocks)
    manifest_path = IMG / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    for name in wanted:
        manifest[name] = render(name, blocks[name])
        print(f"{name:14s} {manifest[name]['w']:.2f} x {manifest[name]['h']:.2f} in  ({manifest[name]['pt']} pt)")
    manifest = {k: v for k, v in manifest.items() if k in blocks}
    manifest_path.write_text(json.dumps(manifest, indent=1))


if __name__ == "__main__":
    main()
