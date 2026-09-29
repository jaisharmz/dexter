#!/bin/sh
# Today's runs and their outcomes: did each message get a reply, or did the run fail?
#
# WHY THIS EXISTS. Reading the plain gateway.log alone is misleading:
#   - `cli turn:` (success) is written to BOTH logs
#   - `cli terminal failure` is written ONLY to the daily JSON log
# So a failed run leaves no trace in gateway.log and looks identical to one still
# running. That produced two wrong verdicts in one afternoon — first "no reply
# recorded" (right, wrong reasoning), then "false alarm, it's fine" (wrong).
#
# `Sent via Discord` is NOT a reliable delivery receipt — it appeared zero times on a
# day Dexter demonstrably sent many messages. Use `openclaw channels status` and read
# the `out:` timestamp for that.
python3 - <<'PY'
import json, os, re, datetime
day  = datetime.date.today().isoformat()
js   = f"/tmp/openclaw/openclaw-{day}.log"
rows = []
if os.path.exists(js):
    for line in open(js, errors="ignore"):
        try: d = json.loads(line)
        except Exception: continue
        m, t = d.get("message",""), d.get("time","")[11:19]
        if   "cli exec:"            in m: rows.append((t,"start",m))
        elif "cli turn:"            in m: rows.append((t,"ok",m))
        elif "cli terminal failure" in m: rows.append((t,"FAIL",m))

n_ok = n_fail = n_start = 0
print(f"  Dexter runs for {day}\n")
for t, kind, m in sorted(rows):
    if kind == "start":
        n_start += 1
        chars = (re.search(r"promptChars=(\d+)", m) or [0,"?"])[1]
        print(f"  {t}  start   {chars:>6} chars")
    elif kind == "ok":
        n_ok += 1
        out = (re.search(r"outBytes=(\d+)", m) or [0,"?"])[1]
        ms  = int((re.search(r"durationMs=(\d+)", m) or [0,"0"])[1])
        note = "  <- near-empty" if out.isdigit() and int(out) < 40 else ""
        print(f"  {t}  ok      {out:>6} bytes in {ms//60000}m{ms//1000%60:02d}s{note}")
    else:
        n_fail += 1
        err = (re.search(r"error=(.*)$", m) or [0,"?"])[1][:48]
        ms  = int((re.search(r"durationMs=(\d+)", m) or [0,"0"])[1])
        print(f"  {t}  FAILED  after {ms//60000}m{ms//1000%60:02d}s — {err}")

print(f"\n  {n_start} started, {n_ok} replied, {n_fail} FAILED")
if n_fail:
    print("  A failed run means that message went unanswered in Discord.")
PY
