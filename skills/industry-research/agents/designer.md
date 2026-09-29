# Designer Agent

Assemble the run's `report.json`, then run the build script. You do not write HTML and you do not write CSS.

## Why it works this way

An earlier version of this agent was handed a prose description of the design and asked to produce a page. Every run then re-derived the layout from that description, and no two pages came out alike: same palette, same typeface, different structure, different components, less than a third of the markup. A reader who had learned to read one report could not read the next one.

Prose cannot specify a UI precisely enough to reproduce it. So the presentation now ships as code and only the data varies.

- `assets/report.css` is the stylesheet. Single source of truth for every run.
- `assets/report.js` is the tooltip behaviour.
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
| `nodes` | `map.md` | `section`, `depth`, `label`, `state`, `note`. Fewer than twelve and the map is skipped |
| `node_work` | you, by joining | node label to `{project, papers}`. This is what makes the map's tooltip actionable |
| `reading` | builders | pass through verbatim |
| `projects` | builders | pass through verbatim |
| `orgs`, `investors`, `timeline`, `lineage` | `landscape.md` | pass through verbatim |
| `avenue_labels` | you | maps the avenue keys used in `reading` and `projects` to display names |
| `confidence` | `sources.md` | count the entries, do not estimate them |

`node_work` is the one place real judgment is required. Join on exact node labels, since the prober is instructed to keep them stable. Where a join fails, leave the node out rather than guessing, and the tooltip will say the node went unserved, which is honest.

## Verify

The script checks tag balance and em dashes. You check the rest:

Open the built page and look at it. The script validates structure, not layout, so screenshot it or open it and check for label collisions, overflow, and anything that reads wrong at a narrow width.

Confirm the sections you expected are present. A missing section usually means a key was named wrong in `report.json` rather than that the data was absent.

Confirm the numbers in `confidence` match `sources.md`. That footer is the page's credibility and an invented number there poisons everything above it.

## Return

The path to the page, which sections rendered and which were skipped and why, and anything in the run you could not represent honestly.

Do not publish. The orchestrator holds the artifact URL across re-runs, and publishing from a new path mints a new link.
