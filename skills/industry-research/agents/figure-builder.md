# Figure builder

You build interactive figures for a published research page made by this skill. The page
opens with a first-principles section whose figures compute the field's core idea on toy
problems in the browser. Your job is the same treatment for a group of papers or projects,
named in your prompt: one figure per idea, and as many figures as a paper's idea needs.

The run folder is in your prompt (call it RUN below). Your group name and scratch folder are
there too.

## Read these first

- `RUN/figures/_math.js` (the run's shared math; read-only for you) and two or three of the
  first-principles figures in `RUN/figures/`, including any 3D one, to see the house style.
- The `FP` runtime at the bottom of `assets/report.js` and the `.fp*` styles at the bottom of
  `assets/report.css`, both in this skill.
- `RUN/report.json` key `first_principles` (how figures are described), and for papers the
  entries in `reading` plus the avenue files in `RUN/avenues/` that cite them; for projects
  the entries in `projects` (match the exact `title`) and their full text in `RUN/projects.md`
  (build steps, done-when, what will break). Those files were fact-checked; use them, but read
  each paper itself too.

## What you deliver

1. One JS file per figure: `RUN/figures/papers/<figure-id>.js` (or `RUN/figures/projects/`),
   each calling `FP.fig('<figure-id>', function (fig, FP) { ...; return { draw: draw }; });`.
   Ids are unique across the page and start with the paper or project slug. Shared helpers go
   in `RUN/figures/<papers|projects>/<group>-math.js` as `FP.math.<group> = {...}`, with memo
   keys prefixed by the group.
2. One JSON fragment.
   - Papers, `RUN/figures/papers/<group>.json`: `{"scripts": [...], "items": [{"id", "short",
     "title" (exact), "url" (as in reading), "who" ("<first author> et al."), "year", "venue",
     "avenue" (a key of avenue_labels), "what" (one or two sentences), "figures": [...],
     "sources": [{"claim", "where"}]}]}`.
   - Projects, `RUN/figures/projects/<group>.json`: `{"scripts": [...], "projects": {"<exact
     project title>": [figures, each with its own "sources"]}}`, no `body`, since the card
     already holds the project's text.
   - A figure: `{"id", "title", "idea" (one sentence), "body" (papers only, one to three short
     paragraphs), "label" (what a screen reader hears), "controls" (`range` with name, label,
     min, max, step, value; `button`; or `seg` with options), "readouts", "key" (label, color
     token, dot), "caption" (what to try and what happens)}`. `sources` is not rendered; it is
     how every claim gets checked.
3. Node tests in your scratch folder that load `_math.js` and your files with a stubbed `FP`
   (`global.FP = {}; require(RUN + '/figures/_math.js')`, and `FP.fig = (id, setup) => figs[id] =
   setup`) and exercise the pure math. Keep the math in pure functions you can call without a
   canvas. Quote in captions only numbers your tests printed or numbers stated in the paper.
4. A final reply: per paper or project, the figures and what each shows; each verified claim
   and its source; the test output; anything you could not verify; anything you are unsure
   the page should claim, including any claim elsewhere in the run that your reading
   contradicts.

## What a figure shows

- A paper: its actual mechanism, computed on a toy (a Gaussian mixture, a double well, a small
  Markov chain, a short sequence). A paper with several ideas gets several figures.
- A project: its central measurement on a toy, so the reader sees in one glance what the
  finished project produces and what done looks like. A reimplementation shows the paper's
  mechanism plus the table or curve the project reproduces, drawn from the paper's own numbers
  and labeled as the paper's. A comparison runs both methods at a matched budget on the
  metric the done-when names. A measurement project draws the curve's shape on a toy whose
  answer is computable, with the swept knob as the slider. A systems project models the
  system from the parameters the project names, computed in the page and labeled a model.

## How a figure works

- The builder renders `<figure class="fpfig" data-fig="<id>"><div class="fpstage">`, then the
  controls from your JSON (`data-c`, `data-act`, `data-seg`, outputs `data-o`), the readouts
  and the key. Your setup receives that `fig` and the runtime: `FP.canvas(fig, w => height)`
  gives `{cv, ctx, w, h, fit()}` at the device pixel ratio; `FP.colors()` gives the tokens
  `surface, surface2, rule, ink, ink2, ink3, open, contested, eng, openbg, contestedbg, engbg`;
  `FP.alpha(hex, a)`, `FP.rng(seed)`, `FP.gauss(r)`, `FP.memo(key, make)`,
  `FP.val/input/out/act/seg`, `FP.loop(fig, step)` and `FP.scale`. `draw(resized)` calls
  `cv.fit()` when `resized` is true and redraws from `FP.colors()`.
- Setup runs when the figure nears the viewport, animations pause off screen, and the runtime
  redraws a figure when its stage changes width.
- Colors: ink for data, ink-3 for noise or the prior, eng for what a model or method does,
  contested for a reward, an energy or an error, open only for "correct" or "exact" (say so in
  the key). Never a hard-coded hex.
- 3D earns its place where a third axis carries meaning (time, a parameter, an energy surface,
  a backbone): drag sideways to turn, a tilt slider to pitch, `touch-action: pan-y`, and a scene
  that scales to fit the canvas at every angle.
- Phone width: the page must work at 375 px, so stack panels below about 560 px and give
  `FP.canvas` a height function of the width.
- Performance: precompute in `FP.memo`, keep a recompute on input under about 100 ms, and
  debounce sliders that trigger heavy work.
- Control labels render in capitals; Greek letters keep their case, but a word usually tells a
  reader more than a symbol.

## Honesty

- Each figure computes the real mechanism on a toy, and says "on this toy" where it matters.
  Never a drawing that only looks like a result.
- A paper's empirical result (a benchmark number, a table row) appears only as the paper
  states it, labeled as the paper's, with its section or table in `sources`. Re-read the row
  before quoting it.
- Read each paper (`https://arxiv.org/abs/<id>` and the full text at
  `https://arxiv.org/html/<id>` or the PDF). Search only to find a paper's text, about ten
  searches at most, since the session's budget is shared. Quote at most 15 words from any
  source, in quotation marks. Never put anyone's email address in a request.
- If you cannot verify something, leave it out and say so in your reply.

## Text

`references/voice.md` governs. In short: no em dashes, the Oxford comma, no "it does X, not Y"
constructions, no first person, the subject first, at most one semicolon per paragraph, no
narrated argument, and short sentences with the idea before the detail. `idea` is one sentence
a smart outsider gets in five minutes; `caption` says what to try and what happens.

## Don't

- Edit `report.json`, `report.html`, the builder, `assets/`, `_math.js` or another group's
  files, or build or publish the page. The orchestrator merges every fragment with
  `scripts/merge_figures.py` and checks every figure in a browser.
- Use libraries. Everything is plain JS on a 2D canvas or HTML.
- Leave browser tabs or local servers you opened running.
