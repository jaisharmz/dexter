"""Watch the companies that post new-grad roles on a rolling basis, and print what is new.

Some employers open new-grad reqs team by team all year instead of in one autumn wave. NVIDIA is
the model: each team posts its own "New College Grad" req when it gets headcount, so a single
check misses most of what it posts. This reads each company's own feed, keeps the reqs that fit
(new grad, one of the operator's areas, in the US, no years floor, not last cycle's class) and remembers
what it has seen, so each run prints only what appeared since the last one.

The list and how each company is read: config/rolling-watch.json.
Why these companies, and what to do with a hit: references/rolling-watch.md.

Usage:
    python3 skills/role-sourcing/scripts/rolling_watch.py                 new matches since the last run
    python3 skills/role-sourcing/scripts/rolling_watch.py --all           every current match, seen or not
    python3 skills/role-sourcing/scripts/rolling_watch.py --only nvidia   one company (slug), repeatable
    python3 skills/role-sourcing/scripts/rolling_watch.py --dry-run       record nothing as seen
    python3 skills/role-sourcing/scripts/rolling_watch.py --check         fetch every feed once and report counts
"""
import argparse
import datetime
import html
import json
import pathlib
import re
import sys
import urllib.request

SKILL = pathlib.Path(__file__).resolve().parents[1]
CONFIG = SKILL / "config" / "rolling-watch.json"
STATE = SKILL / "state" / "watch" / "rolling"
SIMPLIFY = "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json"
HEADERS = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}


def get(url):
    request = urllib.request.Request(url, headers=HEADERS)
    return json.load(urllib.request.urlopen(request, timeout=40))


def post(url, body):
    request = urllib.request.Request(url, data=json.dumps(body).encode(), headers={**HEADERS, "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(request, timeout=40))


def text(markup):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html.unescape(html.unescape(markup or "")))).strip()


# Each reader returns postings as {id, title, url, location, posted, team, body}. body may be empty
# when the list endpoint carries no description; details() fills it for the reqs that matter.

def workday(company):
    base = f"https://{company['tenant']}.{company['pod']}.myworkdayjobs.com/wday/cxs/{company['tenant']}/{company['site']}"
    postings, offset, total = [], 0, None
    while total is None or (offset < total and offset < company.get("max", 400)):
        page = post(f"{base}/jobs", {"appliedFacets": company.get("facets", {}), "limit": 20, "offset": offset, "searchText": company.get("search", "")})
        total = page.get("total", 0) if total is None else total
        for job in page.get("jobPostings", []):
            if "title" not in job:  # a withdrawn req can be listed with no title (Snap, 2026-10-01)
                continue
            postings.append({
                "id": (job.get("bulletFields") or [job["externalPath"]])[0],
                "title": job["title"],
                "url": f"https://{company['tenant']}.{company['pod']}.myworkdayjobs.com/{company['site']}{job['externalPath']}",
                "location": job.get("locationsText", ""),
                "posted": job.get("postedOn", ""),
                "team": "",
                "body": "",
                "detail": f"{base}{job['externalPath']}",
            })
        offset += 20
        if not page.get("jobPostings"):
            break
    return postings


def greenhouse(company):
    jobs = get(f"https://boards-api.greenhouse.io/v1/boards/{company['board']}/jobs?content=true")["jobs"]
    return [{
        "id": str(job["id"]),
        "title": job["title"],
        "url": job["absolute_url"],
        "location": (job.get("location") or {}).get("name", ""),
        "posted": job.get("first_published") or job.get("updated_at", ""),
        "team": ", ".join(department["name"] for department in job.get("departments", [])),
        "body": text(job.get("content", "")),
    } for job in jobs]


def lever(company):
    jobs = get(f"https://api.lever.co/v0/postings/{company['account']}?mode=json")
    return [{
        "id": job["id"],
        "title": job["text"],
        "url": job["hostedUrl"],
        "location": (job.get("categories") or {}).get("location", ""),
        "posted": datetime.datetime.fromtimestamp(job.get("createdAt", 0) / 1000).date().isoformat(),
        "team": (job.get("categories") or {}).get("team", ""),
        "body": job.get("descriptionPlain", "") + " " + " ".join(text(item.get("content", "")) for item in job.get("lists", [])),
    } for job in jobs]


def ashby(company):
    jobs = get(f"https://api.ashbyhq.com/posting-api/job-board/{company['org']}")["jobs"]
    return [{
        "id": job["id"],
        "title": job["title"],
        "url": job["jobUrl"],
        "location": job.get("location", ""),
        "posted": (job.get("publishedAt") or "")[:10],
        "team": job.get("department") or job.get("team") or "",
        "body": job.get("descriptionPlain", ""),
    } for job in jobs if job.get("isListed", True)]


LISTINGS = []


def simplify(company):
    # companies with their own career sites (Google, Meta, Apple, Microsoft, Amazon) are read through
    # the Simplify new-grad list, which tracks them; it is the README's source and has every listing
    if not LISTINGS:
        LISTINGS.extend(get(SIMPLIFY))
    pattern = re.compile(company["match"], re.I)
    return [{
        "id": str(listing["id"]),
        "title": listing["title"],
        "url": listing["url"],
        "location": ", ".join(listing.get("locations", [])),
        "posted": datetime.datetime.fromtimestamp(listing.get("date_posted", 0)).date().isoformat(),
        "team": "",
        "body": "",
    } for listing in LISTINGS if listing.get("active") and listing.get("is_visible", True) and pattern.search(listing.get("company_name", ""))]


READERS = {"workday": workday, "greenhouse": greenhouse, "lever": lever, "ashby": ashby, "simplify": simplify}

FLOOR = re.compile(r"(\d{1,2})\s*\+\s*(?:years|yrs)", re.I)


def details(posting):
    # only Workday leaves the description out of its list endpoint. Its startDate is the day the
    # posting went live, not the job's start (Adobe, GM, Salesforce, 2026-10-01), so it is not read
    if posting.get("detail") and not posting["body"]:
        info = get(posting["detail"]).get("jobPostingInfo", {})
        posting["body"] = text(info.get("jobDescription", ""))
    return posting


def verdict(company, posting, rules):
    title = posting["title"]
    if re.search(company.get("exclude", rules["exclude"]), title, re.I):
        return "excluded title"
    # the Simplify list is a new-grad list already, so its titles need not say so
    if not company.get("prefiltered", company["source"] == "simplify") and not re.search(company.get("newgrad", rules["newgrad"]), title, re.I):
        return "not a new-grad req"
    if not re.search(company.get("areas", rules["areas"]), title, re.I):
        return "outside the operator's areas"
    if re.search(rules["location_exclude"], posting["location"]) and not re.search(r"United States|\bUSA?\b|Remote", posting["location"]):
        return "outside the US"
    details(posting)
    floors = [int(number) for number in FLOOR.findall(posting["body"]) if int(number) < 20]
    posting["years_floor"] = max(floors) if floors else 0
    if posting["years_floor"] >= rules["years_floor"]:
        return f"asks for {posting['years_floor']}+ years"
    # a req left up from last cycle still says which class it wants
    year = rules.get("class_year")
    if year and re.search(rf"graduat[^.]{{0,60}}\b{year - 1}\b", posting["body"], re.I) and not re.search(rf"\b{year}\b", posting["body"]):
        return f"last cycle's req (graduating {year - 1})"
    return ""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true", help="print every current match, not only new ones")
    parser.add_argument("--only", action="append", default=[], help="company slug, repeatable")
    parser.add_argument("--dry-run", action="store_true", help="record nothing as seen")
    parser.add_argument("--check", action="store_true", help="fetch each feed and report how many postings it returned")
    arguments = parser.parse_args()

    if not CONFIG.exists():
        sys.exit("no config/rolling-watch.json: copy config/rolling-watch.example.json to it, set class_year, and list the companies to watch")
    config = json.loads(CONFIG.read_text())
    rules = config["defaults"]
    companies = [company for company in config["companies"] if not arguments.only or company["slug"] in arguments.only]
    STATE.mkdir(parents=True, exist_ok=True)
    seen_path = STATE / "seen.json"
    seen = json.loads(seen_path.read_text()) if seen_path.exists() else {}
    today = datetime.date.today().isoformat()
    hits, problems = [], []

    for company in companies:
        try:
            postings = READERS[company["source"]](company)
        except Exception as error:  # one broken feed must not stop the rest
            problems.append(f"{company['name']}: {company['source']} feed failed ({error})")
            continue
        if arguments.check:
            print(f"{company['name']:32} {company['source']:10} {len(postings)} postings")
            continue
        for posting in postings:
            key = f"{company['slug']}:{posting['id']}"
            if key in seen and not arguments.all:
                continue
            try:
                reason = verdict(company, posting, rules)
            except Exception as error:
                problems.append(f"{company['name']}: could not read {posting['url']} ({error})")
                continue
            first_seen = seen.get(key, today)
            # a req that failed only on its title is re-read cheaply next time; one that needed its
            # description (years floor, start date) is remembered, so it is fetched once
            if "years_floor" in posting:
                seen.setdefault(key, today)
            if reason:
                continue
            hits.append({"company": company["name"], "slug": company["slug"], "track": company.get("track", "newgrad"),
                         "title": posting["title"], "url": posting["url"], "location": posting["location"],
                         "posted": posting["posted"],
                         "years_floor": posting.get("years_floor", 0), "first_seen": first_seen, "source": company["source"]})

    if arguments.check:
        print("\n".join(problems))
        return
    for hit in hits:
        print(json.dumps(hit, ensure_ascii=False))
    print(f"# {len(hits)} {'matches' if arguments.all else 'new matches'} across {len(companies)} companies", file=sys.stderr)
    for problem in problems:
        print(f"# {problem}", file=sys.stderr)
    if not arguments.dry_run:
        seen_path.write_text(json.dumps(seen, indent=0, sort_keys=True) + "\n")
        if hits and not arguments.all:
            with open(STATE / f"new-{today}.jsonl", "a") as log:
                log.writelines(json.dumps(hit, ensure_ascii=False) + "\n" for hit in hits)


if __name__ == "__main__":
    main()
