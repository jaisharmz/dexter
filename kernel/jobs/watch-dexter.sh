#!/bin/sh
# Event stream for monitoring Dexter. Each stdout line is one thing worth knowing.
#
# TWO LOGS, on purpose. The plain gateway.log carries transport and turn events;
# the daily JSON log carries the agent-side failures. Watching only one misses
# exactly the failures that matter — 'no queued reply payloads', 'cli terminal
# failure' and 'stalled session' appear ONLY in the JSON log.
#
# Patterns are validated against real log lines, not assumed. The first version of
# this filter used 'discord gateway: Gateway websocket closed' and matched zero
# lines, because the log writes '[discord] gateway: …'. It silently missed two real
# transport drops. Before adding a pattern, grep the log for it and confirm it hits.
#
#   trigger=user                  the operator sent a message; a run started
#   cli turn:                     turn finished — carries durationMs and outBytes.
#                                 outBytes distinguishes "model produced nothing"
#                                 from "reply was not delivered".
#   cli terminal failure          the run died          [JSON log]
#   CLI run aborted               killed mid-flight     [JSON log]
#   no queued reply payloads      reply generated then suppressed as a duplicate —
#                                 the react-but-never-speak bug   [JSON log]
#   stalled session               15-min heuristic, NOT a verdict  [JSON log]
#   host timing gap               the Mac slept; the socket is about to drop
#   Gateway websocket closed      transport dropped (usually auto-recovers)
#   ENOTFOUND                     DNS gone, typically right after a sleep
#   without explicit trust        plugin not loaded; inbound is silently dead
#   [gateway] ready               restarted — interrupts any in-flight run

# Paths are derived from this script's own location, not baked in. Dexter now runs
# on two machines with different home directories; a literal /Users/you made
# every one of these jobs a silent no-op on the PC.
_job_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INTEL_ROOT=${_job_dir%/kernel/jobs}

# macOS puts the gateway log under ~/Library/Logs; Linux/WSL uses XDG state. Pick
# whichever exists rather than assuming, so the same watcher runs on both nodes.
for _c in "$HOME/Library/Logs/openclaw/gateway.log" \
          "$HOME/.local/state/openclaw/gateway.log" \
          "$HOME/.openclaw/logs/gateway.log"; do
  [ -f "$_c" ] && PLAIN="$_c" && break
done
PLAIN=${PLAIN:-$HOME/.openclaw/logs/gateway.log}

# The JSON log filename carries the date and rotates at midnight. Computing it once
# at startup means that after midnight the tail follows a file that never gets
# another line — and the four failure patterns that live ONLY in that log go
# unwatched, silently. Observed 2026-09-02 00:01. So the JSON tail is supervised and
# relaunched when the date changes; the plain log has a stable path and does not need it.
{
  tail -F -n 0 "$PLAIN" 2>/dev/null \
    | grep -E --line-buffered \
        'trigger=user|cli turn:|host timing gap|without explicit trust|\[gateway\] ready|FATAL' &

  (
    cur="" ; tpid=""
    while true; do
      d=$(date +%F)
      if [ "$d" != "$cur" ]; then
        [ -n "$tpid" ] && kill "$tpid" 2>/dev/null
        cur="$d"
        tail -F -n 0 "/tmp/openclaw/openclaw-$d.log" 2>/dev/null \
          | grep -E --line-buffered \
              'cli terminal failure|CLI run aborted|no queued reply payloads|stalled session' &
        tpid=$!
      fi
      sleep 60
    done
  ) &
  wait
} | awk '{ if (length($0) > 165) $0 = substr($0,1,165); print; fflush() }'
