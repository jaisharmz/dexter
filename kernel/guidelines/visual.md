---
name: visual
summary: The operator is a visual person. An artifact or deck opens with its decision, then builds the core idea in figures that compute the real thing, then gives every important paper, project or option as many figures as its idea needs. Interactive beats static, and 3D earns its place when a third axis means something.
triggers: [artifacts, presentations, slides, reports, explainers, teaching, research maps, briefings]
---

The operator's words, in order, while the flow-matching field map was built (2026-10-12 and 13):

> can you incorporate visualizations into the explanations? also i feel like one section of
> this should be first principles explanations where you should put these visualizations.
> plus points for interactive or 3d

> for each *important* paper, can you make a visual (plus points for 3d) just in the way
> you've made them already

> the first principles section is really good for intro, but after that i need one / however
> many necessary per paper. note that certain papers might need many more visualizations
> than others

> you should make visuals for the projects too, and wherever else necessary. in general im
> a visual person so remember that

And on the finished page, 75 figures across 19 papers and 24 projects: "this is really really good."

## The shape

1. **The decision, first.** One paragraph saying what the page concludes or recommends, above everything else ([[presentation]], [[ordering]]).
2. **First principles, right under it.** The one idea everything else depends on ([[core-idea]]), built up in a handful of figures, one idea each, in the order the rest of the page needs them. On the field map that was seven: a regression on crossing straight pairs, the averaged flow that never crosses, the same flow in 3D space-time, bridges between point clouds, one step against many, masked and edit flows, the reward tilt, and exact steering against its shortcut.
3. **Then every important unit gets its own figures.** Each paper, project, option or design alternative gets as many figures as its idea needs, one to three in practice: SD3 needed three, π0 one. Uneven counts are the point.
4. **Wherever else a picture explains faster.** A citation links to its paper's figures ("drawn in 2 figures"). A comparison becomes a chart, a schedule becomes a timeline, and a list of options becomes a switcher ([[presentation]] has the chart forms).

A page whose job is teaching takes the textbook form (`skills/textbook/SKILL.md`). The first-principles build-up becomes the chapters themselves, each with a boxed statement, a derivation, its figures and its exercises, and the decision paragraph becomes the preface.

## What a figure is

- **It computes the real mechanism on a toy** small enough to run in the page: a Gaussian mixture, a double well, a 12-token Markov chain, a 60-residue backbone. A drawing that only looks like the result has no place on the page.
- **One idea per figure**, stated in one sentence above it.
- **A control that lets the idea move**: a slider on the knob that matters, a play button, a toggle between the method and its baseline. The caption says what to try and what happens: "Slide a. At the default 0.7 the SDE optimum reaches 0.88 of the tilt and the ODE samples reach 1.61."
- **Live readouts beside the drawing** carry the numbers.
- **3D only where a third axis carries meaning**: time, a parameter, an energy surface, a protein backbone. Drag to turn, a tilt slider to pitch, and a scene that fits the canvas at every angle.
- **Honest labels.** "On this toy" wherever it matters, a model called a model with its assumptions listed, and a paper's numbers only as the paper states them, with the table named.
- **The page's own colors and both themes**, phone width included, with controls labeled in words.

## Checked before it ships

- Every number in a caption or body comes from running the figure's own math at its own settings, or from the source with its section or table. The steering figure was expected to undershoot the tilt and overshot it, and only the run caught that.
- Building figures from the sources corrects the text around them. On the field map it caught four wrong claims, among them a noise-level argument and a "nobody publishes" that a paper's own table contradicted. Feed each correction back into the page.
- Open the page and set up every figure: none errored, none blank, and each canvas fits its frame at desktop and 375 px, light and dark.

## At scale

- Split the figures across parallel agents, one per group of papers or projects, each with a written contract: the files to write, the fragment format, and the honesty and text rules. Then merge the fragments with a script that validates ids, scripts and titles. The industry-research skill has both: `agents/figure-builder.md` and `scripts/merge_figures.py`.
- Read every agent's "could not verify" list before publishing, since that is where the page's own errors surface.
- Publish to the same address every time, so the link the operator has keeps working.

## Decks

A deck follows the same order: the decision, a first-principles build-up of one idea and one figure per slide, then a slide or two per important paper or option, in the operator's slide style (`skills/slides/config/style.md`). A slide cannot run code, so render the computed figures to images from the same code, use a short clip from the explainer studio (`skills/daily-briefing/explainer/`) when something has to move, and link the interactive page for depth.

## Pairs with

[[core-idea]] finds the idea the first-principles section builds, [[presentation]] governs results and chart forms, [[ordering]] sets the order of everything, and [[deslopification]] the prose.
