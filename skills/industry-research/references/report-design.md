# The report page

Every run publishes one page alongside the folder. The folder is for reading; the page is for deciding. They are not the same job, and the page must not be a rendering of the markdown.

## This file is the rationale. The implementation is code.

`assets/report.css` is the stylesheet, `assets/report.js` the behaviour, and `scripts/build_report.py` turns a run's `report.json` into its page. Those three are the single source of truth and every run uses them unchanged.

This document explains *why* the design is what it is, so that anyone changing it understands what the decisions were protecting. It is not a specification to re-derive a page from. An earlier version of the skill tried that, describing the design in prose and asking each run to build from the description, and the pages drifted immediately: right palette, right typeface, entirely different structure and roughly a third of the components. Two reports from the same skill should be readable by the same reader without relearning the page.

**So: never hand-author CSS in a run, and never restyle for a topic.** A change worth making is a change to `assets/report.css`, where every future run inherits it.

The page earns its place only by showing what prose cannot: **where the open problems sit relative to where the money and the people are.** If a page you have built would tell the reader nothing they could not get by reading `README.md`, you have built the wrong page.

## Pick the form from what the run actually has

Three forms. Choose one primary. Do not ship all three.

**The openness map.** Every node in the hierarchy as a labeled cell, colored by state. Use when `map.md` carries twelve or more marked nodes. It answers "where is the genuinely open research concentrated," which is the question a hierarchy in prose form hides, because a reader cannot hold twenty-five nodes and their states in their head at once.

**The divergence slopegraph.** Avenues ranked by capital on the left, by research openness on the right, connected. Crossing lines are the finding. Use only when **four or more avenues carry market figures**. Below four it is two or three lines that look like they say something and do not, which is the chart equivalent of padding a thin section.

**The decision plane.** Openness against entry cost, marks sized by market, colored by field. This is the `INDEX.md` view across runs, not a single-run view. Use when two or more runs exist. It answers the question the whole exercise is for, which is which field to pick.

When a run supports none of them, ship the page without a chart. A comparison strip of the avenue headers plus the reachability ladder is a legitimate page. An invented chart is worse than no chart.

## Palette

Validated with the dataviz skill's checker on all pairs, both modes. Do not substitute hues and do not add a fourth.

| Role | Light | Dark |
|---|---|---|
| open, nobody knows how | `#1baf7a` | `#199e70` |
| contested, people disagree | `#eb6834` | `#d95926` |
| engineering, path is known | `#2a78d6` | `#3987e5` |
| dead | no fill, muted ink, strikethrough | same |
| surface | `#fcfcfb` | `#1a1a19` |
| ink primary | `#0b0b0b` | `#ffffff` |
| ink secondary | `#52514e` | `#c3c2b7` |

Assign these three in this fixed order every run. Never cycle them, never repaint when a filter changes the node count, and never let a fourth state borrow one.

**Dead is not a fourth hue.** It is an absence: no fill, muted text, a strikethrough. That keeps the palette at three, which is what clears the all-pairs floors, and it encodes the meaning better than any color would.

Two constraints from the validator, both mandatory:

The open hue sits at 2.74:1 against the light surface, below the 3:1 line. **The relief rule applies**, so every cell carries a visible text label and the page carries a table view. That is not optional and it is not satisfied by a tooltip.

CVD separation is 9.2 light and 9.4 dark, above the target, so color alone is legal here. Ship the secondary encoding anyway: a state word on every legend entry, and a 2px surface gap between adjacent cells so boundaries survive a grayscale print.

## Marks and anatomy

Thin marks. 2px lines, markers at 8px or larger, 4px rounded ends on any bar, a 2px surface gap between adjacent fills and a 2px surface ring where marks overlap.

Grid and axes stay recessive, in secondary ink at most. Text always wears text tokens; a value never takes its series color. A colored chip beside a label carries the identity instead.

Direct-label selectively. On the openness map every cell is labeled, because that is the relief rule. On a slopegraph label the endpoints and nothing between them. Never a number on every point.

Digits that line up in a column get `font-variant-numeric: tabular-nums`.

## Interaction

An HTML chart is interactive by default, so ship the hover layer. Crosshair plus tooltip on the slopegraph. Hit targets larger than the mark.

**The openness map's tooltip must be actionable, not descriptive.** Repeating the node's one-line note is the obvious implementation and it wastes the interaction, because the note is already on the cell. What a reader wants when they hover a sub-problem is what to *do* about it.

So the tooltip carries, in this order: the project that attacks this node if one exists, named and with its scale, then the one or two papers that define the node, then the note only if it adds something the cell does not already say. A node with no project and no paper says so plainly, which is itself useful because it marks the parts of the map this run left unserved.

This works because projects already declare a `subproblem` and reading entries can be tagged with the nodes they bear on. Join on those rather than on fuzzy text matching, and where a join fails, show nothing rather than guessing. The map then becomes the index for the rest of the page: hover a problem, see the work.

Make the tooltip's links clickable, which means it cannot use `pointer-events: none`. Keep it open while the pointer is inside it and dismiss on Escape.

Every page carries a **table view** of the same data, reachable without JavaScript trickery, as a `<details>` block below the chart. This satisfies the relief rule and it is how the page degrades.

Respect `prefers-reduced-motion`. Give keyboard focus a visible state.

## What else the page carries

**The narrative, first.** The four to eight beats from `README.md`, telling how the field got to its current shape through named people and their disagreements. Render it as prose, not a timeline widget, because it is an argument rather than a list of dates. Keep the links on the anchoring artifacts live.

This sits above everything, including the verdict, because it is what makes the map underneath legible. A reader who knows why a branch exists reads the openness map differently from one meeting it cold. Rules for writing it are in `narrative.md`.

**The verdict, second.** One paragraph saying what you would do. It follows the narrative and precedes the chart, because a page that buries its conclusion under a visualization has the priority backwards.

**The avenue strip.** The fixed YAML headers rendered side by side so the comparable fields actually compare: market now, market in fifteen years, openness, entry cost, holy grail, blocker. This is why those keys are fixed.

**The reading path.** This is the section readers ask for by name, and burying it inside avenue files is the most common way this page fails them. Render the spine first: the three or four papers tagged **start here** and **core**, in read order, each with its time estimate and one line on what it unlocks. Sum the times so the reader can see whether the path fits their week. Everything tagged **when you need it** goes behind a disclosure, grouped by avenue.

Tier is encoded in form, not only in a label. The spine gets full-size entries in reading order with a visible sequence; the optional tier is smaller and collapsed. A reader should be able to tell in one glance which four papers to open tonight.

**Every entry shows what kind of thing it is**, as a visible chip: seminal, foundation release, benchmark, result, position, survey. This is the fastest thing on the page to read and it changes how the entry beneath it should be understood, so it goes before the title rather than after the annotation. Give `seminal` the only saturated treatment; the rest stay quiet, because a page where six chips shout is a page with no signal in the chips.

Where an entry is seminal, print what it opened up on the same line. That sentence is the reason the tag exists.

**Each entry carries three separate signals and they must not blur together**: role says what kind of contribution it is, citations say how much attention it got, and stars on its code say whether anyone runs it. A benchmark with two thousand citations and an abandoned repository is a different object from a foundation release with four hundred citations and a live one, and a reader should be able to see that distinction without clicking anything.

**The project shelf.** Grouped by scale, weekend through semester, so the reader picks by the time they have.

**The page is for orientation, not execution.** A card leads with the `plain` sentence, the one written for someone outside the field, at full size. Under it, only the few facts needed to choose: sub-problem and its state, archetype, what it is built on, time and hardware. That is the whole card by default.

The numbered build steps, the done-when criterion and the will-break note do **not** go on the page. They live in `projects.md`, and the card links there. A reader deciding between six projects does not want six sets of terminal commands, and a reader who has decided wants the file open in an editor anyway. Say so on the card: one link, "full design doc."

**Everything named is a link.** Render each project's `resources` as a compact row of links under the plain sentence, each labelled by kind so a reader can tell a checkpoint from a benchmark from a paper without clicking. A card naming four repositories and linking none of them makes the reader search for things you already found.

Where a resource carries `stars`, show the count beside its link with the date it was read. Only a minority of resources should carry one. A number beside every link is noise that hides the two that matter, and the interesting case is usually a low count on something central rather than a high one.

The same applies in the reading list: where a paper ships code, link the repository beside the paper and show its stars when they are notable. A famous paper with an abandoned repository is worth seeing at a glance, and that gap is often exactly what makes a reimplementation worth doing.

**Each project carries its own short reading.** Two to four entries, split into read-before and keep-open-during, rendered inside the card. This is not the avenue's reading list repeated: the avenue list answers "how do I understand this area" and this answers "what do I need in my head on Saturday morning," and they are rarely the same papers. Mark entries that also appear in the avenue list so a reader sees the overlap instead of wondering whether it is a different paper.

**Next steps expand in place.** Each card carries its `next_steps` behind a disclosure labelled with the count, so a reader who likes a project can see where it leads without leaving the page and without that text crowding the five they are still comparing. Keep it a native `<details>`, since it works without JavaScript and survives a print.

**Show the set as a set.** Above each avenue's three cards, print the `set_note`, and on each card print the `teaches` line. Those two fields are what stop the shelf reading as a menu of alternatives when it is meant to be a curriculum. Without them a reader picks one project and skips the other two, which defeats the point.

The project marked `signal: strong` gets visual priority and shows its headline. At most one per avenue carries the mark, and if a run marks none, show none rather than promoting the best of a weak set.

**The landscape, in three tiers.** Frontier labs, academic groups and startups kept visually separate, because a reader scanning for where to apply, where to do a PhD, and who is building this are three different scans. Show what each organization ships rather than what it claims, and mark the pre-product companies, since a large round with nothing shipped is a specific kind of employer.

**What was left out.** Render the `excluded` list as a short closing block under the three tiers: the organization, why it failed the inclusion test, and the counter-case. Small type, but present. A reader who wonders why an obvious name is missing should find the answer on the page rather than assuming the run did not look.

**What the investors believe.** One line of thesis per fund plus its conviction level, ordered by conviction rather than by fund size. Where two credible funds take opposite sides on whether this category is real, put them next to each other; that disagreement says more about how settled the field is than any market figure. Give absence the same visual weight as presence, since a large fund sitting this out while loudly funding an adjacent category is a finding.

**The timeline, in two visual tiers.** The point of a timeline is that a reader takes the whole period in at a glance, which only works if importance is legible without reading.

**Major** entries are few and get the full treatment: normal type, the kind chip, room to breathe. **Minor** entries are many and get a compact single line at reduced size in muted ink, close-set so a year of routine activity reads as texture rather than as fifty things to evaluate. That contrast is doing the work; if the two tiers look similar the section has failed.

Within the majors, the two or three inflection points get the accent colour and their `why` clause printed. Nothing else is highlighted, because a timeline where everything is highlighted has highlighted nothing.

Shutdowns keep their own colour at either weight, since a cluster of them is a pattern worth seeing from across the room.

Do not collapse the timeline behind a disclosure. Whole-period visibility is the entire point of the section.

**The living codebases.** The maintained projects from `ecosystem.md`, each showing stars, last activity, and whether it takes outside contributions. Sort by whether a reader could contribute rather than by star count, since the point of the section is finding a way in rather than ranking popularity.

Mark dormant repositories visibly rather than dropping them. A heavily starred project with no commits in a year is information, and a reader who cannot tell it apart from a live one will waste a month opening a pull request nobody merges.

**The reachability ladder.** People grouped by hops, one hop through needs-an-intro through cold-but-answerable, with the evidence link on each. Include the no-path tier. A ladder that reaches everyone is lying and the reader will find out by email.

**The confidence footer.** Counts by source tier, the number of claims that failed verification, and the length of the couldn't-verify list. This is the page's most important element after the verdict, and it goes at the bottom rather than hidden. A run whose footer shows nothing unverified is a run that hid something.

## Theme

Both themes are selected, not flipped. Define the palette as custom properties on a root scope, redefine under `@media (prefers-color-scheme: dark)`, then redefine again under `:root[data-theme="dark"]` and `:root[data-theme="light"]` so the viewer's toggle wins in both directions. Style through the tokens, never inside the media query.

## Type

No webfonts. The artifact CSP blocks font CDNs and a silent fallback wrecks the pairing. Use a system stack.

The material is prose being weighed against machine identifiers, so pair a serif for claims and reasoning with a monospace for arXiv identifiers, market figures, correlation values, and state labels. Running text near 65 characters. Uppercase labels get letter-spacing. Headings get `text-wrap: balance`.

## What not to do

No hero number the size of the page. No emoji as section markers. No numbered `01 / 02 / 03` markers, because avenues are not a sequence and the numbering in the filenames is an opinion about importance, not an order of operations.

Never a dual axis. Market size and openness are different scales, so they are different encodings, never two y-axes on one plot.

Do not draw the slopegraph with three avenues because the run only found three. Ship the strip instead and say why.
