#!/bin/sh
# Is a node's Dexter actually serving Discord? Prints "up" or "down", exit 0/1.
#
#   sh kernel/ha/health.sh            # this node
#   sh kernel/ha/health.sh <addr>     # a peer over tailscale
#
# "Serving" deliberately means more than "the box pings". On 2026-09-05 the Mac's
# gateway process was alive and healthy for 45 minutes while its Discord websocket
# was closed -- pinging the host would have reported a healthy node that could not
# receive a single message. So the probe asks the gateway itself, and a node only
# counts as up if the gateway answers AND reports discord connected.
set -u
_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$_dir/node.sh"

ADDR=${1:-127.0.0.1}
PORT=${HA_GATEWAY_PORT:-18789}

BODY=$(curl -s -m 6 "http://$ADDR:$PORT/health" 2>/dev/null) || BODY=""
case "$BODY" in
  *'"ok":true'*) ;;
  *) echo down; exit 1 ;;
esac

# The gateway is alive. Now: does it hold Discord? Only meaningful locally --
# /health does not expose channel state, so a remote probe stops at liveness.
if [ "$ADDR" = "127.0.0.1" ] || [ "$ADDR" = "localhost" ]; then
  if ! openclaw channels status 2>/dev/null | grep -qi 'discord'; then
    echo down; exit 1
  fi
fi

echo up
