#!/bin/sh
# Posts the dependency-ordered queue to #queue. Dexter maintains that channel;
# the operator reads it and never files entries by hand.
set -e

# Paths are derived from this script's own location, not baked in. Dexter now runs
# on two machines with different home directories; a literal /Users/you made
# every one of these jobs a silent no-op on the PC.
_job_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INTEL_ROOT=${_job_dir%/kernel/jobs}

# Cron gets a login-shell PATH where a stale node shadows the current one, and
# `openclaw` refuses to start on it. See kernel/jobs/nodejs-path.sh.
. "$INTEL_ROOT/kernel/jobs/nodejs-path.sh"
. "$INTEL_ROOT/kernel/jobs/channel.sh"

# On a two-machine pair, only the node currently holding Dexter may do this
# (kernel/ha/guard.sh). A single machine has no guard, and always may.
[ ! -f "$INTEL_ROOT/kernel/ha/guard.sh" ] || sh "$INTEL_ROOT/kernel/ha/guard.sh" queue-digest || exit 0

cd "$INTEL_ROOT"
TARGET=$(channel_id queue) || { echo "post-queue: no id for #queue in etc/channels.json; run ./setup" >&2; exit 1; }
# The layered queue (kernel/pqueue.mjs) is in beta in intel; an install without it posts the
# flat list.
if [ -f kernel/pqueue.mjs ]; then BODY=$(node kernel/pqueue.mjs list); else BODY=$(node kernel/queue.mjs list); fi
openclaw message send --channel discord --target "$TARGET" \
  -m "**Queue** — $(date '+%Y-%m-%d')
\`\`\`
$BODY
\`\`\`"
