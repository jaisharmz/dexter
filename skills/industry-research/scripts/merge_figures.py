#!/usr/bin/env python3
"""Fold per-paper and per-project figure fragments into a run's report.json.

Figure agents never touch report.json. Each writes its drawing code under the run folder and
one JSON fragment beside it:

    <run>/figures/papers/<group>.json     {"scripts": [...], "items": [paper, ...]}
    <run>/figures/projects/<group>.json   {"scripts": [...], "projects": {"<exact title>": [figure, ...]}}

This script checks every fragment, then writes `papers.items` (in the order of avenue_labels,
each group's own order inside an avenue), `papers.scripts`, each project's `figures` and
`project_figure_scripts`. A paper or project dropped from the fragments loses its figures on
the next merge, so the fragments stay the only source. `papers.title` and `papers.lede` are
the page's own words and are kept.

    python3 merge_figures.py <run> [--check]
"""
import json
import pathlib
import re
import sys


def load(path):
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as err:
        sys.exit(f"{path}: not JSON ({err})")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check_only = "--check" in sys.argv
    if len(args) != 1:
        sys.exit(__doc__)
    run = pathlib.Path(args[0]).resolve()
    d = load(run / "report.json")
    errors, warnings = [], []

    # Every figure id on the page must be unique, first principles included.
    seen = {f["id"]: "first_principles" for f in (d.get("first_principles") or {}).get("figures") or []}

    def claim(fid, where):
        if fid in seen:
            errors.append(f"figure id {fid} appears in both {seen[fid]} and {where}")
        seen[fid] = where

    def names(fig, where):
        # FP.out writes to the first [data-o] of a name, and a range control's own output carries
        # its name, so a readout sharing a range control's name never shows its value.
        ranges = {c.get("name") for c in fig.get("controls") or [] if c.get("type", "range") == "range"}
        for r in fig.get("readouts") or []:
            if r.get("name") in ranges:
                errors.append(f"{where}: figure {fig.get('id')} has a readout and a range control both named {r.get('name')!r}")

    def script_ok(name, where):
        path = (run / name).resolve()
        if run not in path.parents:
            errors.append(f"{where}: script outside the run folder: {name}")
        elif not path.exists():
            errors.append(f"{where}: missing script {name}")
        return path

    registered = {}

    def scan(path):
        # FP.fig('<id>', ...) is how a figure registers; the builder renders a frame per id.
        if path.exists():
            for fid in re.findall(r"FP\.fig\(\s*['\"]([^'\"]+)['\"]", path.read_text()):
                registered[fid] = path.name

    for name in (d.get("first_principles") or {}).get("scripts") or []:
        scan(script_ok(name, "first_principles"))

    # ---------------------------------------------------------------- papers
    order = list((d.get("avenue_labels") or {}).keys())
    items, paper_scripts = [], []
    for frag in sorted((run / "figures" / "papers").glob("*.json")):
        f = load(frag)
        for name in f.get("scripts") or []:
            scan(script_ok(name, frag.name))
            if name not in paper_scripts:
                paper_scripts.append(name)
        for i, p in enumerate(f.get("items") or []):
            for key in ("id", "title", "figures"):
                if not p.get(key):
                    errors.append(f"{frag.name}: paper {p.get('id', i)} has no {key}")
            if p.get("avenue") not in order:
                errors.append(f"{frag.name}: paper {p.get('id')} has avenue {p.get('avenue')!r}, "
                              f"not one of {order}")
            if not p.get("sources"):
                warnings.append(f"{frag.name}: paper {p.get('id')} carries no sources")
            for fig in p.get("figures") or []:
                claim(fig.get("id"), f"{frag.name} ({p.get('id')})")
                names(fig, frag.name)
            items.append((order.index(p["avenue"]) if p.get("avenue") in order else len(order), len(items), p))
    ids = [p["id"] for _, _, p in items if p.get("id")]
    for pid in {x for x in ids if ids.count(x) > 1}:
        errors.append(f"paper id {pid} appears in two fragments")
    items = [p for _, _, p in sorted(items, key=lambda t: (t[0], t[1]))]

    # ---------------------------------------------------------------- projects
    titles = {p["title"]: p for p in d.get("projects") or []}
    proj_figs, proj_scripts = {}, []
    for frag in sorted((run / "figures" / "projects").glob("*.json")):
        f = load(frag)
        for name in f.get("scripts") or []:
            scan(script_ok(name, frag.name))
            if name not in proj_scripts:
                proj_scripts.append(name)
        for title, figs in (f.get("projects") or {}).items():
            if title not in titles:
                errors.append(f"{frag.name}: no project titled {title!r}")
                continue
            if title in proj_figs:
                errors.append(f"{frag.name}: project {title!r} also has figures in another fragment")
            for fig in figs:
                claim(fig.get("id"), f"{frag.name} ({title[:40]})")
                names(fig, frag.name)
                if not fig.get("sources"):
                    warnings.append(f"{frag.name}: figure {fig.get('id')} carries no sources")
            proj_figs[title] = figs

    for fid, where in seen.items():
        if fid not in registered:
            errors.append(f"figure {fid} ({where}) has no FP.fig('{fid}', ...) in any listed script")

    for w in warnings:
        print("warning:", w)
    if errors:
        for err in errors:
            print("ERROR:", err)
        sys.exit(1)

    n_pf = sum(len(p.get("figures") or []) for p in items)
    n_jf = sum(len(v) for v in proj_figs.values())
    print(f"{len(items)} papers with {n_pf} figures, {len(proj_figs)} of {len(titles)} projects "
          f"with {n_jf} figures, {len(paper_scripts) + len(proj_scripts)} scripts")
    missing = [t for t in titles if t not in proj_figs]
    if missing:
        print(f"{len(missing)} projects without figures:", *missing, sep="\n  ")
    if check_only:
        return

    pp = d.get("papers") or {}
    pp["items"], pp["scripts"] = items, paper_scripts
    d["papers"] = pp
    for title, p in titles.items():
        if title in proj_figs:
            p["figures"] = proj_figs[title]
        else:
            p.pop("figures", None)
    d["project_figure_scripts"] = proj_scripts
    (run / "report.json").write_text(json.dumps(d, indent=1, ensure_ascii=False))
    print(f"wrote {run / 'report.json'}")


if __name__ == "__main__":
    main()
