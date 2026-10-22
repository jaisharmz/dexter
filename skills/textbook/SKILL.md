---
name: textbook
description: Write a page that teaches as a short textbook with computed figures. A title page, preface and contents, then chapters that each open with the motivation and the intuition, state one idea, derive it, build it up in interactive figures that compute it on a toy, show it four ways joined by short derivations, compute where it breaks and name what is open, connect it to the reader's research, and end with exercises, derivations to redo from a blank page, and verified readings, with an appendix of prerequisites. Parallel agents build the figures against a written contract, a script merges everything into one self-contained artifact with typeset math, and the exercises can be the cards of a drills deck. Use when the operator asks to learn, go deep on, or be taught a set of ideas or a field's foundations as a page; says "make it a textbook", "teach me X from first principles" for more than a chat answer, or "ideas like X"; or wants an explainer artifact turned into a book.
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
   they are. They follow the order a seminal paper uses: why the idea was needed, the idea in
   a sentence and a picture, then the formal statement, then first principles and several
   views. Under the chapter title, the lead is the abstract: the idea in two sentences.
   Inside that order, bring the reader to each idea instead of dropping them into it: a scene,
   the question a reader would ask, the smallest case worked with real numbers, the general
   statement, and the name last (the rules are under "Introducing an idea" below).
   - **c.1 Motivation.** Open on a concrete scene or task ("Suppose you..."), ask the question
     it raises, then say why the old view failed, in a paragraph that a reader outside the
     field follows. History and the field come after the scene. Where a document that moved
     capital rests on the idea (billiondollarpdf.com collects them), add its card here: the
     medium label (PAPER, WHITEPAPER), the title linked to the original, a one-line mental
     model, author and year, and a folded story of what it changed with the verified
     mathematical link to the chapter. A chapter with no genuine match gets no card.
   - **c.2 Intuition.** The smallest example that shows the idea, worked with real numbers one
     step at a time (a fortune of 3 dollars in a fair game, a boat with two steps left, a state
     that doubles unless pushed), checked against an extreme case, then the new mental model
     as its read-back in one sentence, in the `intuit` style, and one picture: the chapter's
     first-principles figure, placed here with `<!--fig:ID@C-->`, so the picture still
     computes the real thing.
   - **c.3 Statement.** One or two sentences that name the questions the toy raised, then
     boxed definitions, theorems and propositions, each named, with displayed equations
     numbered (c.1), (c.2). Every hypothesis comes with the case that fails without it.
   - **c.4 Derivation.** A proof of each statement, one move per displayed line with its
     reason, so a reader with a pencil can redo it ("integrating by parts gives" or "by X's
     lemma" with no line shown is a skipped step), ending in ∎, then remarks and the
     special cases that recover familiar results. A derivation is the chapter's spine: the
     figures show it working, and the exercises make the reader redo it.
   - **c.5 Figures.** Numbered Figure c.1, c.2, each computing the idea on a toy in the page
     (the rules are in `visual.md` and `agents/figure-builder.md`).
   - **c.6 Four ways to see it.** Three or four pictures of the same idea, each from a field
     that named it, and between consecutive pictures a join: a two- or three-line derivation
     from one to the next, so every picture is tied to the others. Cite the figure that draws
     a picture when there is one. The idea's names as chips go underneath, headed "Names
     across fields". A chapter whose idea has only one picture is a sign it is a technique.
   - **c.7 Where it breaks and what is open.** The hypothesis that fails in practice, what
     happens when it does, and how fast, then a figure that computes the failure (a weight
     collapsing with dimension, rounds that stop helping, an iterate that cycles), then two
     or three open problems, each tied to one of the reader's threads where one fits.
   - **c.8 In your research.** Where the idea meets the reader's own projects and open
     threads. This section and the open problems tied to the reader's threads are the only
     places that speak to the reader as "you".
   - **Exercises.** Problems with numbers, each with its answer folded under it.
   - **Derivations from a blank page.** Two per chapter, separate from the exercises: a result
     to rederive without looking (Tweedie, a contraction, a regret bound), with the solution
     folded under it. One redoes the chapter's main derivation, and one extends it.
   - **Notes and further reading.** A Guides line first: one or two long tutorials that
     teach the chapter, in reading order, with the sections to read, marked "on your disk"
     with the path when the reader already owns them (look in their paper folders before
     searching the web, and cross-check the chapter's derivations against them). Then two to
     four verified readings, then one project that ends in a number.

   Under each chapter's lead, one line names the earlier chapters and the prerequisites it
   uses ("Uses Chapter 2 and Appendix A.1"), linked.

## Introducing an idea

A page that teaches from first principles builds the thing in front of the reader before naming
it. Check every section against these, in order:

- **A scene first.** The first two sentences put a concrete object, a person doing a task, or
  the chapter's running example in front of the reader. A first sentence whose subject is a
  field ("Generative modeling asks...") drops the reader in.
- **The question before the answer.** Every definition and theorem answers a question the text
  asked earlier, often literally ("But how...?").
- **A toy with numbers before the general form.** The smallest case, one dimension or one
  variable first, then one change at a time, and the general statement reduces to the toy.
- **Earned definitions.** The old tool fails on the page before the new one appears, and each
  hypothesis is paired with the case that breaks without it.
- **Shown, then named.** A term's name arrives after the reader has seen what it refers to,
  each symbol is defined in words at first use, and no paragraph carries more than two terms
  that are not yet defined or shown.
- **Pencil-checkable derivations.** One move per line with its reason; a tool that carries a
  step gets a short lesson where it is used.
- **Intuition on both sides of a formula.** A guess before it and a read-back after it,
  checked against an extreme case.
- **A plain ending.** The last paragraph says in words what the result lets the reader do and
  where the next section goes.

Before shipping a book, give separate fresh agents a few chapters each, this list, and a
sample of the operator's own writing, and have them return exact patches; apply them inside
each patch's chapter only.
5. **Appendix A: Prerequisites.** Every tool the chapters use without building it (Itô's
   lemma, a transform, a theorem from measure theory), one paragraph each: the statement, why
   it holds, the chapters that use it, and where to learn it (a local course folder or a
   verified book chapter).
6. **Appendix B.** The ideas that almost made the book, one line each on why.
7. **Footer.** How the figures compute their numbers, and where the source and deck live.

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

- `<!--figs:UNIT@C-->` puts unit UNIT's figures here. `<!--fig:FIGID@C-->` puts one figure
  anywhere in chapter C, which is how the failure figure lands under "Where it breaks" and
  how the figures are put in teaching order. Figures are numbered C.1, C.2 in the order they
  appear, and `<!--figs:-->` skips any figure placed on its own.
- `<!--ref:FIGID-->` becomes a link that reads "Figure C.k", so the text never hard-codes a
  figure number.
- `<!--exercises:UNIT@C-->` lists that unit's exercises from the deck.
- Readings stay as `<!--read:UNIT-->` until the figure agents return verified ones.

### 4. Build the figures in parallel

Give each agent two chapters, `agents/figure-builder.md` as its contract, and a per-chapter
brief: the statement, the figures to build (what each computes, its control, the readout
that verifies the claim), the failure figure, the exercises to write, and candidate readings
to verify, including the papers behind each open problem. Write a common brief once and a
short one per agent, as files, and point each agent at both. Each
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

### 6. Audit the math

Before publishing, and before adding anything to a book that already exists, give a fresh
agent with no stake in the text an adversarial brief: find what is wrong in every statement,
derivation, caption and claim about a paper, check each by a derivation or a script, and mark
each finding confirmed or suspected. Split a long book in two so each reader has room. Fix
every confirmed finding first. On "Fundamental Ideas from First Principles" two readers found
27 problems in a version that had already shipped, among them a parallel-in-time map that did
not converge as stated and a "converge to an equilibrium" that holds only for averages.

### 7. Build and check

```
python3 <folder>/page/build.py            writes page/dist/<slug>.html
python3 <folder>/page/build.py --only UNIT writes one unit's figures alone, for an agent's check
```

Serve `page/dist/` over a local static server (a file URL can't be driven) and check:

- every figure set up, with no `fperr` and no console errors, and every readout filled;
- no "not built yet" placeholder and no "Figure ?" left from a `ref` to a missing figure;
- MathJax typeset everything: count `mjx-container`, expect zero `mjx-merror` and no raw `\(`
  left in the text;
- no horizontal scroll at 375 px, panels stacked, both themes readable;
- the text passes `deslopification`, read as a stranger to the request.

### 8. Publish

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
