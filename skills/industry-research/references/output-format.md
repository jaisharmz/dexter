# Output format

The reader runs this skill across several fields in order to compare them. That single fact drives the whole schema: facts are standardized so runs can be compared, prose is not standardized so runs can be honest.

## Directory layout

```
industry-research/
├── INDEX.md
└── <topic-slug>-<YYYY-MM-DD>/
    ├── README.md
    ├── map.md
    ├── avenues/
    │   ├── 01-<slug>.md
    │   ├── 02-<slug>.md
    │   └── ...
    ├── projects.md
    ├── reading.md
    ├── narrative.md
    ├── landscape.md
    ├── network.md
    ├── ecosystem.md
    ├── unknown-unknowns.md
    ├── sources.md
    ├── report.html
    ├── run.json
    └── .research/
```

`industry-research/` sits in the working directory unless `--out` says otherwise. Re-running the same topic on the same day overwrites; on a later day it creates a sibling, and `INDEX.md` keeps both so the reader can see what changed.

## The standardization split

Every `avenues/*.md` opens with a YAML header. Same keys, every file, every run, no exceptions. This is what `INDEX.md` is built from and what makes two runs comparable.

```yaml
---
avenue: <name>
one_line: <what this avenue is, in one sentence a non-specialist gets>
market_now: <value, source, year, or "no revenue yet" if that's the truth>
market_15y: <range, plus the variable it depends on. Always tier three. See sourcing.md>
openness: <mostly-open | mixed | mostly-engineering>
entry_cost: <what it takes to make a first real contribution: weeks? a GPU cluster? a wet lab?>
key_labs: [...]
key_companies: [...]
holy_grail: <what "solved" looks like, one sentence>
blocker: <the specific thing standing between now and that, one sentence>
---
```

Below the header, nothing is standardized. Length, section order, and structure all follow what the avenue actually contains. See the anti-uniformity rule in `voice.md`. An avenue with four labs racing on a real bottleneck runs long. An avenue that turns out to be mostly press releases gets two paragraphs saying so.

The body should cover, in whatever order and at whatever length fits: the problem hierarchy down to niche sub-problems, what is genuinely open versus what is engineering, who owns which piece, the project, what to read, and what is still open. It should not have a fixed set of headings that appear in every file.

## What each file does

**`README.md`**: the briefing, and the only file guaranteed to be read. Open with the historian's compressed narrative, about 150 words, ending by pointing at `narrative.md`. Then the thing that would surprise someone who knows the field slightly. Then what the field actually is at the level of an argument, not a definition. Then what you would do first if you were the reader, concretely, this week. Then a short guide to the rest of the folder. No table of contents, no "this document explores."

**`map.md`**: the hierarchy in the exact syntax `prober.md` specifies, since the report page parses it. All the way down: industry, sub-industry, broad problems, sub-problems, and niche sub-problems where they are notable. This is the one file where a rigid structure is correct, because its whole job is to show shape. An indented outline works better than prose here. Annotate nodes that are contested, dead, or newly opened.

**`avenues/NN-<slug>.md`**: one per avenue, numbered by the writer's judgment of what matters most, not alphabetically. The number is an opinion and should be treated as one.

**`projects.md`**: every project from every avenue, consolidated and grouped **by scale rather than by avenue**. A reader deciding what to build this weekend should not have to open four avenue files to find the weekend options.

Each entry carries its avenue, what gets built, the named stack, honest compute, the open question it opens onto, and the repo-adoption judgment from `builder.md`. Lead with the project marked `repo_potential: strong`, reasoning visible, since that is the one most likely to change what the reader does on Saturday. At most one per avenue may carry that mark.

**`reading.md`**: the consolidated reading path across all avenues, in read order, tiered **start here**, **core**, and **when you need it**. Open with the spine: the three or four papers that actually have to be read, with their time estimates summed, so the reader knows whether the path fits the week they have. Everything else sits below, grouped by avenue.

A reading list nobody starts is worth nothing, and the reliable way to produce one is eleven papers presented as equally important. Rank them, and say what each one unlocks rather than what it contains.

**`report.html`**: the published page, per `report-design.md`. A copy lives in the run directory so the folder is self-contained even if the artifact URL is lost.

**`narrative.md`**: the essay on how the field got here, 1,500 to 2,500 words, written per `narrative.md` in references. Origins that predate the current cycle, the founding disagreement, how it produced the branches on the map, where money changed what got worked on, what died, and what is still unresolved.

This is the longest prose in the run and the piece that makes everything else legible. A reader who finishes it can place a new paper in a lineage and explain why two similar-looking subfields do not talk to each other. `README.md` opens with a compressed version and links here.

**`landscape.md`**: who exists in this field, in three tiers that answer three different questions. Frontier labs for where to apply, academic groups for where to do a PhD, startups for where the field is being built and who is funding it. Merging them into one alphabetical list destroys the distinction the reader needs.

It also carries the investor section, which is the part most landscape write-ups skip and often the most useful: what each fund appears to believe about this field, what it is doing as a consequence, and where funds openly disagree. A major fund with no exposure to a hot category is a position, not an absence, and saying what it is funding instead is more informative than another portfolio list.

Then a dated timeline of the last two to three years, most recent first, including shutdowns and pivots rather than only launches and rounds, with the two or three genuine inflection points marked.

**`ecosystem.md`**: the maintained open-source projects in the field, five to ten, kept separate from the paper repositories in the reading list. Most code attached to a paper is published once and abandoned; a smaller set is real software with users, and only the second kind is somewhere a reader can learn by reading source and earn standing by contributing.

Each entry carries what it is, who maintains it, stars and last activity with the date checked, why it matters in this field, what its source teaches that a paper does not, and whether it accepts outside contributions. That last field is the one that turns the file from a bibliography into a route in.

**`network.md`**: companies bucketed by sub-problem, then named people, then paths. The paths section is the point. For each target, the shortest real route from the reader's network, tiered:

- *one hop*: someone in their stated circles can introduce them directly
- *needs an intro*: two hops, with the intermediate named
- *cold but answerable*: no path, but this person posts publicly and replies to strangers, and here is what to open with

A cold-outreach angle should reference something specific the person actually did. Generic outreach templates are worse than nothing.

**`unknown-unknowns.md`**: the payload. Things the reader did not know to ask about. Sourced mainly from the contrarian and adjacent scout lenses. Each entry states the thing, why it did not show up in an obvious search, and what it changes.

This file has a failure mode worth naming: filling it with facts that are merely new to the reader rather than genuinely non-obvious. A thing that any survey paper's introduction would have told them does not belong here.

**`sources.md`**: claims, sources, tiers, plus the mandatory "couldn't verify" and "contested" sections. Format per `sourcing.md`.

**`run.json`**: machine state, so runs are diffable and resumable:

```json
{
  "schema": 1,
  "topic": "...",
  "slug": "...",
  "date": "YYYY-MM-DD",
  "flags": {"depth": "deep", "focus": null, "auto": false},
  "profile_path": "...",
  "profile_hash": "...",
  "avenues": ["..."],
  "report_url": "https://claude.ai/code/artifact/...",
  "agents_run": {"scout": 6, "prober": 4, "builder": 4, "connector": 1}
}
```

**`.research/`**: raw subagent output, one file per agent, kept so a later run can build on it instead of re-searching. Never edited by the editor pass. Never shown to the reader unless they ask.

## INDEX.md

Regenerated after every run by reading the YAML headers across all run directories. This is the file that answers the actual question the reader is asking, which is not "what is robotics" but "which of these should I pick."

```markdown
# Fields mapped

| Field | Run | Avenues | Biggest market | Most open | Cheapest entry | Verdict |
|---|---|---|---|---|---|---|
| Robotics | 2026-08-05 | 5 | ... | ... | ... | one line |
```

`INDEX.md` also carries a **Published pages** table, one row per run, linking each field to its report page. That table plus `report_url` in each `run.json` plus the local `report.html` are the three places an address is kept, and the reason for three is that chat scrollback is not one of them.

Below the table, a short prose section comparing across runs: where the fields overlap, where a skill learned in one transfers to another, and which one you would pick if forced. That section gets rewritten each run and it should take a position.

With only one run, the table has one row and the prose section says so rather than inventing a comparison.
