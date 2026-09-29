#!/bin/sh
# The safety gate. Exits 0 only if THIS node may cause side effects right now.
#
#   sh "$INTEL_ROOT/kernel/ha/guard.sh" queue-digest              || exit 0
#   sh "$INTEL_ROOT/kernel/ha/guard.sh" --primary-only outbound   || exit 0
#
# Why this exists, concretely: some jobs send approved things that cannot be unsent.
# Restoring Dexter's backup onto the PC also restores its crons, so from the moment
# the PC comes up there are two machines holding the same queue and the same
# schedule. Without this gate every recipient gets everything twice, and an apology
# is not a rollback.
#
# TWO TIERS, because the two failure modes are not equally bad:
#
#   default        -- runs on whichever node is currently active. Correct for
#                     anything reversible: digests, registries, replies.
#   --primary-only -- runs ONLY on the designated primary, even if this node has
#                     legitimately taken over. Reserved for the irreversible.
#
# The second tier buys protection against split brain. A partition can convince
# the standby that the primary is dead when it is merely unreachable, and then
# both nodes are active at once. For chat that costs a duplicated reply, which is
# visible and self-corrects. For a send it would cost every recipient a second
# copy. So sending is pinned to one machine forever: if the primary is down when a
# send is due, the send waits a day, and a day late beats twice-sent.
#
# Silence on a skip is deliberate -- cron stdout is announced to Discord and a
# daily "skipped, I am standby" post is noise. Skips are logged instead, so a job
# that silently never runs is still discoverable after the fact.
set -u

PRIMARY_ONLY=0
case "${1:-}" in
  --primary-only) PRIMARY_ONLY=1; shift ;;
esac
JOB=${1:-unnamed}

_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$_dir/node.sh"

ROLE=$(role_get)
NODE=$(node_id)
LOG="$HA_DIR/guard.log"
note() { printf '%s %s %s: %s\n' "$(date '+%F %T')" "$NODE" "$JOB" "$1" >> "$LOG"; }

if [ "$ROLE" != "active" ]; then
  note "SKIP (role=$ROLE)"
  exit 1
fi

if [ "$PRIMARY_ONLY" = 1 ] && [ "$NODE" != "$(primary_get)" ]; then
  note "SKIP (active, but primary-only job and primary is $(primary_get))"
  exit 1
fi

note "RUN (role=active${PRIMARY_ONLY:+, primary-only ok})"
exit 0
