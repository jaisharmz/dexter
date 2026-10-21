#!/usr/bin/env python3
"""Build the page: shell.html with style.css, every figure fragment, and the scripts inlined.

    python3 page/build.py              writes page/dist/<slug>.html (slug from page/book.json)
    python3 page/build.py --only tilt  writes page/dist/test_tilt.html, that unit's figures alone

<!--exercises:UNIT@C--> lists the deck cards that page/exercises.json maps to UNIT, read from
the problems/ folder beside page/, as Exercise C.1, C.2 with each card's examples folded as
the answer. <!--figs:UNIT@C--> numbers that unit's figures Figure C.1, C.2.

shell.html marks the stylesheet with <!--style-->, each unit's figures with <!--figs:UNIT-->,
and the scripts with <!--scripts-->. A unit is a slug (tilt, measure, fixedpoint, ...), and its
fragment is page/figures/UNIT.json; every figure id in it starts with "UNIT-":

    {"scripts": ["figures/fixedpoint-bellman.js", ...],
     "figures": [{"id", "title", "idea", "label", "controls", "readouts", "key", "caption"}]}

Script paths are relative to page/. The runtime (page/runtime.js) goes first, then every
unit's scripts in unit order, then FP.boot().
"""
import html
import json
import pathlib
import re
import sys

PAGE = pathlib.Path(__file__).resolve().parent


def e(text):
    return html.escape(str(text), quote=True)


def md_inline(text):
    """Escape, then allow **bold**, *italic*, `code` and [text](url)."""
    s = e(text)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", s)
    s = re.sub(r"`(.+?)`", r"<code>\1</code>", s)
    s = re.sub(r"\[(.+?)\]\((https?://[^)\s]+)\)", r'<a href="\2">\1</a>', s)
    return s


def sym(text):
    """Control labels are set in capitals, which would turn beta into B, so Greek keeps its case."""
    return re.sub(r"([Ͱ-Ͽἀ-῿]+)", r'<span class="sym">\1</span>', e(text))


def control(c):
    kind, name = c.get("type", "range"), c["name"]
    if kind == "range":
        return (f'<label class="fpc"><span class="fpl">{sym(c.get("label", name))}</span>'
                f'<input type="range" id="c-{e(name)}-{{fid}}" data-c="{e(name)}" min="{c.get("min", 0)}" '
                f'max="{c.get("max", 1)}" step="{c.get("step", 0.01)}" value="{c.get("value", c.get("min", 0))}">'
                f'<output data-o="{e(name)}"></output></label>')
    if kind == "button":
        return f'<button type="button" class="fpb" data-act="{e(name)}">{e(c.get("label", name))}</button>'
    if kind == "seg":
        on = c.get("value") or c["options"][0][0]
        btns = "".join(f'<button type="button" data-v="{e(v)}" aria-pressed="{"true" if v == on else "false"}">'
                       f"{e(lbl)}</button>" for v, lbl in c["options"])
        lbl = f'<span class="fpl">{sym(c["label"])}</span>' if c.get("label") else ""
        return f'<div class="fpc">{lbl}<div class="fpseg" data-seg="{e(name)}" role="group">{btns}</div></div>'
    raise SystemExit(f"unknown control type {kind!r} in {name}")


def figure(f, number=None):
    fid = e(f["id"])
    ctl = "".join(control(c).replace("{fid}", fid) for c in f.get("controls") or [])
    ctl = f'<div class="fpctl">{ctl}</div>' if ctl else ""
    reads = "".join(f'<span>{e(r.get("label", ""))} <b data-o="{e(r["name"])}"></b></span>'
                    for r in f.get("readouts") or [])
    reads = f'<div class="fpread">{reads}</div>' if reads else ""
    key = "".join(f'<span><i class="{"dot" if k.get("dot") else ""}" style="background:var(--{e(k["color"])})"></i>'
                  f'{e(k["label"])}</span>' for k in f.get("key") or [])
    key = f'<div class="fpkey">{key}</div>' if key else ""
    cap = f'<p class="fpcap">{md_inline(f["caption"])}</p>' if f.get("caption") else ""
    label = f'<span class="fnum">Figure {number}</span>' if number else ""
    return (f'<div class="fp" id="fig-{fid}"><h4>{label}{md_inline(f["title"])}</h4>'
            f'<p class="fpidea">{md_inline(f["idea"])}</p>'
            f'<figure class="fpfig" data-fig="{fid}"><div class="fpstage" data-label="{e(f.get("label", f["title"]))}"></div>'
            f"{ctl}{reads}{key}</figure>{cap}</div>")


def card_front(number):
    """The front of a deck card: its title, its bullets and its example lines (the answers)."""
    found = sorted((PAGE.parent / "problems").glob(f"{number:02d}_*.py"))
    if not found:
        raise SystemExit(f"exercises: no card {number:02d} in problems/")
    doc = found[0].read_text().split('"""')[1].strip("\n").splitlines()
    title = re.sub(r"^\d+\.\s*", "", doc[0]).strip()
    bullets, examples, current = [], [], None
    for line in doc[1:]:
        if line.startswith("- "):
            current = [line[2:].strip()]
            bullets.append(current)
        elif line.startswith("  ") and current is not None and line.strip():
            current.append(line.strip())
        elif line.strip():
            current = None
            examples.append(line.rstrip())
        else:
            current = None
    return title, [" ".join(b) for b in bullets], examples


def exercise_list(numbers, chapter):
    items = []
    for k, number in enumerate(numbers, 1):
        title, bullets, examples = card_front(number)
        body = "".join(f"<li>{e(b)}</li>" for b in bullets)
        answer = (f'<details><summary>Answer</summary><pre>{e(chr(10).join(examples))}</pre></details>'
                  if examples else "")
        items.append(f'<li class="ex"><p class="exhead"><span class="exnum">Exercise {chapter}.{k}</span> '
                     f'{e(title)} <span class="excard">card {number}</span></p><ul>{body}</ul>{answer}</li>')
    return f'<ol class="exercises">{"".join(items)}</ol>'


def load_units(errors):
    units = {}
    seen = {}
    for path in sorted((PAGE / "figures").glob("*.json")):
        try:
            d = json.loads(path.read_text())
        except json.JSONDecodeError as err:
            errors.append(f"{path.name}: not JSON ({err})")
            continue
        nn = path.stem
        code = ""
        for s in d.get("scripts") or []:
            p = (PAGE / s).resolve()
            if PAGE not in p.parents or not p.exists():
                errors.append(f"{path.name}: missing script {s}")
            else:
                code += p.read_text()
        for f in d.get("figures") or []:
            for k in ("id", "title", "idea", "caption"):
                if not f.get(k):
                    errors.append(f"{path.name}: figure {f.get('id')} has no {k}")
            fid = f.get("id", "")
            if not fid.startswith(nn + "-"):
                errors.append(f"{path.name}: figure id {fid} must start with {nn}-")
            if fid in seen:
                errors.append(f"figure id {fid} in both {seen[fid]} and {path.name}")
            seen[fid] = path.name
            if f"FP.fig('{fid}'" not in code and f'FP.fig("{fid}"' not in code:
                errors.append(f"{path.name}: no FP.fig registration for {fid} in its scripts")
            ranges = {c["name"] for c in f.get("controls") or [] if c.get("type", "range") == "range"}
            for r in f.get("readouts") or []:
                if r.get("name") in ranges:
                    errors.append(f"{path.name}: {fid} has a readout and a range control both named {r['name']!r}")
        units[nn] = d
    return units


def scripts(units, only=None):
    parts = [(PAGE / "runtime.js").read_text()]
    for nn in sorted(units):
        if only and nn != only:
            continue
        for s in units[nn].get("scripts") or []:
            parts.append((PAGE / s).read_text())
    parts.append("FP.boot();")
    return "\n".join(f"<script>\n{p}\n</script>" for p in parts)


def main():
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]
    errors = []
    units = load_units(errors)
    if errors:
        sys.exit("\n".join(errors))
    style = f"<style>\n{(PAGE / 'style.css').read_text()}\n</style>"

    def figs(m):
        nn, chapter = m.group(1), m.group(2)
        if nn not in units:
            return f'<p class="pending">Figures for {nn} are not built yet.</p>'
        return "".join(figure(f, f"{chapter}.{k}" if chapter else None)
                        for k, f in enumerate(units[nn].get("figures") or [], 1))

    plan = PAGE / "exercises.json"
    chapters = json.loads(plan.read_text()) if plan.exists() else {}

    def exercises(m):
        unit, chapter = m.group(1), m.group(2)
        if unit not in chapters:
            return '<p class="pending">Exercises for this chapter are not listed yet.</p>'
        return exercise_list(chapters[unit], chapter)

    if only:
        out = PAGE / "dist" / f"test_{only}.html"
        shell = (f"<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" "
                 f"content=\"width=device-width,initial-scale=1\"><title>test {only}</title><!--style--></head>"
                 f"<body><main class=\"page viz-root\"><!--figs:{only}--></main><!--scripts--></body></html>")
    else:
        book = json.loads((PAGE / "book.json").read_text()) if (PAGE / "book.json").exists() else {}
        out = PAGE / "dist" / f'{book.get("slug", PAGE.parent.name)}.html'
        shell = (PAGE / "shell.html").read_text()
    page = shell.replace("<!--style-->", style)
    page = re.sub(r"<!--figs:([a-z]+)(?:@(\d+))?-->", figs, page)
    page = re.sub(r"<!--exercises:([a-z]+)@(\d+)-->", exercises, page)
    page = page.replace("<!--scripts-->", scripts(units, only))
    out.write_text(page)
    print(f"wrote {out.relative_to(PAGE.parent)} ({len(page) // 1024} KB, "
          f"{sum(len(u.get('figures') or []) for k, u in units.items() if not only or k == only)} figures)")


if __name__ == "__main__":
    main()
