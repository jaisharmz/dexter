#!/usr/bin/env python3
"""Read a Workday careers board through its JSON API instead of the page.

Workday careers sites are client-rendered: fetching the URL a recruiter sends you
returns an empty shell. Every tenant exposes the same JSON endpoint underneath, and
it carries two fields the rendered page never shows -- `postedOn` and, on the detail
record, **`startDate`**, which is the field that actually decides eligibility.

    python3 workday_feed.py nvidia wd5 NVIDIAExternalCareerSite \
        --facet workerSubType=ab40a98049581037a3ada55b087049b7 \
        --facet locationHierarchy1=2fcb99c455831013ea52fb338f2932d8

    python3 workday_feed.py nvidia wd5 NVIDIAExternalCareerSite --search 2027 --detail

The tenant, pod and site come out of the URL a posting is shared as:

    https://<tenant>.<pod>.myworkdayjobs.com/<site>?workerSubType=<id>&...
    https://nvidia .wd5 .myworkdayjobs.com/NVIDIAExternalCareerSite?workerSubType=ab40...

Facet ids are opaque and stable -- copy them straight out of the URL query string.
"""
from __future__ import annotations
import argparse, html, json, re, sys, urllib.request

def _post(url: str, body: dict) -> dict:
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json",
                 "User-Agent": "Mozilla/5.0"})
    return json.load(urllib.request.urlopen(req, timeout=30))

def _get(url: str) -> dict:
    req = urllib.request.Request(
        url, headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"})
    return json.load(urllib.request.urlopen(req, timeout=30))

def strip_html(s: str) -> str:
    return re.sub(r"\n{2,}", "\n", re.sub(r"<[^>]+>", "\n", html.unescape(s or ""))).strip()

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("tenant"); ap.add_argument("pod"); ap.add_argument("site")
    ap.add_argument("--facet", action="append", default=[],
                    help="name=value, repeatable; copy ids from the careers URL")
    ap.add_argument("--search", default="")
    ap.add_argument("--limit", type=int, default=100)
    ap.add_argument("--detail", action="store_true",
                    help="also fetch each req's start date and qualifications")
    ap.add_argument("--grep", default="",
                    help="only show reqs whose title matches this regex")
    a = ap.parse_args()

    base = f"https://{a.tenant}.{a.pod}.myworkdayjobs.com/wday/cxs/{a.tenant}/{a.site}"
    facets: dict[str, list[str]] = {}
    for f in a.facet:
        k, _, v = f.partition("=")
        facets.setdefault(k, []).append(v)

    postings, offset, total = [], 0, None
    while total is None or (offset < total and len(postings) < a.limit):
        page = _post(f"{base}/jobs", {"appliedFacets": facets, "limit": 20,
                                      "offset": offset, "searchText": a.search})
        # Only the first page carries a meaningful total; later pages return 0.
        if total is None:
            total = page.get("total", 0)
        batch = page.get("jobPostings", [])
        if not batch:
            break
        postings += batch
        offset += len(batch)

    fetched = len(postings)
    if a.grep:
        rx = re.compile(a.grep, re.I)
        postings = [p for p in postings if rx.search(p.get("title", ""))]

    note = f"{total} on this filter, {fetched} fetched"
    if a.grep:
        note += f", {len(postings)} matching /{a.grep}/"
    print(note + "\n")
    for p in postings:
        line = f"{p.get('postedOn','?'):20} | {p.get('locationsText','?')[:32]:32} | {p.get('title')}"
        if not a.detail:
            print(line); continue
        try:
            info = _get(base + p["externalPath"])["jobPostingInfo"]
        except Exception as e:
            print(line + f"   [detail failed: {e}]"); continue
        # startDate is the real eligibility field. The title year lies; this does not.
        print(f"{line}\n    start={info.get('startDate','?')}  req={info.get('jobReqId','?')}")
        txt = strip_html(info.get("jobDescription", ""))
        low = txt.lower()
        i = max(low.find("what we need to see"), low.find("minimum qual"),
                low.find("basic qual"), 0)
        for ln in txt[i:i + 700].splitlines()[:6]:
            if ln.strip():
                print("      " + ln.strip()[:160])
    return 0

if __name__ == "__main__":
    sys.exit(main())
