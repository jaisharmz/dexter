#!/bin/sh
# Commits what the nightly consolidation wrote (DREAMS.md, memory/dreaming/, memory/.dreams/),
# which memory-core's 3 AM job writes and never commits. kernel/commit-dreams.mjs says how.
set -e

# Paths are derived from this script's own location, not baked in, as in the other jobs.
_job_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INTEL_ROOT=${_job_dir%/kernel/jobs}

. "$INTEL_ROOT/kernel/jobs/nodejs-path.sh"

# On a two-machine pair, only the node holding Dexter runs the consolidation, so only it commits
# (kernel/ha/guard.sh). A single machine has no guard, and always may.
[ ! -f "$INTEL_ROOT/kernel/ha/guard.sh" ] || sh "$INTEL_ROOT/kernel/ha/guard.sh" dreams-commit || exit 0

cd "$INTEL_ROOT"
exec node kernel/commit-dreams.mjs "$@"
