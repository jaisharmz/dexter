"""Fetch a fund's student directory and keep a private copy of it.

A fund's university-recruiting page lists portfolio companies that asked to meet students:
each one's new-grad and intern plans, class years, visa support, interview process and a
named hiring contact. The contacts are shared on the condition that they are not passed
around, so the copy lives in home/ (a separate private repository) and never in a commit
here. What the directory is for and how to use it: references/vc-directories.md.

Usage:
    python3 skills/role-outreach/scripts/vc_directory.py greylock           fetch, save, print what changed
    python3 skills/role-outreach/scripts/vc_directory.py greylock --show    print the saved copy
"""
import argparse
import datetime
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[3]
STORE = ROOT / "home" / "reference" / "vc-directories"

SOURCES = {
    "greylock": {
        "url": "https://greylock.com/jobs/mit-career-week-2026/",
        "file": "greylock-university-career-week-2026.json",
        "title": "Greylock, University Career Week 2026: Company Directory",
    },
}

WATCHED = ("contactEmail", "hiringPlans", "classYears", "hiring2026", "hiring2027", "visa", "stage")


def fetch(url):
    # Greylock's site is Next.js: asked with "RSC: 1" it returns the server-components
    # payload, and the companies sit in it as one JSON array of records keyed by slug
    request = urllib.request.Request(url, headers={"RSC": "1", "User-Agent": "Mozilla/5.0"})
    text = urllib.request.urlopen(request, timeout=30).read().decode("utf-8", "replace")
    start = text.find('[{"slug":')
    if start < 0:
        sys.exit("no company array in the page; the site has changed, so read it in a browser")
    companies, _ = json.JSONDecoder().raw_decode(text[start:])
    return companies


def contacts(record):
    # the field is free text: "a@example.com OR b@example.com", "a@example.com and b@example.com", "a, b"
    return re.findall(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", record.get("contactEmail", ""))


def changes(old, new):
    before = {company["slug"]: company for company in old}
    after = {company["slug"]: company for company in new}
    lines = [f"added: {after[slug]['name']}" for slug in after if slug not in before]
    lines += [f"removed: {before[slug]['name']}" for slug in before if slug not in after]
    for slug in after.keys() & before.keys():
        for field in WATCHED:
            if before[slug].get(field) != after[slug].get(field):
                lines.append(f"{after[slug]['name']}: {field} {before[slug].get(field)!r} -> {after[slug].get(field)!r}")
    return lines


def show(saved):
    print(f"{saved['title']} (fetched {saved['fetched_at']}, {len(saved['companies'])} companies)")
    for company in saved["companies"]:
        new_grads = "new grads" if "new grad" in company.get("hiringPlans", "").lower() else "interns only"
        print(f"- {company['name']} | {company['stage']} | {company['locations']} | {new_grads} | "
              f"2027: {company.get('hiring2027') or '?'} | {', '.join(contacts(company)) or 'no contact'}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", choices=sorted(SOURCES))
    parser.add_argument("--show", action="store_true", help="print the saved copy without fetching")
    arguments = parser.parse_args()

    source = SOURCES[arguments.source]
    path = STORE / source["file"]
    saved = json.loads(path.read_text()) if path.exists() else {}
    if arguments.show:
        if not saved:
            sys.exit(f"nothing saved at {path}; run without --show first")
        show(saved)
        return

    companies = fetch(source["url"])
    lines = changes(saved.get("companies", []), companies)
    # keep the hand-written context (who shared it, on what terms, their picks) across refreshes
    saved.update({
        "title": source["title"],
        "url": source["url"],
        "fetched_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "companies": companies,
    })
    STORE.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(saved, indent=1, ensure_ascii=False) + "\n")
    print(f"saved {len(companies)} companies to {path}")
    print("\n".join(lines) if lines else "no changes since the last copy")


if __name__ == "__main__":
    main()
