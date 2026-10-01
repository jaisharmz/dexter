"""Print the next applications to make from a run's queues, skipping what is done, skipped or blocked.

A run directory (e.g. skills/role-apply/state/run-2026-10-01/) holds:
    queue_<name>.json   lists of entries: company, role, apply_url, ats, notes, essay_required, needs_account, ...
    order.json          {"order": ["<queue name>", ...], "internship_queues": [...], "internship_companies": [...]}
    skips.json          {"<normalized company>": "<why>"}, written by --skip
    log.jsonl           what this run has submitted (log_application.py --run appends to it)

    python3 skills/role-apply/scripts/next_in_queue.py <run-dir> [N]                 the next N clear entries
    python3 skills/role-apply/scripts/next_in_queue.py <run-dir> --held              entries waiting on an essay or account
    python3 skills/role-apply/scripts/next_in_queue.py <run-dir> --skip "<Company>" "<why>"

Every entry printed has passed gate.py (no live process, no hold). One entry per company: the
first queue in "order" that has the company wins. Entries in an "internship_queues" queue are
kept only for companies in "internship_companies", which is how a track rule such as "internships
only at the few firms worth waiting for" is expressed (references/runs.md).
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import gate  # noqa: E402


def normalize(name):
    return re.sub(r"[^a-z0-9]", "", re.sub(r"\(.*?\)", "", (name or "").lower()))


def main():
    run = pathlib.Path(sys.argv[1])
    config = json.loads((run / "order.json").read_text())
    skips_path = run / "skips.json"
    skips = json.loads(skips_path.read_text()) if skips_path.exists() else {}

    if "--skip" in sys.argv:
        position = sys.argv.index("--skip")
        skips[normalize(sys.argv[position + 1])] = sys.argv[position + 2]
        skips_path.write_text(json.dumps(skips, indent=1) + "\n")
        print("skipped", sys.argv[position + 1])
        return

    log_path = run / "log.jsonl"
    done = {normalize(json.loads(line)["company"]) for line in log_path.read_text().splitlines() if line.strip()} if log_path.exists() else set()
    seen, ready, held = set(), [], []
    for name in config["order"]:
        path = run / f"queue_{name}.json"
        if not path.exists():
            continue
        for entry in json.loads(path.read_text()):
            key = normalize(entry.get("company"))
            if not key or key in seen or key in done or key in skips:
                continue
            if name in config.get("internship_queues", []) and key not in config.get("internship_companies", []):
                continue
            seen.add(key)
            (held if entry.get("essay_required") or entry.get("needs_account") else ready).append((name, entry))

    if "--held" in sys.argv:
        for name, entry in held:
            why = "essay" if entry.get("essay_required") else "account"
            print(f"[{name}] {why:8} {entry.get('company')} | {entry.get('role')} | {entry.get('apply_url')}")
        return

    wanted = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 5
    shown = 0
    for name, entry in ready:
        result, recent = gate.verdict(entry["company"])
        if result == "blocked":
            skips[normalize(entry["company"])] = "gate: " + "; ".join(f"{date} {kind}" for date, kind, _ in recent[:2])
            continue
        print(json.dumps({"queue": name, "gate": result, **{field: entry.get(field) for field in
                          ("company", "role", "ats", "apply_url", "location", "area", "eligibility", "required_fields", "policy", "notes")}}, ensure_ascii=False))
        shown += 1
        if shown >= wanted:
            break
    skips_path.write_text(json.dumps(skips, indent=1) + "\n")
    print(f"# {len(ready)} ready before the gate, {len(held)} held, {len(done)} done this run", file=sys.stderr)


if __name__ == "__main__":
    main()
