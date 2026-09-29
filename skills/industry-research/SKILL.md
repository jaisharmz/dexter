---
name: industry-research
description: Map an industry or research field end to end, covering the problem hierarchy down to niche sub-problems, what "solved" would look like, market size now and in 10-15 years, a concrete project and annotated reading list to get current, the companies working each sub-problem, and named people to reach out to with a real path to each. Use when the user runs /industry-research <topic>, or asks to "map", "survey", "research the landscape of", "figure out what's happening in", or "help me understand" a field like robotics, world models, inference, protein design, or RL. Output is a folder of markdown, written to be read by a technical peer rather than skimmed like a consulting deck.
argument-hint: <industry-or-field> [--quick|--deep] [--focus <subarea>] [--profile <path>] [--auto] [--out <dir>]
user-invocable: true
---

# Industry Research

Map a field so someone can decide whether to work in it.

The reader is running this across several fields to compare them. They want the shape of the problem space, honest numbers, one thing to actually build, and a route to the people who would know. They do not want a survey they could have generated themselves.

Two failure modes govern the whole design. The output can read like AI slop, which makes it worthless regardless of accuracy. Or it can quietly frame every field through what the reader already knows, which defeats the point of comparing fields at all. Most of the instructions below exist to prevent one or the other.

## Arguments

`$ARGUMENTS` holds the topic and any flags.

| Flag | Effect |
|---|---|
| `--quick` | Three scouts, top two avenues, fewer searches. Twenty to thirty minutes. For sniffing at a field. |
| `--deep` | Six scouts, every avenue found, maximum search budget. Well over an hour. |
| (default) | Between the two. Five or six scouts, three to five avenues. |

| `--focus <subarea>` | Constrain the whole run to one part of the field. |
| `--profile <path>` | Use a different person's profile. Default is `~/.claude/industry-research/profile.md`. |
| `--auto` | Skip the avenue confirmation in step 0. |
| `--out <dir>` | Output root. Default is `./industry-research/`. |

Those timings are measured, not estimated. A scout with a real search budget takes four to seven minutes and a prober takes seven to ten, so wall clock is set by the depth of the pipeline rather than by the number of agents, since each stage fans out in parallel. Tell the user roughly how long the run will take before starting it.

## Before you start

Read `references/voice.md`. Everything this skill produces is governed by it, and you are the one joining the subagent output together, so you need it in context.

Read `references/output-format.md` for the folder schema and `references/sourcing.md` for the citation tiers.

Subagent prompts live in `agents/`. Spawn each subagent with the relevant file's contents as its prompt, plus its inputs. Use general-purpose agents; nothing here needs a registered custom agent type.

## Step 0: Frame

Load the profile from `--profile` or `~/.claude/industry-research/profile.md`.

If it does not exist, bootstrap first. Spawn one agent with `agents/bootstrapper.md`, ask the user which directory holds their background and what circles they are part of, and have it write `~/.claude/industry-research/profile.md`. Show the result and let them correct it before going on. If the profile exists but is more than a few months old, say so and offer to re-bootstrap.

Then resolve the topic. Vague input is expected. Decide whether the thing named is an industry, a research field, or a technique, and note what it gets confused with. "Robotics" is an industry containing several research fields. "Reinforcement learning" is a technique used across several industries. That distinction changes what the avenues are.

**Some topics are too broad to map as one field, and mapping them anyway produces mush.** "Biology" contains protein design, single-cell omics, neuroscience, ecology, and clinical work. Those have different money, different labs, different bottlenecks, and different people. Averaged into one map they yield a document that is true about nothing.

When the topic is that broad, do not silently narrow it and do not map it flat. Ask, with `AskUserQuestion` and `multiSelect: true`, offering three or four concrete sub-fields, each with a one-line description of what mapping it would actually cover. The user may pick several, and "Other" lets them name one you missed.

Then **run the full pipeline once per selected sub-field**, producing one run directory each. `INDEX.md` compares them afterward, which is the whole point of asking rather than guessing.

Say the cost out loud before starting. Three sub-fields is three runs, so roughly three times the wall clock and three times the search budget. Web search is capped per session, and a run that exhausts it comes back thin without announcing that it did. If the user picks more sub-fields than the remaining budget supports, say which ones you will run now and which should wait for a fresh session.

A topic is broad enough to trigger this when its sub-fields would not share labs, funders, or conferences. "Biology," "materials," "healthcare," and "finance" qualify. "Robotics" and "inference" do not, since those hold together as one map with `--focus` available for narrowing.

Emit a candidate avenue list with one line each. Unless `--auto`, show it and ask the user to prune with a single `AskUserQuestion`, multi-select. This costs thirty seconds and prevents a long run spent on the wrong branches.

## Step 1: Scout

Spawn scouts in parallel, one per lens, each with `agents/scout.md`. Send them in a single message so they run concurrently.

Lenses: money, literature, bottleneck, practitioner, contrarian, adjacent, history. Use all seven on `--deep`, five by default, and money plus literature plus contrarian plus history on `--quick`.

The history lens is not optional even on a quick run. It is the only one that produces the narrative `README.md` opens with, and a run without it yields a map of a field with no account of how the field got there.

Pass each one the topic, its lens, and the profile's `untouched` list. The adjacent lens weights toward `untouched`, because a collision between two things the reader knows nothing about is exactly the unknown unknown worth finding.

Merge the results. De-duplicate avenues, keeping the strongest evidence for each. Where two lenses disagree about whether something matters, keep both readings; that disagreement usually marks something real.

Decide the avenue count from what the field actually contains. Do not aim for five. Some fields have two live avenues and some have eight, and reporting a fixed number is a lie about the field's shape.

**Check for branches that are alternatives to a probed avenue rather than parts of it.** This is the scoping failure that damages a run most, and it is invisible afterward because the map looks complete. A prober given one avenue will absorb neighbouring work into its own frame, since that is the frame it was handed. So a school of thought that competes with the avenue ends up filed underneath it, described in the vocabulary of the thing it is trying to replace, and the reader cannot tell it was ever a separate programme.

On the first inference run this happened to attention architecture, which landed as three leaf nodes under "creating fewer bytes" inside the KV cache avenue, framed as tactics for producing less cache. One of those nodes described itself as an existential threat to the branch it sat under.

Two cheap defences. Before spawning probers, ask of each candidate avenue which other candidates would become unnecessary if it succeeded, and promote anything that answers "this one." After the probers return, read each hierarchy for a child node whose own text says it competes with, replaces, or threatens its parent, and promote it or add it to the unprobed list by name. A branch nobody probed belongs in `map.md`'s unprobed section explicitly. Silence there reads as coverage.

Save raw scout output to `.research/`.

## Step 2 and 3: Probe and build

These pipeline per avenue. Do not wait for all probers to finish before starting any builder. Each avenue moves through probe then build independently, so a fast avenue finishes while a slow one is still searching.

For each avenue, spawn a prober with `agents/prober.md`, then when it returns, spawn a builder with `agents/builder.md` on its output.

The prober produces the YAML header and the body: hierarchy, holy grail, blocker, money, ownership, and the open-versus-engineering split.

The builder appends the project and reading list. Pass it the live path to the reader's reading log, not a copy, so it de-duplicates against the current file.

Assign each avenue its number and full output path before spawning, and put that exact path in the prober's prompt. Two probers left to choose for themselves will both pick `01` and one will overwrite the other. Number by importance, which is your judgment and should be treated as an opinion.

Probers routinely come back having corrected the scouts that fed them: a paper misfiled into the wrong cluster, a missing replication, a claim that did not survive a second look. Those corrections are the most reliable content in the run, because they are the one place where two agents checked each other. Keep them. Where a correction invalidates something you already wrote into another file, go fix that file rather than leaving the two in disagreement.

## Step 4: Connect, map the landscape, write the history

Three agents, spawned together since none depends on the others.

`agents/connector.md`, given the avenues, the merged scout findings on people, and the profile's network. Produces `network.md` and `ecosystem.md`.

`agents/landscape.md`, given the avenues and the money scout's findings. Produces `landscape.md`: frontier labs, academic groups and startups as three separate tiers, the investors behind them with what each fund appears to believe, and a dated timeline of the last two to three years.

`agents/historian.md`, given the history scout's beats plus the other scouts' findings. Produces `narrative.md`, an essay of 1,500 to 2,500 words on how the field got here, plus a compressed version for `README.md`.

The split is deliberate. The landscape agent maps who exists, the connector draws routes to them, and the historian explains why any of it is shaped the way it is. Tell each that the others are running so none writes another's file.

The historian is the one agent whose output cannot be produced faster by the orchestrator. An earlier version had the orchestrator write the narrative inline and it came out at three hundred words, which is a summary rather than a history. Give it its own agent and its own search budget.

## Step 5: Write the narrative files

You write these yourself, from everything above.

**`map.md`**: the hierarchy across all avenues, industry down to niche sub-problems. This is the one file where rigid structure is right, since its job is to show shape. An indented outline beats prose. Annotate nodes that are contested, dead, or newly opened.

**`unknown-unknowns.md`**: the payload. Draw mainly on the contrarian and adjacent scouts' `surprises` fields. Each entry: the thing, why an obvious search would have missed it, and what it changes. The failure mode is filling this with things that are merely new to the reader. If a survey paper's introduction would have said it, it does not belong here.

**`projects.md`** and **`reading.md`**: consolidate every builder's structured output across avenues, per `references/output-format.md`. Group projects by scale rather than by avenue, and lead the reading path with its spine. These two files exist because a reader who wants to know what to build this weekend, or which four papers to read tonight, should not have to open every avenue file to find out.

**`README.md`**: the briefing, and the only file guaranteed to be read.

**Open with the compressed narrative** the historian returns, about 150 words, ending by pointing at `narrative.md`. Do not write this yourself and do not expand it. The essay is a separate agent's job, spawned in step 4b, and the compression is written after the essay rather than before.

Then what would surprise someone who knows the field slightly. Then what the field actually is, stated as an argument rather than a definition. Then what you would do first, concretely, this week. Then a short guide to the rest of the folder. No table of contents and no "this document explores."

## Step 6: Check, then edit

Order matters twice over. Editing an unverified document makes the errors read better. And the checker must not start until every drafting agent has finished, including the connector, or whatever finishes late goes out unverified.

Spawn one agent with `agents/checker.md` over every drafted file. It verifies numbers, people, companies, repos, and papers, writes `sources.md`, and returns corrections plus a change log.

**`network.md` is the highest-stakes file in the run and it must be in scope.** Everything else is wrong on a page. That one sends the reader to email a stranger with a stale affiliation attached, or to plan a month around a deadline nobody confirmed. If the checker is running short on budget, it should spend the last of it there rather than on a fifth market figure. Where a single file carries both the people and the dates, consider giving it its own checker rather than sharing one across the whole run.

Two failure shapes to watch for, because both showed up on the first real run and neither looks like a hallucination at a glance. A plausible paper title welded to a genuine arXiv identifier survives every check except following the link. And a real number lifted from a real paper, then attached to the wrong measurement, produces a finding that is entirely fabricated out of entirely true parts. Tell the checker to confirm that each number measures what the draft says it measures, not merely that it appears in the cited source.

**Apply the checker's corrections to the fenced YAML blocks as well as to the prose.** The editor is told to leave those blocks alone, so anything you fix only in prose survives in the machine-readable copy, and the machine-readable copy is what the report page renders. On one run a fabricated percentage, an unsourced affiliation and an invented paper title all reached the build this way. Grep the avenue files for the corrected strings before moving on.

Then spawn one agent with `agents/editor.md` over the corrected files. It rewrites everything against `references/voice.md`, counts punctuation, and does the anti-anchoring sweep. This is a rewrite, not a review.

Write `run.json` per `references/output-format.md`.

Regenerate `INDEX.md` by reading the YAML headers across every run directory under the output root. The prose comparison below the table should take a position on which field to pick. With one run, say so instead of inventing a comparison.

## Step 7: Publish the report page

Spawn one agent with `agents/designer.md`, pointed at the finished run directory. It reads `references/report-design.md`, picks a chart form from what the run actually contains, and writes a self-contained HTML file. It does not publish.

Then publish it yourself with the `Artifact` tool, because you hold the URL across re-runs and a new file path mints a new link. Reuse the same path for the same topic so a later run redeploys rather than scattering.

**Record the URL in three places the moment you have it**, or the reader loses it. Write `report_url` into the run's `run.json`. Add a row to the "Published pages" table in `INDEX.md`. And keep the built `report.html` inside the run folder, so the folder still works when a link is stale or the reader is offline. A page whose address exists only in a chat message is a page that is gone next week.

The page is not a rendering of the folder. The folder is for reading and the page is for deciding, and the page earns its place only by showing what prose cannot: where the open problems sit relative to where the money and the people are. If the designer comes back with a page that only restates `README.md`, send it back.

Two things the page must carry, and they are the ones most likely to get dropped for looking unglamorous. The verdict goes at the top, because a page that buries its conclusion under a chart has the priority backwards. The confidence footer goes at the bottom and stays visible: tier counts, how many claims failed verification, and how long the couldn't-verify list is. A report whose footer shows nothing unverified is a report that hid something.

When several sub-fields were run from one broad topic, publish one page per run, then a single index page carrying the decision plane across all of them. That comparison is what the user asked for when they picked more than one.

## Report back

Tell the user where the folder is, how many avenues were found and why that number, the single most surprising thing the run turned up, and how many claims failed verification. That last number tells them something real about the field's information environment.

Do not paste the output into the conversation. It is a folder for a reason.

## Standing rules

**Anti-anchoring.** The profile sets how deep to write and who the reader can reach. It does not decide what a field is about. Never frame a field through the reader's prior work, never reach for analogies to their past projects, and never weight avenues toward what sits adjacent to what they already know. A genuine connection gets one labeled sentence at the end of the relevant file. Someone with two years in one area is often trying to leave it, and every analogy back to familiar ground makes the comparison they are attempting worse.

**Length follows substance.** A thin avenue gets two paragraphs saying it is thin. Padding it to match a rich one destroys the comparison the reader is making. See the anti-uniformity rule in `voice.md`.

**Every number carries its tier.** Looked up, reasoned, or guessed, and never ambiguous which. Ten-to-fifteen-year figures are always guesses, and a CAGR extrapolation is not a finding.

**Named people need evidence links.** A researcher name with nothing attached looks like signal and is not, and the reader might email them.

**Say what you could not find.** The `gaps` and "couldn't verify" sections are load-bearing. An empty one means somebody quietly dropped what they were unsure about.

**When the search budget runs out, the run degrades in a way nothing in the output shows.** Web search is capped per session. A run that hits the cap can still fetch any page whose address it already has, so verification keeps working and the output keeps looking complete, while discovery stops entirely. Organizations nobody mentioned never get found, and `landscape.md` comes back accurate about what it contains and quietly short. That failure has happened, and the reader caught it by naming a company that appeared in neither the roster nor the exclusions.

If browser automation is available, use it as the fallback. Some hosts refuse automated fetchers, and several claims were marked unverified purely for that reason. Two constraints. Never complete a CAPTCHA or bot challenge; when one appears, mark the claim unverified and move on. And browser calls are slow, so spend them on discovery rather than treating them as a general replacement for fetching.

Tell the user when a run is search-degraded, record it in `run.json`, and have the landscape agent state plainly that its roster is a floor rather than a census. A degraded run is worth shipping. A degraded run that reads as complete is not.

## Learning

<!-- skill-learning -->
`LEARNED.md` in this folder is part of this skill. **Read it before the first step and
treat it as overriding anything above** — it is where this skill's own corrections live.

When a run teaches something durable — Jai rewrites the output, states a preference in
passing, a step fails the same way twice, a default turns out to be wrong for how he
actually works — record it and say so in one line:

    bash kernel/skill-learn.sh record industry-research "<what to do differently>"

`kernel/skill-learning.md` is the protocol: what counts, what belongs in `state/` or
`USER.md` instead, and when a lesson graduates from the sidecar into this file.
