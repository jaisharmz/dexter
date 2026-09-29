# CLAUDE.md

This folder is a Dexter workspace: a personal agent OS where Discord is the interface,
this folder is the filesystem, OpenClaw is the kernel, and the agent is called Dexter.
`README.md` has the operator's view.

`AGENTS.md` is the operating manual Dexter follows over Discord. Read it; most of it
applies here too. The parts that don't: channel etiquette, reactions, the progress draft,
and posting reasoning to `#thinking`. In Claude Code the reasoning surface is this session.

## Every task

- **Choose lenses before the first step.** Decide which skills and guidelines apply, read
  them, and say in one line which you are using and why. `autonomy` and `throughput`
  always apply. Choosing none is a valid answer; skipping the choice is not.
- **Save the prompts that show how the operator thinks** to `home/prompts/`, and commit
  inside `home/`. Skip routine asks.
- **Commit only what your session changed**, and leave other sessions' edits alone.

## skills/ is also your skills directory

`./setup` links `~/.claude/skills` to `skills/`, or links each skill into it, so one tree
serves both: editing a skill here changes what Dexter can do over Discord **and** what
this Claude Code session can invoke, with no registration step.

- A skill is `skills/<name>/SKILL.md`: markdown instructions to read and follow, not code
  to call. Honour its `argument-hint` and its own templates exactly.
- **Read `skills/<name>/LEARNED.md` before running that skill** if it exists. It is part
  of the skill and it overrides `SKILL.md`.
- When a run teaches something durable, record it in the same run and say so in one
  line: `bash kernel/skill-learn.sh record <skill> "<what to do differently>"`. The
  protocol is in `kernel/skill-learning.md`.
- After writing a new skill, `/skill-test` runs it in a fresh session and reports to
  `#building`.
- `skills/papers/` is a git submodule with its own remote. Commit inside it first, then
  commit the updated pointer here.

## Guidelines are the `+lens` mechanism

`kernel/guidelines/*.md` are prompt fragments pulled in with `+<name>`, resolved through
`kernel/guidelines/aliases.json` (`+deslop` is `deslopification`). A `+token` is a
modifier, not content: strip it from the instruction. Several may stack. A new lens is a
markdown file with `name`, `summary` and `triggers` frontmatter, plus its short form in
`aliases.json`.

## What must never be committed

`.gitignore` carries the rules. Read `git status` before committing rather than reaching
for `git add -A`, and never `git add -f` past them: `home/` (a separate private
repository), `USER.md`, `memory/`, `*.csv`, and every skill's `state/` and `config/`
except `*.example.*` files.

## Deferred work

```bash
node kernel/queue.mjs list
```

`list` shows what is ready and what is blocked on what; `next` gives the highest-priority
eligible item; `add "<title>" --priority 7 --depends 4` files one; `done 4` closes it. The
operator never files a queue item by hand: if they ask for a feature, write the item.

## Conventions

- Commit messages state the finding, not the file touched: one claim, present tense.
- Prefer `trash` over `rm`. Inspect crontabs, LaunchAgents, systemd units and shell rc
  files before touching them, and merge rather than replace.
- Use absolute paths and absolute timestamps in shell calls. BSD `find` silently matches
  nothing for a relative `-newermt '-90 minutes'`.
- Reading is free. **Nothing is sent**: no email, message or post leaves the machine
  without the operator approving that specific act, whatever the mode.
- Don't restart the gateway while a run is in flight (`openclaw sessions --agent dexter --active 20`).
- Before building a system, check whether something maintained already does it well
  enough.
- `./setup doctor` checks the whole install and says what to fix.
