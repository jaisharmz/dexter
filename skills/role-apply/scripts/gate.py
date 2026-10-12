"""Decide whether the operator may apply to a company today. Run it immediately before every Submit.

The rule: a company is blocked while a recruiter, interview, assessment or offer mail from it is
less than six months old, or while a hold the operator set by hand (a warm path they are working
themselves) stands. A pending application (one in the last six months that has not ended in a
rejection) blocks only at a company that publishes a cap or cooldown, listed in
references/caps.json. A cap that names the day it lifts ("until 2026-12-29") blocks until then even
after a rejection, since a cooldown like ElevenLabs' counts every application whatever its outcome.
Anywhere else a second role is allowed, and the verdict is
"applied-before": look the company's policy up (careers FAQ, posting text, Ashby's
application-limit notice), add it to caps.json if one exists, and apply if none does.

It reads the two records every application conversation keeps current:
    state/applications.jsonl   every application, with its status
    state/responses.jsonl      every reply from a company, newest first
    state/holds.json           {"<normalized company>": "<why>"}; optional
    state/aliases.json         {"<normalized name>": ["<other normalized names>"]}; optional
    state/run-*/skips.json     each run's skipped and held companies with the reason; optional
    state/held-*.json          the Oct 1 run's held_or_skipped list, in the same role; optional

A company an earlier run skipped or held (a failed LinkedIn bar, a salary or essay hold, a form
left for the operator's captcha) reads "skipped-before" with that reason, unless it is blocked.
It is not a block: read the reason, and leave a company-level skip standing unless the operator
lifts it.

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
CAPS = pathlib.Path(__file__).resolve().parents[1] / "references" / "caps.json"
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
    # Workable board slugs spell a dot as "-dot-": "pony-dot-ai" is Pony.ai
    return re.sub(r"[^a-z0-9]", "", re.sub(r"\(.*?\)", "", (name or "").lower().replace("-dot-", ".")))


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


def skipped(company):
    company_keys = keys(company)
    found = []
    for path in sorted(STATE.glob("run-*/skips.json"), reverse=True):
        for name, why in json.loads(path.read_text()).items():
            if same(company_keys, name):
                found.append((path.parent.name[len("run-"):], "skipped", str(why)))
    for path in sorted(STATE.glob("held-*.json"), reverse=True):
        for entry in json.loads(path.read_text()).get("held_or_skipped", []):
            if same(company_keys, entry.get("key")):
                found.append((path.stem[len("held-"):], "skipped", str(entry.get("reason"))))
    return found


def verdict(company):
    result, recent = standing(company)
    earlier = skipped(company) if result != "blocked" else []
    return ("skipped-before", earlier + recent) if earlier else (result, recent)


def standing(company):
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
    capped = json.loads(CAPS.read_text()) if CAPS.exists() else {}
    policy = next((capped[key] for key in keys(company) if key in capped), None)
    # a cooldown that counts every application, rejected or not, names the day it lifts ("until 2026-12-29")
    lifts = re.search(r"until (\d{4}-\d{2}-\d{2})", policy or "")
    if applied and lifts and lifts.group(1) > datetime.date.today().isoformat():
        return "blocked", [("", "cap", policy)] + recent
    if applied and rejected and max(rejected) >= max(applied):
        return "clear-after-rejection", recent
    if applied:
        if policy:
            return "blocked", [("", "cap", policy)] + recent
        return "applied-before", recent
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
