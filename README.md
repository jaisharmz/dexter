# intel — Dexter

A personal agent OS. **Discord is the interface, this folder is the filesystem,
OpenClaw is the kernel, and the agent is called Dexter.** Under the hood, Dexter is
Claude Code, run by [OpenClaw](https://openclaw.ai) behind a Discord bot. It runs on a
Mac and an always-on PC, and you reach it from anywhere, including your phone.

The point of the design is not the skills it has today. It's that adding the next one
is cheap. A skill is a markdown file, a lens is a markdown file, and the agent edits
both, so a correction made in one run is a file the next run reads.

```
 phone ─► Discord ─► OpenClaw gateway ─► Claude Code, as Dexter
                     (the kernel)             │ reads and edits
                                              ▼
                          intel/   skills/    what it can do: /commands
                                   kernel/    how it works: +lenses, the queue, failover
                                   AGENTS.md  its operating manual
```

## In one minute

- You type in one Discord channel. Dexter decides which channel the work belongs in,
  does it there, and leaves a one-line pointer where you asked.
- `/papers world models` runs a skill. `+deslop` applies a lens to one message. Those
  two sigils are the whole calling convention.
- A skill is a folder with a `SKILL.md`. Drop one into `skills/` and it is a `/command`
  in Discord on the next message and in Claude Code from the next session, with nothing
  to register. Copied into `~/.claude/skills`, the same folder works in plain Claude
  Code, with no Discord at all.
- When you correct a run, the lesson goes into that skill's `LEARNED.md` during the same
  run, and every later run reads it before starting.
- It reads anything and sends only what you approve. No email, message or post leaves
  the machine without a yes for that specific act, so food orders stop at Place Order
  and outreach waits as a draft until you approve it.

## What it does

The skills in this repo, all in regular use:

| skill | what it does |
|---|---|
| `/grubhub` | Orders food by asking a few multiple-choice questions, reads back the real total with every fee, and stops at the Place Order button. |
| `/papers <topic>` | Builds one ordered reading path, where the first M entries are about the best M you could have read. Each entry says which lab it came from and what that lab believes. |
| `/industry-research <field>` | Maps a field end to end with ten agents, from scouts to a page builder. The fact-checker runs before the style edit, so a fabricated finding can't hide behind good prose. |
| `/proof-project <field>` | Finds the one project that would prove you can work in a field you haven't worked in yet. Each project ends in a sentence with a number that did not exist before. |
| `/loops` | Runs adversarial and judge subagents over work that looks finished, before anyone else sees it. |
| `/handoff` | Hands the current task to the home PC, so the laptop can close without killing it. |
| `/dispatch` `/guidelines` `/skill-test` | The plumbing: routing a message to its channel, listing the lenses, and testing a new skill in a fresh session. |

`papers` is its own repo, included here as a submodule.

## Lenses

A lens is a prompt fragment in `kernel/guidelines/`, pulled into any message with `+`.
Most are rules Jai stated once, in his own words, and the agent now applies them
whenever they fit.

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

---

## Try it

**Just the skills, in Claude Code.** Clone the repo and copy the skills you want into
your own skills folder. They work without Discord or OpenClaw:

```
git clone --recurse-submodules https://github.com/jaisharmz/intel-public
mkdir -p ~/.claude/skills
cp -R intel-public/skills/loops intel-public/skills/papers ~/.claude/skills/
```

Then `/loops` or `/papers <topic>` in any Claude Code session. The lenses work the same
way: paste one in, or ask Claude to read `kernel/guidelines/ordering.md` before it
answers.

**The whole thing.** Install [OpenClaw](https://openclaw.ai), point its workspace at
this folder, and give it a Discord bot:

```
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --auth-choice anthropic-cli
openclaw config set agents.defaults.workspace "$PWD/intel-public"
openclaw secrets store set DISCORD_BOT_TOKEN --kind secret --value-file -
openclaw config set channels.discord.token --ref-provider default --ref-source store --ref-id DISCORD_BOT_TOKEN
openclaw config set plugins.entries.discord.enabled true
openclaw gateway install
```

The channel IDs in `etc/channels.json` are zeros; put your own server's in. The model
runs on a Claude Code subscription rather than API billing. On the first
message, `BOOTSTRAP.md` walks the agent through its first run, and the agent deletes it
when it is done.

---

## Day to day

**You type in one place: `#dexter`.** Dexter reads it, decides where the work belongs,
does it there, and leaves a one-line pointer back in `#dexter`. You never pick a
channel, and you never file a queue item by hand.

Two sigils are the whole calling convention:

```
/papers world models              run a skill
+deslop write me a summary        apply a guideline to this one message
+deslop +abstraction <task>       stack as many as you like
??                                show everything available
```

`/` **does** a thing. `+` **adds a lens**. Full detail in `kernel/syntax.md`; the `??`
index is pinned in `#dexter`.

### The three sections in Discord

| Section | Channels | Who writes |
|---|---|---|
| **Yours** | `#dexter` `#inbox` `#general` · `#recruiting` `#outreach` `#sourcing` `#projects` `#experiments` `#prospective-ideas` `#learning` `#people` `#health` | you; Dexter replies |
| **Builder** | `#skills` `#queue` `#log` `#thinking` `#building` `#guidelines` `#perspectives` | the system building itself |
| **Notes** | `#notes` | **you alone**: Dexter reads it for context and never posts there |

`#notes` is for life, meetings and thinking. Dexter treats it as read-only context and
will not speak in it.

Each channel has its purpose pinned. The full map lives in `etc/channels.json`.

### Modes

Every channel has a default posture, set by blast radius and overridable in any single
message:

- `auto` — act without asking (`#experiments`, `#prospective-ideas`)
- `plan` — propose first (most channels)
- `approve` — nothing happens without an explicit yes (`#outreach`)

One rule no mode overrides: **Dexter reads anything and sends nothing.** No email,
message, or post leaves the machine without you approving that specific act.

---

## Adding things

**A skill**: drop a folder with a `SKILL.md` into `skills/`. It becomes a `/command`
in Discord on the next message *and* in Claude Code from the next session, with no
registration step.
`skills/` is the canonical tree and `~/.claude/skills` is a symlink to it, so both
tools read the same files.

**A guideline**: drop a markdown file with `name` / `summary` / `triggers`
frontmatter into `kernel/guidelines/`. It becomes a `+lens`.

Both directions work: make it in the folder and it's in Discord; make it from Discord
and it's in the folder.

**Skills learn from use.** A skill is a document, and a document can be wrong. When a
run is corrected, the correction is recorded in that same run:

```
bash kernel/skill-learn.sh record grubhub 'Tip presets stop at $4.00; anything else needs Custom tip'
```

It lands as a dated line in `skills/grubhub/LEARNED.md`, which overrides `SKILL.md`
and is read first on every run. A lesson confirmed twice is promoted into `SKILL.md`
itself. The protocol is in `kernel/skill-learning.md`.

---

## Deferred work

```
node kernel/queue.mjs list          what's ready, what's blocked and on what
node kernel/queue.mjs next          highest-priority eligible item
node kernel/queue.mjs add "<title>" --priority 7 --depends 4
node kernel/queue.mjs done 4
```

Items carry dependencies and are topologically sorted, so nothing is dropped — only
blocked. A cron job posts the queue to `#queue` daily, and a heartbeat runs every 30
minutes. This is what makes "queue the health app until the main piece is done" a
property of the system rather than something anyone has to remember.

---

## Two machines, one Dexter

A laptop is not a host for an always-on service: in its first week the Mac froze for
206 minutes in total and dropped Discord on every wake. So Dexter runs on both machines, with
the PC answering and the Mac as a warm standby. **Exactly one node holds Discord at a
time**, because two live Dexters would answer every message twice.

- Each node only ever changes its own role file, so there is no vote to get wrong. A
  standby that can't reach `discord.com` refuses to take over, because then it's the
  broken one.
- Anything irreversible runs only on the designated primary, even during a failover.
  If the primary is down, the job waits a day. A day late beats twice-sent.
- "Up" means the gateway answers, and on the node itself, that Discord is attached.
  The Mac once served a healthy gateway for 45 minutes with its Discord socket closed.

The design is in `docs/HA.md`, and the scripts are in `kernel/ha/`.

---

## Layout

```
intel/
├── README.md              this file
├── AGENTS.md SOUL.md      how Dexter operates; who it is
├── IDENTITY.md            Dexter fills this in itself
├── BOOTSTRAP.md           read once on first run, then deleted
├── CLAUDE.md              the same manual, for Claude Code sessions in this folder
├── kernel/                queue.mjs · guidelines/ · jobs/ · ha/ · public/ · syntax.md
│                          reasoning.md · routing-table.json · skill-learning.md
├── etc/channels.json      channel map: id, mode, write direction, category
├── skills/                CANONICAL skills. ~/.claude/skills → here
├── docs/                  DESIGN.md (architecture) · HA.md (two machines)
└── home/                  ← PRIVATE repo, gitignored by the parent
    ├── prompts/           raw prompts, verbatim
    ├── corpus/            things you wrote
    ├── reference/         things other people wrote, never mixed with corpus
    └── people/            contacts
```

**Two repos on purpose.** Personal data can't reach the shareable repo because it
lives in a different repository: a directory boundary, not a habit. A global `*.csv`
rule backs it up, because data files are where contact details end up, whatever
folder they sit in.

---

## What's not here

This repo is a mirror of a private one, and the private half stays private: daily
memory logs and the nightly consolidation that folds them into long-term memory, raw
prompts, contacts, `USER.md`, per-skill state, the job-search skills, and anything for
school. A few docs point at skills and setup files that stay private; they exist,
just not here.

An agent regenerates the mirror whenever something significant changes, with
`kernel/public/sync.sh`:

- Only committed files on an allowlist cross, so a gitignored file can't, whatever the
  list says.
- Private paragraphs inside public files are fenced with `public:omit` markers and
  dropped on the way out.
- A leak gate fails the build on any string from a private denylist, and on anything
  shaped like an email address, IP, Discord ID, home directory, phone number, key or
  token.
- The push waits for a human yes, because a push here is publishing.

---

## Operating it

```
openclaw gateway status             is it up
openclaw skills list                what Dexter can see
openclaw cron list                  scheduled jobs
tail -f ~/Library/Logs/openclaw/gateway.log
```

The gateway runs as a LaunchAgent on the Mac and a systemd service on the PC, so it
survives reboots.

**If Dexter goes quiet, work down this list.** All four of these happened on day one,
stacked, each hiding the next.

1. **Plugin not trusted.** `grep 'without explicit trust' ~/Library/Logs/openclaw/gateway.log`.
   Discord is an *external* plugin: being configured is not enough, it must also be
   trusted or the inbound listener never starts. Outbound still works, which makes this
   look like a model problem rather than a transport one.
   Fix: `openclaw config set plugins.entries.discord.enabled true` and restart.
   Healthy looks like: `openclaw channels status` → `enabled, configured, running, connected`.

2. **The Mac slept.** `grep 'host timing gap' <log>`: a freeze kills the websocket
   (`code=1006`, then `ENOTFOUND` while DNS recovers). The `ai.openclaw.caffeinate`
   LaunchAgent exists to prevent this; check it is loaded with
   `launchctl list | grep caffeinate`.

3. **Gateway wedged.** Symptom is `admission closed: suspend phase` looping every 30s
   with `restart deferred: gateway still has active work`: a session hung mid-run and
   nothing new is admitted. Fix: `openclaw gateway restart`.

4. **Poisoned session.** Dexter reacts 👀 but never replies, and the log says
   `no queued reply payloads ... cause=skipped:duplicate`. The reply is generated and
   then suppressed as a duplicate. Fix:
   `openclaw sessions archive --agent dexter "agent:dexter:discord:channel:<id>"`.

**Do not restart the gateway while a run is in flight.** Long skill runs take 30+
minutes. A restart interrupts them; OpenClaw does recover (`started interrupted main
session`, `main-session restart recovery`) but resets with `reason=orphaned-tool-use`
and redoes the work. Check first:

```
openclaw sessions --active 20        # any live session?
```

Config changes that need a restart can wait until it's idle.

**Two different sleeps, two different fixes.** `pmset -g log | grep 'Sleep  '` names
which one:

| log says | cause | fix |
|---|---|---|
| `Maintenance Sleep ... Using Batt` | on battery | plug it in; `caffeinate -s` only holds on AC |
| `Clamshell Sleep` | **lid closed** | `sudo pmset -a disablesleep 1`, or attach an external display |

Lid-close sleep **ignores AC power** and ignores every caffeinate assertion. Observed
2026-09-01: a run was killed mid-flight, lost its session (`useResume=false
session=none`) and restarted from scratch. Plugging in does not help this one.

`caffeinate -s`, the flag the LaunchAgent uses, **only holds system sleep while on
AC power**. On battery the Mac enters `Maintenance Sleep` regardless, the Discord
socket dies with a 1006, and DNS fails on wake. This produced six dropouts in 35
minutes on 2026-08-31 with the lid open and the caffeinate assertion held the whole
time. `PreventSystemSleep 0` in `pmset -g assertions` is the tell. The fix is to plug
the laptop in, not `sudo pmset disablesleep`.

**Checking on a long run:** `sh kernel/jobs/dexter-status.sh`. It reports transport,
whether the model is alive (CPU advancing over a 20s sample), and which pipeline phase
it is in.

Three signals that look like failure and are not:

- **No typing indicator.** Discord's expires after ~10s and is not refreshed during a
  long tool call.
- **`stalled session` in the log.** Fires at 15 minutes. A research run legitimately
  exceeds it.
- **No disk writes.** Some phases are network-bound and write nothing for a long
  stretch. Silence between ingestion and drafting is the normal shape.

**Two traps when checking by hand.** BSD `find` silently matches *nothing* for a
relative `-newermt '-90 minutes'`: it does not error, it just lies. And the Bash tool
keeps its working directory between calls, so a relative path can resolve somewhere
unintended and return empty. Use absolute paths and absolute timestamps. Both of these
produced a false "it has written nothing" verdict that nearly got a healthy run killed.

**Reading the log:** it is JSON per line. `cli turn: ... outBytes=N` means the model
produced N bytes, which is how you tell "the model failed" from "the reply was not
delivered". `cli terminal failure ... CLI run aborted` is the former.

**If Discord goes quiet:** `openclaw secrets audit` first. A token reference that
stops resolving is the most likely cause, and it fails silently rather than loudly.

---

## Where to read more

- `docs/DESIGN.md`: the first week's architecture, what was deliberately *not* built,
  open questions
- `docs/HA.md`: two machines, one Dexter
- `AGENTS.md`: the operating manual the agent itself reads
- `kernel/syntax.md`: the calling convention in full
- `kernel/skill-learning.md`: how a skill corrects itself
- `kernel/guidelines/`: the lenses

Built by Jai Sharma on OpenClaw and Claude Code. MIT licensed.
