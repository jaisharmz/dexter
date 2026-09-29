# Two machines, one Dexter

The laptop is not a host for an always-on service. Across 2026-08-31 to 09-05 it
froze for **206 minutes**, dropped the Discord websocket on every wake, and took
the 3am memory-consolidation cron down with it. None of that is a bug in Dexter.
The PC is on all the time; the laptop is not.

So Dexter now lives on both, with the PC as the machine that actually answers and
the Mac as a warm standby. Texting from a phone reaches the PC, whether or not the
laptop is open, asleep, or in a backpack.

---

## The one rule

**Exactly one node holds Discord at a time.**

Discord will happily deliver the same message to two connections using the same bot
token. Two live Dexters means every message answered twice — and, far worse, every
approved send going out twice. A duplicated reply is embarrassing. A duplicated send
cannot be taken back.

Everything in `kernel/ha/` exists to enforce that one rule.

---

## Roles

Each machine holds two small files under `~/.openclaw/ha/`, and they are the only
state that is deliberately **not** synced — mirroring them would give both nodes
the same role and undo the whole arrangement.

| file | meaning |
|---|---|
| `role` | `active` (owns Discord), `standby` (inert replica), or `off` (maintenance) |
| `primary` | which node owns Dexter in steady state, and the only one allowed to send email |

The standby does not merely have Discord switched off — **its gateway is not
running at all**. That matters because two of Dexter's crons are agent turns rather
than shell scripts (Memory Dreaming, the weekly skill review), so a script-level
guard cannot reach inside them. No gateway, nothing to fire, no tokens burned
rewriting memory that the active node is also rewriting.

---

## Failover

`kernel/ha/watchdog.sh` runs every 30s on both machines and is the only writer of
the role file. It only ever changes its *own* node's role, so there is no
distributed agreement to get wrong.

```
standby: primary unreachable 6× in a row (~3 min)  ->  start my gateway, become active
standby: primary answers 2× in a row               ->  stop my gateway, become standby
primary: I am healthy and booted > 90s ago         ->  start my gateway, become active
```

Three protections against both nodes going live at once:

1. **Self-isolation check.** A standby that cannot reach `discord.com` refuses to
   promote. If your laptop's wifi drops, the laptop is the broken one — it must not
   conclude the PC died and seize control.
2. **Hysteresis.** Six failures to promote, two successes to hand back. The
   Mac↔PC tailscale path drops often enough that a single missed probe must not
   trigger a takeover.
3. **Boot holdoff.** A returning primary waits 90s — longer than the standby needs
   to notice it is back and step down — so the handback never overlaps.

Anything that slips past all three costs one duplicated chat reply, which is
visible and self-corrects on the next tick.

### Why "up" means more than "the box pings"

On 2026-09-05 the Mac's gateway was alive and healthy for 45 minutes while its
Discord websocket was closed. Pinging the host would have reported a perfectly
healthy node that could not receive a single message. `kernel/ha/health.sh` asks
the gateway, and locally also asks whether Discord is actually attached.

---

## The two-tier guard

`kernel/ha/guard.sh` gates every job that causes a side effect:

```sh
sh "$INTEL_ROOT/kernel/ha/guard.sh" queue-digest             || exit 0   # reversible
sh "$INTEL_ROOT/kernel/ha/guard.sh" --primary-only outbound  || exit 0   # irreversible
```

| tier | runs on | used for |
|---|---|---|
| default | whichever node is active | digests, registries, replies — anything you can simply do again |
| `--primary-only` | the designated primary, **even during a failover** | anything that sends |

The second tier is the deliberate asymmetry. If the PC is down when a send is due,
the send does not happen that day, and Dexter says so. **A day late beats
twice-sent** — that is the whole trade, and it is why split brain can never cost
more than a duplicate message.

Skips are written to `~/.openclaw/ha/guard.log`, never to Discord: cron stdout is
announced, and a daily "skipped, I am standby" post is noise. But a job that
silently never runs still has to be discoverable, so it goes in the log.

---

## State replication

`kernel/ha/sync.sh` mirrors **from the active node to the standby**. One-way, never
a merge — there is exactly one writer at a time, so nothing needs reconciling.

- workspace `intel/` (with the nested private `home/`), history included
- `openclaw.sqlite` (config + secret store), the agent session DB, `prospects.db`
- `~/Downloads/outbound_attachments/optimized` — the attachments every draft references,
  which live outside both repos and are the easiest thing to forget

SQLite is **snapshotted with `.backup`, not copied.** Those are live WAL databases;
rsyncing them under an open gateway yields a torn file that looks fine until the
moment you need it.

Virtualenvs are never synced — they bake absolute interpreter paths, so a copied
`.venv` from macOS is inert on WSL. They get rebuilt per machine.

After a failover, the node that was serving holds the newer state, so hand it back
explicitly:

```sh
sh kernel/ha/sync.sh --force     # run on the node that was active
```

---

## Doing it by hand

```sh
sh kernel/ha/watchdog.sh --dry-run     # what would it decide right now?
sh kernel/ha/health.sh                 # is my own Dexter serving?
sh kernel/ha/health.sh 100.64.0.2    # is the PC serving?

printf 'off\n'    > ~/.openclaw/ha/role      # take this node out of the pair
printf 'active\n' > ~/.openclaw/ha/role      # force this node to serve
printf 'pc\n'     > ~/.openclaw/ha/primary   # move the crown
```

Taking a node `off` is the right move before maintenance: the watchdog stands down
and will not promote or demote anything until you set a role again.

---

## Addresses

| node | tailscale | role in steady state |
|---|---|---|
| `mac` | `100.64.0.1` | standby |
| `pc` (WSL) | `100.64.0.2` | **primary** |

Identity is derived from the tailscale IP actually assigned to the host, not from
the hostname — a renamed machine cannot lie about which node it is.
