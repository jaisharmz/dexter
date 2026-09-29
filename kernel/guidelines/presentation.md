---
name: presentation
summary: Present work like a proof. Method first with a dummy example, then results nobody can doubt. Sparse over complex.
triggers: [presenting, artifacts, reporting, results, writing]
---

Governs every artifact, report or write-up of experimental work. The audience is a
competent colleague who will glance, not read.

> Think about a mathematical proof. We try to make it as easy as possible for the
> reader to understand and agree with our notions. If we give long explanations, the
> reader will get lost. The beauty of the proof is in the simplicity.

## Method section

State the underlying idea plainly, usually with a **dummy example** — two or three
made-up fields, not the full schema. The reader should get it at a glance and never have
to hold more than one thing in their head.

## Results section

This is where rigor lives, and the standard is: **after reading it there is no doubt
about the experimental setup.**

- Say exactly what was run, on what, with what configuration.
- Show that the appropriate configurations were tried, not just the one that worked.
- **Ablate.** If several things changed, the result attributes to none of them until
  each is isolated.
- Include a **control** wherever one exists, and report run-to-run variance before
  claiming any effect smaller than it.
- Prefer **real traces over summary statistics**. As many real examples as fit, with
  short interactive clickthroughs so the reader sees what happened rather than being
  told.
- Report what broke alongside what improved. A net number hides two gross numbers;
  give both.

## Name a condition, then define it

A label like "one re-ask" or "pruned schema" is a handle, not a definition. Every named
condition in a results table must be reproducible from the page alone:

- **Show the actual prompt**, verbatim, including the system message. Not a paraphrase
  of it.
- **Say what each placeholder contains** and where it came from — if a slot holds "the
  model's reasoning", say which field of which response, and whether anything was
  filtered.
- **List the parameters that could change the answer**: model, provider, temperature,
  sampling, response format, token limits.
- **State what was NOT in the prompt**, when its absence is the point.

The test: a teammate should be able to rebuild the condition from the page and get the
same number. If two conditions differ, the reader must be able to see exactly what
differs — that is what makes the comparison an ablation rather than an anecdote.

## The method switcher

When a page compares several methods, do not write each one up separately. Put them in
**one tabbed panel where every method renders through the identical template** — only
the contents change. The reader clicks between tabs and the difference jumps out,
because everything that is the same stays in the same place on screen.

The template that worked:

| slot | holds |
| --- | --- |
| header left | method name, config letter, calls per document, payload size |
| header right | the result, with the secondary result underneath |
| body | the **verbatim prompt**, with `{PLACEHOLDERS}` in caps |
| lower left | **what each slot holds** — one line per placeholder |
| lower right | **settings**, then **not in the call** |

Rules that make it work:

- **Every method gets every row**, including the baseline. The baseline's "not in the
  call" reads "Nothing. This is the full context." — that line is doing real work.
- **The baseline is a tab like any other.** It is not prose above the comparison.
- Order tabs so the default selected tab is the one the page is arguing for, and the
  baseline sits first.
- Keep it keyboard-navigable: `role="tablist"`, `aria-selected`, arrow keys.
- If two methods differ in one slot only, say so in that slot ("This is the only
  difference from config F") rather than making the reader diff two screens.

This replaces writing the same structure twice in two shapes, which is what it was
built to fix.

## The dumbbell, for before → after

When every item has a before value, an after value and a reference point, draw a
**dumbbell**, not paired bars:

- one dot per state on a shared axis, joined by a connector — the length of the
  connector *is* the size of the change
- the reference (a stronger model, a target) as a **vertical tick** on the same axis,
  never a third dot, so it reads as context rather than a competitor
- **numbers in their own labelled columns to the right of the plot** (`NOW`, `BEFORE`,
  `REFERENCE`). Labels inside the plot collide with the marks — this was found on
  screen, not in the code
- one legend, gridlines and axis in percent, the total row separated by a rule
- wrap each row in a `<g>` with a transparent hit rect and a `<title>`, so hovering
  anywhere on the row gives the exact numbers

What it replaced: two stacked bars of different heights with no legend and the
reference series missing entirely. Paired bars make the reader compute the difference;
the dumbbell shows it.

## The staircase, for marginal value

When the question is *what should we fix first*, rank the candidates by what each one is
worth **given the ones above it are already fixed** — greedy and cumulative, so two
candidates cannot both claim the same win:

- one row per candidate on a shared axis running the full range of the metric
- a grey bar for where you are now, and a **short coloured segment showing only what this
  row adds**, starting where the row above ended. The segments march rightward like a
  staircase; the reader sees both the size of each step and the distance still left
- the reference (the stronger system) as a vertical tick, so it is visible that fixing
  every candidate still does not reach it
- say in the prose that it is greedy and cumulative. Otherwise a reader will sum the
  column and get a number that does not exist

## Diverging bars, when the answer can be negative

A repair, filter or heuristic that sometimes helps and sometimes harms needs a chart that
can go **below zero**, or the reader will assume the floor is zero:

- a zero line drawn inside the track, bars growing left (red) or right (accent) from it
- put the honest worst case in the **first row** — "apply it to everything" — so the
  negative is the first thing read, not a footnote
- the rows below it are the same intervention at increasing precision, which turns the
  chart into the argument: *this works only if you can aim it*

Do not report a fix rate without the damage rate. A repair measured only on the things it
fixed looks like a free win in every case, including the cases where it is net negative.

## Diffing two long values

When two strings must be compared and either can be hundreds of characters — a nested
JSON array, a paragraph of free text — **never print them one above the other and expect the
reader to spot the difference.** Word-level diff, LeetCode style:

- tokenise on whitespace *and* punctuation, peel the shared prefix and suffix, then LCS
  the remainder — the interesting part is usually a handful of tokens
- red for text only in the left value, green for text only in the right; everything
  shared stays in normal ink
- in a dense table, **condense**: keep a few tokens of context around each change and
  collapse the untouched runs to `…`. In a detail panel, show the whole thing
- say which side is which in one line, next to the colours

The failure it prevents: a reader concluding two values are unrelated when they differ by
a single comma.

## Write for the person, not the pipeline

Found on 2026-09-25, when a literature review built from agent notes was rejected as "not
readable for humans. It looks like notes an AI would take for AI's usage... I care about
intuitions, overall ideas and methods." The rewrite he called "so much better" did this:

- **Open with "In one minute":** four or five bullets that are the whole answer on their own.
- **Very direct headings** that say what the section holds: "What the papers found", "What to
  read, in order", "What to build next". Never a clever title.
- **Short bullets, each a full sentence that explains itself.** Short is not terse. "~1 pt" or
  "71% · 87%" as a label reads as a note to self; say what the number means in the same bullet.
- **A toy example before any method**: a made-up document with two or three fields and one
  variant beside it, the changed values shaded.
- **Approaches in the method switcher** (below), every tab answering the same questions: how it
  works, where the answers come from, what it keeps, what the papers found, where it breaks,
  and a one-line verdict.
- **Reading lists**: per entry the title, date, citations or stars and lab, then three bullets:
  what it shows, how it works, why read it.
- **Machine detail stays in the folder.** File paths, function names, commit hashes, table
  numbers, grader output and ordering notes are working material. The page names the folder
  once, at the bottom.

## Form

- **Short bullets, not paragraphs.** Nobody reads paragraphs. Short is not terse: every bullet
  is a sentence a teammate outside the project could follow without the context you have.
- Aim at **intuition, not impressiveness**. The goal is agreement, not admiration.
- Given a sparse phrasing and a complex one, always the sparse one — but not so sparse
  that it becomes sentence fragments and the reader has to reconstruct meaning.
- No bursty titles, no jargon that a teammate outside the project would have to decode.
- Explanations are brief and intuitive or they are absent.

## Look at it before you hand it over

**Render the finished page and actually look at it.** Not the source — the page, as a
human reviewer will meet it. Every artifact, every time, before the link goes out.

Checking for:

- Nothing broken: a chart that did not draw, a table that collapsed, a section that is
  empty because its data never arrived, an overflow that scrolls sideways.
- Nothing ugly: colliding labels, text clipped by its container, a column of numbers
  that does not line up, spacing that drifts between sibling blocks.
- It reads well at phone width as well as full width, and in both light and dark.

A page that is correct and looks unfinished will be read as unfinished. One look costs
a minute; shipping a broken layout costs the reader's trust in the numbers on it.

Companion guidelines: [[deslopification]] for the prose tells, [[ordering]] for the
order findings are presented in.
