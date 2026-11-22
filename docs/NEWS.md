# What's new

dexter is rebuilt from a private workspace, and each build that changes something you would
notice adds an entry here, newest first. An entry says what a running Dexter now does
differently and where to read more. Smaller fixes and new `LEARNED.md` lessons ride along
without an entry.

## 2026-11-22

- `/slack` reads Slack through the desktop app's accessibility tree: every workspace and its unread
  badge, the sidebar's conversations, and the loaded messages in a channel or DM, with `--older` to scroll
  back. It never types, posts, reacts, joins or installs anything, and never brings Slack forward. Opening
  a conversation marks it read, so each move prints how to put the view back. `scripts/ax.swift` is the
  general reader underneath, for any Mac app with no connector; the skill lists the order to try
  (connector, accessibility tree, deep link, keys to the process, a window screenshot).

- A new lens, `+research` (`kernel/guidelines/research-loop.md`): improve a model one error source at a
  time. Evaluate with traces, cluster the failures, test one idea against the largest source of error as
  a ten-minute ablation, and keep it only under a rule written before the run. A Type 1 test asks whether
  a skill can be learned at all (on a temporary split of eval rows that never reaches the final model).
  A Type 2 test asks whether new data delivers it (with and without, from one checkpoint). Training data
  comes from a program before an LLM, and from an LLM before public data, and every result gets a
  mechanism as well as a number.

## 2026-11-13

- `/role-campaign <company>` reaches many named people at one company at once about a full-time role:
  researchers on the teams the operator fits, managers who hire, and recruiters, plus everyone the
  operator wrote to there before, re-asked in a new note that says what the earlier one was. Parallel
  research subagents verify every address and paper, `scripts/assemble.py` builds each note from the
  operator's own bullets, a fresh reader checks it, and the drafts carry their files through the Gmail
  connector's file references. It ends with drafts ordered best first, at most three per team per send
  block, and a send block on the calendar. For startups it also maps investors and writes the
  operator's VC introduction note as a second wave.

## 2026-11-11

- The deslop lens (`kernel/guidelines/deslopification.md`) gains a section on what a reader's margin
  comments catch that word-level checks miss: judgment words used before they are defined, numbers without
  their unit, methods named but not shown, analogies used before they are introduced, obvious specifics,
  clipped references ("both what?"), and facts with no stated reason, plus the context, options, decision
  shape for memos. `skills/papers/scripts/deslop.py` now also flags rates written with "a" ("$60 an hour",
  so write "per"), the section symbol, a dangling "both", ", so" as a conjunction, and needless single
  hyphens ("signed-off", "50-task").

## 2026-10-28

- `/guided-learning` agrees a syllabus before it teaches. A topic now opens with the core idea in one
  sentence, five to eight units each marked name it, use it or derive it, the floor it assumes, what it
  skips, the project people in that field actually do, and the time; the lesson starts when you reply go
  or edit it. A new lecture mode (`--lecture`) teaches without questions, one piece per message like a
  textbook section: why it exists, a physical picture, the idea, the smallest worked example, a derivation
  step by step, a figure, where it breaks. You answer next, deeper, skip or q. Both modes put their effort
  into presentation and only look things up to check them. See `skills/guided-learning/SKILL.md`.
- A new lens, `+notation` (`kernel/guidelines/notation-last.md`): teach an idea in plain words, a concrete
  example and symbols the reader already owns, then name it with the field's term and notation in one line.
  Lessons now follow it by default, and syllabus lines are written in plain words with the field's name in
  parentheses.

## 2026-10-22

- The queue fits in a terminal. `./todos` prints every open item on one line, cut to the window's width, in
  four piles: what waits on you, what is being worked on, what the AI takes next, and what is blocked and on
  what. It is `node kernel/queue.mjs list --brief`; `list` without the flag still prints whole titles for
  agents. To run it from any folder, add `alias todos='<your dexter folder>/todos'` to your shell's rc file.

## 2026-10-22

- Textbook chapters bring the reader in before they explain. Each chapter of a `/textbook` page now opens
  on a concrete scene and the question it raises, its Intuition section works the smallest example with
  real numbers before the one-sentence idea, its Statement opens on the question it settles, and its
  derivations move one step per line. The skill's new "Introducing an idea" section lists the tests, and
  before a book ships, separate fresh agents audit a few chapters each against a sample of the operator's
  own writing and return exact patches, which a second round of verifiers rechecks. See
  `skills/textbook/SKILL.md`.

## 2026-10-21

- Textbook chapters open the way a seminal paper does. Each chapter of a `/textbook` page now starts with its
  motivation, the problem that forced the idea, and its intuition, the idea in one sentence beside the
  chapter's first computed figure, before the formal statement. Where a document that moved capital rests on
  the idea, a card under the motivation links the original and a folded story ties it to the chapter's
  mathematics, and chapters with no real match get no card. Each chapter's notes now begin with a Guides line:
  one or two long tutorials in reading order, with the sections to read, marked when the reader already owns a
  copy. See `skills/textbook/SKILL.md`.

- Textbook chapters go deeper. Every chapter of a `/textbook` page now shows its idea four ways, each picture from a
  field that named it and joined to the next by a two- or three-line derivation, then computes where the idea
  breaks in a figure of its own and names the open problems that follow. Two derivations per chapter ask the
  reader to rederive a result from a blank page, with the solution folded, and an appendix states the
  prerequisites the chapters use. The build places a single figure anywhere with `<!--fig:ID@C-->` and cites
  figures with `<!--ref:ID-->`, so adding a figure renumbers nothing by hand. Before deepening a book that has
  shipped, the skill runs an adversarial math audit and fixes what it confirms first. See
  `skills/textbook/SKILL.md`.

## 2026-10-20

- Pages that teach are short textbooks. `/textbook` turns a topic or a list of ideas into one page with a title
  page, a preface and contents, and chapters that each state one idea in a boxed theorem, derive it, build it up
  in figures that compute it on a toy, list its names across fields, connect it to the operator's own research,
  and end with exercises and verified readings. Math is typeset with MathJax's SVG build, parallel agents build
  the figures against `agents/figure-builder.md`, and `scripts/new_book.py` starts a book folder that builds on
  its own. The presentation and visual guidelines now send teaching pages to it, and no page frames itself as a
  reply to the request that asked for it. See `skills/textbook/SKILL.md`.

- Photos of handwritten notes have a skill. `/handwritten-notes` transcribes the page line by line in the author's
  own structure, marks every word it cannot read instead of guessing, checks each line against the materials the
  notes refer to (and looks for a newer official document that supersedes them), files the photo and transcription
  beside the work they belong to, turns action lines into queue items, and ends by saying what the notes change.
  `scripts/tiles.py` cuts a dense page into enlarged tiles for small writing. See `skills/handwritten-notes/SKILL.md`.

- Outreach and submissions pass a second gate before the operator sees them. `kernel/reachgate/`
  reads a short card per act and fails an email to someone whose own page asks not to be
  emailed (naming the form or portal the page points to instead), a cited paper the person did
  not write or that the note titles wrong, an address the outbound records already hold, a
  company with a live interview process, and anything a fresh reader has not passed. It runs
  the mail gate on the draft read back RAW. See `kernel/reachgate/README.md`.
- A draft that says files are attached is not ready until it carries them. The mail gate's
  hand-over check, `node kernel/mailgate/gate.mjs check --raw` on a draft read back RAW, used to
  report "clean" when the text said "I have attached my resume" and nothing was attached, since a
  missing attachment blocked only sends. It now fails that draft too. The audit hook still lets a
  draft call through with its files to come, because files are attached after the draft exists.
  See "Where it runs" in `kernel/mailgate/README.md`.

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
