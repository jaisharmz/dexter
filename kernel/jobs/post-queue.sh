#!/bin/sh
# Posts the dependency-ordered queue to #queue. Dexter maintains that channel;
# Jai reads it and never files entries by hand.
set -e

# Paths are derived from this script's own location, not baked in. Dexter now runs
# on two machines with different home directories; a literal /Users/you made
# every one of these jobs a silent no-op on the PC.
_job_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INTEL_ROOT=${_job_dir%/kernel/jobs}

# Cron gets a login-shell PATH where a stale node shadows the current one, and
# `openclaw` refuses to start on it. See kernel/jobs/nodejs-path.sh.
. "$INTEL_ROOT/kernel/jobs/nodejs-path.sh"

# Only the node currently holding Dexter may do this. See kernel/ha/guard.sh.
sh "$INTEL_ROOT/kernel/ha/guard.sh" queue-digest || exit 0

cd "$INTEL_ROOT"
BODY=$(node kernel/queue.mjs list)
openclaw message send --channel discord --target 000000000000000000 \
  -m "**Queue** — $(date '+%Y-%m-%d')
\`\`\`
$BODY
\`\`\`"
