---
name: textbook
description: Write a page that teaches as a short textbook with computed figures. A title page, preface and contents, then chapters that each state one idea, derive it, build it up in interactive figures that compute it on a toy, list its names across fields, connect it to the reader's research, and end with exercises and verified readings. Parallel agents build the figures against a written contract, a script merges everything into one self-contained artifact with typeset math, and the exercises can be the cards of a drills deck. Use when the operator asks to learn, go deep on, or be taught a set of ideas or a field's foundations as a page; says "make it a textbook", "teach me X from first principles" for more than a chat answer, or "ideas like X"; or wants an explainer artifact turned into a book.
argument-hint: <topic | list of ideas> [--chapters N] [--deck] [--into <folder>]
user-invocable: true
---

# Textbook

A textbook page teaches a small number of ideas so that each one sticks: the statement, why it
is true, what it looks like when it runs, where else it appears, and what to practice. It is
the form the operator wants for any artifact whose job is teaching. Reports, plans and
decisions keep the shape in `kernel/guidelines/presentation.md`. This skill adds the teaching
form on top of the figure rules in `kernel/guidelines/visual.md`.

## The shape

1. **Title page.** A kicker ("A short textbook with computed figures"), the title (a name of
   two to four words), and one subtitle sentence that says what the chapters share.
2. **Preface.** What the book is about, how the chapters are ordered, the parts every chapter
   has, and how the figures and exercises work. Then the contents: one row per chapter with a
   one-line summary.
3. **Introduction.** The organizing idea of the whole book and the test it gives the reader.
   For a book of ideas, the test is how many fields named the idea on their own, drawn as a
   table of ideas by fields.
4. **Chapters.** Every chapter has the same numbered parts, so a reader always knows where
   they are:
   - **c.1 Statement.** Boxed definitions, theorems and propositions, each named, with
     displayed equations numbered (c.1), (c.2).
   - **c.2 Derivation.** A short proof of each statement that ends in ∎, then remarks and the
     special cases that recover familiar results. A derivation is the chapter's spine: the
     figures show it working, and the exercises make the reader redo it.
   - **c.3 Figures.** Numbered Figure c.1, c.2, each computing the idea on a toy in the page
     (the rules are in `visual.md` and `agents/figure-builder.md`).
   - **c.4 Names across fields.** The idea's names as chips, when the topic has them.
   - **c.5 In your research.** Where the idea meets the reader's own projects and open
     threads. This is the one section that speaks to the reader as "you".
   - **Exercises.** Problems with numbers, each with its answer folded under it.
   - **Notes and further reading.** Two to four verified readings, then one project that
     ends in a number.
5. **Appendix.** The ideas that almost made the book, one line each on why.
6. **Footer.** How the figures compute their numbers, and where the source and deck live.

### What a textbook never does

- It never frames itself as a reply. No "your prompt", "you asked", "your two guesses", no
  section that answers the request point by point. The request shapes the book, and a reader
  who never saw it must find nothing missing.
- It never leaves the idea it is about outside the chapters. When the topic has a model case
  the reader already knows (diffusion, for a book of ideas like diffusion), that case is
  Chapter 1, with the same parts as the rest.
- It never opens with "In one minute". The preface does that job.

## Ordering

Chapters follow `kernel/guidelines/ordering.md`: reading the first M chapters is the best M
the reader could have read, and each chapter uses only the chapters before it. Say in the
preface what the order optimizes. Cross-references go backward ("the tilt of Chapter 2"),
and a forward reference is a sign two chapters are in the wrong order.

## Running it

### 0. Read first

`LEARNED.md` here (it overrides this file), then `kernel/guidelines/core-idea.md`,
`visual.md`, `ordering.md`, `presentation.md` and `deslopification.md`. For the reader's own
research connections, read what the workspace knows about the reader's projects.

### 1. Choose the chapters

Catalog every candidate before cutting. For each, write the napkin statement, the fields that
named it, and what each name brings. Order by best prefix. Six to nine chapters is the usual
size. Say the list and the order in one line and go on unless the topic itself is unclear.

### 2. Start the book folder

```
python3 skills/textbook/scripts/new_book.py <folder> --title "<Title>"
```

It copies `assets/` into `<folder>/page/`: the shell template, the stylesheet, the figure
runtime and the build script. The folder is then self-contained and builds without this skill.

### 3. Write the text first

Fill `page/shell.html` chapter by chapter: statement, derivation, remarks, names, research,
notes. Math goes in `\( \)` and `\[ \]` with `\tag{c.k}`, typeset by MathJax's SVG build, which
needs no fonts or runtime fetches. Write `&lt;` or `\lt` for a less-than sign inside math.
Leave three kinds of placeholder for the build to fill:

- `<!--figs:UNIT@C-->` puts unit UNIT's figures here, numbered Figure C.1, C.2.
- `<!--exercises:UNIT@C-->` lists that unit's exercises from the deck.
- Readings stay as `<!--read:UNIT-->` until the figure agents return verified ones.

### 4. Build the figures in parallel

Give each agent two chapters, `agents/figure-builder.md` as its contract, and a per-chapter
brief: the statement, the figures to build (what each computes, its control, the readout
that verifies the claim), the exercises to write, and candidate readings to verify. Each
agent writes only its own files and checks them in its own scratch folder. Read every agent's
"could not verify" list before publishing.

### 5. Exercises

When the `drills` skill is installed, the exercises are a `paper-ideas` deck beside the page:
each card's front is a scenario with numbers, and its back asserts the answer in code.
`page/exercises.json` maps each unit to its card numbers, and the build shows each front as
Exercise C.k with the card's examples folded as the answer. Order the deck like the book:
one core card per chapter first, then each chapter's most useful application, then the rest.
`renumber.py` rewrites file names and titles only, so remap card cross-references afterward.
Without drills, write the exercises into the shell by hand in the same form.

### 6. Build and check

```
python3 <folder>/page/build.py            writes page/dist/<slug>.html
python3 <folder>/page/build.py --only UNIT writes one unit's figures alone, for an agent's check
```

Serve `page/dist/` over a local static server (a file URL can't be driven) and check:

- every figure set up, with no `fperr` and no console errors, and every readout filled;
- MathJax typeset everything: count `mjx-container`, expect zero `mjx-merror` and no raw `\(`
  left in the text;
- no horizontal scroll at 375 px, panels stacked, both themes readable;
- the text passes `deslopification`, read as a stranger to the request.

### 7. Publish

Publish `page/dist/<slug>.html` as an artifact, put the link in the folder's README, and log
it in the day's memory file. Republish from the same path to keep the link.

## Files

- `assets/shell.html` is the template: title page, preface, contents, introduction, one
  chapter with every part, appendix and footer, plus the MathJax setup.
- `assets/style.css` holds the tokens (both themes), the textbook classes and the figure frame.
- `assets/runtime.js` is the figure runtime: lazy setup, canvases at device pixel ratio,
  theme-aware colors, seeded randomness, play loops that pause off screen.
- `assets/build.py` merges the shell, the stylesheet, every unit's figure fragment and the
  exercises into one file and checks ids, registrations and readout names.
- `agents/figure-builder.md` is the contract for figure agents.
- `scripts/new_book.py` starts a book folder.

## Learning

Read `LEARNED.md` before every run. When a run teaches something durable, record it the same
run with `bash kernel/skill-learn.sh record textbook "<what to do differently>"`.
