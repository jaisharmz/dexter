#!/bin/sh
# Mirror Dexter's state from the ACTIVE node to the standby. Safe to run on either.
#
#   sh kernel/ha/sync.sh              # push my state to the peer (if I am active)
#   sh kernel/ha/sync.sh --dry-run    # show what would move
#   sh kernel/ha/sync.sh --force      # push even if I am not active (post-failover)
#
# One-way mirror, never a merge. There is exactly one writer at a time -- that is
# the whole point of the role file -- so the standby is a replica and nothing has
# to be reconciled. A two-way sync here would invent conflicts that the design has
# already made impossible.
#
# SQLite is snapshotted, not copied. Dexter's sessions and secret store are live
# WAL databases; rsyncing those files while the gateway holds them open yields a
# torn copy that looks fine until the moment you need it. `.backup` takes a
# consistent snapshot of an open database, which is exactly the supported way.
#
# The venvs are deliberately NOT synced. They bake absolute interpreter paths, so
# a copied .venv from macOS is inert on WSL -- it must be rebuilt per machine.
set -u
_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$_dir/node.sh"

DRY=""; FORCE=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY="--dry-run" ;;
    --force)   FORCE=1 ;;
  esac
done

ME=$(node_id); ROLE=$(role_get); PEER=$(peer_addr)
[ -z "$PEER" ] && { echo "sync: cannot identify peer" >&2; exit 2; }

if [ "$ROLE" != active ] && [ "$FORCE" = 0 ]; then
  echo "sync: this node is '$ROLE', not active -- refusing to overwrite the peer."
  echo "      (use --force after a failover, when the node that was serving is the"
  echo "       one holding the newer state)"
  exit 1
fi

# How to reach the peer, and in which shell. Lives in node.sh because handoff needs
# exactly the same answers. See the comment there for why a probe beats an assumption.
peer_probe
case $? in
  2) echo "sync: cannot identify peer" >&2; exit 2 ;;
  3) echo "sync: cannot ssh to ${PEER_SSH:-peer} -- see docs/HA.md 'pairing'" >&2; exit 3 ;;
esac
[ -n "$REMOTE_SH" ] && echo "sync: peer answers through WSL"

PEER_INTEL="$PEER_HOME/Documents/intel"

echo "sync: $ME (active) -> $PEER_SSH  [$PEER_INTEL]"

# rsync creates the last directory of a destination, never its missing parents, so
# the first sync onto a virgin machine died four times on `mkdir ~/Documents/intel:
# No such file or directory`. The seeding pass is exactly the one that runs before
# anything has laid out a home directory, so it has to create the skeleton it is
# about to fill.
$SSH "$PEER_SSH" "${REMOTE_SH}mkdir -p \
  '$PEER_INTEL' \
  '$PEER_INTEL/skills/outbound-sourcing/state' \
  '$PEER_HOME/.openclaw/state' \
  '$PEER_HOME/.openclaw/agents/dexter/agent'" 2>/dev/null \
  || { echo "sync: cannot create the destination layout on $PEER_SSH" >&2; exit 4; }
RSYNC="rsync -az --partial $DRY -e \"$SSH\" --rsync-path=\"$RSYNC_PATH\""

run() { eval "$RSYNC $*"; }

# 1. The workspace, history included. `home/` is a nested private repo and rides
#    along in the same pass; excluding it would strip Dexter of its private half.
echo "  workspace"
run "--delete \
  --exclude '.venv/' --exclude '__pycache__/' --exclude 'node_modules/' \
  --exclude 'temp/' --exclude '*.log' \
  '$INTEL_ROOT/' '$PEER_SSH:$PEER_INTEL/'"

# 2. Live databases, snapshotted first.
SNAP=$(mktemp -d)
trap 'rm -rf "$SNAP"' EXIT
snap_db() { # snap_db <src.sqlite> <name>
  [ -f "$1" ] || return 0
  if sqlite3 "$1" ".backup '$SNAP/$2'" 2>/dev/null; then
    echo "  snapshot $2"
  else
    echo "  WARNING: could not snapshot $2 -- skipped rather than copied torn" >&2
    rm -f "$SNAP/$2"
  fi
}
snap_db "$HOME/.openclaw/state/openclaw.sqlite" openclaw.sqlite
snap_db "$HOME/.openclaw/agents/dexter/agent/openclaw-agent.sqlite" openclaw-agent.sqlite
snap_db "$INTEL_ROOT/skills/outbound-sourcing/state/prospects.db" prospects.db

[ -f "$SNAP/openclaw.sqlite" ] && \
  run "'$SNAP/openclaw.sqlite' '$PEER_SSH:$PEER_HOME/.openclaw/state/'"
[ -f "$SNAP/openclaw-agent.sqlite" ] && \
  run "'$SNAP/openclaw-agent.sqlite' '$PEER_SSH:$PEER_HOME/.openclaw/agents/dexter/agent/'"
[ -f "$SNAP/prospects.db" ] && \
  run "'$SNAP/prospects.db' '$PEER_SSH:$PEER_INTEL/skills/outbound-sourcing/state/'"

# 2b. The config. Without it the peer has a workspace and no idea it is Dexter:
#     pc-install.sh stops at "no config yet -- run sync.sh --force on the Mac first"
#     and points back at this script, which never sent it. `openclaw.json` carries the
#     gateway token and the Discord wiring; pc-install rewrites the macOS paths inside
#     it on arrival. `service-env/` is deliberately not sent — it is launchd-shaped and
#     `openclaw gateway install` regenerates it for systemd on the other side.
if [ -f "$HOME/.openclaw/openclaw.json" ]; then
  echo "  config"
  run "'$HOME/.openclaw/openclaw.json' '$PEER_SSH:$PEER_HOME/.openclaw/'"
fi

# 3. Attachments -- outside both repos, and every outbound draft references them.
if [ -d "$HOME/Downloads/outbound_attachments/optimized" ]; then
  echo "  attachments"
  $SSH "$PEER_SSH" "${REMOTE_SH}mkdir -p '$PEER_HOME/Downloads/outbound_attachments'" 2>/dev/null
  run "'$HOME/Downloads/outbound_attachments/optimized/' \
       '$PEER_SSH:$PEER_HOME/Downloads/outbound_attachments/optimized/'"
fi

# 4. The role and primary files are NOT synced, on purpose. They are the one piece
#    of state that must differ between the two machines; mirroring them would hand
#    both nodes the same role and undo the entire arrangement.
echo "sync: done"
