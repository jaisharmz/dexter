#!/bin/sh
# One failover decision. Run every 30s (systemd timer on the PC, launchd on the Mac).
#
#   sh kernel/ha/watchdog.sh            # decide and act
#   sh kernel/ha/watchdog.sh --dry-run  # decide and report, change nothing
#
# THE RULE: exactly one node holds Discord. This script is the only writer of the
# role file, and it only ever changes its OWN node's role. Nobody reaches across
# and demotes the other machine, so there is no distributed agreement to get wrong.
#
# Three guards against the failure that actually matters -- both nodes live at once:
#
#   1. Self-isolation check. A standby that cannot reach the internet is far more
#      likely to be the broken one than to be witnessing a dead primary. It must
#      never promote itself on the strength of its own outage.
#   2. Hysteresis. Six consecutive failures (~3 min) to promote, two successes to
#      hand back. A single dropped probe -- and the tailscale path drops often
#      enough on this pair -- must not trigger a takeover.
#   3. Boot holdoff on the primary. When the primary returns it waits longer than
#      the standby needs to notice and step down, so the handback does not overlap.
#
# Anything that slips past all three costs a duplicated chat reply. It cannot cost
# a duplicated email: those are pinned to the primary by guard.sh --primary-only.
set -u
_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$_dir/node.sh"

DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1

PROMOTE_AFTER=6      # ~3 min of consecutive failures
DEMOTE_AFTER=2       # ~1 min of consecutive successes
HOLDOFF=90           # primary waits this long after boot before claiming Discord

ME=$(node_id); PRIM=$(primary_get); ROLE=$(role_get); PEER=$(peer_addr)
CNT_FILE="$HA_DIR/peer-fail-count"
LOG="$HA_DIR/watchdog.log"
log() { printf '%s %s %s\n' "$(date '+%F %T')" "$ME" "$1" >> "$LOG"; }
say() { [ "$DRY" = 1 ] && printf '%s\n' "$1"; }

[ "$ME" = unknown ] && { log "ABORT: cannot identify this node (no tailscale ip)"; say "unknown node"; exit 2; }
[ "$ROLE" = off ]   && { say "role=off, standing down"; exit 0; }

count=0; [ -f "$CNT_FILE" ] && count=$(tr -d ' \n' < "$CNT_FILE" 2>/dev/null || echo 0)
case "$count" in ''|*[!0-9]*) count=0 ;; esac

internet_ok() { curl -s -m 5 -o /dev/null https://discord.com/api/v10/gateway 2>/dev/null; }
peer_up()     { [ -n "$PEER" ] && [ "$(sh "$_dir/health.sh" "$PEER" 2>/dev/null)" = up ]; }

apply() { # apply <role> <human reason>
  if [ "$DRY" = 1 ]; then say "WOULD $1: $2"; return 0; fi
  log "$1: $2"
  if [ "$1" = active ]; then
    openclaw gateway start >/dev/null 2>&1
  else
    openclaw gateway stop  >/dev/null 2>&1
  fi
  role_set "$1"
  # Best effort only: the gateway is mid-transition, and a missed notice must
  # never abort a failover that already succeeded.
  openclaw message send --to "discord:channel:000000000000000000" \
    --text "HA: **$ME** is now **$1** — $2" >/dev/null 2>&1 || true
}

# Stopping the whole gateway, rather than just switching the Discord channel off,
# is what makes the standby genuinely inert. A running gateway keeps firing crons
# even with Discord disabled, and two of Dexter's crons are agent turns rather
# than shell scripts -- Memory Dreaming and the skill review -- so guard.sh cannot
# reach inside them. With no gateway there is nothing to fire, and the standby
# stops burning tokens rewriting memory the active node is also rewriting.
# The cost is a slower promotion (cold start, ~15s), which a failover can afford.

if [ "$ME" = "$PRIM" ]; then
  # ---- I am the designated primary: I want to be active whenever I am healthy ----
  if [ "$ROLE" = active ]; then say "primary, active, nothing to do"; exit 0; fi
  up_secs=$(awk '{print int($1)}' /proc/uptime 2>/dev/null) || up_secs=""
  [ -z "$up_secs" ] && up_secs=$(( $(date +%s) - $(sysctl -n kern.boottime 2>/dev/null | sed -n 's/.*sec = \([0-9]*\).*/\1/p' || echo 0) ))
  if [ "${up_secs:-9999}" -lt "$HOLDOFF" ]; then
    say "primary, booted ${up_secs}s ago, holding off until ${HOLDOFF}s"; exit 0
  fi
  apply active "primary reclaiming after standby had it"
  exit 0
fi

# ---- I am the standby ----
if [ "$ROLE" = active ]; then
  if peer_up; then
    count=$((count + 1)); printf '%s\n' "$count" > "$CNT_FILE"
    say "standby-holding-active; primary looks up ($count/$DEMOTE_AFTER)"
    [ "$count" -ge "$DEMOTE_AFTER" ] && { printf '0\n' > "$CNT_FILE"; apply standby "primary is back"; }
  else
    printf '0\n' > "$CNT_FILE"; say "standby-holding-active; primary still down, staying up"
  fi
  exit 0
fi

if ! internet_ok; then
  printf '0\n' > "$CNT_FILE"
  log "no internet from standby -- not promoting; the fault is probably local"
  say "standby has no internet; refusing to promote"
  exit 0
fi

if peer_up; then
  printf '0\n' > "$CNT_FILE"; say "standby; primary healthy"; exit 0
fi

count=$((count + 1)); printf '%s\n' "$count" > "$CNT_FILE"
say "standby; primary DOWN ($count/$PROMOTE_AFTER)"
if [ "$count" -ge "$PROMOTE_AFTER" ]; then
  printf '0\n' > "$CNT_FILE"
  apply active "primary unreachable for $((PROMOTE_AFTER * 30))s"
fi
