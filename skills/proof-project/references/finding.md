# Finding the gap

The agentic half. Given a field, find the two or three places where a cheap, finishable
project would produce something nobody has. This is reading, not search, and there is no
deterministic version.

## The governing heuristic

**Ask what the control experiment would be, and whether anyone has run it.**

Six independent field surveys, of fields that share nothing, each concluded that the
field's most open problem was a measurement problem, and each time it was the part with
the least money on it. So start from a landscape survey of the field, such as one made
with `/industry-research`, and ask whether its most open problem is a measurement problem
too.

The mechanism is not mysterious. Publishing the denominator caps your own numerator, so the
people best positioned to measure a benchmark's noise floor are exactly the people whose
scores it would cap. **That is a structural gap, not a temporary one**, and it is why an
outsider with a laptop can produce something a lab with a cluster has not.

## Six places to look, in order of hit rate

**1. Limitations and future-work sections.** Authors describing what they could not do,
usually accurately. Read the last page before the references, in five recent papers.

**2. A number everyone cites.** Track it to its source. Frequently it was measured once,
years ago, on a smaller model, and has been repeated since without recheck. The market moved
and the measurement did not.

**3. A dead repo a live paper depends on.** A method that works, an implementation abandoned
two years ago, and papers still citing the result. The decay *is* the project, not an
obstacle to it.

**4. Two communities using one phrase.** They cite each other thinly and each assumes the
other validated the shared assumption. Neither did. The phrase is the search term.

**5. A frontier lab's closed result.** Fully described in a paper or model card, with no
code, no weights, no prompts — and reproducible on one card with open weights. Reproducing
one produces a public number that a lab currently holds privately.

**6. A benchmark's own noise floor.** How well does the benchmark agree with *itself*? Almost
never published, always wanted, and usually computable from data already downloaded.

## Then check it is actually open

The expensive mistake is a project that turns out to be done. Before committing:

- Search the exact claim, not the topic. Topic searches return the field; claim searches
  return the paper that already did it.
- Check the last six months specifically. Fields move, and a gap open in a survey from three
  months ago may be closed.
- Check whether a maintainer has it in flight — an issue, a branch, a workshop abstract.
- **Ask.** If an author or maintainer is reachable, a two-minute question resolves this
  better than an hour of searching, and it opens the relationship early.

Record what you searched. "Open" is a claim like any other and needs its evidence.

## Cross with what the operator has

`config/assets.md`. Run the gap list against it and look for a crossing: a gap that is
cheap for this person specifically because of a library they wrote, a skill they have, an
affiliation, or access they already hold.

**Two ordinary capabilities crossed is rarer than one exceptional one.** Quantisation is
common. Diffusion language models are common. Someone who has done both is not, and the
project at that intersection is one almost nobody else can run cheaply.

Look for the crossing *before* exhaustively listing gaps. It narrows the search enormously,
and a project that only this operator could have done proves more than a good project anyone
could have done.

## Budget and stopping

A run should cost a bounded number of tool calls, stated up front. Stop on budget, or when
two consecutive lines of enquiry produce neither a gap nor a lead.

**Returning two well-specified projects is a better outcome than six thin ones.** A project
that fails the form-factor spec should not be written down — padding here is expensive
downstream, because the operator will spend a weekend on it.

## Writing it up

`references/schema.md`. One file per field, dated, in `state/projects/{field-slug}.md`.

Fields move. Re-running a field in three months is expected, and the date is what makes the
old file interpretable rather than misleading.
