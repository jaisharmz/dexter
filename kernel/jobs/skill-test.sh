#!/bin/sh
# Test a freshly written skill without waiting for a manual session restart.
#
# OpenClaw snapshots the eligible skill list when a session starts, so a brand-new
# SKILL.md is invisible to the session you wrote it in. skills.load.watch picks up
# *edits* to an existing skill mid-session, but a first registration still needs a
# fresh session. A one-shot cron job is a fresh session, so scheduling one a few
# seconds out is the cheapest way to prove the skill actually loads and runs.
#
# usage: skill-test.sh <skill-name> "<prompt to run>" [delay]
set -e

# Paths are derived from this script's own location, not baked in. Dexter now runs
# on two machines with different home directories; a literal /Users/you made
# every one of these jobs a silent no-op on the PC.
_job_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INTEL_ROOT=${_job_dir%/kernel/jobs}

# Cron gets a login-shell PATH where a stale node shadows the current one, and
# `openclaw` refuses to start on it. See kernel/jobs/nodejs-path.sh.
. "$INTEL_ROOT/kernel/jobs/nodejs-path.sh"

cd "$INTEL_ROOT"

SKILL="$1"
PROMPT="$2"
DELAY="${3:-30s}"
BUILDING=000000000000000000

[ -n "$SKILL" ] && [ -n "$PROMPT" ] || {
  echo "usage: skill-test.sh <skill-name> \"<prompt>\" [delay]" >&2; exit 1; }

[ -f "skills/$SKILL/SKILL.md" ] || {
  echo "no skills/$SKILL/SKILL.md — write the skill first" >&2; exit 1; }

# Every skill carries the learning footer, so a brand-new one gets it here — this is
# the first moment a freshly written SKILL.md passes through code. See
# kernel/skill-learning.md.
bash kernel/skill-learn.sh sync

# Nudge the watcher so an edited skill reloads in already-open sessions too.
touch "skills/$SKILL/SKILL.md"

JOB="skilltest-$SKILL-$(date +%s)"
openclaw cron add "$JOB" \
  --at "$DELAY" \
  --message "$PROMPT

When done, post a short verdict to Discord channel $BUILDING using the message tool:
whether /$SKILL loaded, whether it did the right thing, and the single most useful
fix. Be specific about what failed; 'worked fine' is not a verdict." \
  --delete-after-run \
  --description "One-shot test of the $SKILL skill in a fresh session"

echo "scheduled '$JOB' in $DELAY — verdict will land in #building"
