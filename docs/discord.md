# dexter over Discord

The folder is the agent; Discord is an optional front door to it. With `./setup` done, an
[OpenClaw](https://openclaw.ai) gateway runs Claude Code as a bot in a Discord server you own,
so you can reach the agent from anywhere, your phone included. The skills, lenses, queue,
memory and operating manual are the same files Claude Code reads in the folder. Discord adds
the channels, the daily posts and a heartbeat.

```
 phone ─► Discord ─► OpenClaw gateway ─► Claude Code, reading and editing this folder
```

## How it behaves

- You type in one channel, `#dexter`. The agent decides which channel the work belongs in,
  does it there, and leaves a one-line pointer where you asked.
- `/papers world models` runs a skill and `+deslop` applies a lens, exactly as in Claude Code.
  `??` lists everything.
- Long runs leave their reasoning in `#thinking`, as muted embeds so it never reads as an
  answer, and every routing decision lands in `#log`.
- `#queue` gets the queue every morning, and `#skills` gets the registry of skills.

## The channels

| Section | Channels | Who writes |
|---|---|---|
| **Yours** | `#dexter` `#inbox` `#general` · `#projects` `#recruiting` `#experiments` `#ideas` `#learning` | you; the agent replies |
| **Builder** | `#skills` `#queue` `#log` `#thinking` `#building` | the system building itself |
| **Notes** | `#notes` | you alone: the agent reads it for context and never posts there |

Every channel has a default posture, set by blast radius and overridable in any message:

- `auto` acts without asking (`#experiments`, `#ideas`).
- `plan` proposes first (most channels).
- `approve` does nothing without an explicit yes. Put it on any channel where a mistake
  costs something.

To change them, edit `etc/channels.json` (and `kernel/routing-table.json` to match), then run
`./setup` again. Channels that already exist are matched by name, never doubled, and a channel
whose mode is `read-only` is one the agent can read but never answers in.

## When it goes quiet

Start with `./setup doctor`. Then, in the order these failures actually stack:

1. **Plugin not trusted.** Discord is an external plugin: configured is not enough, it must
   also be trusted, or the inbound listener never starts while outbound still works.
   `openclaw config set plugins.entries.discord.enabled true`, then `openclaw gateway restart`.
   Healthy looks like `openclaw channels status` → `enabled, configured, running, connected`.
2. **The machine slept.** Sleep kills the websocket. On a Mac, battery sleep ignores
   `caffeinate`, and closing the lid ignores power: keep it plugged in and open, or run the
   gateway on something that stays on.
3. **Gateway wedged.** `admission closed: suspend phase` repeating every 30 seconds means a
   session hung mid-run. `openclaw gateway restart`.
4. **Poisoned session.** The bot reacts 👀 but never replies, and the log says
   `cause=skipped:duplicate`.
   `openclaw sessions archive --agent dexter "agent:dexter:discord:channel:<id>"`.

Don't restart the gateway while a run is in flight: long skill runs take 30 minutes or more,
and a restart redoes the work. `openclaw sessions --agent dexter --active 20` shows what is
live.

Three signals look like failure and are not: the typing indicator vanishing during a long
tool call, `stalled session` in the log after 15 minutes, and a long stretch with no disk
writes. `sh kernel/jobs/dexter-turns.sh` lists today's runs, and
`sh kernel/jobs/watch-dexter.sh` follows the log for the lines that matter.
