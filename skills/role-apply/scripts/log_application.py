"""Record one submitted application: keep the confirmation screenshot and append applications.jsonl.

    python3 skills/role-apply/scripts/log_application.py "<Company>" "<Role>" <url> <ats> <résumé variant> <screenshot> "<notes>" \
        [--by "<who submitted>"] [--run <run directory>] [--area <area>]

The screenshot is copied to temp/applications/confirmations/<date>/ and its path goes into the
notes. With --run, the submission is also appended to <run directory>/log.jsonl and the run's
count is printed, which is how a long run keeps track of how far it has got.
"""
import argparse
import datetime
import json
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[3]
APPLICATIONS = ROOT / "skills" / "role-apply" / "state" / "applications.jsonl"


def main():
    parser = argparse.ArgumentParser()
    for name in ("company", "role", "url", "ats", "resume", "screenshot", "notes"):
        parser.add_argument(name)
    parser.add_argument("--by", default="agent, on the operator's instruction")
    parser.add_argument("--run", default="")
    parser.add_argument("--area", default="")
    arguments = parser.parse_args()

    today = datetime.date.today().isoformat()
    folder = ROOT / "temp" / "applications" / "confirmations" / today
    folder.mkdir(parents=True, exist_ok=True)
    name = re.sub(r"[^a-z0-9]+", "-", f"{arguments.company} {arguments.role}".lower()).strip("-")[:90] + pathlib.Path(arguments.screenshot).suffix
    shutil.copy(arguments.screenshot, folder / name)
    evidence = f"temp/applications/confirmations/{today}/{name}"

    entry = {"date": today, "company": arguments.company, "role": arguments.role, "url": arguments.url, "ats": arguments.ats,
             "resume": arguments.resume, "status": "submitted", "submitted_date": today, "submitted_by": arguments.by,
             "notes": f"{arguments.notes} Evidence: {evidence}"}
    with open(APPLICATIONS, "a") as log:
        log.write(json.dumps(entry) + "\n")

    if not arguments.run:
        print(f"logged {name}")
        return
    run_log = pathlib.Path(arguments.run) / "log.jsonl"
    with open(run_log, "a") as log:
        log.write(json.dumps({"t": datetime.datetime.now().strftime("%H:%M"), "company": arguments.company, "role": arguments.role,
                              "url": arguments.url, "area": arguments.area, "status": "submitted", "evidence": evidence}) + "\n")
    rows = [json.loads(line) for line in run_log.read_text().splitlines() if line.strip()]
    print(f"logged {name}; this run: {len(rows)} roles at {len({row['company'] for row in rows})} companies")


if __name__ == "__main__":
    main()
