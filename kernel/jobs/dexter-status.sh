#!/bin/sh
# Is Dexter working, hung, or finished — and if working, at what phase?
#
# Two traps this script exists to avoid, both of which cost real time on 2026-08-31:
#
#   1. BSD find silently matches NOTHING for `-newermt '-90 minutes'`. It does not
#      error. Every "nothing on disk" verdict from that flag is a lie. Write-activity
#      is computed in python from absolute mtimes instead.
#   2. The Bash tool keeps its working directory between calls, so a relative path
#      like `find skills/outbound-sourcing` can silently resolve to nothing. Every
#      path here is absolute.
set -e

# Paths are derived from this script's own location, not baked in. Dexter now runs
# on two machines with different home directories; a literal /Users/you made
# every one of these jobs a silent no-op on the PC.
_job_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INTEL_ROOT=${_job_dir%/kernel/jobs}

# Cron gets a login-shell PATH where a stale node shadows the current one, and
# `openclaw` refuses to start on it. See kernel/jobs/nodejs-path.sh.
. "$INTEL_ROOT/kernel/jobs/nodejs-path.sh"

ROOT="$INTEL_ROOT"

echo "── transport ──"
openclaw channels status 2>/dev/null | grep -i 'discord' || echo "  discord: NOT CONNECTED"

echo
echo "── is the model running? ──"
PID=$(ps aux | grep '[c]laude --output-format stream-json' | awk '{print $2}' | head -1)
if [ -z "$PID" ]; then
  echo "  no CLI process — idle (finished, or never started)"
else
  A=$(ps -o time= -p "$PID" | tr -d ' ')
  sleep 20
  B=$(ps -o time= -p "$PID" | tr -d ' ')
  if [ "$A" = "$B" ]; then
    echo "  pid $PID: $A → $B over 20s"
    echo "  HUNG — zero CPU. Fix: openclaw gateway restart, then archive the session."
  else
    echo "  pid $PID: $A → $B over 20s"
    echo "  WORKING — CPU advancing. Network-bound work looks exactly like this."
  fi
fi

echo
echo "── what has it actually written? ──"
python3 - "$ROOT" <<'PY'
import os, sys, time
root = sys.argv[1]
watch = os.path.join(root, "skills/outbound-sourcing/state")
if not os.path.isdir(watch):
    print("  no outbound state dir"); raise SystemExit
now = time.time()
newest = []
for dirpath, _, files in os.walk(watch):
    for f in files:
        p = os.path.join(dirpath, f)
        try: newest.append((os.path.getmtime(p), p))
        except OSError: pass
if not newest:
    print("  nothing written, ever"); raise SystemExit
newest.sort(reverse=True)
ts, p = newest[0]
mins = (now - ts) / 60
rel = p.replace(watch + "/", "")
print(f"  last write: {rel}  ({mins:.0f} min ago)")

cand = os.path.join(watch, "candidates")
recent = 0
if os.path.isdir(cand):
    recent = sum(1 for f in os.listdir(cand)
                 if (now - os.path.getmtime(os.path.join(cand, f))) < 3 * 3600)
print(f"  candidate files in the last 3h: {recent}")

# Phase inference. The pipeline writes candidates, then the db, then goes quiet
# through verification, which is network-bound and produces nothing until done.
if mins < 3:
    print("  PHASE: actively writing")
elif rel.startswith("prospects.db"):
    print("  PHASE: verify or draft — db ingested, now verifying addresses.")
    print("         Silence here is expected; verification writes nothing until done.")
elif rel.startswith("candidates/"):
    print("  PHASE: discovery — still finding people, nothing ingested yet.")
else:
    print("  PHASE: unclear")
PY

echo
echo "── read the signals correctly ──"
echo "  'stalled session' in the log fires at 15 min. It is a heuristic, not a verdict."
echo "  Discord's typing indicator expires after ~10s, so its absence means nothing."
echo "  No disk writes does NOT mean stuck — verification is silent for a long time."
echo "  Trust: CPU advancing = alive. Phase above = where it is."
