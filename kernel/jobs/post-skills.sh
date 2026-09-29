#!/bin/sh
# Regenerates the skill registry in #skills from whatever is on disk in skills/.
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
[ ! -f "$INTEL_ROOT/kernel/ha/guard.sh" ] || sh "$INTEL_ROOT/kernel/ha/guard.sh" skill-registry || exit 0

cd "$INTEL_ROOT"
BODY=$(openclaw skills list 2>/dev/null | grep 'openclaw-workspace' | sed 's/│//g' \
  | awk '{$1=$1};1' | cut -c1-150)
TARGET=$(channel_id skills) || { echo "post-skills: no id for #skills in etc/channels.json; run ./setup" >&2; exit 1; }
openclaw message send --channel discord --target "$TARGET" \
  -m "**Skill registry** — $(date '+%Y-%m-%d')
\`\`\`
$BODY
\`\`\`
Invoke any of these here, or add one to skills/ and it appears on the next run."
