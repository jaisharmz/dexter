# dexter

A personal agent workspace for [Claude Code](https://claude.com/claude-code). Open the folder
in Claude Code and the agent works from the skills, rules and memory inside it.

A correction you make once becomes a file that every later run reads. Claude Code starts each
session from what is on disk, and dexter keeps more there, in plain files the agent edits as
it works. Each skill keeps a `LEARNED.md` of the corrections it has earned, read before every
run. A rule you care about becomes a lens you attach to any message with `+name`. Work that
cannot happen yet goes into a queue with its dependencies instead of being forgotten.

The same folder can also run as an always-on bot in your own Discord server, through
[OpenClaw](https://openclaw.ai), so you can reach it from your phone. Nothing else in it
depends on Discord.

## What it adds to Claude Code

| | what you get | Claude Code on its own |
|---|---|---|
| **Skills that learn** | When you correct a run, the lesson goes into that skill's `LEARNED.md` during the same run. Later runs read it before anything else, and a lesson that holds moves into the skill itself. | Skills are files you edit by hand. Auto memory keeps project notes, not corrections tied to a skill. |
| **Lenses** | Short rule files you attach to any message: `+deslop`, `+core`, `+ordering`. Two are always on: act without asking except for four kinds of decision, and run independent work in parallel. | Skills and output styles. Nothing attaches a rule to a single message. |
| **A queue of deferred work** | Work that is blocked waits on what it depends on and survives every session. Ask for a feature and the agent files the item. | A session's task list ends with the session. `/loop` and scheduled tasks repeat a prompt, but nothing keeps a backlog. |
| **An operating manual** | `AGENTS.md` makes the agent choose its lenses before the first step, save the prompts that show how you think, commit and push its own changes, and keep memory in dated files. | `CLAUDE.md` holds whatever you write in it. |
| **A private half** | `home/` is a separate git repository with no remote, for raw prompts, your writing, other people's writing and contacts. Privacy is a directory boundary, so a slip in habit cannot leak it. | One repository, kept private by `.gitignore` discipline. |
| **Approval before anything is sent** | It reads mail, pages and files freely and sends nothing without your yes for that specific act. | Permission modes govern tool calls, not what leaves in an email. |
| **Starter skills** | Research reading paths, field maps, the job search from sourcing to tracker, food orders, slides, self-emails and anonymization. | None. |
| **Discord, if you want it** | An OpenClaw gateway: one channel per kind of work, each with its own approval mode, daily queue and skills posts, and your phone. | Remote Control and the mobile app reach a session. There is no Discord gateway. |

Everything else (`CLAUDE.md`, skills, subagents, hooks, MCP connectors, auto memory, scheduled
tasks) is Claude Code's own, and dexter uses it as it is.

## What leaves your machine

- **Nothing is sent without your yes.** No email, message, post or form submission goes out
  until you approve that specific act, and no mode overrides this. Job applications stop at
  Submit unless you authorize a run to submit for you, and even then an agreement that waives
  a right, such as arbitration, comes back to you.
- **Your private half stays local.** `home/` has no remote and is ignored by the workspace.
  So are `USER.md`, `memory/`, every skill's `state/` and `config/` (apart from the
  `*.example.*` files), and every `*.csv`.
- **The workspace becomes your own private repository.** On the first run the agent renames
  this repository's remote to `upstream` and, with your yes, creates a private GitHub
  repository as `origin`. Your lessons, skills and lenses are pushed there. GitHub makes
  every fork of a public repository public, so this is a new repository instead of a fork.
- **The model sees what the agent reads,** as in any Claude Code session.

## How a run goes

You type `/role-apply Example Robotics`. Dexter reads `skills/role-apply/SKILL.md`, then the
skill's `LEARNED.md`, whose entries override it. It lists the company's open roles as a
multi-select, and you pick one. It fills the form in your browser from `config/profile.yaml`
and stops at Submit with a review sheet.

You notice the start-date box says "flexible" and reply that forms want a month and a year.
It fixes the field and, in the same run, writes one line to
`skills/role-apply/LEARNED.md`. Every later run of the skill, in any session, reads that line
before it starts. Once a lesson has held twice, or you state it as a rule, it moves into the
skill's own text.

## Start

Both ways in begin with a clone:

```
git clone --recurse-submodules https://github.com/jaisharmz/dexter
cd dexter
```

**In Claude Code.** You need git, python3, node and Claude Code. Run `claude` in the folder.
`.claude/skills` links to `skills/` and `CLAUDE.md` loads the operating manual, so nothing
else needs setting up. On your first message the agent reads `BOOTSTRAP.md`: it picks its own
name, asks you a few questions, creates `home/`, and offers to make the folder your own
private repository. Type `??` to list every skill and lens.

**Over Discord, optionally.** To reach it from your phone, run it as a bot on a machine that
stays on. Install OpenClaw, then run `./setup`:

```
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
./setup
```

`./setup` walks you through making a Discord bot and an empty server, which takes a few
minutes in Discord's developer portal. Then it points OpenClaw at this folder with your Claude
Code login, so the model runs on your subscription rather than API billing. It creates the
channels, lets only your account drive the bot, installs the gateway as a service, and
schedules the daily posts. Run it again any time, and `./setup doctor` checks every piece.
[`docs/discord.md`](docs/discord.md) covers the channels, their approval modes, and what to do
when the bot goes quiet.

## Starter skills

A skill is a folder with a `SKILL.md`, run as `/name`. Skills that need your details read them
from their own `config/` folder, which ships `*.example.*` files: copy one without `.example`,
fill it in, and git ignores the result.

**Research and learning**

| skill | what it does |
|---|---|
| `/papers <topic>` | Builds one ordered reading path in which the first M entries are about the best M you could have read, each saying which lab it came from and what that lab believes. |
| `/industry-research <field>` | Maps a field end to end with ten agents, from scouts to a page builder. The fact-checker runs before the style edit, so a fabricated finding cannot hide behind good prose. |
| `/guided-learning <topic>` | Teaches by asking one guiding question at a time, so you derive the idea instead of being handed it. `n` answers the current step for you, and `q` steps back to first principles. |
| `/proof-project <field>` | Finds the one project that would prove you can work in a field you have not worked in yet, ending in a sentence with a number that did not exist before. |

**The job search, from sourcing to tracker**

| skill | what it does |
|---|---|
| `/role-sourcing` | Finds companies worth applying to, from curated new-grad lists, VC portfolio boards and a daily watch of companies that post new-grad roles all year, and decides per company whether a decade there is well spent. |
| `/role-outreach <company>` | Chooses the channel (a fund's talent team, a referral, the role's owner, the form), finds the person, and leaves the email as a Gmail draft. It never sends. |
| `/role-apply <company>` | Fills the application in your browser and stops at Submit. In a run you authorize, it works down a queue, with a double-application check before every Submit. |
| `/role-tracker` | Keeps a Google Sheet of every application and live process, with a "Whose move" column that shows at a glance what is yours to do and what waits on someone else. |

**Everyday**

| skill | what it does |
|---|---|
| `/grubhub` | Orders food through a few multiple-choice questions, reads back the real total with every fee, and stops at Place Order. |
| `/slides <topic>` | Makes slides that look like yours: it measures your style from your own decks, builds a .pptx from that profile, and checks every slide in Google Slides before handing it over. |
| `/self-email` | Sends you a report you can read in a minute on your phone, with the detail in tables ordered by what to do first. |

**Quality and plumbing**

| skill | what it does |
|---|---|
| `/loops` | Runs adversarial and judge subagents over work that looks finished, before anyone else sees it. |
| `/anonymize <path>` | Removes the personal data from a file, folder or document and keeps the principles and the way of thinking, then scans the result for leaks. This repository is built with it. |
| `/dispatch` `/guidelines` `/skill-test` | Routing a message to the right channel, listing the lenses, and testing a new skill in a fresh session. |

## The lenses

A lens is a short markdown rule in `kernel/guidelines/`, attached to a message with `+name`.
They are plain text, so they also work pasted into any other chat. They began as one person's
rules for their own agent: edit them, delete them, or write your own.

| lens | the rule |
|---|---|
| `+ordering` | Order N items so that reading only the first M is about the best M you could have read. Each item earns its place by what it adds to the ones above it. |
| `+core` | Every problem, paper or topic turns on one idea that takes about five minutes to learn and unlocks far more than the thing itself. Find it and lead with it. |
| `+deslop` | Strip the tells of machine-written prose, using density budgets rather than bans. |
| `+presentation` | Present work like a proof: the method with a dummy example first, then results nobody can doubt. |
| `+small` | Make it work at the smallest scale that can show it, check it by eye, then grow in steps. |
| `+system-design` | Complexity, not correctness, is what kills long-lived systems. |
| `+abstraction` | Add an abstraction only if it shrinks what a reader has to hold in their head. |
| `+autonomy` `+throughput` | Always on. Act without asking unless it is a design decision, a captcha, a credential or a legal agreement, and run independent work in the background and in parallel. |

## Make it yours

**A skill** needs two fields of frontmatter and the instructions below them:

```markdown
---
name: standup
description: Write today's standup from yesterday's commits. Use when I say "standup".
---

# Standup

1. Run `git log --since=yesterday` in each repository under `~/code`.
2. Group the commits by project and write three lines: done, doing, blocked.
3. Keep it under 80 words, and ask before posting it anywhere.
```

Save it as `skills/standup/SKILL.md` and it is `/standup` in every new session.
`/skill-test standup "write my standup"` runs it in a fresh session, and
`bash kernel/skill-learn.sh sync` adds the learning footer every skill carries.

**A lesson** is one dated line in the skill's `LEARNED.md`. The agent writes it with
`bash kernel/skill-learn.sh record <skill> "<what to do differently>"` during the run that
taught it, and says so in one line:

```markdown
- **2026-10-01** — "When can you start?" takes a month and a year, not a sentence.
```

**A lens** is a markdown file with `name`, `summary` and `triggers` frontmatter in
`kernel/guidelines/`, with a short form in `kernel/guidelines/aliases.json`.

**Deferred work** goes in the queue:

```
node kernel/queue.mjs list          what is ready, what is blocked and on what
node kernel/queue.mjs next          the highest-priority eligible item
node kernel/queue.mjs add "<title>" --priority 7 --depends 4
node kernel/queue.mjs done 4
```

`git pull upstream main` takes new versions of dexter into your own repository.

## What the agent reads

| file | when | what it holds |
|---|---|---|
| `CLAUDE.md` | every Claude Code session | imports the files below |
| `AGENTS.md` | every session | the operating manual |
| `SOUL.md`, `IDENTITY.md` | every session | its character, and the name it picked on the first run |
| `USER.md` | every session | your preferences, as dated directives it rewrites when they change |
| `BOOTSTRAP.md` | the first run, then deleted | the first-run steps |
| `skills/<name>/SKILL.md`, then `LEARNED.md` | when the skill runs | the skill, then its corrections, which win |
| `kernel/guidelines/<lens>.md` | on `+lens`; `autonomy` and `throughput` always | the lens |
| `memory/YYYY-MM-DD.md` | written as it works | the day's notes |

## Related projects

[LifeOS](https://github.com/danielmiessler/LifeOS) is the closest relative: a personal AI
harness on Claude Code built around your goals and context.
[Superpowers](https://github.com/obra/superpowers) is a skills framework and development
methodology for coding agents. [anthropics/skills](https://github.com/anthropics/skills) is
Anthropic's public collection of agent skills. [OpenClaw](https://openclaw.ai) is the gateway
dexter uses for Discord.

## Where it came from

dexter is the public build of intel, the private workspace its author runs every day. When
something significant changes there, an agent carries it across: `/anonymize` takes out the
personal data and keeps the thinking, a leak gate scans the result, and the author approves
every push. So this repository moves with a setup in daily use.

Built by Jai Sharma on Claude Code. MIT licensed.
