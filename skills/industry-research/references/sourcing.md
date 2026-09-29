# Sourcing

The dollar figures are the most hallucination-prone part of this whole pipeline, and they are also the part the reader will quote to someone else. Get them right or label them clearly.

The governing rule: a reader should always be able to tell the difference between something you looked up, something you reasoned to, and something you are guessing at. Blurring those three is the failure mode.

## Three tiers, always distinguishable

**Looked up.** A number someone published. Format: value, source, year.

> <Sector> companies raised $X.XB in <year> (<source>, <month year>).

**Reasoned.** A number you derived from looked-up inputs. Show the arithmetic inline. The reader should be able to disagree with your assumption without having to reconstruct your math.

> Roughly $900M/yr in inference spend for this segment: ~30M daily queries (company blog, Nov 2025) at the published $0.08/query list rate, discounted 40% for enterprise contracts.

**Guessed.** A number with no published basis that you still think is worth stating. Say so in the same breath, and say what would change your mind.

> Call it $2-4B by 2035, though this is my guess and it rests entirely on whether teleoperation data collection gets cheap enough to stop being the bottleneck. If a big lab open-sources a large manipulation dataset, revise up hard.

Never a bare number. "The market is worth $12B" with no year, no source, and no tier marker is the single most common way these reports become useless.

## Ten to fifteen year projections

Every one of these is tier three. There is no honest way to look up 2040.

Do not report a CAGR-extrapolated figure as though it were a finding. The consultancy reports that produce those numbers are mostly extrapolating the same way, and citing them launders a guess into a fact.

Instead, name the one or two variables the answer actually depends on, then give a range conditioned on them.

> Depends almost entirely on whether protein design moves from screening to de novo generation. If it does, this is a pharma-R&D-sized market, so tens of billions. If it stays a screening accelerator, it stays a tools market, so low single-digit billions. I lean toward the second through 2035 because wet-lab validation throughput is not improving at anything like the rate model quality is.

That is more useful than "$47.3B by 2038 at 23.4% CAGR" and it is honest about what is knowable.

Also flag when a market does not exist yet. "Autonomous research agents" has near-zero present revenue. Saying so is more informative than finding some analyst's invented TAM.

## Distinguish the money types

These get conflated constantly and they differ by an order of magnitude:

- **Venture funding into the space.** Easy to source, and it measures belief, not value.
- **Actual revenue of companies in the space.** Hard to source for private companies. Say when you could not find it.
- **The market being addressed.** Often the incumbent industry being disrupted, which is a much larger number and a much weaker claim.
- **Research spend.** Grants, lab budgets, internal R&D. Relevant for fields where nobody sells anything yet.

State which one you mean. "Robotics is a $50B market" is meaningless without knowing whether that is industrial robot arm sales, humanoid startup funding, or all of manufacturing automation.

## Posts and threads as evidence

Social posts are the primary record of what researchers and investors actually believe, because that is where positions get stated years before anyone writes them up. Use them, with three rules.

**A post is a strong source for what someone said and a weak source for whether it is true.** Quoting a researcher's thread to establish their position is correct. Citing it to establish a technical fact is not, unless the thread is itself the announcement of a result.

**Quote the substance inline, because links rot.** Accounts get deleted, locked, and renamed, and a claim resting on a dead link is unverifiable a year later. Give the handle, the date, and enough of the words that the point survives without the link.

**Never read engagement as agreement.** A post with many likes is a popular post. It is not a field consensus, and a quiet post from someone central outweighs a loud one from someone adjacent.

Do not compile anyone's posting history, do not cite personal accounts of people who are not public figures in this field, and do not quote anything from a locked or deleted account.

## Named people

Only name someone if you can point to a specific thing they wrote, built, or said. Link it.

> Chelsea Finn (Stanford / Physical Intelligence): the π0 paper and her arguments on the sim-to-real debate: [link]

If you cannot find that evidence, do not name them. A list of plausible-sounding researcher names with no attached work is the worst output this skill can produce, because it looks like signal and is not, and the reader might email one of them.

Do not guess at someone's current affiliation. People move. If you saw it in a paper from 2023, say "as of the 2023 paper" or check for something current.

Never state anyone's personal circumstances, contact details beyond a public professional handle, or anything they have not made public themselves.

## Companies

Give stage and size where you can find it, because it changes whether the reader should apply, cold-email, or ignore. A twelve-person seed company and a 3000-person public company are different objects.

Say what they actually ship, not what their landing page claims. If a company describes itself as "building the foundation model for biology" and what they have released is a protein structure API, write the second thing.

## The source ledger

Every run produces `sources.md`. It holds three sections.

**Claims and sources.** Each substantive claim, its source, and its tier. Group by the file the claim appears in, so the reader can audit one document at a time.

**Couldn't verify.** Things you believe are probably true but could not source. This section is mandatory and it should not be empty on a real run. An empty "couldn't verify" section means the checker did not do its job, or the writer quietly dropped everything uncertain, which loses real information.

**Contested.** Where sources disagree. Give both numbers and both sources. Disagreement between two credible sources is itself a finding, and it often points at exactly where the interesting research question lives.

## Confidence markers in the prose

Use them sparingly and only where they would change what the reader does.

Marking every sentence with a confidence level is its own kind of noise. Reserve it for the load-bearing claims: the ones a reader might reorganize their year around.

## What the checker verifies

The checker pass runs after drafting and before editing. For every output file it:

1. Finds every number and confirms it carries a tier marker, and for tier one, a source and year.
2. Finds every named person and confirms an evidence link exists and resolves.
3. Finds every named company and confirms it exists and does roughly what the text says.
4. Moves anything that fails to `sources.md` under "couldn't verify," and either removes the claim or downgrades it in place to tier three with reasoning.

Silently deleting an unverifiable claim is as wrong as silently asserting it. The reader wants to know that you looked and came up short.
