# dexter

A personal agent OS you can run yourself. **Discord is the interface, this folder is the
filesystem, OpenClaw is the kernel, and the agent is called Dexter.** Under the hood,
Dexter is Claude Code, run by [OpenClaw](https://openclaw.ai) behind a Discord bot you
own, so you can reach it from anywhere, your phone included.

The point is not the skills it ships with. It's that adding the next one is cheap: a
skill is a markdown file, a lens is a markdown file, and the agent edits both, so a
correction made in one run is a file the next run reads.

```
 phone ─► Discord ─► OpenClaw gateway ─► Claude Code, as Dexter
                     (the kernel)             │ reads and edits
                                              ▼
                     this folder   skills/      what it can do: /commands
                                   kernel/      how it works: +lenses, the queue, jobs
                                   AGENTS.md    its operating manual
                                   home/        your private half, its own repository
```

## Set it up

You need a Mac, Linux or WSL machine that stays on, with git, python3,
[Claude Code](https://claude.com/claude-code) logged in, and OpenClaw:

```
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
```

Then:

```
git clone --recurse-submodules https://github.com/jaisharmz/dexter
cd dexter
./setup
```

`./setup` walks you through making a Discord bot and an empty server, which takes a few
minutes in Discord's developer portal, and does the rest itself:

- points OpenClaw at this folder, signed in with your Claude Code login, so the model runs
  on your subscription rather than API billing
- creates the channels in your server, and keeps their ids in `etc/channels.local.json`,
  which git ignores
- lets only you drive Dexter: the bot answers your Discord account and nobody else's
- installs the gateway as a service, so Dexter survives reboots
- schedules the daily `#queue` digest and `#skills` registry
- links `skills/` into Claude Code, and creates `home/` as its own private repository

Run it again any time; it only does what is missing. `./setup doctor` checks every piece
and says what to fix. Then say hello in `#dexter`: on its first message Dexter reads
`BOOTSTRAP.md`, picks its own name, vibe and emoji, and asks you a few questions.

## In one minute

- You type in one channel, `#dexter`. Dexter decides which channel the work belongs in,
  does it there, and leaves a one-line pointer where you asked.
- `/papers world models` runs a skill. `+deslop` applies a lens to one message. Those two
  sigils are the whole calling convention, and `??` lists everything.
- A skill is a folder with a `SKILL.md`. Drop one into `skills/` and it is a `/command` in
  every new session, in Discord and in Claude Code, with nothing to register.
- When you correct a run, the lesson goes into that skill's `LEARNED.md` during the same
  run, and every later run reads it first.
- It reads anything and sends only what you approve. No email, message or post leaves the
  machine without a yes for that specific act.

## What's inside

| path | what it is |
|---|---|
| `AGENTS.md` | the operating manual Dexter reads every session |
| `skills/` | `dispatch` routes `#dexter` into channels, `guidelines` lists and applies lenses, `loops` runs adversarial and judge subagents over finished work, `skill-test` tries a new skill in a fresh session, and `papers` builds an ordered reading path on any topic |
| `kernel/guidelines/` | the lenses: short rules pulled into any message with `+` |
| `kernel/queue.mjs` | deferred work with dependencies, so blocked work waits instead of vanishing |
| `kernel/skill-learn.sh` | records a correction into a skill's `LEARNED.md` |
| `kernel/jobs/` | the daily posts, and two scripts for watching a long run |
| `etc/channels.json` | the channel map: purpose, default mode and id of every channel |
| `kernel/routing-table.json` | how `dispatch` decides where a message goes, in a file you can correct |
| `home/` | your private half: raw prompts, your writing, other people's writing, contacts |

## The lenses

A lens is a prompt fragment in `kernel/guidelines/`. They began as rules one person wrote
down for his own agent; edit them, delete them, or write your own.

| lens | the rule |
|---|---|
| `+ordering` | Order N items so that reading only the first M is about the best M you could have read. Each item earns its place by what it adds to the ones above it. |
| `+core` | Every problem, paper or topic turns on one idea that takes about five minutes to learn and unlocks far more than the thing itself. Find it and lead with it. |
| `+deslop` | Strip the tells of machine-written prose, using density budgets rather than bans. |
| `+presentation` | Present work like a proof: the method with a dummy example first, then results nobody can doubt. |
| `+small` | Make it work at the smallest scale that can show it, check it by eye, then grow in steps. |
| `+system-design` | Complexity, not correctness, is what kills long-lived systems. |
| `+abstraction` | Add an abstraction only if it shrinks what a reader has to hold in their head. |
| `+autonomy` `+throughput` | Always on. Act without asking unless it's a design decision, a captcha, a credential or a legal agreement, and run everything in the background and in parallel. |

## Make it yours

**A skill.** Make `skills/<name>/SKILL.md` with `name` and `description` frontmatter and
the instructions below it. Then `/skill-test <name> "<a prompt that should use it>"`
runs it in a fresh session, and the verdict lands in `#building`. `bash kernel/skill-learn.sh sync` adds the learning
footer every skill carries.

**A lens.** Drop a markdown file with `name`, `summary` and `triggers` frontmatter into
`kernel/guidelines/`, and give it a short form in `kernel/guidelines/aliases.json`.

**The channels.** Edit `etc/channels.json` (and `kernel/routing-table.json` to match),
then run `./setup` again. Channels that already exist are matched by name, never doubled,
and a channel whose mode is `read-only` is one Dexter can read but never answers in.

**Your private half.** `home/` is a separate git repository with no remote, ignored by
this one, along with `USER.md`, `memory/` and your server's ids. Push your fork of this
folder and nothing personal goes with it.

## Day to day

| Section | Channels | Who writes |
|---|---|---|
| **Yours** | `#dexter` `#inbox` `#general` · `#projects` `#experiments` `#ideas` `#learning` | you; Dexter replies |
| **Builder** | `#skills` `#queue` `#log` `#thinking` `#building` | the system building itself |
| **Notes** | `#notes` | you alone: Dexter reads it for context and never posts there |

Every channel has a default posture, set by blast radius and overridable in any message:

- `auto` acts without asking (`#experiments`, `#ideas`)
- `plan` proposes first (most channels)
- `approve` does nothing without an explicit yes. Put it on any channel where a mistake
  costs something.

Long runs leave their reasoning in `#thinking`, as muted embeds so it never reads as an
answer, and every routing decision lands in `#log`.

## Deferred work

```
node kernel/queue.mjs list          what's ready, what's blocked and on what
node kernel/queue.mjs next          highest-priority eligible item
node kernel/queue.mjs add "<title>" --priority 7 --depends 4
node kernel/queue.mjs done 4
```

Items carry dependencies and are topologically sorted, so nothing is dropped, only
blocked. Ask Dexter for a feature in any channel and it files the item itself; `#queue`
gets the list every morning.

## When it goes quiet

Start with `./setup doctor`. Then, in the order these failures actually stack:

1. **Plugin not trusted.** Discord is an external plugin: configured is not enough, it
   must also be trusted, or the inbound listener never starts while outbound still works.
   `openclaw config set plugins.entries.discord.enabled true`, then
   `openclaw gateway restart`. Healthy looks like `openclaw channels status` →
   `enabled, configured, running, connected`.
2. **The machine slept.** Sleep kills the websocket. On a Mac, battery sleep ignores
   `caffeinate`, and closing the lid ignores power: keep it plugged in and open, or run
   Dexter on something that stays on.
3. **Gateway wedged.** `admission closed: suspend phase` repeating every 30 seconds means
   a session hung mid-run. `openclaw gateway restart`.
4. **Poisoned session.** Dexter reacts 👀 but never replies, and the log says
   `cause=skipped:duplicate`.
   `openclaw sessions archive --agent dexter "agent:dexter:discord:channel:<id>"`.

Don't restart the gateway while a run is in flight: long skill runs take 30 minutes or
more, and a restart redoes the work. `openclaw sessions --agent dexter --active 20` shows
what's live.

Three signals that look like failure and aren't: the typing indicator vanishing during a
long tool call, `stalled session` in the log after 15 minutes, and a long stretch with no
disk writes. `sh kernel/jobs/dexter-turns.sh` lists today's runs, and
`sh kernel/jobs/watch-dexter.sh` follows the log for the lines that matter.

## Where it came from

dexter is the public bootstrap of intel, the private workspace my own Dexter runs from.
When something significant changes there, such as a new mechanism or a better skill, an
agent carries it across through a leak gate, and I approve every push. So this repository
moves with a setup that is used every day.

Built by Jai Sharma on OpenClaw and Claude Code. MIT licensed.
