"""Decide whether the operator may apply to a company today. Run it immediately before every Submit.

The rule: a company is blocked while the operator has a live process there, meaning any
application in the last six months that did not end in a rejection, or any recruiter,
interview, assessment or offer mail. One role per company. A hold the operator set by hand
(a warm path they are working themselves) blocks too.

It reads the two records every application conversation keeps current:
    state/applications.jsonl   every application, with its status
    state/responses.jsonl      every reply from a company, newest first
    state/holds.json           {"<normalized company>": "<why>"}; optional
    state/aliases.json         {"<normalized name>": ["<other normalized names>"]}; optional

It does not read the operator's inboxes or confirmation screenshots. responses.jsonl is only as
fresh as the last inbox sweep, so a run that will submit should sweep the inbox first. Names
match by prefix, which errs toward blocking: every hit prints the logged company it matched, so
confirm a block on the full name before acting on it.

Usage:
    python3 skills/role-apply/scripts/gate.py "Company Name"          verdict and the records behind it
    python3 skills/role-apply/scripts/gate.py "A" "B" --quiet         one verdict line per company
Exit status is 0 when every company is clear, 1 otherwise.
"""
import datetime
import json
import pathlib
import re
import sys

STATE = pathlib.Path(__file__).resolve().parents[1] / "state"
LIVE_REPLIES = {"interview_invite", "assessment", "recruiter_outreach", "offer"}
SUBMITTED = {"submitted", "security-code-sent"}

# brand and parent names that differ between a careers page and the logs; state/aliases.json adds more
ALIASES = {
    "cursor": ["anysphere", "cursor"], "xai": ["xai", "spacexai"],
    "googledeepmind": ["deepmind", "googledeepmind"], "deepmind": ["deepmind", "googledeepmind"],
    "amazon": ["amazon", "aws", "amazonwebservices", "annapurna"], "aws": ["amazon", "aws"],
    "meta": ["meta", "facebook", "metaplatforms"], "google": ["google"], "alphabet": ["google"],
}


def normalize(name):
    return re.sub(r"[^a-z0-9]", "", re.sub(r"\(.*?\)", "", (name or "").lower()))


def keys(company):
    base = normalize(company)
    path = STATE / "aliases.json"
    extra = json.loads(path.read_text()) if path.exists() else {}
    return set(ALIASES.get(base, [])) | set(extra.get(base, [])) | {base}


def same(company_keys, name):
    other = normalize(name)
    if not other:
        return False
    return any(key == other or (len(key) > 3 and (other.startswith(key) or key.startswith(other))) for key in company_keys)


def lines(name):
    path = STATE / name
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()] if path.exists() else []


def records(company):
    company_keys = keys(company)
    found = []
    for application in lines("applications.jsonl"):
        if same(company_keys, application.get("company")) and application.get("status") in SUBMITTED:
            found.append((application.get("submitted_date") or application.get("date") or "", "applied", f"{application.get('company')}: {application.get('role') or ''}"))
    for reply in lines("responses.jsonl"):
        if same(company_keys, reply.get("company")):
            found.append((reply.get("date") or "", reply.get("type") or "", f"{reply.get('company')}: {reply.get('role') or reply.get('subject') or ''}"))
    return sorted(found, reverse=True)


def verdict(company):
    holds_path = STATE / "holds.json"
    holds = json.loads(holds_path.read_text()) if holds_path.exists() else {}
    for key in keys(company):
        if key in holds:
            return "blocked", [("", "hold", holds[key])]
    cutoff = (datetime.date.today() - datetime.timedelta(days=183)).isoformat()
    recent = [record for record in records(company) if record[0] >= cutoff]
    if not recent:
        return "clear", []
    if any(kind in LIVE_REPLIES for _, kind, _ in recent):
        return "blocked", recent
    applied = [date for date, kind, _ in recent if kind == "applied"]
    rejected = [date for date, kind, _ in recent if kind == "rejection"]
    if applied and rejected and max(rejected) >= max(applied):
        return "clear-after-rejection", recent
    if applied:
        return "blocked", recent
    return "clear", recent


def main():
    names = [argument for argument in sys.argv[1:] if not argument.startswith("--")]
    if not names:
        sys.exit(__doc__)
    quiet = "--quiet" in sys.argv
    blocked = False
    for name in names:
        result, recent = verdict(name)
        blocked |= result == "blocked"
        print(f"{result}: {name}")
        if not quiet:
            for date, kind, detail in recent[:6]:
                print(f"    {date or '-':10} {kind:18} {detail[:80]}")
    sys.exit(1 if blocked else 0)


if __name__ == "__main__":
    main()
