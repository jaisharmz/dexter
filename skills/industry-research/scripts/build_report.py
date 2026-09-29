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
import html, json, pathlib, sys, collections

SKILL = pathlib.Path(__file__).resolve().parent.parent
e = html.escape

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
        elif note:
            parts.append(f'<div class="tw-sec"><span class="tw-note">{e(note)}</span></div>')
        return "".join(parts)

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
    return sec("Where the open research is", legend + bands + table)


# ---------------------------------------------------------------- reading
def reading(d):
    items = d.get("reading") or []
    if not items:
        return ""
    UNIT = {"an afternoon": 3, "an evening": 3, "two sittings": 6, "a sitting": 3, "a weekend": 8}
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
        if r.get("citations_note") == "too new to cite":
            bits.append('<span class="pcit new">too new to cite</span>')
        elif isinstance(r.get("citations"), int):
            bits.append(f'<span class="pcit"><b>{r["citations"]:,}</b> citations</span>')
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

    groups, spine_n, hrs_all = "", 0, 0
    for a in sorted({r.get("avenue", "") for r in items}):
        sp = [r for r in items if r.get("avenue") == a and r.get("tier") in ("start-here", "core")]
        if not sp:
            continue
        spine_n += len(sp)
        hrs = sum(UNIT.get((r.get("time") or "").strip().lower(), 3) for r in sp)
        hrs_all += hrs
        groups += (f'<div class="ravenue"><h3>{e(labels.get(a, a))}'
                   f'<span class="rhrs">{len(sp)} papers, about {hrs} hours</span></h3>'
                   f'<ol class="reading">{"".join(entry(r, i + 1) for i, r in enumerate(sp))}</ol></div>')
    rest = [r for r in items if r.get("tier") == "when-you-need-it"]
    tail = (f'<details><summary>{len(rest)} more, each with a stated trigger for when to reach '
            f'for it</summary><ol class="reading opt">{"".join(entry(r) for r in rest)}</ol></details>'
            ) if rest else ""
    lede = (f'<p class="lede">The spine is {spine_n} papers, about {hrs_all} hours, split by avenue. '
            f'Read one avenue\'s stack in the order given and that half of the field becomes legible. '
            f'Everything below is reference material with a stated trigger.</p>')
    return sec("What to read, in order", lede + groups + tail)


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
            nt = f'<span class="rnote">{e(r["note"])}</span>' if r.get("note") else ""
            res += (f'<a class="res k-{r.get("kind", "repo")}" href="{e(r["url"])}">'
                    f'<span class="rk">{e(r.get("kind", "repo"))}</span>'
                    f'<span class="rnm">{e(r["name"])}</span>{st}{nt}</a>')
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
        return (f'<article class="proj{" strong" if strong else ""}">'
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
    lede = ('<p class="lede">Three per avenue, and they are a curriculum rather than a menu. '
            'Each teaches something the other two do not, so the point is to do all of them '
            'rather than pick the best one.</p>')
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
        lede = ('<p class="lede">Ordered by conviction rather than by fund size. Absence is a '
                'position: a large fund sitting this out while funding an adjacent category is '
                'a finding, not a gap.</p>')
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
        recent = sum(1 for y in yrs if int(y) >= int(yrs[-1]) - 2)
        lede = (f'<p class="lede">{len(tl)} events across {span}, {maj} of them major. '
                f'{recent} fall in the last three years, so the early rows are sparse and the '
                f'recent ones dense. That contrast is the point: the small rows are there to be '
                f'scanned for clustering rather than read one at a time.</p>')
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
            f'<title>{e(m.get("title", "Industry research"))}</title>\n'
            f'<style>\n{css}\n</style>\n\n'
            f'<div class="viz-root"><div class="wrap">\n'
            f'{head}\n{narrative(d, run)}\n{openness_map(d)}\n{reading(d)}\n{projects(d)}\n'
            f'{landscape(d)}\n{confidence(d)}\n'
            f'<div id="tip" role="tooltip"></div>\n</div></div>\n'
            f'<script>\n{js}\n</script>\n')
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
