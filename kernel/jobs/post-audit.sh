#!/bin/sh
# Posts the daily audit of agent actions to #log: what was blocked, held for approval or
# flagged, and which sessions looked wrong (kernel/audit/README.md).
#
# No HA guard, unlike the other jobs. Each machine audits its own ledger, since
# var/log/ never leaves the machine, so each posts its own report under its own name.
set -e

_job_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INTEL_ROOT=${_job_dir%/kernel/jobs}

. "$INTEL_ROOT/kernel/jobs/nodejs-path.sh"
. "$INTEL_ROOT/kernel/jobs/bounded.sh"
. "$INTEL_ROOT/kernel/jobs/channel.sh"
. "$INTEL_ROOT/kernel/jobs/send.sh"

cd "$INTEL_ROOT"

# EVERY STAGE IS BOUNDED AND TIMED. The scheduler allows a command job 10 minutes and says only
# "cron: job execution timed out" when it runs out: on 2026-11-20 the job ran 725 s and on
# 2026-11-21 it ran 677 s, and both days the report landed only on the scheduler's own retry
# minutes later. The bounded send accounts for 5.6 min of that at worst and every warm stage here
# takes under a second, so one of the other stages stalled too, and the job kept no record of
# where it had got to. So each stage is cut off on its own clock, the worst case adds up to about
# 7.6 min, and var/log/post-audit.log keeps the time each stage took. The bounds are overridable
# so a test can exercise a stall without waiting them out.
STAGE_LOG=var/log/post-audit.log
mkdir -p var/log
_trace_at=$(date '+%s')
trace() {
  printf '%s  %4ss  %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$(( $(date '+%s') - _trace_at ))" "$1" >> "$STAGE_LOG"
}
trace "start"

TARGET=$(run_bounded "${POST_CHANNEL_TIMEOUT:-30}" channel_id log) || { echo "post-audit: no id for #log in etc/channels.json; run ./setup" >&2; exit 1; }
trace "channel #log resolved"

# A Discord message holds 2000 characters; the full report is one command away.
if REPORT=$(run_bounded "${POST_REPORT_TIMEOUT:-60}" node kernel/audit/audit.mjs report --since 24h); then
  BODY=$(printf '%s\n' "$REPORT" | cut -c1-180 | head -c 1700)
else
  BODY="the report stage was killed before it printed anything, so today's audit is unread."
fi
trace "report read"

# The effort router's day in one line, when it routed anything (docs/DESIGN.md §5).
ROUTES=""
if [ -f kernel/router.mjs ]; then
  ROUTES=$(run_bounded "${POST_ROUTER_TIMEOUT:-30}" sh -c 'node kernel/router.mjs digest --hours 24 2>/dev/null' || true)
fi
trace "routes read"

MESSAGE="**Audit** — $(hostname -s), $(date '+%Y-%m-%d')
\`\`\`
$BODY
\`\`\`${ROUTES:+
$ROUTES}
Full: \`node kernel/audit/audit.mjs report\`"

# A late run meets a gateway whose Discord connection is still coming up, and the send then blocks
# instead of failing; kernel/jobs/send.sh bounds and retries it, and says why.
send_discord "$TARGET" "$MESSAGE" || { trace "send gave up"; echo "post-audit: the day's report did not post" >&2; exit 1; }
trace "posted"
