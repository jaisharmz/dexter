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
# One Discord message holds 2,000 characters. The full list outgrew that on Oct 3, and
# `openclaw message send` hung on the 70 KB post every morning after (exit 13), so the post is a
# digest that fits one message. kernel/pqueue.mjs, where a checkout has it, gives the board's
# three sections; an install without it posts queue.mjs's list, cut at a line to the same size.
if [ -f kernel/pqueue.mjs ]; then
  BODY=$(node kernel/pqueue.mjs digest --max 1850)
else
  BODY=$(node kernel/queue.mjs list | LC_ALL=C awk -v max=1780 '
    cut || used + length($0) + 1 > max { cut = 1; left++; next }
    { print; used += length($0) + 1 }
    END { if (left) printf "... and %d more lines: node kernel/queue.mjs list\n", left }')
fi
# A test points OPENCLAW at a stand-in, so nothing it runs can post.
"${OPENCLAW:-openclaw}" message send --channel discord --target "$TARGET" \
  -m "**Queue** — $(date '+%Y-%m-%d')
\`\`\`
$BODY
\`\`\`"
