# CLAUDE.md

This folder is `intel` — a personal agent OS. Discord is the interface, this folder is
the filesystem, OpenClaw is the kernel, and the agent is called Dexter. `README.md` has
the operator's view; `docs/DESIGN.md` has the architecture and what was deliberately not
built.

`AGENTS.md` is the operating manual for Dexter running over Discord. Read it — most of
it applies here too. The parts that don't: channel etiquette, reactions, the progress
draft, and posting reasoning to `#thinking`. In Claude Code the reasoning surface is
this session.

## Every task: choose lenses, save the prompt, push the work

These three rules apply to every session that touches intel, including sessions started
in another folder that use its skills.

- **Choose lenses before the first step.** Decide which skills, guidelines and perspectives
  apply, read them, and say in one line which you are using and why. `autonomy` and
  `throughput` always apply. `presentation`, `ordering` and `deslopification` apply to
  anything written for Jai. `core-idea` applies to anything taught, explained or
  summarized: find the one five-minute idea that unlocks the most, and lead with it. A skill that fits gets run, not paraphrased. Choosing none is
  a valid answer; skipping the choice is not.
- **Save the prompts that show how Jai thinks.** Most prompts are routine ("fix this",
  "order dinner") and should not be saved. Save one when it shows how he frames a problem,
  what he values, or how he designs systems and prompts: a spec, a framework like
  `ordering.md`, a set of preferences, or a correction that explains why. Save it verbatim
  to `home/prompts/YYYY-MM-DD-<slug>.md`, along with the text of any file it points at,
  such as `@prompt.md`, then commit inside `home/`. That is its own repo with no remote.
  Jai set this bar on 2026-09-26, after noticing that nothing was being saved and
  declining a hook that would have saved everything.
- **Push after you commit.** `git push` intel whenever you commit there. Commit only what
  your session changed, and leave other sessions' uncommitted edits for them to commit.

## skills/ is also your own skills directory

`~/.claude/skills` is a symlink to `intel/skills/`. One tree, two consumers: editing a
skill here changes what Dexter can do over Discord **and** what this Claude Code session
can invoke, immediately, with no registration step. Treat every edit under `skills/` as
a change to live behaviour on two surfaces.

- A skill is `skills/<name>/SKILL.md` — markdown instructions to read and follow, not
  code to call. Honour its `argument-hint` and its own templates exactly; "use the
  template and add nothing extra" is about the skill's template.
- **Read `skills/<name>/LEARNED.md` before running that skill** if it exists. It is part
  of the skill and it overrides `SKILL.md`.
- When a run teaches something durable, record it in the same run, then say so in one
  line: `bash kernel/skill-learn.sh record <skill> "<what to do differently>"`. Don't ask
  first. Full protocol in `kernel/skill-learning.md`.
- `skills/papers/` and `skills/outbound-sourcing/` are **git submodules** with their own
  remotes. Commit inside the submodule first, then commit the updated pointer here.

## Guidelines are the `+lens` mechanism

`kernel/guidelines/*.md` are prompt fragments pulled in with `+<name>`, resolved through
`kernel/guidelines/aliases.json` (`+deslop` → `deslopification`, `+abstraction` →
`software-abstraction`). A `+token` is a modifier, not content — strip it from the
instruction. Several may stack.

- `autonomy` and `throughput` are `triggers: [always]`. They are in force whether or not
  anyone types them.
- Anything long written from here — a report, a SOW, a skill's prose output — goes
  through `deslopification` first. `skills/papers/scripts/deslop.py` is the executable
  version of that guideline.
- A new lens is a markdown file with `name` / `summary` / `triggers` frontmatter dropped
  into `kernel/guidelines/`, plus its short form in `aliases.json`.

## What must never be committed

Privacy here is a directory boundary, not discipline (`docs/DESIGN.md` §1.4). `.gitignore`
carries the rules and the reason for each one. Before committing, read `git status` rather
than reaching for `git add -A`, and never `git add -f` past these:

- `home/` — a **separate private repository** holding raw prompts, corpus, reference
  material and contacts. It is gitignored by the parent and does not arrive by git on a
  new machine.
- `*.csv` globally — contact data about real people, wherever it sits.
- `skills/role-apply/config/`, `skills/role-apply/state/`, `skills/role-outreach/state/`,
  `skills/grubhub/config/preferences.yaml` — personal details, and
  drafts addressed to named third parties. The rules cover the *directories*, because a
  new filename inside one would otherwise sail through.
- `USER.md`, `instructions.pdf`, `temp/`, `var/log/`. `temp/` is scratch by design.

## Memory and generated files

- `memory/YYYY-MM-DD.md` — raw daily logs. Write to today's file when something is worth
  remembering. Read the file before writing it; concrete updates only, no placeholders.
- `USER.md` — durable preferences as imperative directives, each preceded by
  `<!-- observed: YYYY-MM-DD | status: active -->`. When a preference changes, mark the
  old entry `superseded` and rewrite in place. Never leave two contradictory actives.
- `DREAMS.md` and `memory/dreaming/{light,deep,rem}/` are written by the nightly
  consolidation job. Read them; don't hand-edit them.
- `AGENTS.md` describes a root `MEMORY.md` layer. It does not exist yet — don't assume it
  when looking for durable facts.

## Deferred work

```bash
node kernel/queue.mjs list
```

`list` shows what's ready and what's blocked on what; `next` gives the highest-priority
eligible item; `add "<title>" --priority 7 --depends 4` files one; `done 4` closes it.
Items are topologically sorted, so blocked work is deferred rather than dropped. Jai
never files a queue item by hand — if he asks for a feature, write the item.

## Two machines

The PC is the always-on node and the Mac is a warm standby (`docs/HA.md`,
`docs/MIGRATION.md`). **Exactly one node holds Discord at a time** — two live Dexters
answer every message twice and would repeat every send.

Don't restart the gateway while a run is in flight; long skill runs take 30+ minutes and
a restart makes them redo the work. Check `openclaw sessions --active 20` first.
`README.md` has the full triage list for a quiet Dexter, in the order the failures
actually stack.

## Conventions

- **Commit messages state the finding, not the file touched.** "The account owns the
  addresses, not the config file", not "fix: update config handling". One claim, present
  tense, no type prefix.
- Prefer `trash` over `rm`. Inspect existing state before touching crontabs, LaunchAgents,
  systemd units or shell rc files, and merge rather than replace.
- Use absolute paths and absolute timestamps in shell calls. BSD `find` silently matches
  nothing for a relative `-newermt '-90 minutes'`, and the Bash tool keeps its working
  directory between calls. Both have produced a confident, wrong "it wrote nothing".
- Reading is free: files, web, calendars, anything inside this workspace. **Nothing is
  sent.** No email, message or post leaves the machine without Jai approving that
  specific act — no mode overrides this.
- Before building a system, check whether something maintained already does it well
  enough. A preflight gate, not a research assignment.
