#!/bin/sh
# Identity and role for one node of the Dexter pair. Sourced, never run directly.
#
# Dexter runs on two machines that can both reach Discord with the SAME bot token.
# Discord will happily deliver every message to both connections, so the pair needs
# a rule: EXACTLY ONE node is "active" at a time. Everything in kernel/ha/ exists to
# enforce that rule. See docs/HA.md.
#
# Why a file and not a config lookup: the guard runs before every side-effectful
# cron, including at 9am when the gateway may be mid-restart. It has to answer
# "am I active?" without talking to the gateway.

# INTEL_ROOT is derived from this file's own location, never hardcoded. The old
# job scripts baked in /Users/you/... which is simply wrong on the PC --
# the same script has to work from two different home directories now.
_ha_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
case "$_ha_dir" in
  */kernel/ha) INTEL_ROOT=${_ha_dir%/kernel/ha} ;;
  */kernel/jobs) INTEL_ROOT=${_ha_dir%/kernel/jobs} ;;
  *) INTEL_ROOT=${INTEL_ROOT:-$HOME/Documents/intel} ;;
esac
export INTEL_ROOT

HA_DIR="$HOME/.openclaw/ha"
ROLE_FILE="$HA_DIR/role"
mkdir -p "$HA_DIR" 2>/dev/null || true

# Tailscale addresses. IPs, not MagicDNS names: MagicDNS needs a working resolver
# and the failover path must survive exactly the conditions where DNS is flaky.
MAC_TS=100.64.0.1
PC_TS=100.64.0.2

# Which machine am I? Decided by the tailscale IP actually assigned to this host,
# so a renamed hostname cannot make a node lie about who it is.
node_id() {
  _ips=$(ifconfig 2>/dev/null | grep -o '100\.[0-9]*\.[0-9]*\.[0-9]*' ; \
         ip -4 addr 2>/dev/null | grep -o '100\.[0-9]*\.[0-9]*\.[0-9]*')
  case "$_ips" in
    *"$MAC_TS"*) echo mac ;;
    *"$PC_TS"*)  echo pc ;;
    *) echo unknown ;;
  esac
}

peer_addr() {
  case "$(node_id)" in
    mac) echo "$PC_TS" ;;
    pc)  echo "$MAC_TS" ;;
    *)   echo "" ;;
  esac
}

# Role is one of: active | standby | off
#   active  -- this node owns Discord and may run side-effectful jobs
#   standby -- warm, syncing, Discord disabled, runs the watchdog
#   off     -- take no part (used while doing maintenance)
role_get() {
  [ -f "$ROLE_FILE" ] && tr -d ' \n' < "$ROLE_FILE" || echo standby
}

role_set() {
  printf '%s\n' "$1" > "$ROLE_FILE"
  printf '%s %s -> %s\n' "$(date '+%F %T')" "$(node_id)" "$1" >> "$HA_DIR/role.log"
}

# The designated primary: the node that owns Dexter in steady state, and the only
# one allowed to run irreversible jobs. Defaults to the PC because it is the
# always-on machine -- the laptop froze for 206 minutes across two days and took
# a 3am cron down with it, which is the whole reason this pair exists.
PRIMARY_FILE="$HA_DIR/primary"

primary_get() {
  [ -f "$PRIMARY_FILE" ] && tr -d ' \n' < "$PRIMARY_FILE" || echo pc
}

primary_set() {
  printf '%s\n' "$1" > "$PRIMARY_FILE"
  printf '%s primary -> %s\n' "$(date '+%F %T')" "$1" >> "$HA_DIR/role.log"
}

# ---- reaching the peer --------------------------------------------------------
#
# Sync and handoff both need the same three answers: how to ssh there, where the
# peer's home is, and whether a POSIX command survives the trip at all. The PC runs
# Windows OpenSSH, so a login lands in cmd.exe and `printf %s "$HOME"` comes back as
# its own literal text; everything Dexter needs on that machine lives inside WSL, one
# `wsl --` away. Probing beats assuming in both directions — a Linux peer keeps the
# fast path, and guessing wrong fails as "cannot ssh", which sends you debugging the
# network instead of the shell.
#
# Sets PEER_ADDR PEER_SSH PEER_PORT SSH REMOTE_SH RSYNC_PATH PEER_HOME.
# Returns 2 if this node cannot name its peer, 3 if nothing answers.
peer_probe() {
  PEER_ADDR=$(peer_addr)
  [ -n "$PEER_ADDR" ] || return 2
  PEER_SSH=${HA_PEER_SSH:-"you@$PEER_ADDR"}
  PEER_PORT=${HA_PEER_PORT:-22}
  SSH="ssh -p $PEER_PORT -o BatchMode=yes -o ConnectTimeout=10"
  REMOTE_SH=""
  RSYNC_PATH="rsync"

  PEER_HOME=$($SSH "$PEER_SSH" 'printf %s "$HOME"' 2>/dev/null)
  case "$PEER_HOME" in /*) return 0 ;; esac

  PEER_HOME=$($SSH "$PEER_SSH" 'wsl -- bash -lc "printf %s \$HOME"' 2>/dev/null)
  case "$PEER_HOME" in
    /*) REMOTE_SH="wsl -- "; RSYNC_PATH="wsl -- rsync"; return 0 ;;
  esac
  return 3
}

# Run one shell script on the peer, as a login shell, and never think about quoting.
#
# Three shells sit between here and there — the local one, cmd.exe, and bash — and a
# command with a quote or a pipe in it gets mangled differently by each. base64 is
# alphanumeric plus + / =, none of which cmd.exe treats as special, so the script
# arrives byte-identical no matter what is in it. Call peer_probe first.
peer_bash() { # peer_bash '<shell script>'
  _pb=$(printf '%s' "$1" | base64 | tr -d '\n')
  if [ -n "$REMOTE_SH" ]; then
    $SSH "$PEER_SSH" "wsl -- bash -c \"echo $_pb | base64 -d | bash -l\""
  else
    $SSH "$PEER_SSH" "echo $_pb | base64 -d | bash -l"
  fi
}
