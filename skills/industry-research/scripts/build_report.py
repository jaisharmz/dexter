#!/usr/bin/env python3
"""Build a run's report.html from report.json. Deterministic: same data, same page.

Usage:  python3 build_report.py <run_dir>

Reads   <run_dir>/report.json
Writes  <run_dir>/report.html

The stylesheet and script come from the skill's assets/ directory and are never
regenerated per run. That is the whole point of this script: every run's page is
structurally identical, so a reader who has read one can read any of them.

Standard library only. No pyyaml, no jinja, nothing to install.
"""
import html, json, pathlib, re, sys, collections

SKILL = pathlib.Path(__file__).resolve().parent.parent
e = html.escape
UNIT = {"an afternoon": 3, "an evening": 3, "two sittings": 6, "a sitting": 3, "a weekend": 8}


def hours(rs):
    return sum(UNIT.get((r.get("time") or "").strip().lower(), 3) for r in rs)

STATE_WORD = {"open": "open", "contested": "contested", "eng": "engineering",
              "engineering": "engineering", "dead": "dead"}
SCALE_LABEL = {"weekend": "A weekend", "two-weeks": "Two to three weeks", "semester": "A semester"}
SCALE_SHORT = {"weekend": "a weekend", "two-weeks": "2 to 3 weeks", "semester": "a semester"}
ARCH = {"reimplement": "reimplement a paper", "nano": "nano, end to end",
        "apply": "apply something that exists"}
ROLE_LABEL = {"foundation-release": "foundation release"}
KIND_LABEL = {"round": "round", "launch": "launch", "release": "release",
              "acquisition": "acquisition", "shutdown": "shutdown", "move": "move", "paper": "paper"}


def sec(title, body, cls=""):
    c = f' class="{cls}"' if cls else ""
    return f'<section{c}><h2>{e(title)}</h2>{body}</section>'


# ---------------------------------------------------------------- narrative
def md_inline(t):
    """Links, bold, italic, code. Enough markdown for an essay, no more."""
    import re
    t = e(t)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2">\1</a>', t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    return t


def narrative(d, run):
    """Render the essay. Prefers narrative.md so the file stays the source of truth."""
    n = d.get("narrative") or {}
    path = run / (n.get("file") or "narrative.md")
    if path.exists():
        body, para = "", []

        def flush():
            nonlocal body, para
            if para:
                body += f"<p>{md_inline(' '.join(para))}</p>"
                para = []

        for ln in path.read_text().split("\n"):
            st = ln.strip()
            if st.startswith("# ") and not body:
                continue                      # the file's own H1; the section supplies one
            if st.startswith("## "):
                flush()
                body += f"<h3>{md_inline(st[3:])}</h3>"
            elif st.startswith("> "):
                flush()
                body += f"<blockquote>{md_inline(st[2:])}</blockquote>"
            elif not st:
                flush()
            else:
                para.append(st)
        flush()
        words = len(path.read_text().split())
        return (f'<section class="narr"><h2>How the field got here</h2>'
                f'<p class="narrmeta">{words:,} words. The full essay is '
                f'<code>narrative.md</code>.</p>{body}</section>')
    if n.get("beats"):
        beats = "".join(f"<p>{b}</p>" for b in n["beats"])
        return f'<section class="narr"><h2>How the field got here</h2>{beats}</section>'
    return ""


# ---------------------------------------------------------------- openness map
def openness_map(d):
    nodes = d.get("nodes") or []
    if len(nodes) < 12:
        return ""
    by = collections.OrderedDict()
    for n in nodes:
        by.setdefault(n["section"], []).append(n)
    order = sorted(by, key=lambda s: (-sum(1 for x in by[s] if x["state"] == "open"), -len(by[s])))
    work = d.get("node_work") or {}
    proj = {p["title"]: p for p in (d.get("projects") or [])}
    read = {r["title"]: r for r in (d.get("reading") or [])}

    def tip(label, note):
        w = work.get(label) or {}
        parts = []
        p = proj.get(w.get("project"))
        if p:
            parts.append(f'<div class="tw-sec"><span class="tw-k">Project</span>'
                         f'<b>{e(p["title"])}</b>'
                         f'<span class="tw-s">{SCALE_SHORT.get(p.get("scale"), "")}</span>'
                         f'<span class="tw-p">{e(p.get("plain", ""))}</span></div>')
        got = [(t, read[t]) for t in (w.get("papers") or []) if t in read]
        if got:
            li = "".join(f'<li><a href="{e(r["url"])}">{e(t)}</a>'
                         f'<span class="tw-role">{e(r.get("role", ""))}</span></li>' for t, r in got)
            parts.append(f'<div class="tw-sec"><span class="tw-k">Papers</span><ul>{li}</ul></div>')
        if not parts:
            parts.append('<div class="tw-sec"><span class="tw-none">No project and no paper in '
                         'this run. This part of the map went unserved.</span></div>')
        # The cell shows only its label, so the note always adds something, served or not.
        if note:
            parts.append(f'<div class="tw-sec"><span class="tw-note">{e(note)}</span></div>')
        return "".join(parts)

    def served(label):
        w = work.get(label) or {}
        return w.get("project") in proj or any(t in read for t in (w.get("papers") or []))

    bands = ""
    for s in order:
        items = by[s]
        opens = sum(1 for i in items if i["state"] == "open")
        cells = ""
        for n in items:
            cls = f'cell s-{n["state"]}' + (" sub" if n.get("depth") else "")
            cells += (f'<button type="button" class="{cls}" '
                      f'data-title="{e(n["label"])}" '
                      f'data-work="{html.escape(tip(n["label"], n.get("note", "")), quote=True)}">'
                      f'<span class="cl">{e(n["label"])}</span>'
                      f'<span class="cs">{STATE_WORD.get(n["state"], n["state"])}</span></button>')
        bands += (f'<div class="band"><div class="bandhead"><span class="bn">{e(s)}</span>'
                  f'<span class="bc"><b>{opens}</b> open of {len(items)}</span></div>'
                  f'<div class="cells">{cells}</div></div>')

    rows = "".join(f'<tr><td>{e(n["section"])}</td>'
                   f'<td>{"&nbsp;&nbsp;" if n.get("depth") else ""}{e(n["label"])}</td>'
                   f'<td>{STATE_WORD.get(n["state"], n["state"])}</td>'
                   f'<td>{e(n.get("note", ""))}</td></tr>' for n in nodes)
    legend = ('<div class="legend">'
              '<span class="lg"><span class="sw" style="background:var(--open)"></span>open, nobody knows how</span>'
              '<span class="lg"><span class="sw" style="background:var(--contested)"></span>contested, people disagree on the approach</span>'
              '<span class="lg"><span class="sw" style="background:var(--eng)"></span>engineering, the path is known</span>'
              '</div>')
    table = ('<details><summary>Table view, same data</summary><div class="tablewrap"><table>'
             '<thead><tr><th>Branch</th><th>Sub-problem</th><th>State</th><th>Note</th></tr></thead>'
             f'<tbody>{rows}</tbody></table></div></details>')
    n_served = sum(1 for n in nodes if served(n["label"]))
    lede = (f'<p class="lede">{len(nodes)} sub-problems, grouped by branch and colored by state, '
            f'with the branches holding the most open problems first. Hover or focus one for the '
            f'project and papers that attack it. {n_served} of the {len(nodes)} have at least one, '
            f'and the rest went unserved in this run.</p>')
    return sec("Where the open research is", lede + legend + bands + table)


# ---------------------------------------------------------------- first principles
def first_principles(d, run):
    """The field's core idea, built up in figures that compute the real thing.

    `first_principles` carries a lede (the one idea everything else hangs on), then figures,
    each with a title, the idea in one sentence, a short body, its controls, readouts, a key,
    a caption saying what to try, and the avenues and papers it unlocks. The drawing code is
    the run's own, in `scripts` under the run folder, and registers with FP.fig(id, setup);
    the chrome around it is the same on every page."""
    fp = d.get("first_principles") or {}
    figs = fp.get("figures") or []
    if not figs:
        return ""

    def control(c):
        kind, name = c.get("type", "range"), c["name"]
        if kind == "range":
            return (f'<label class="fpc"><span class="fpl">{e(c.get("label", name))}</span>'
                    f'<input type="range" data-c="{e(name)}" min="{c.get("min", 0)}" max="{c.get("max", 1)}" '
                    f'step="{c.get("step", 0.01)}" value="{c.get("value", c.get("min", 0))}">'
                    f'<output data-o="{e(name)}"></output></label>')
        if kind == "button":
            return f'<button type="button" class="fpb" data-act="{e(name)}">{e(c.get("label", name))}</button>'
        if kind == "seg":
            on = c.get("value") or c["options"][0][0]
            btns = "".join(f'<button type="button" data-v="{e(v)}" aria-pressed="{"true" if v == on else "false"}">'
                           f'{e(lbl)}</button>' for v, lbl in c["options"])
            lbl = f'<span class="fpl">{e(c["label"])}</span>' if c.get("label") else ""
            return f'<div class="fpc">{lbl}<div class="fpseg" data-seg="{e(name)}" role="group">{btns}</div></div>'
        return ""

    out = ""
    for i, f in enumerate(figs, 1):
        body = "".join(f"<p>{md_inline(p)}</p>" for p in (f.get("body") or []))
        ctl = "".join(control(c) for c in (f.get("controls") or []))
        ctl = f'<div class="fpctl">{ctl}</div>' if ctl else ""
        reads = "".join(f'<span>{e(r.get("label", ""))} <b data-o="{e(r["name"])}"></b></span>'
                        for r in (f.get("readouts") or []))
        reads = f'<div class="fpread">{reads}</div>' if reads else ""
        key = "".join(f'<span><i class="{"dot" if k.get("dot") else ""}" style="background:var(--{e(k["color"])})"></i>'
                      f'{e(k["label"])}</span>' for k in (f.get("key") or []))
        key = f'<div class="fpkey">{key}</div>' if key else ""
        cap = f'<p class="fpcap">{md_inline(f["caption"])}</p>' if f.get("caption") else ""
        unl = f'<p class="fpun"><b>Unlocks</b>{md_inline(f["unlocks"])}</p>' if f.get("unlocks") else ""
        out += (f'<article class="fp" id="fp-{e(f["id"])}"><p class="fpk">{e(f.get("kicker") or f"Figure {i}")}</p>'
                f'<h3>{e(f["title"])}</h3><p class="fpidea">{md_inline(f.get("idea", ""))}</p>'
                f'<div class="fpbody">{body}</div>'
                f'<figure class="fpfig" data-fig="{e(f["id"])}"><div class="fpstage" data-label="{e(f.get("label", f["title"]))}"></div>'
                f'{ctl}{reads}{key}</figure>{cap}{unl}</article>')
    lede = f'<p class="lede">{md_inline(fp["lede"])}</p>' if fp.get("lede") else ""
    return sec(fp.get("title") or "First principles", lede + out, "fpsec")


def figure_scripts(d, run):
    """The run's figure code, inlined in order after the page script, then FP.boot()."""
    names = (d.get("first_principles") or {}).get("scripts") or []
    code = ""
    for name in names:
        path = (run / name).resolve()
        if run not in path.parents:
            sys.exit(f"figure script outside the run folder: {name}")
        code += f"\n/* {name} */\n" + path.read_text()
    return code + "\nFP.boot();\n" if code else ""


# ---------------------------------------------------------------- avenue strip
def plural(n, one, many):
    return f"no {many}" if n == 0 else f"{n} {one if n == 1 else many}"


def avenues(d):
    """The avenues side by side: problems on the map against people and money.

    Each entry carries `nodes` (state counts from the map), `people` (organizations from the
    landscape whose sub-problems sit in the avenue, by tier), a short `money` line the designer
    writes from market_now, and the header fields verbatim for the full cards. One shared
    scale for the bars, so a long bar means many problems and its green share means open ones."""
    avs = d.get("avenues") or []
    if len(avs) < 2:
        return ""
    STATES = [("open", "open", "b-open"), ("contested", "contested", "b-contested"),
              ("engineering", "engineering", "b-eng"), ("dead", "dead", "b-dead")]
    top = max(sum((a.get("nodes") or {}).values()) for a in avs) or 1
    rows = ('<div class="avrow avhead"><span>Avenue</span><span>Problems on the map</span>'
            '<span>Organizations on them</span><span>Money now</span></div>')
    for a in avs:
        n = a.get("nodes") or {}
        segs = "".join(f'<i class="{c}" style="flex-basis:{100 * n[k] / top:.2f}%"></i>'
                       for k, _, c in STATES if n.get(k))
        words = ", ".join(f"{n[k]} {w}" for k, w, _ in STATES if n.get(k))
        rest = ", ".join(f"{n[k]} {w}" for k, w, _ in STATES[1:] if n.get(k))
        cnt = f'<b>{n.get("open", 0)} open</b>' + (f", {rest}" if rest else "")
        p = a.get("people") or {}
        ppl = ""
        if p:
            ppl = (f'<b>{p.get("total", 0)}</b> organizations: '
                   f'{plural(p.get("frontier-lab", 0), "frontier lab", "frontier labs")}, '
                   f'{plural(p.get("academic", 0), "academic group", "academic groups")}, and '
                   f'{plural(p.get("startup", 0), "startup", "startups")}')
        rows += (f'<div class="avrow"><div class="avnm">{e(a["name"])}</div>'
                 f'<div><span class="avk">Problems on the map</span>'
                 f'<span class="sbar" role="img" aria-label="{e(words)}">{segs}</span>'
                 f'<span class="avct">{cnt}</span></div>'
                 f'<div class="avppl"><span class="avk">Organizations on them</span>{ppl}</div>'
                 f'<div class="avmo"><span class="avk">Money now</span>{e(a.get("money", ""))}</div>'
                 f'</div>')
    cards = ""
    for a in avs:
        n = a.get("nodes") or {}
        dl = ""
        for k, lbl in [("market_now", "Now"), ("market_15y", "In 15 years"),
                       ("entry_cost", "Entry"), ("holy_grail", "Holy grail"), ("blocker", "Blocker")]:
            if a.get(k):
                cls = ' class="blk"' if k == "blocker" else ""
                dl += f"<dt>{lbl}</dt><dd{cls}>{e(a[k])}</dd>"
        cards += (f'<article class="av"><span class="avn">{n.get("open", 0)} open of '
                  f'{sum(n.values())}</span><h3>{e(a["name"])}</h3>'
                  f'<p class="avone">{e(a.get("one_line", ""))}</p><dl>{dl}</dl></article>')
    lede = f'<p class="lede">{e(d["avenues_lede"])}</p>' if d.get("avenues_lede") else ""
    full = ('<details class="avfull"><summary>Each avenue\'s header in full: the market now and '
            'in fifteen years, the cost of entry, the holy grail, and the blocker</summary>'
            f'<div class="avs">{cards}</div></details>')
    return sec("Where the money and the people are",
               lede + f'<div class="avcmp">{rows}</div>' + full)


# ---------------------------------------------------------------- reading
def cite(r):
    """Citation counts arrive as text, 'at least 93 (Semantic Scholar, Oct 11 2026)', because
    every index undercounts. The designer may split that into an integer floor plus a short
    note, and the source string stays on hover either way. A count the builder called an
    artifact gets a note instead of a number, since 'at least 4' on a famous benchmark misleads."""
    cit = r.get("citations")
    src = r.get("citations_source") or (cit if isinstance(cit, str) else "")
    ttl = f' title="{e(src)}"' if src else ""
    if isinstance(cit, int):
        pre = "at least " if r.get("citations_floor") else ""
        return f'<span class="pcit"{ttl}>{pre}<b>{cit:,}</b> citations</span>'
    if r.get("citations_note"):
        return f'<span class="pcit new"{ttl}>{e(r["citations_note"])}</span>'
    if isinstance(cit, str) and cit.strip():
        return f'<span class="pcit new">{e(cit)}</span>'
    return ""


def reading(d):
    items = d.get("reading") or []
    if not items:
        return ""
    labels = d.get("avenue_labels") or {}

    def entry(r, num=None):
        n = f'<span class="rn">{num}</span>' if num else ""
        role = r.get("role")
        chip = ""
        if role:
            op = f'<span class="opened">{e(r["opened"])}</span>' if r.get("opened") else ""
            chip = (f'<p class="rolerow"><span class="role ro-{role}">'
                    f'{e(ROLE_LABEL.get(role, role))}</span>{op}</p>')
        bits = []
        if r.get("group"):
            bits.append(f'<span class="pgrp">{e(r["group"])}</span>')
        if r.get("venue"):
            bits.append(f'<span class="pven">{e(r["venue"])}</span>')
        c = cite(r)
        if c:
            bits.append(c)
        if r.get("code_url"):
            st = (f'<span class="star" title="{e(r.get("code_stars_note", ""))}">'
                  f'{r["code_stars"]:,}</span>') if isinstance(r.get("code_stars"), int) else ""
            note = f'<span class="rnote">{e(r["code_note"])}</span>' if r.get("code_note") else ""
            bits.append(f'<a class="codelink" href="{e(r["code_url"])}">code{st}{note}</a>')
        elif r.get("code_checked"):
            bits.append('<span class="pcit new">no code released</span>')
        prov = f'<p class="prov">{"".join(bits)}</p>' if bits else ""
        summ = f'<p class="rsum">{e(r["summary"])}</p>' if r.get("summary") else ""
        skip = f'<span class="rskip">skip {e(r["skip"])}</span>' if r.get("skip") else ""
        return (f'<li class="r-{r.get("tier", "core")}">{n}<div>{chip}'
                f'<a class="rt" href="{e(r["url"])}">{e(r["title"])}</a> '
                f'<span class="ry">{e(str(r.get("year", "")))}</span>'
                f'<span class="rtime">{e(r.get("time", ""))}</span>'
                f'{prov}{summ}<p class="rwhy">{e(r.get("why", ""))}</p>{skip}</div></li>')

    # A run may name a spine that crosses avenues: three or four titles from the reading
    # list, in read order. Without one, each avenue's start-here and core papers are its
    # spine, which is the right page for a run of two or three avenues and the wrong one
    # for eight, where it called 57 papers a spine.
    by_title = {r["title"]: r for r in items}
    spine = [by_title[t] for t in (d.get("spine") or []) if t in by_title]
    for t in (d.get("spine") or []):
        if t not in by_title:
            sys.stderr.write(f"WARNING: spine title not in the reading list: {t}\n")
    in_spine = {id(r) for r in spine}
    avs = sorted({r.get("avenue", "") for r in items})
    head = ""
    if spine:
        head = (f'<div class="ravenue spine"><h3>The spine'
                f'<span class="rhrs">{len(spine)} papers, about {hours(spine)} hours</span></h3>'
                f'<ol class="reading">{"".join(entry(r, i + 1) for i, r in enumerate(spine))}</ol></div>')
    groups, stack_n, stack_h = "", 0, 0
    for a in avs:
        sp = [r for r in items if r.get("avenue") == a and r.get("tier") in ("start-here", "core")
              and id(r) not in in_spine]
        if not sp:
            continue
        stack_n += len(sp)
        stack_h += hours(sp)
        lst = f'<ol class="reading">{"".join(entry(r, i + 1) for i, r in enumerate(sp))}</ol>'
        cnt = f'{len(sp)} papers, about {hours(sp)} hours'
        if spine:
            groups += (f'<details class="ravenue"><summary><span class="rsn">{e(labels.get(a, a))}</span>'
                       f'<span class="rhrs">{cnt}</span></summary>{lst}</details>')
        else:
            groups += (f'<div class="ravenue"><h3>{e(labels.get(a, a))}'
                       f'<span class="rhrs">{cnt}</span></h3>{lst}</div>')
    rest = [r for r in items if r.get("tier") == "when-you-need-it"]
    tail = ""
    if rest:
        inner = ""
        for a in avs:
            g = [r for r in rest if r.get("avenue") == a]
            if g:
                inner += (f'<div class="ravenue"><h3>{e(labels.get(a, a))}'
                          f'<span class="rhrs">{len(g)}</span></h3>'
                          f'<ol class="reading opt">{"".join(entry(r) for r in g)}</ol></div>')
        tail = (f'<details class="ropt"><summary>{len(rest)} more, each with a stated trigger for '
                f'when to reach for it</summary>{inner}</details>')
    if spine:
        ref = (f', and the last {len(rest)} are reference, each with a trigger for when to reach '
               f'for it') if rest else ""
        lede = (f'<p class="lede">The spine is {len(spine)} papers, about {hours(spine)} hours, '
                f'in the order to read them. Each avenue\'s own stack follows, {stack_n} papers '
                f'in read order{ref}.</p>')
    else:
        lede = (f'<p class="lede">The spine is {stack_n} papers, about {stack_h} hours, split by '
                f'avenue. Read one avenue\'s stack in the order given and that part of the field '
                f'becomes legible. Everything below is reference material with a stated trigger.</p>')
    return sec("What to read, in order", lede + head + groups + tail)


# ---------------------------------------------------------------- projects
def projects(d):
    ps = d.get("projects") or []
    if not ps:
        return ""
    labels = d.get("avenue_labels") or {}
    notes = ""
    seen = set()
    for p in ps:
        a = p.get("avenue")
        if p.get("set_note") and a not in seen:
            seen.add(a)
            notes += (f'<p class="setnote"><b>{e(labels.get(a, a))}</b>'
                      f'{e(p["set_note"])}</p>')

    def card(p):
        strong = p.get("signal") == "strong"
        res = ""
        for r in (p.get("resources") or []):
            st = (f'<span class="star" title="{e(r.get("stars_note", ""))}">'
                  f'{r["stars"]:,}</span>') if isinstance(r.get("stars"), int) else ""
            # The note rides on hover. Printed inline it wrapped each chip over three lines,
            # cut the names it annotates to an ellipsis, and made a card 700px of links.
            nt = f' title="{e(r["note"])}"' if r.get("note") else ""
            res += (f'<a class="res k-{r.get("kind", "repo")}" href="{e(r["url"])}"{nt}>'
                    f'<span class="rk">{e(r.get("kind", "repo"))}</span>'
                    f'<span class="rnm">{e(r["name"])}</span>{st}</a>')
        res = f'<div class="resources">{res}</div>' if res else ""
        meta = ""
        for k, lbl in [("subproblem", "Sub-problem"), ("built_on", "Built on"),
                       ("compute", "Time and compute"), ("reproduce_on", "Runs on")]:
            v = p.get(k)
            if not v:
                continue
            v = ", ".join(v) if isinstance(v, list) else str(v)
            st = ""
            if k == "subproblem" and p.get("subproblem_state"):
                s = p["subproblem_state"]
                st = f' <span class="spill sp-{s}">{e(s)}</span>'
            meta += f"<dt>{lbl}</dt><dd>{e(v)}{st}</dd>"
        teach = (f'<p class="pteach"><span class="tl">Teaches</span>{e(p["teaches"])}</p>'
                 if p.get("teaches") else "")
        rft = ""
        if p.get("read_for_this"):
            li = ""
            for r in p["read_for_this"]:
                tag = "read first" if r.get("when") == "before" else "keep open"
                av = ('<span class="inav">also in the reading list</span>'
                      if r.get("in_avenue_list") else "")
                li += (f'<li><span class="rwhen w-{r.get("when", "before")}">{tag}</span>'
                       f'<a href="{e(r["url"])}">{e(r["title"])}</a>{av}'
                       f'<span class="rfw">{e(r.get("why", ""))}</span></li>')
            rft = f'<div class="rft"><span class="rfth">Read for this</span><ul>{li}</ul></div>'
        nxt = ""
        if p.get("next_steps"):
            li = "".join(f"<li>{e(s)}</li>" for s in p["next_steps"])
            nxt = (f'<details class="nxt"><summary>Next steps after this one '
                   f'<span class="cnt">{len(p["next_steps"])}</span></summary><ol>{li}</ol></details>')
        head = f'<p class="phead">{e(p["headline"])}</p>' if p.get("headline") else ""
        sig = (f'<p class="pwhy"><span class="sig sig-strong">worth making public</span>'
               f'{e(p.get("signal_why", ""))}</p>') if strong else ""
        # Cards are grouped by scale, so each names its avenue or the set notes above
        # cannot be matched to the cards they describe.
        av = labels.get(p.get("avenue"), p.get("avenue") or "")
        pav = f'<p class="pav">{e(av)}</p>' if av else ""
        return (f'<article class="proj{" strong" if strong else ""}">{pav}'
                f'<div class="ptop"><h3>{e(p["title"])}</h3>'
                f'<span class="gen">{e(ARCH.get(p.get("archetype", ""), p.get("archetype", "")))}</span></div>'
                f'<p class="plain">{e(p.get("plain", ""))}</p>{res}{head}'
                f'<dl>{meta}</dl>{teach}{rft}{nxt}'
                f'<p class="doclink">Build steps, done-when and what will break are in '
                f'<code>projects.md</code></p>{sig}</article>')

    shelf = ""
    for s in ("weekend", "two-weeks", "semester"):
        g = [p for p in ps if p.get("scale") == s]
        if g:
            shelf += (f'<div class="scale"><h3>{SCALE_LABEL[s]}</h3>'
                      f'<div class="projs">{"".join(card(p) for p in g)}</div></div>')
    lede = ('<p class="lede">Three per avenue, written as a curriculum. Each teaches something '
            'the other two do not, so do all three in order.</p>')
    return sec("What to build", lede + notes + shelf)


# ---------------------------------------------------------------- landscape
def landscape(d):
    orgs = d.get("orgs") or []
    invs = d.get("investors") or []
    tl = d.get("timeline") or []
    lin = d.get("lineage") or []
    out = ""
    if orgs:
        # Known tiers render first, in this order. Anything else renders after,
        # in first-seen order, rather than disappearing. A field whose organizations
        # do not fit three buckets is a fact about the field: AI safety needed
        # nonprofit and government tiers, and an earlier version of this script
        # dropped 18 of 33 organizations without saying so.
        KNOWN = [("frontier-lab", "Frontier labs"), ("academic", "Academic groups"),
                 ("startup", "Startups"), ("nonprofit", "Nonprofits and institutes"),
                 ("government", "Government bodies")]
        seen = [k for k, _ in KNOWN]
        extra = []
        for o in orgs:
            t = o.get("tier") or "other"
            if t not in seen and t not in extra:
                extra.append(t)
        TIERS = KNOWN + [(t, t.replace("-", " ").replace("_", " ").capitalize())
                         for t in extra]
        placed = set()
        body = ""
        for key, lbl in TIERS:
            g = [o for o in orgs if (o.get("tier") or "other") == key]
            if not g:
                continue
            placed.update(id(o) for o in g)
            cards = ""
            for o in g:
                pre = ('<span class="preprod">pre-product</span>'
                       if o.get("ships") is False else "")
                bits = []
                for k, l in [("stage", "Stage"), ("raised", "Raised"), ("entry", "Way in")]:
                    if o.get(k):
                        bits.append(f"<dt>{l}</dt><dd>{e(str(o[k]))}</dd>")
                if o.get("investors"):
                    bits.append(f'<dt>Backers</dt><dd>{e(", ".join(o["investors"]))}</dd>')
                cards += (f'<article class="org"><h4><a href="{e(o.get("url", "#"))}">'
                          f'{e(o["name"])}</a>{pre}</h4>'
                          f'<p class="orgwhat">{e(o.get("what", ""))}</p>'
                          f'<dl>{"".join(bits)}</dl></article>')
            body += f'<div class="tier-block"><h3>{lbl}</h3><div class="orgs">{cards}</div></div>'
        dropped = [o for o in orgs if id(o) not in placed]
        if dropped:
            sys.stderr.write(
                "WARNING: %d organizations were not rendered: %s\n"
                % (len(dropped), ", ".join(o.get("name", "?") for o in dropped)))
        ex = d.get("excluded") or []
        if ex:
            rows = ""
            for x in ex:
                cc = (f'<p class="xcc"><span class="xk">Counter-case</span>{e(x["countercase"])}</p>'
                      if x.get("countercase") else "")
                nm = (f'<a href="{e(x["evidence"])}">{e(x["name"])}</a>'
                      if x.get("evidence") else e(x["name"]))
                rows += (f'<li><span class="xn">{nm}</span>'
                         f'<span class="xw">{e(x.get("why", ""))}</span>{cc}</li>')
            body += (f'<div class="excluded"><h3>Considered and left out</h3>'
                     f'<p class="xlede">Named so you can tell a decision from an oversight.</p>'
                     f'<ul>{rows}</ul></div>')
        out += sec("Who is doing this", body)
    if invs:
        rank = {"leading": 0, "participating": 1, "tourist": 2, "absent": 3}
        rows = ""
        for i in sorted(invs, key=lambda x: rank.get(x.get("conviction"), 9)):
            c = i.get("conviction", "")
            p = (f'<a class="ipartner" href="{e(i["partner_url"])}">{e(i["partner"])}</a>'
                 if i.get("partner") and i.get("partner_url")
                 else (f'<span class="ipartner">{e(i["partner"])}</span>' if i.get("partner") else ""))
            note = (f'<p class="icontra">{e(i["contrarian_note"])}</p>'
                    if i.get("contrarian_note") else "")
            bets = (f'<p class="ibets">{e(", ".join(i["bets"]))}</p>' if i.get("bets") else "")
            rows += (f'<article class="inv c-{c}"><div class="itop"><h4>{e(i["name"])}</h4>'
                     f'<span class="conv c-{c}">{e(c)}</span></div>'
                     f'<p class="ithesis">{e(i.get("thesis", ""))}</p>{p}{bets}{note}</article>')
        lede = ('<p class="lede">Ordered by conviction, whatever the fund\'s size. Absence is a '
                'position: a large fund that sits this out while funding an adjacent category '
                'has taken a side.</p>')
        out += sec("What the investors believe", lede + f'<div class="invs">{rows}</div>')
    if lin:
        edges = ""
        for l in sorted(lin, key=lambda x: str(x.get("year", ""))):
            inf = '<span class="inferred">inferred</span>' if l.get("inferred") else ""
            edges += (f'<li><span class="ly">{e(str(l.get("year", "")))}</span>'
                      f'<span class="lf">{e(l["from"])}</span>'
                      f'<span class="lk">{e(l.get("kind", ""))}</span>'
                      f'<span class="lt">{e(l["to"])}</span>{inf}'
                      f'<span class="ld">{e(l.get("detail", ""))}</span></li>')
        out += sec("How they are connected", f'<ul class="lineage">{edges}</ul>')
    if tl:
        rows = ""
        for t in tl:
            k = t.get("kind", "")
            w = t.get("weight", "minor")
            infl = " inflection" if t.get("inflection") else ""
            why = (f'<span class="twhy">{e(t["why"])}</span>'
                   if t.get("inflection") and t.get("why") else "")
            rows += (f'<li class="tl-{k} w-{w}{infl}">'
                     f'<span class="td">{e(str(t["date"]))}</span>'
                     f'<span class="tk">{e(KIND_LABEL.get(k, k))}</span>'
                     f'<span class="tt">{e(t["what"])}</span>{why}</li>')
        maj = sum(1 for t in tl if t.get("weight") == "major")
        yrs = sorted(str(t["date"])[:4] for t in tl if t.get("date"))
        span = f"{yrs[0]} to {yrs[-1]}" if yrs else ""
        # Calendar years, named in the sentence, so the count can be checked against the
        # file's own prose without guessing where "the last three years" starts.
        first = int(yrs[-1]) - 2 if yrs else 0
        recent = sum(1 for y in yrs if int(y) >= first)
        lede = (f'<p class="lede">{len(tl)} events from {span}, {maj} of them major. '
                f'{recent} are dated {first} to {yrs[-1] if yrs else ""}, so the early rows are '
                f'sparse and the recent ones dense. Scan the small rows for clusters.</p>')
        out += sec("Timeline", lede + f'<ul class="timeline">{rows}</ul>')
    return out


# ---------------------------------------------------------------- confidence
def confidence(d):
    c = d.get("confidence") or {}
    if not c:
        return ""
    tiles = ""
    for k, lbl, good in [("ids_ok", "arXiv IDs resolve to the right paper", True),
                         ("resources_ok", "repos and checkpoints exist", True),
                         ("killed", "claims killed by the check pass", False),
                         ("unverified", "on the couldn't-verify list", False),
                         ("contested", "contested between sources", False)]:
        if k in c:
            tiles += (f'<div class="stat"><span class="v {"good" if good else "bad"}">'
                      f'{e(str(c[k]))}</span><span class="k">{lbl}</span></div>')
    # Counts the fixed keys have no slot for (tiers, fixed, downgraded) come as tiles whose
    # labels say exactly what was counted. Tone is good, bad, or omitted for plain ink.
    for t in c.get("tiles") or []:
        tone = {"good": " good", "bad": " bad"}.get(t.get("tone"), "")
        tiles += (f'<div class="stat"><span class="v{tone}">{e(str(t["value"]))}</span>'
                  f'<span class="k">{e(t["label"])}</span></div>')
    notes = "".join(f'<p class="confnote">{e(n)}</p>' for n in c.get("notes", []))
    return sec("How much of this to believe", f'<div class="conf">{tiles}</div>{notes}')


def main():
    run = pathlib.Path(sys.argv[1]).resolve()
    d = json.load(open(run / "report.json"))
    css = (SKILL / "assets" / "report.css").read_text()
    js = (SKILL / "assets" / "report.js").read_text()
    m = d.get("meta", {})
    bar = "".join(f'<span><b>{e(k)}</b> {e(str(v))}</span>' for k, v in (m.get("runbar") or {}).items())
    head = (f'<header><p class="eyebrow">{e(m.get("eyebrow", "Industry research"))}</p>'
            f'<h1>{e(m.get("title", "Untitled run"))}</h1>'
            f'<p class="verdict">{m.get("verdict", "")}</p>'
            f'<div class="runbar">{bar}</div></header>')
    page = (f'<meta charset="utf-8">\n'
            f'<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            f'<title>{e(m.get("title", "Industry research"))}</title>\n'
            f'<style>\n{css}\n</style>\n\n'
            f'<div class="viz-root"><div class="wrap">\n'
            f'{head}\n{first_principles(d, run)}\n{narrative(d, run)}\n{avenues(d)}\n{openness_map(d)}\n'
            f'{reading(d)}\n{projects(d)}\n{landscape(d)}\n{confidence(d)}\n'
            f'<div id="tip" role="tooltip"></div>\n</div></div>\n'
            f'<script>\n{js}\n{figure_scripts(d, run)}</script>\n')
    (run / "report.html").write_text(page)
    print(f"wrote {run / 'report.html'} ({len(page):,} bytes)")
    for tag in ("div", "section", "article", "p", "span", "ul", "ol", "li", "dl", "details", "a"):
        import re
        o = len(re.findall(rf"<{tag}[\s>]", page)); c = len(re.findall(rf"</{tag}>", page))
        if o != c:
            print(f"  WARNING unbalanced <{tag}>: {o} open, {c} close")
    if "—" in page:
        print(f"  WARNING {page.count(chr(8212))} em dashes in output")


if __name__ == "__main__":
    main()
