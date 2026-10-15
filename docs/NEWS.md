# What's new

dexter is rebuilt from a private workspace, and each build that changes something you would
notice adds an entry here, newest first. An entry says what a running Dexter now does
differently and where to read more. Smaller fixes and new `LEARNED.md` lessons ride along
without an entry.

## 2026-10-15

- The deslop lens now checks compression as well as stock phrases. A draft written from an
  outline tends to carry the outline's shorthand into the prose: labels used as if they were
  defined terms ("the rule"), riddle phrasings of a mechanism ("who pays to raise a worker"),
  symmetric epigrams, and abstract stakes where the writing is about people. The lens says to
  re-read a draft as someone who never saw the outline, name things plainly, make causes
  explicit, and spend the extra words. See "Compression is a tell too" in
  `kernel/guidelines/deslopification.md`.

## 2026-10-13

- The deslop lens and `skills/papers/scripts/deslop.py` catch more of what reads as generated:
  em dashes, "comes for free", contrast by negation ("it checks numbers, not sentences"),
  ownership metaphors ("the database owns reported numbers"), announced ideas ("the design rests
  on one idea"), and intervals or significance tests in prose that should state the result simply.

## 2026-10-12

- Drafts are checked against what they carry. `kernel/mailgate/gate.mjs` reads a draft's own
  text (the quoted thread left out) and fails it when it promises files that are not attached
  ("some materials on what we have worked on" with only résumés), keeps a placeholder, names a
  weekday that does not match its date, says someone is cc'd who is not, or carries an inline
  signature image. The audit hook runs it on every draft and send call: a failure is blocked,
  and a promise with nothing attached yet is allowed on a draft and blocked on a send. Run it by
  hand on a draft read back in full with `node kernel/mailgate/gate.mjs check --raw <file>`.
  See `kernel/mailgate/README.md`.

## 2026-10-11

- The first run can no longer be skipped. While `BOOTSTRAP.md` exists, a project hook
  (`.claude/settings.json` runs `kernel/first-run.sh`) opens every session and every prompt,
  slash commands included, with a reminder to finish it first. Making the folder your own
  private repository now covers a GitHub fork (always public, so the agent moves you to a
  private copy) and a zip download, and checks the result is private. `./setup doctor` flags
  a fork too. If your folder is a fork, start a session and say yes when the agent offers to
  move it.
- **slides** ships three finished looks for someone whose own style has not been measured yet:
  `consulting` for a case or strategy deck, `research` for results and methods, and `technical`
  for teaching math and CS with LaTeX-rendered problems and solutions. Each has a builder whose
  demo slides show every pattern once (standard of comparison, scorecards, forest plots,
  flowcharts, practice and solution pairs). `scripts/template.py` reads a company or client
  template so a deck builds on its masters, fonts and colors, and `scripts/icon.py` draws
  matching icons, as PNGs or as a Manim clip. The rules for fonts, icons and flowcharts are in
  `skills/slides/presets/README.md`.
- **kindle**, a new skill, reads a book you own in Kindle for Mac without taking over the
  screen. The in-book search returns print page numbers for citations, `goto` jumps to a
  passage, and `read` pulls a chapter as text, spread by spread. Keys go straight to the
  Kindle process and reads go through the accessibility tree, so the app you are working in
  stays in front. See `skills/kindle/SKILL.md`.
- The queue orders work by tier (now, next, soon, later), and an item that blocks a
  higher-tier one inherits that tier. Every item also carries an id and a name that never
  change, and the queue finds an item by its number, an old number, its name or its id.
- `./setup` installs the Claude Code pieces, the audit hook and each clone's git config, even
  on a machine without OpenClaw, and it checks each one and prints the exact fix.
- The nightly memory consolidation gets a commit job of its own, which commits only the
  night's dreaming notes and pushes them.
- Headful subagents start with a ready-then-go handshake, and on an unattended night the
  parent checks in with each running child. Children take their next work from the queue,
  and mail reaches a busy session at its next tool call. A shared Chrome lease keeps two
  sessions from typing into the same browser at once.
- Agents never type in a chat or messaging app (Slack, Discord, Teams, WhatsApp, Messages,
  LinkedIn or X messaging, a mail compose window), because a keystroke that lands in the
  wrong place there is a send. They read those apps through connectors, exports or a URL, and
  write email as Gmail drafts. The audit enforces it: typing, a paste or Return on such a page
  waits for the operator's approval, and typing on a page the session did not navigate to, or
  a Chrome click outside the lease, is flagged. See `AGENTS.md` and `kernel/audit/README.md`.
- The audit reads quoted commands correctly and flags scripted Submit clicks.

## 2026-10-09

- **spawn**, a new skill, starts headful subagents in the desktop app and keeps a process
  table of them. `/name` and the session mailbox it relies on ship with it.
- A new workspace follows `BOOTSTRAP.md` before acting on its first request.
- The job tracker ranks every application in a Tier column, from S+ to F, scored on the
  work, the people and the path.

## 2026-10-08

- Reply drafts are read back raw to catch images they inherited, and they follow the
  operator's layout for bullets and times. A venture firm's sitemap lists its whole portfolio.

## 2026-10-06

- **calendar-holds**, a new skill, puts every time the agent proposes on two calendars of its
  own and books only the times you accept.
- A pending application blocks a second role at the same company only when the company
  publishes a cap or a cooldown.

## 2026-10-05

- Guided learning lists a concept's steps before the first question.
- Outreach checks a paper's footer and an agent's bullets before anything is attached or
  sent.

## 2026-10-03

- One hook logs and checks every agent action, and both Claude Code and the Discord gateway
  read it. See `kernel/audit/README.md`.

## 2026-10-01

- The job search ships from sourcing to applying with its owner's personal data taken out.
  **anonymize** defines how, and **role-tracker** rebuilds the tracker from the application
  records.

## 2026-09-30

- **self-email** opens with a one-minute summary and orders every table by what to do first.

## 2026-09-29

- dexter becomes a bootstrap: clone it, run `./setup`, and a Dexter answers in your own
  Discord. The first run makes it your own private repository.
- Twelve starter skills ship with example configs in place of anyone's data, including
  **slides**, which measures your style from your own decks.

## 2026-09-28

- Dexter starts as a personal agent OS. Discord is the interface, this folder is the
  filesystem, and OpenClaw is the kernel.
