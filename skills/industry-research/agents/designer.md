# Designer Agent

Assemble the run's `report.json`, then run the build script. You do not write HTML and you do not write CSS.

## Why it works this way

An earlier version of this agent was handed a prose description of the design and asked to produce a page. Every run then re-derived the layout from that description, and no two pages came out alike: same palette, same typeface, different structure, different components, less than a third of the markup. A reader who had learned to read one report could not read the next one.

Prose cannot specify a UI precisely enough to reproduce it. So the presentation now ships as code and only the data varies.

- `assets/report.css` is the stylesheet. Single source of truth for every run.
- `assets/report.js` is the tooltip behaviour and the `FP` runtime the first-principles figures draw with.
- `scripts/build_report.py` turns `report.json` into `report.html`.

**Never hand-author CSS in a run. Never restyle for a topic.** A biology run and a robotics run look identical because they are the same product. If the design genuinely needs to change, change `assets/report.css` so every future run inherits it, and say that you did.

## What you actually do

Read the finished run directory and write `report.json` into it. Then run:

```
python3 <skill-dir>/scripts/build_report.py <run-dir>
```

It writes `report.html` beside the JSON and prints warnings for unbalanced tags and for em dashes. Fix the data and re-run until it prints none.

## Building report.json

Standard library only, and the script imports nothing beyond it. `pyyaml` is usually absent, so convert the agents' YAML blocks to JSON yourself rather than importing a parser and discovering it is missing.

Top-level keys, all optional except `meta`. A section whose data is missing is simply not rendered, which is the correct behaviour for a thin run.

| Key | Source | Notes |
|---|---|---|
| `meta` | you | `eyebrow`, `title`, `verdict` (HTML allowed), `runbar` as a flat object |
| `narrative` | `README.md` opening | `{"beats": [...]}`, HTML allowed for links |
| `first_principles` | you, from the whole run | `lede` (the field's core idea), `scripts` (paths under the run folder, `figures/_math.js` first) and `figures`: `id`, `kicker`, `title`, `idea`, `body` (paragraphs), `label` (what a screen reader hears), `controls` (`range`, `button`, or `seg`), `readouts`, `key` (label plus a color token), `caption` (what to try), `unlocks` (avenues and papers). Rendered first, under the verdict |
| `nodes` | `map.md` | `section`, `depth`, `label`, `state`, `note`. Fewer than twelve and the map is skipped |
| `node_work` | you, by joining | node label to `{project, papers}`. This is what makes the map's tooltip actionable |
| `reading` | builders | pass through, adding `avenue`. Split each `citations` string into `citations` (an integer floor) with `citations_floor: true`, or a short `citations_note` ("too new to cite", "no reliable count"), and keep the builder's text as `citations_source`, which shows on hover. Where the builder calls a count an artifact or an empty floor, give the note, since "at least 4" on a famous benchmark misleads |
| `spine` | `reading.md` | the three or four titles of the run's own spine, in read order. With it the page leads with that spine and folds each avenue's stack; without it every start-here and core paper counts as spine |
| `projects` | builders | pass through, adding `avenue` and the avenue's `set_note` |
| `avenues`, `avenues_lede` | you, by joining | one entry per avenue: `nodes` (state counts from `map.md`), `people` (landscape orgs whose `subproblems` sit in the avenue, by tier), a short `money` line condensed from `market_now`, and the header fields verbatim. This strip is what puts the open problems beside the money and the people |
| `orgs`, `investors`, `timeline`, `lineage`, `excluded` | `landscape.md` | pass through verbatim |
| `avenue_labels` | you | maps the avenue keys used in `reading` and `projects` to display names |
| `confidence` | `sources.md` | count the entries, do not estimate them. `tiles` (value, label, tone) carry what the fixed keys cannot, such as tier counts, and `notes` say how each number was counted |

`node_work` is the one place real judgment is required. Join on exact node labels, since the prober is instructed to keep them stable. Where a join fails, leave the node out rather than guessing, and the tooltip will say the node went unserved, which is honest.

## The first-principles section

The operator asked on 2026-10-12 for every page to carry a section that explains the field from first principles with visualizations, interactive where possible and 3D where a third axis carries meaning. It renders first, right under the verdict, because the rest of the page reads differently once the core idea has landed.

- **Lead with the core idea** (`kernel/guidelines/core-idea.md`): the one idea, learnable in about five minutes, that the avenues all build on. It is the section's `lede`, and the figures build it up in the order the map depends on it.
- **Compute, never draw by hand.** Each figure computes the real object for a toy problem in the page: a flow integrated from its exact velocity, a coupling from Sinkhorn, a tilt on a grid. Put the shared math in `<run>/figures/_math.js` and one file per figure, `<run>/figures/<id>.js`, each calling `FP.fig(id, function (fig, FP) { ... return { draw: draw }; })`. The runtime gives a canvas sized to the column, `FP.colors()` from the page's tokens, a seeded `FP.rng`, `FP.loop` for animation, and controls the builder rendered from the JSON.
- **Check every claim before writing it.** Run the figure math in node with the figure's own settings and quote only numbers that run printed. On the flow matching run the steering figure's shortcut was expected to under-shoot the tilt and in fact overshot it, by 0.6 at β = 0.5.
- **Draw only in the page's tokens**: ink for data, ink-3 for noise, eng for what a model does, contested for a reward. A figure that hard-codes a hex breaks in one of the two themes.
- **One idea per figure**, stated in its `idea` line, with a control that lets the reader watch it hold and a caption saying what to try. Link only papers the run's checkers verified.
- Look at every figure at full width, at phone width and in dark mode before returning.

## Verify

The script checks tag balance and em dashes. You check the rest:

Open the built page and look at it. The script validates structure, not layout, so screenshot it or open it and check for label collisions, overflow, and anything that reads wrong at a narrow width.

Confirm the sections you expected are present. A missing section usually means a key was named wrong in `report.json` rather than that the data was absent.

Confirm the numbers in `confidence` match `sources.md`. That footer is the page's credibility and an invented number there poisons everything above it.

## Return

The path to the page, which sections rendered and which were skipped and why, and anything in the run you could not represent honestly.

Do not publish. The orchestrator holds the artifact URL across re-runs, and publishing from a new path mints a new link.
