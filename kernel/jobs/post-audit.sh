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
. "$INTEL_ROOT/kernel/jobs/channel.sh"

cd "$INTEL_ROOT"
TARGET=$(channel_id log) || { echo "post-audit: no id for #log in etc/channels.json; run ./setup" >&2; exit 1; }
# A Discord message holds 2000 characters; the full report is one command away.
BODY=$(node kernel/audit/audit.mjs report --since 24h | cut -c1-180 | head -c 1700)
# The effort router's day in one line, when it routed anything (docs/DESIGN.md §5).
ROUTES=$( [ -f kernel/router.mjs ] && node kernel/router.mjs digest --hours 24 2>/dev/null || true)
# A test points OPENCLAW at a stand-in, so nothing it runs can post.
"${OPENCLAW:-openclaw}" message send --channel discord --target "$TARGET" \
  -m "**Audit** — $(hostname -s), $(date '+%Y-%m-%d')
\`\`\`
$BODY
\`\`\`${ROUTES:+
$ROUTES}
Full: \`node kernel/audit/audit.mjs report\`"
