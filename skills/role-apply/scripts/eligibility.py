"""Read a posting and say whether a new-grad bachelor's may apply to it. Run it immediately before Submit, beside gate.py.

gate.py answers for the company; this answers for the posting. It flags what the skill's eligibility rules exclude
or leave to the operator:

    floor      a years floor under the requirements, "3+ years" or a range such as "1-7 years"
    level      an Ashby pay tier titled Senior, Staff, Principal or Lead (the description may never say so)
    degree     a PhD or master's stated as required
    area       an on-site or hybrid seat with no Bay Area, New York or remote option (the out-of-area rule)
    limit      Ashby's application-limit notice

Usage:
    python3 skills/role-apply/scripts/eligibility.py <posting url> [<posting url> ...]
Reads Ashby, Greenhouse (US and EU), Lever and Workable postings. Exit status is 0 when nothing is flagged, 1 otherwise.
A flag is a reason to stop and read the line it quotes, not a verdict: a floor under "Nice to have" or one that counts
internships may still be fine.
"""
import html
import json
import re
import sys
import urllib.error
import urllib.request

# "3+ years" and "1-7 years", and the spelled-out floors NVIDIA writes: "at least 8 years", "with 10 years of relevant work"
FLOOR = re.compile(r"\b(\d{1,2})\s*(?:\+|(?:-|–|to)\s*\d{1,2}\+?)\s*(?:years?|yrs)\b"
                   r"|\b(?:at least|a minimum of|minimum of)\s+(\d{1,2})\s+(?:years?|yrs)\b"
                   r"|\b(\d{1,2})\s+(?:years?|yrs)\s+of\s+(?:(?:relevant|professional|industry|hands-on|related|full-time)\s+)*"
                   r"(?:experience|work)\b", re.I)
PREFERRED = re.compile(r"nice to have|preferred|desired|bonus|plus\b|ideally", re.I)
# a floor that admits new grads in the same breath is not a floor for the operator
NEW_GRAD_OK = re.compile(r"new grads?\b|new graduates?|including internships|equivalent combination of education", re.I)
LEVEL = re.compile(r"senior|staff|principal|lead", re.I)
DEGREE = re.compile(r"[^.]{0,80}\b(?:PhD|Ph\.D\.?|doctorate|Master'?s|M\.S\.)\b[^.]{0,80}\b(?:required|must)\b[^.]{0,40}", re.I)
AREA = re.compile(r"san francisco|\bsf\b|bay area|palo alto|mountain view|menlo park|redwood city|san mateo|sunnyvale|santa clara|"
                  r"san jose|berkeley|oakland|emeryville|foster city|burlingame|fremont|los altos|cupertino|new york|\bnyc\b|"
                  r"brooklyn|manhattan|remote", re.I)
ASHBY_QUERY = ("query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) { jobPosting("
               "organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) { title "
               "locationName secondaryLocationNames workplaceType descriptionHtml applicationLimitCalloutHtml "
               "compensationTiers { title } } }")


def fetch(url, data=None, headers=None):
    request = urllib.request.Request(url, data=data, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json", **(headers or {})})
    return json.loads(urllib.request.urlopen(request, timeout=30).read())


def plain(markup):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " | ", html.unescape(markup or ""))))


def posting(url):
    """Return title, places, workplace, description text, pay-tier titles and whether an application limit shows."""
    match = re.search(r"jobs\.ashbyhq\.com/([^/]+)/([0-9a-f-]{36})", url)
    if match:
        organization, posting_id = match.groups()
        body = json.dumps({"operationName": "ApiJobPosting", "query": ASHBY_QUERY,
                           "variables": {"organizationHostedJobsPageName": organization, "jobPostingId": posting_id}}).encode()
        found = fetch("https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting", body,
                      {"Content-Type": "application/json", "Origin": "https://jobs.ashbyhq.com", "Referer": url})["data"]["jobPosting"]
        if not found:
            return None
        return {"title": found["title"], "places": [found["locationName"]] + (found.get("secondaryLocationNames") or []),
                "workplace": found.get("workplaceType") or "", "text": plain(found["descriptionHtml"]),
                "tiers": [tier["title"] for tier in found.get("compensationTiers") or [] if tier.get("title")],
                "limit": bool(found.get("applicationLimitCalloutHtml"))}
    match = re.search(r"greenhouse\.io/([^/]+)/jobs/(\d+)", url)
    if match:
        host = "boards-api.eu.greenhouse.io" if ".eu." in url else "boards-api.greenhouse.io"
        found = fetch(f"https://{host}/v1/boards/{match.group(1)}/jobs/{match.group(2)}")
        return {"title": found["title"], "places": [found["location"]["name"]], "workplace": "", "text": plain(found.get("content")),
                "tiers": [], "limit": False}
    match = re.search(r"jobs\.lever\.co/([^/]+)/([0-9a-f-]{36})", url)
    if match:
        found = fetch(f"https://api.lever.co/v0/postings/{match.group(1)}/{match.group(2)}")
        categories = found.get("categories") or {}
        lists = " ".join(f"{item.get('text', '')} | {item.get('content', '')}" for item in found.get("lists", []))
        return {"title": found["text"], "places": [categories.get("location", "")] + (categories.get("allLocations") or []),
                "workplace": found.get("workplaceType", ""), "text": plain(found.get("description", "") + " | " + lists),
                "tiers": [], "limit": False}
    match = re.search(r"apply\.workable\.com/([^/]+)/j/([A-Z0-9]+)", url)
    if match:
        found = fetch(f"https://apply.workable.com/api/v2/accounts/{match.group(1)}/jobs/{match.group(2)}")
        places = [", ".join(filter(None, (place.get("city"), place.get("region"), place.get("country")))) for place in found.get("locations", [])]
        return {"title": found["title"], "places": places, "workplace": found.get("workplace", ""),
                "text": plain((found.get("description") or "") + " | " + (found.get("requirements") or "")), "tiers": [], "limit": False}
    raise SystemExit(f"not a posting this script reads: {url}")


def heading_before(segments, index):
    # the nearest short line above a bullet that reads as a section heading ("Requirements", "Nice to have:")
    for segment in reversed(segments[:index]):
        segment = segment.strip()
        if segment and len(segment) <= 60 and not segment.endswith("."):
            return segment
    return ""


def flags(found):
    found_flags = []
    segments = [segment.strip(" |") for segment in found["text"].split(" | ") if segment.strip(" |")]
    for index, segment in enumerate(segments):
        if not FLOOR.search(segment):
            continue
        if PREFERRED.search(segment) or PREFERRED.search(heading_before(segments, index)) or NEW_GRAD_OK.search(segment):
            continue
        found_flags.append(("floor", f"{heading_before(segments, index)}: {segment.strip()}"))
    found_flags += [("level", f"pay tier '{title}'") for title in found["tiers"] if LEVEL.search(title)]
    found_flags += [("degree", line.replace(" | ", " ").strip()) for line in DEGREE.findall(found["text"])]
    remote = re.search(r"remote", found["workplace"], re.I)
    if not remote and not any(AREA.search(place or "") for place in found["places"]):
        found_flags.append(("area", f"{'; '.join(found['places'])} ({found['workplace'] or 'workplace not stated'})"))
    if found["limit"]:
        found_flags.append(("limit", "Ashby shows an application-limit notice"))
    return found_flags


def main():
    urls = [argument for argument in sys.argv[1:] if argument.startswith("http")]
    if not urls:
        sys.exit(__doc__)
    flagged = False
    for url in urls:
        try:
            found = posting(url)
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
            found = None
        if found is None:
            print(f"closed: {url}")
            flagged = True
            continue
        found_flags = flags(found)
        flagged |= bool(found_flags)
        print(f"{'flagged' if found_flags else 'clear'}: {found['title']} ({'; '.join(found['places'])[:80]})")
        for kind, detail in found_flags:
            print(f"    {kind:6} {detail[:160]}")
    sys.exit(1 if flagged else 0)


if __name__ == "__main__":
    main()
