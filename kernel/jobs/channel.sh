#!/bin/sh
# channel_id <name>: the Discord id of a channel. Sourced, never run directly, after
# nodejs-path.sh has put a node on PATH.
#
# The jobs used to carry ids as literals, which tied every script to one server. Ids
# live in the channel map now: ./setup writes them to etc/channels.local.json, which git
# ignores, and a map that carries its own ids (etc/channels.json) works as well. A
# placeholder id (zeros, before setup has run) counts as missing.
channel_id() {
  node -e '
    const fs = require("fs");
    const [map, local, name] = process.argv.slice(1);
    const ids = fs.existsSync(local) ? JSON.parse(fs.readFileSync(local, "utf8")).ids || {} : {};
    const id = ids[name] || (JSON.parse(fs.readFileSync(map, "utf8")).channels[name] || {}).id;
    if (!/^[1-9][0-9]{16,19}$/.test(id || "")) process.exit(1);
    console.log(id);' "$INTEL_ROOT/etc/channels.json" "$INTEL_ROOT/etc/channels.local.json" "$1"
}
