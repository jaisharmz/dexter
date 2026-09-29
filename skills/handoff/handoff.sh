#!/bin/sh
# Hand a task to the other node and pick the answer back up here.
#
#   handoff.sh start "<brief>" [--dir <subdir>]   send it, get a run id
#   handoff.sh status [<id>]                      running or finished, and for how long
#   handoff.sh log <id> [--tail N]                what it has said so far
#   handoff.sh wait <id> [--timeout S]            block until it finishes, then print
#   handoff.sh fetch <id>                         copy the run's log here
#   handoff.sh list                               every run the peer has
#   handoff.sh kill <id>                          stop one
#
# The peer runs Claude Code headless (`claude -p`) in its own copy of intel. That is
# the whole trick: the workspace is already mirrored, so a brief that made sense here
# makes sense there. Nothing is streamed back live -- the laptop polls, because the
# reverse direction needs an sshd on the Mac that may not be running, and a handoff
# that silently fails to report is worse than one you have to ask about.
set -u
_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INTEL_ROOT=${_dir%/skills/handoff}
. "$INTEL_ROOT/kernel/ha/node.sh"

RUNS='$HOME/.openclaw/handoff'   # single-quoted on purpose: expands on the peer

die() { printf 'handoff: %s\n' "$*" >&2; exit 1; }

connect() {
  peer_probe
  case $? in
    2) die "this node cannot name its peer -- no tailscale address (see kernel/ha/node.sh)" ;;
    3) die "no answer from ${PEER_SSH:-the peer} -- see docs/HA.md 'pairing'" ;;
  esac
  PEER_INTEL="$PEER_HOME/Documents/intel"
}

# Claude Code's auth is machine-bound: a token that works here proves nothing there.
# Checking first turns a silent empty log into one sentence naming the fix.
preflight() {
  out=$(peer_bash '
    command -v claude >/dev/null 2>&1 || { echo NO_CLAUDE; exit 0; }
    [ -f "$HOME/.claude/.credentials.json" ] || { echo NO_AUTH; exit 0; }
    [ -d "$HOME/Documents/intel" ] || { echo NO_INTEL; exit 0; }
    echo READY')
  case "$out" in
    *NO_CLAUDE*) die "the peer has no claude binary -- npm install -g @anthropic-ai/claude-code" ;;
    *NO_AUTH*)   die "Claude Code is not signed in on the peer. Run 'claude' there once, sign in, Ctrl-D. Auth is machine-bound; nothing here can stand in for it." ;;
    *NO_INTEL*)  die "the peer has no ~/Documents/intel -- run 'sh kernel/ha/sync.sh' first" ;;
    *READY*)     : ;;
    *)           die "cannot read the peer's state: $out" ;;
  esac
}

cmd_start() {
  [ $# -ge 1 ] || die 'usage: handoff.sh start "<brief>"'
  BRIEF="$1"; shift
  SUBDIR=""
  while [ $# -gt 0 ]; do
    case "$1" in --dir) SUBDIR="${2:-}"; shift 2 ;; *) shift ;; esac
  done
  connect; preflight

  # The peer works from committed state. Anything uncommitted here simply is not
  # there, and a handoff that silently runs against a week-old tree is the kind of
  # bug you find three answers later.
  DIRTY=$(cd "$INTEL_ROOT" && git status --porcelain --untracked-files=no | head -5)
  if [ -n "$DIRTY" ]; then
    printf 'handoff: uncommitted changes here that the peer will not see:\n%s\n' "$DIRTY" >&2
    printf '         commit and push, or pass the detail inside the brief.\n\n' >&2
  fi

  ID="run-$(date +%Y%m%d-%H%M%S)"
  B64=$(printf '%s' "$BRIEF" | base64 | tr -d '\n')
  WORK="$PEER_INTEL${SUBDIR:+/$SUBDIR}"

  peer_bash "
    set -e
    mkdir -p $RUNS
    WORK='$WORK'; [ -d \"\$WORK\" ] || WORK='$PEER_INTEL'
    git -C '$PEER_INTEL' pull --ff-only >$RUNS/$ID.pull 2>&1 || true
    printf %s '$B64' | base64 -d > $RUNS/$ID.brief
    # systemd owns the run, not this ssh connection. setsid was not enough: a
    # 'wsl -- bash' invocation is a transient session, and when it ends WSL reaps
    # what it started -- the run died instantly and left a zero-byte log, which is
    # the most confusing possible failure because everything upstream succeeded.
    # A user unit outlives the session, and lingering keeps it alive past logout.
    if command -v systemd-run >/dev/null 2>&1 && systemctl --user is-system-running >/dev/null 2>&1; then
      systemd-run --user --unit=handoff-$ID --collect \
        --property=WorkingDirectory=\"\$WORK\" \
        bash -lc \"claude -p \\\"\\\$(cat $RUNS/$ID.brief)\\\" --permission-mode bypassPermissions > $RUNS/$ID.log 2>&1\" >/dev/null
      printf 'systemd\n' > $RUNS/$ID.how
    else
      cd \"\$WORK\"
      setsid nohup claude -p \"\$(cat $RUNS/$ID.brief)\" --permission-mode bypassPermissions \
        > $RUNS/$ID.log 2>&1 < /dev/null &
      echo \$! > $RUNS/$ID.pid
      printf 'setsid\n' > $RUNS/$ID.how
    fi
    printf 'started %s in %s\n' '$ID' \"\$WORK\"
  " || die "could not start the run"

  printf '\nhandoff: %s is running on %s\n' "$ID" "$PEER_ADDR"
  printf '  sh skills/handoff/handoff.sh wait %s\n' "$ID"
}

peer_state() { # peer_state <id>  ->  "running <secs>" | "finished <secs>" | "missing"
  peer_bash "
    [ -f $RUNS/$1.log ] || { echo missing; exit 0; }
    age=\$(( \$(date +%s) - \$(stat -c %Y $RUNS/$1.log 2>/dev/null || echo 0) ))
    st=\$(systemctl --user is-active handoff-$1 2>/dev/null || true)
    case \"\$st\" in
      active|activating|reloading) echo \"running \$age\"; exit 0 ;;
    esac
    pid=\$(cat $RUNS/$1.pid 2>/dev/null || echo 0)
    if [ \"\$pid\" != 0 ] && kill -0 \"\$pid\" 2>/dev/null; then echo \"running \$age\"
    else echo \"finished \$age\"; fi"
}

cmd_status() {
  connect
  if [ $# -ge 1 ]; then
    printf '%s: %s\n' "$1" "$(peer_state "$1")"
    return 0
  fi
  peer_bash "
    ls -1t $RUNS/*.log 2>/dev/null | head -10 | while read -r f; do
      id=\$(basename \"\$f\" .log)
      pid=\$(cat $RUNS/\$id.pid 2>/dev/null || echo 0)
      if [ \"\$pid\" != 0 ] && kill -0 \"\$pid\" 2>/dev/null; then st=running; else st=finished; fi
      printf '%-24s %-9s %s\n' \"\$id\" \"\$st\" \"\$(head -c 70 $RUNS/\$id.brief 2>/dev/null)\"
    done" || true
}

cmd_log() {
  [ $# -ge 1 ] || die 'usage: handoff.sh log <id> [--tail N]'
  ID="$1"; N=200
  [ "${2:-}" = "--tail" ] && N="${3:-200}"
  connect
  peer_bash "tail -n $N $RUNS/$ID.log 2>/dev/null || echo 'no such run: $ID'"
}

cmd_wait() {
  [ $# -ge 1 ] || die 'usage: handoff.sh wait <id> [--timeout S]'
  ID="$1"; TIMEOUT=3600
  [ "${2:-}" = "--timeout" ] && TIMEOUT="${3:-3600}"
  connect
  START=$(date +%s)
  while :; do
    st=$(peer_state "$ID")
    case "$st" in
      missing)   die "no such run: $ID" ;;
      finished*) break ;;
    esac
    [ $(( $(date +%s) - START )) -ge "$TIMEOUT" ] && {
      printf 'handoff: still running after %ss -- it keeps going, check back with status\n' "$TIMEOUT" >&2
      exit 2; }
    sleep 15
  done
  printf '── %s finished ──\n\n' "$ID"
  cmd_log "$ID"
}

cmd_fetch() {
  [ $# -ge 1 ] || die 'usage: handoff.sh fetch <id>'
  connect
  OUT="$INTEL_ROOT/var/handoff"
  mkdir -p "$OUT"
  rsync -az -e "$SSH" --rsync-path="$RSYNC_PATH" \
    "$PEER_SSH:$PEER_HOME/.openclaw/handoff/$1.log" "$OUT/" 2>/dev/null \
    || die "could not fetch $1"
  printf 'handoff: %s\n' "${OUT#$INTEL_ROOT/}/$1.log"
}

cmd_kill() {
  [ $# -ge 1 ] || die 'usage: handoff.sh kill <id>'
  connect
  peer_bash "systemctl --user stop handoff-$1 2>/dev/null && echo 'stopped $1' && exit 0
             pid=\$(cat $RUNS/$1.pid 2>/dev/null || echo 0)
             [ \"\$pid\" != 0 ] && kill \"\$pid\" 2>/dev/null && echo 'killed $1' || echo 'not running: $1'"
}

case "${1:-}" in
  start)  shift; cmd_start "$@" ;;
  status) shift; cmd_status "$@" ;;
  log)    shift; cmd_log "$@" ;;
  wait)   shift; cmd_wait "$@" ;;
  fetch)  shift; cmd_fetch "$@" ;;
  list)   shift; cmd_status ;;
  kill)   shift; cmd_kill "$@" ;;
  *) sed -n '2,/^# The peer runs/p' "$0" | sed '$d' | grep -v 'public:omit' | sed 's/^# \{0,1\}//' ;;
esac
