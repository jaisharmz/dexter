#!/bin/sh
# Regenerates the skill registry in #skills from whatever is on disk in intel/skills.
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
sh "$INTEL_ROOT/kernel/ha/guard.sh" skill-registry || exit 0

cd "$INTEL_ROOT"
BODY=$(openclaw skills list 2>/dev/null | grep 'openclaw-workspace' | sed 's/│//g' \
  | awk '{$1=$1};1' | cut -c1-150)
openclaw message send --channel discord --target 000000000000000000 \
  -m "**Skill registry** — $(date '+%Y-%m-%d')
\`\`\`
$BODY
\`\`\`
Invoke any of these here, or add one to intel/skills and it appears on the next run."
